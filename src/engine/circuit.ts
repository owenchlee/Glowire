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
//   switch          + ──R── −   (wire resistance when closed, 1 GΩ when open)
//   changeover      common ──R── centre, centre ──R── each throw (closed one ≈ 0, open one 1 GΩ)
//   meter           + ──R── −   (ammeter ≈ 0 Ω, voltmeter 1 GΩ)
//   capacitor       + ──C── −   (a gap once settled; see mna.ts for how it fills over time)
//   transistor      each leg ──R── inner node; Ebers–Moll diodes and current sources inside
//   block           nothing

import {
  AMMETER_RESISTANCE,
  DIODE_MODEL,
  BATTERY_INTERNAL_RESISTANCE,
  VOLTMETER_RESISTANCE,
  LED_MODELS,
  OPEN_SWITCH_RESISTANCE,
  THERMAL_VOLTAGE,
  TRANSISTOR,
  TRANSISTOR_LEAD_RESISTANCE,
  WIRE_RESISTANCE,
} from './constants';
import { getChangeoverPorts, getTerminals, getTransistorPorts, neighbourIndex, opposite } from './tiles';
import type { Board, Direction, LedColor, Tile } from './types';

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
  | { type: 'D'; a: number; b: number; model: DiodeModel; cell: number }
  /** A capacitor; `a` is its + end. */
  | { type: 'C'; a: number; b: number; farads: number; cell: number }
  /** A current `gain` × (the current through diode element `ctrl`), flowing a → b. */
  | { type: 'F'; a: number; b: number; ctrl: number; gain: number; cell: number };

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

export function diodeModel(): DiodeModel {
  const m = DIODE_MODEL;
  const nVt = m.emissionCoefficient * THERMAL_VOLTAGE;
  const junctionVoltage = m.ratedVoltage - m.ratedCurrent * m.seriesResistance;
  return { nVt, is: m.ratedCurrent / Math.expm1(junctionVoltage / nVt) };
}

/** A transistor's two junctions. */
export function transistorJunction(): DiodeModel {
  return { is: TRANSISTOR.saturationCurrent, nVt: THERMAL_VOLTAGE };
}

// Fitted once: the fits are pure functions of the constants.
const LED_DIODE_MODELS: Record<LedColor, DiodeModel> = {
  red: ledDiodeModel('red'),
  green: ledDiodeModel('green'),
  blue: ledDiodeModel('blue'),
};
const DIODE_DIODE_MODEL = diodeModel();

/** Bit mask of the ports the tile exposes after rotation (bit d = direction d), as getPorts. */
function portMaskOf(tile: Tile): number {
  if (tile.kind === 'block') return 0;
  const r = tile.rotation;
  // Rotation-0 masks: wire arms; changeover and transistor W, N, S; two-terminal W, E.
  const m = tile.kind === 'wire' ? tile.arms & 15 : tile.kind === 'changeover' || tile.kind === 'transistor' ? 0b1101 : 0b1010;
  return ((m << r) | (m >> (4 - r))) & 15;
}

