// Board -> circuit (netlist) conversion.
//
// Every tile port becomes a circuit node. When two neighbouring tiles both have a
// port on their shared edge, those two ports are the same node. Each tile then adds
// its elements between its port nodes (plus any internal nodes it needs):
//
//   2-port wire     port ──R(0.01)── port
//   tee / cross     port ──R(0.005)── centre ──R(0.005)── port   (one arm per port)
//   resistor        + ──R── −
//   LED             anode ──Rs── x ──▷|── cathode   (Shockley diode + series resistance)
//   battery         + ──R_int── x ──(+V−)── −      (ideal source + internal resistance)

import {
  BATTERY_INTERNAL_RESISTANCE,
  LED_MODELS,
  THERMAL_VOLTAGE,
  WIRE_RESISTANCE,
} from './constants';
import { getPorts, getTerminals, isConnected, neighbourIndex, opposite } from './tiles';
import type { Board, Direction } from './types';

export interface DiodeModel {
  /** Saturation current Is, amps. */
  is: number;
  /** Emission coefficient × thermal voltage, volts. */
  nVt: number;
}

/** Current through an element is positive flowing a → b. For 'V', a is the + node. */
export type Element =
  | { type: 'R'; a: number; b: number; ohms: number; cell: number }
  | { type: 'V'; a: number; b: number; volts: number; cell: number }
  | { type: 'D'; a: number; b: number; model: DiodeModel; cell: number };

/** Which element terminal sits on each tile port, so results can be mapped back to tiles. */
export interface PortRef {
  cell: number;
  dir: Direction;
  node: number;
  element: number;
  terminal: 'a' | 'b';
}

export interface Circuit {
  nodeCount: number;
  elements: Element[];
  ports: PortRef[];
}

/**
 * Fit the Shockley saturation current so the LED (including its series resistance)
 * drops `ratedVoltage` at `ratedCurrent`:  Is = I / (exp(Vj / nVt) − 1).
 */
export function ledDiodeModel(color: keyof typeof LED_MODELS): DiodeModel {
  const m = LED_MODELS[color];
  const nVt = m.emissionCoefficient * THERMAL_VOLTAGE;
  const junctionVoltage = m.ratedVoltage - m.ratedCurrent * m.seriesResistance;
  return { nVt, is: m.ratedCurrent / Math.expm1(junctionVoltage / nVt) };
}

export function buildCircuit(board: Board): Circuit {
  // 1. Union-find over port keys (cell * 4 + dir) to merge facing ports.
  const parent = new Map<number, number>();
  const findRoot = (k: number): number => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  board.cells.forEach((tile, cell) => {
    if (tile) for (const d of getPorts(tile)) parent.set(cell * 4 + d, cell * 4 + d);
  });
  board.cells.forEach((tile, cell) => {
    if (!tile) return;
    for (const d of getPorts(tile)) {
      if (!isConnected(board, cell, d)) continue;
      const other = neighbourIndex(board, cell, d) * 4 + opposite(d);
      parent.set(findRoot(cell * 4 + d), findRoot(other));
    }
  });

  let nodeCount = 0;
  const nodeOfRoot = new Map<number, number>();
  const portNode = (cell: number, d: Direction): number => {
    const root = findRoot(cell * 4 + d);
    let n = nodeOfRoot.get(root);
    if (n === undefined) nodeOfRoot.set(root, (n = nodeCount++));
    return n;
  };

  // 2. Each tile stamps its elements.
  const elements: Element[] = [];
  const ports: PortRef[] = [];
  const add = (el: Element) => elements.push(el) - 1;
  const port = (cell: number, dir: Direction, element: number, terminal: 'a' | 'b') =>
    ports.push({ cell, dir, node: portNode(cell, dir), element, terminal });

  board.cells.forEach((tile, cell) => {
    if (!tile) return;
    if (tile.kind === 'wire') {
      const dirs = getPorts(tile);
      if (dirs.length === 2) {
        const [d0, d1] = dirs as [Direction, Direction];
        const e = add({
          type: 'R',
          a: portNode(cell, d0),
          b: portNode(cell, d1),
          ohms: WIRE_RESISTANCE,
          cell,
        });
        port(cell, d0, e, 'a');
        port(cell, d1, e, 'b');
      } else {
        const centre = nodeCount++;
        for (const d of dirs) {
          const e = add({
            type: 'R',
            a: portNode(cell, d),
            b: centre,
            ohms: WIRE_RESISTANCE / 2,
            cell,
          });
          port(cell, d, e, 'a');
        }
      }
      return;
    }

    const [plus, minus] = getTerminals(tile);
    const p = portNode(cell, plus);
    const m = portNode(cell, minus);
    if (tile.kind === 'resistor') {
      const e = add({ type: 'R', a: p, b: m, ohms: tile.ohms, cell });
      port(cell, plus, e, 'a');
      port(cell, minus, e, 'b');
    } else if (tile.kind === 'led') {
      const x = nodeCount++;
      const rs = add({
        type: 'R',
        a: p,
        b: x,
        ohms: LED_MODELS[tile.color].seriesResistance,
        cell,
      });
      const d = add({ type: 'D', a: x, b: m, model: ledDiodeModel(tile.color), cell });
      port(cell, plus, rs, 'a');
      port(cell, minus, d, 'b');
    } else {
      const x = nodeCount++;
      const r = add({ type: 'R', a: x, b: p, ohms: BATTERY_INTERNAL_RESISTANCE, cell });
      const v = add({ type: 'V', a: x, b: m, volts: tile.volts, cell });
      port(cell, plus, r, 'b');
      port(cell, minus, v, 'b');
    }
  });

  return { nodeCount, elements, ports };
}
