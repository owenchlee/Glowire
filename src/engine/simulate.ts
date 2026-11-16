// Board in, per-tile physics results out.

import { buildCircuit } from './circuit';
import {
  CAPACITOR_CHARGED,
  CURRENT_EPSILON,
  DIODE_MODEL,
  LED_MODELS,
  SHORT_CIRCUIT_CURRENT,
  TRANSISTOR,
} from './constants';
import { type TimeStep, solveNetlist } from './mna';
import { getChangeoverPorts, getTerminals, getTransistorPorts } from './tiles';
import type { Board, ComponentStatus, Direction, SimulationResult, TileResult } from './types';

/** A transistor passing more than this (0.1 mA) counts as switched on. */
const TRANSISTOR_ON = 1e-4;

/**
 * The board's circuit, settled. With a time step, capacitors start from the given charges
 * and the result is the circuit `dt` seconds later (see transient.ts).
 */
export function simulate(board: Board, step?: TimeStep): SimulationResult {
  const circuit = buildCircuit(board);
  const sol = solveNetlist(circuit, step);

  // Port inflows and port nodes per tile. Arrays, not Maps: this runs on every board edit.
  const inflow: (Partial<Record<Direction, number>> | undefined)[] = new Array(board.cells.length);
  const nodeAt = new Int32Array(board.cells.length * 4); // cell * 4 + dir -> node
  for (const p of circuit.ports) {
    const I = sol.currents[p.element]!;
    const flows = (inflow[p.cell] ??= {});
    flows[p.dir] = p.terminal === 'a' ? I : -I;
    nodeAt[p.cell * 4 + p.dir] = p.node;
  }

  // Nodes joined purely by wire tiles: if both legs of a part are, it is bypassed.
  const parent = new Int32Array(circuit.nodeCount);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (k: number): number => {
    while (parent[k] !== k) k = parent[k] = parent[parent[k]!]!;
    return k;
  };
  for (const el of circuit.elements) {
    const t = board.cells[el.cell];
    if (t?.kind === 'wire' || (t?.kind === 'meter' && t.mode === 'A'))
      parent[find(el.a)] = find(el.b);
  }

  let batteryCurrent = 0;
  const tiles = board.cells.map((tile, cell): TileResult | null => {
    if (!tile) return null;
    if (tile.kind === 'block') {
      return {
        cell,
        kind: tile.kind,
        voltage: 0,
        current: 0,
        portCurrents: {},
        brightness: 0,
        status: 'OFF',
      };
    }
    const portCurrents = inflow[cell] ?? {};

    if (tile.kind === 'wire') {
      // Directions ascending, matching Object.values order so the float sum is unchanged.
      let current = 0;
      let vMax = -Infinity;
      let vMin = Infinity;
      for (let d = 0; d < 4; d++) {
        const I = portCurrents[d as Direction];
        if (I === undefined) continue;
        current += Math.max(0, I);
        const v = sol.voltages[nodeAt[cell * 4 + d]!]!;
        if (v > vMax) vMax = v;
        if (v < vMin) vMin = v;
      }
      return {
        cell,
        kind: tile.kind,
        voltage: vMax >= vMin ? vMax - vMin : 0,
        current,
        portCurrents,
        brightness: 0,
        status:
          current > SHORT_CIRCUIT_CURRENT
            ? 'SHORT_CIRCUIT'
            : current > CURRENT_EPSILON
              ? 'OK'
              : 'OFF',
      };
    }

    if (tile.kind === 'changeover') {
      const [c] = getChangeoverPorts(tile);
      const current = Math.abs(portCurrents[c] ?? 0);
      return {
        cell,
        kind: tile.kind,
        voltage: 0,
        current,
        portCurrents,
        brightness: 0,
        status: current > CURRENT_EPSILON ? 'OK' : 'OFF',
      };
    }

    if (tile.kind === 'transistor') {
      // Its current is what flows in at the collector; its voltage, collector to emitter.
      const [, c, e] = getTransistorPorts(tile);
      const current = portCurrents[c] ?? 0;
      const vc = sol.voltages[nodeAt[cell * 4 + c]!] ?? 0;
      const ve = sol.voltages[nodeAt[cell * 4 + e]!] ?? 0;
      return {
        cell,
        kind: tile.kind,
        voltage: vc - ve,
        current,
        portCurrents,
        brightness: 0,
        status:
          current > TRANSISTOR.maxCurrent ? 'BURNED_OUT' : current > TRANSISTOR_ON ? 'OK' : 'OFF',
      };
    }

    const [plus, minus] = getTerminals(tile);
    const pNode = nodeAt[cell * 4 + plus]!;
    const mNode = nodeAt[cell * 4 + minus]!;
    const voltage = sol.voltages[pNode]! - sol.voltages[mNode]!;
    const intoPlus = portCurrents[plus] ?? 0;
    const powered = sol.powered[pNode] === 1 && sol.powered[mNode] === 1;
    const bypassed = powered && find(pNode) === find(mNode);
    let status: ComponentStatus;
    let brightness = 0;
    let current: number;

    if (tile.kind === 'battery') {
      current = -intoPlus; // discharge current leaves through +
      batteryCurrent += current;
      status =
        Math.abs(current) > SHORT_CIRCUIT_CURRENT
          ? 'SHORT_CIRCUIT'
          : Math.abs(current) > CURRENT_EPSILON
            ? 'OK'
            : 'OFF';
    } else if (tile.kind === 'switch') {
      current = intoPlus;
      status = tile.closed && Math.abs(current) > CURRENT_EPSILON ? 'OK' : 'OFF';
    } else if (tile.kind === 'meter') {
      current = intoPlus;
      // A voltmeter "works" when it's across something powered; an ammeter when current flows.
      const reading = tile.mode === 'A' ? Math.abs(current) > CURRENT_EPSILON : powered;
      status = reading ? 'OK' : 'OFF';
    } else if (tile.kind === 'capacitor') {
      current = intoPlus;
      // "Working" while it holds a useful charge or current is flowing in or out of it.
      status =
        Math.abs(voltage) > CAPACITOR_CHARGED || Math.abs(current) > CURRENT_EPSILON ? 'OK' : 'OFF';
    } else if (tile.kind === 'diode') {
      current = intoPlus;
      if (bypassed) status = 'BYPASSED';
      else if (powered && voltage < -DIODE_MODEL.reverseVoltage) status = 'REVERSED';
      else status = current > CURRENT_EPSILON ? 'OK' : 'OFF';
    } else if (tile.kind === 'resistor') {
      current = intoPlus;
      status = bypassed ? 'BYPASSED' : Math.abs(current) > CURRENT_EPSILON ? 'OK' : 'OFF';
    } else {
      const model = LED_MODELS[tile.color];
      current = intoPlus;
      if (current > model.maxCurrent) status = 'BURNED_OUT';
      else if (bypassed) status = 'BYPASSED';
      else if (powered && voltage < -model.reverseVoltage) status = 'REVERSED';
      else if (current >= model.visibleCurrent) status = 'OK';
      else status = 'OFF';
      if (status !== 'BURNED_OUT')
        brightness = Math.min(1, Math.max(0, current / model.ratedCurrent));
    }
    return { cell, kind: tile.kind, voltage, current, portCurrents, brightness, status };
  });

  return {
    tiles,
    shortCircuit: tiles.some((t) => t?.kind === 'battery' && t.status === 'SHORT_CIRCUIT'),
    batteryCurrent,
    converged: sol.converged,
    iterations: sol.iterations,
  };
}