export function buildCircuit(board: Board): Circuit {
  // 1. Union-find over port keys (cell * 4 + dir) to merge facing ports.
  //    Typed arrays and port bit masks instead of Maps/arrays: this runs on every board edit.
  const cellCount = board.cells.length;
  const portMask = new Uint8Array(cellCount);
  for (let cell = 0; cell < cellCount; cell++) {
    const tile = board.cells[cell];
    if (tile) portMask[cell] = portMaskOf(tile);
  }
  const parent = new Int32Array(cellCount * 4);
  for (let k = 0; k < parent.length; k++) parent[k] = k;
  const findRoot = (k: number): number => {
    let r = k;
    while (parent[r] !== r) r = parent[r]!;
    parent[k] = r;
    return r;
  };
  for (let cell = 0; cell < cellCount; cell++) {
    const mask = portMask[cell]!;
    for (let k = 0; k < 4; k++) {
      if (!(mask & (1 << k))) continue;
      const d = k as Direction;
      const other = neighbourIndex(board, cell, d);
      if (other < 0 || !(portMask[other]! & (1 << opposite(d)))) continue;
      parent[findRoot(cell * 4 + d)] = findRoot(other * 4 + opposite(d));
    }
  }

  let nodeCount = 0;
  const nodeOfRoot = new Int32Array(cellCount * 4).fill(-1);
  const portNode = (cell: number, d: Direction): number => {
    const root = findRoot(cell * 4 + d);
    let n = nodeOfRoot[root]!;
    if (n < 0) nodeOfRoot[root] = n = nodeCount++;
    return n;
  };

  // 2. Each tile stamps its elements.
  const elements: Element[] = [];
  const ports: PortRef[] = [];
  const add = (el: Element) => elements.push(el) - 1;
  const port = (cell: number, dir: Direction, element: number, terminal: 'a' | 'b') =>
    ports.push({ cell, dir, node: portNode(cell, dir), element, terminal });

  for (let cell = 0; cell < cellCount; cell++) {
    const tile = board.cells[cell];
    if (!tile || tile.kind === 'block') continue;
    if (tile.kind === 'wire') {
      const mask = portMask[cell]!;
      const low = mask & -mask;
      if (mask !== low && (mask ^ low) === ((mask ^ low) & -(mask ^ low))) {
        // Exactly two arms, in ascending direction order as armDirections lists them.
        const d0 = (31 - Math.clz32(low)) as Direction;
        const d1 = (31 - Math.clz32(mask)) as Direction;
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
        for (let k = 0; k < 4; k++) {
          if (!(mask & (1 << k))) continue;
          const d = k as Direction;
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
      continue;
    }

    if (tile.kind === 'transistor') {
      // Ebers–Moll: a diode from base to emitter and one from base to collector, and each
      // one's current, multiplied, pushed back through the other leg. A small base current
      // lets about BETA times as much flow from collector to emitter, until the collector
      // can't give any more (the transistor is then fully on: "saturated").
      const [bd, cd, ed] = getTransistorPorts(tile);
      const nb = nodeCount++;
      const nc = nodeCount++;
      const ne = nodeCount++;
      for (const [dir, inner] of [[bd, nb], [cd, nc], [ed, ne]] as const) {
        const e = add({ type: 'R', a: portNode(cell, dir), b: inner, ohms: TRANSISTOR_LEAD_RESISTANCE, cell });
        port(cell, dir, e, 'a');
      }
      const model = transistorJunction();
      const be = add({ type: 'D', a: nb, b: ne, model, cell });
      const bc = add({ type: 'D', a: nb, b: nc, model, cell });
      add({ type: 'F', a: nc, b: nb, ctrl: be, gain: TRANSISTOR.alphaF, cell });
      add({ type: 'F', a: ne, b: nb, ctrl: bc, gain: TRANSISTOR.alphaR, cell });
      continue;
    }

    if (tile.kind === 'changeover') {
      // common ──R── centre, then centre ──closed── the chosen throw, ──open── the other.
      const [c, u, d] = getChangeoverPorts(tile);
      const centre = nodeCount++;
      const legs: [Direction, number][] = [
        [c, WIRE_RESISTANCE / 2],
        [u, tile.up ? WIRE_RESISTANCE / 2 : OPEN_SWITCH_RESISTANCE],
        [d, tile.up ? OPEN_SWITCH_RESISTANCE : WIRE_RESISTANCE / 2],
      ];
      for (const [dir, ohms] of legs) {
        const e = add({ type: 'R', a: portNode(cell, dir), b: centre, ohms, cell });
        port(cell, dir, e, 'a');
      }
      continue;
    }

    const [plus, minus] = getTerminals(tile);
    const p = portNode(cell, plus);
    const m = portNode(cell, minus);
    if (tile.kind === 'resistor' || tile.kind === 'switch' || tile.kind === 'meter') {
      const ohms =
        tile.kind === 'resistor'
          ? tile.ohms
          : tile.kind === 'meter'
            ? tile.mode === 'A'
              ? AMMETER_RESISTANCE
              : VOLTMETER_RESISTANCE
            : tile.closed
              ? WIRE_RESISTANCE
              : OPEN_SWITCH_RESISTANCE;
      const e = add({ type: 'R', a: p, b: m, ohms, cell });
      port(cell, plus, e, 'a');
      port(cell, minus, e, 'b');
    } else if (tile.kind === 'capacitor') {
      const e = add({ type: 'C', a: p, b: m, farads: tile.uf * 1e-6, cell });
      port(cell, plus, e, 'a');
      port(cell, minus, e, 'b');
    } else if (tile.kind === 'led' || tile.kind === 'diode') {
      const x = nodeCount++;
      const rs = add({
        type: 'R',
        a: p,
        b: x,
        ohms: tile.kind === 'led' ? LED_MODELS[tile.color].seriesResistance : DIODE_MODEL.seriesResistance,
        cell,
      });
      const model = tile.kind === 'led' ? LED_DIODE_MODELS[tile.color] : DIODE_DIODE_MODEL;
      const d = add({ type: 'D', a: x, b: m, model, cell });
      port(cell, plus, rs, 'a');
      port(cell, minus, d, 'b');
    } else {
      const x = nodeCount++;
      const r = add({ type: 'R', a: x, b: p, ohms: BATTERY_INTERNAL_RESISTANCE, cell });
      const v = add({ type: 'V', a: x, b: m, volts: tile.volts, cell });
      port(cell, plus, r, 'b');
      port(cell, minus, v, 'b');
    }
  }

  return { nodeCount, elements, ports };
}
