// Board in, per-tile physics results out.

import { buildCircuit } from './circuit';
import { DIODE_MODEL, CURRENT_EPSILON, LED_MODELS, SHORT_CIRCUIT_CURRENT } from './constants';
import { solveNetlist } from './mna';
import { getChangeoverPorts, getTerminals } from './tiles';
import type { Board, ComponentStatus, Direction, SimulationResult, TileResult } from './types';

export function simulate(board: Board): SimulationResult {
  const circuit = buildCircuit(board);
  const sol = solveNetlist(circuit);

  // Port inflows and port nodes per tile.
  const inflow = new Map<number, Partial<Record<Direction, number>>>();
  const nodeAt = new Map<number, number>(); // cell * 4 + dir -> node
  for (const p of circuit.ports) {
    const I = sol.currents[p.element]!;
    const flows = inflow.get(p.cell) ?? {};
    flows[p.dir] = p.terminal === 'a' ? I : -I;
    inflow.set(p.cell, flows);
    nodeAt.set(p.cell * 4 + p.dir, p.node);
  }

  // Nodes joined purely by wire tiles: if both legs of a part are, it is bypassed.
  const parent = Array.from({ length: circuit.nodeCount }, (_, i) => i);
  const find = (k: number): number => {
    while (parent[k] !== k) k = parent[k] = parent[parent[k]!]!;
    return k;
  };
  for (const el of circuit.elements) {
    const t = board.cells[el.cell];
    if (t?.kind === 'wire' || (t?.kind === 'meter' && t.mode === 'A')) parent[find(el.a)] = find(el.b);
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
    const portCurrents = inflow.get(cell) ?? {};
    const flows = Object.values(portCurrents);

    if (tile.kind === 'wire') {
      const nodes = Object.keys(portCurrents).map((d) => nodeAt.get(cell * 4 + Number(d))!);
      const vs = nodes.map((node) => sol.voltages[node]!);
      const current = flows.reduce((s, I) => s + Math.max(0, I), 0);
      return {
        cell,
        kind: tile.kind,
        voltage: vs.length ? Math.max(...vs) - Math.min(...vs) : 0,
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
    const pNode = nodeAt.get(cell * 4 + plus)!;
    const mNode = nodeAt.get(cell * 4 + minus)!;
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
