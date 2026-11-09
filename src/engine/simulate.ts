// Board in, per-tile physics results out.

import { buildCircuit } from './circuit';
import { DIODE_MODEL, CURRENT_EPSILON, LED_MODELS, SHORT_CIRCUIT_CURRENT } from './constants';
import { solveNetlist } from './mna';
import { getChangeoverPorts, getTerminals } from './tiles';
import type { Board, ComponentStatus, Direction, SimulationResult, TileResult } from './types';

function findIn(parent: Int32Array, k: number): number {
  while (parent[k] !== k) k = parent[k] = parent[parent[k]!]!;
  return k;
}

export function simulate(board: Board): SimulationResult {
  const circuit = buildCircuit(board);
  const sol = solveNetlist(circuit);

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
  // Built lazily: only powered parts need it.
  let parent: Int32Array | null = null;
  const find = (k: number): number => {
    if (!parent) {
      const p = (parent = new Int32Array(circuit.nodeCount));
      for (let i = 0; i < p.length; i++) p[i] = i;
      for (const el of circuit.elements) {
        const t = board.cells[el.cell];
        if (t?.kind === 'wire' || (t?.kind === 'meter' && t.mode === 'A'))
          p[findIn(p, el.a)] = findIn(p, el.b);
      }
    }
    return findIn(parent, k);
  };

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
