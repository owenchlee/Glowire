// Steady-state DC solver: modified nodal analysis + Newton–Raphson.
//
// Unknowns: the voltage of every non-ground node, plus the current through every
// voltage source. Each element "stamps" its contribution into A·x = z:
//   resistor   conductance G = 1/R added between its two nodes
//   source     an extra row/column forcing V(+) − V(−) = volts; its unknown is the current
//   diode      nonlinear, so it is replaced by its tangent line at the current guess
//              (a conductance plus a current source) and the system is re-solved until
//              the guess stops moving: Newton–Raphson.
//   capacitor  a gap when settled; stepping through time, a conductance C/dt plus a source
//   F source   gain × a diode's current (transistors), on that diode's tangent line too

import type { Circuit, DiodeModel, Element } from './circuit';
import { GMIN, OPEN_SWITCH_RESISTANCE } from './constants';
import { solveLinear } from './linear';

type DiodeElement = Extract<Element, { type: 'D' }>;

export interface NetlistSolution {
  /** Node voltages, volts. Nodes not connected to any battery read 0. */
  voltages: Float64Array;
  /** Element currents, amps, positive a → b. */
  currents: Float64Array;
  /** 1 if the node is part of a circuit that contains a battery. */
  powered: Uint8Array;
  converged: boolean;
  iterations: number;
}

const MAX_ITERATIONS = 200;
// SPICE-style convergence: a diode has settled when its voltage OR its current stops
// moving (relative tolerance plus an absolute floor). The current test matters for
// nodes pinned only by tiny leakage, e.g. between two off LEDs in series, where
// floating-point noise jiggles the voltage by millivolts at femtoamp currents.
const RELATIVE_TOLERANCE = 1e-9;
const VOLTAGE_TOLERANCE = 1e-9;
const CURRENT_TOLERANCE = 1e-12;
/** exp() argument cap; beyond it the diode curve continues as a straight line. */
const MAX_EXPONENT = 80;

// Reusable scratch buffers for solveNetlist's internal arrays (it runs on every board
// edit, and allocating ~15 typed arrays per call dominated small boards). Each slot
// grows on demand; the first `len` entries are reset to `value` on every request.
const i32Pool: Int32Array[] = [];
const f64Pool: Float64Array[] = [];
function scratchI32(slot: number, len: number, value: number): Int32Array {
  let b = i32Pool[slot];
  if (b === undefined || b.length < len) i32Pool[slot] = b = new Int32Array(Math.max(len, 2 * (b?.length ?? 32)));
  b.fill(value, 0, len);
  return b;
}
function scratchF64(slot: number, len: number): Float64Array {
  let b = f64Pool[slot];
  if (b === undefined || b.length < len) f64Pool[slot] = b = new Float64Array(Math.max(len, 2 * (b?.length ?? 32)));
  else b.fill(0, 0, len);
  return b;
}

/** Diode current and its derivative (small-signal conductance) at voltage v, including GMIN. */
export function diodeEval(v: number, d: DiodeModel): { i: number; g: number } {
  evalInto(v, d);
  return { i: evalI, g: evalG };
}

// Result slots for evalInto: the Newton loop reads these instead of allocating an object per call.
let evalI = 0;
let evalG = 0;
function evalInto(v: number, d: DiodeModel): void {
  const x = v / d.nVt;
  let i: number;
  let g: number;
  if (x > MAX_EXPONENT) {
    const e = Math.exp(MAX_EXPONENT);
    i = d.is * (e * (1 + x - MAX_EXPONENT) - 1);
    g = (d.is * e) / d.nVt;
  } else {
    const e = Math.exp(x);
    i = d.is * (e - 1);
    g = (d.is * e) / d.nVt;
  }
  evalI = i + GMIN * v;
  evalG = g + GMIN;
}

/**
 * SPICE's junction voltage limiting (pnjlim). The exponential means a raw Newton step
 * from 0 V to 3 V would predict ~10^25 A and blow up. Above the critical voltage we
 * instead move along the log of the step, so each iteration changes the current by a
 * sane factor and the iteration converges from any starting point.
 */
function criticalVoltage(d: DiodeModel): number {
  return d.nVt * Math.log(d.nVt / (Math.SQRT2 * d.is));
}

export function limitJunctionStep(vNew: number, vOld: number, d: DiodeModel, vcrit = criticalVoltage(d)): number {
  if (vNew > vcrit && Math.abs(vNew - vOld) > 2 * d.nVt) {
    if (vOld > 0) {
      const arg = 1 + (vNew - vOld) / d.nVt;
      return arg > 0 ? vOld + d.nVt * Math.log(arg) : vcrit;
    }
    return d.nVt * Math.log(vNew / d.nVt);
  }
  return vNew;
}

/**
 * One step forward in time, for circuits with capacitors. Without it the circuit is solved
 * as it ends up once everything has settled, when a capacitor is just a gap.
 */
export interface TimeStep {
  /** Seconds since the last step. */
  dt: number;
  /** Each capacitor's voltage (+ end minus − end) at the last step, by board cell. */
  charges: Readonly<Record<number, number>>;
  /**
   * Optional warm start for a run of steps on one circuit: the diode voltages the last step
   * ended on. Newton starts there instead of at 0 V and leaves its own end point here.
   */
  warm?: { vd?: Float64Array };
}

/** What a circuit's shape fixes, whatever the capacitor charges: pruning, grounds, matrix layout. */
interface Structure {
  active: Int32Array;
  index: Int32Array;
  powered: Uint8Array;
  prunedElement: number[];
  prunedLeaf: number[];
  sources: number[];
  diodes: number[];
  controlled: number[];
  diodeSlot: Map<number, number>;
  n: number;
  size: number;
}
// Stepped solves only: timeUntil solves the same circuit hundreds of times.
const structures = new WeakMap<Circuit, Structure>();

function buildStructure(circuit: Circuit, stepping: boolean): Structure {
  const { nodeCount, elements } = circuit;
  const powered = new Uint8Array(nodeCount);

  // 1. Prune dangling elements. A node touched by only one element terminal can't
  //    carry current (KCL), so that element's current is zero. Repeat until stable.
  //    Element lists per node in CSR form (typed arrays: this runs on every board edit),
  //    each list in ascending element order.
  const elementCount = elements.length;
  const degree = scratchI32(0, nodeCount, 0);
  for (let i = 0; i < elementCount; i++) {
    const el = elements[i]!;
    degree[el.a]!++;
    degree[el.b]!++;
  }
  const start = scratchI32(1, nodeCount + 1, 0);
  for (let node = 0; node < nodeCount; node++) start[node + 1] = start[node]! + degree[node]!;
  const fill = scratchI32(2, nodeCount, 0);
  for (let node = 0; node < nodeCount; node++) fill[node] = start[node]!;
  const touching = scratchI32(3, 2 * elementCount, 0);
  for (let i = 0; i < elementCount; i++) {
    const el = elements[i]!;
    touching[fill[el.a]!++] = i;
    touching[fill[el.b]!++] = i;
  }
  const active = scratchI32(4, elementCount, 1);
  const prunedElement: number[] = [];
  const prunedLeaf: number[] = [];
  const leaves: number[] = [];
  for (let node = 0; node < nodeCount; node++) if (degree[node] === 1) leaves.push(node);
  while (leaves.length) {
    const leaf = leaves.pop()!;
    if (degree[leaf] !== 1) continue;
    let element = touching[start[leaf]!]!;
    for (let k = start[leaf]!; k < start[leaf + 1]!; k++) {
      if (active[touching[k]!]) {
        element = touching[k]!;
        break;
      }
    }
    active[element] = 0;
    prunedElement.push(element);
    prunedLeaf.push(leaf);
    const el = elements[element]!;
    if (--degree[el.a]! === 1) leaves.push(el.a);
    if (--degree[el.b]! === 1) leaves.push(el.b);
  }

  // 2. Find connected circuits among what's left; only those with a battery (or, stepping
  //    through time, a capacitor that may hold charge) get solved. Each one is grounded at
  //    the − node of its first battery, else of its first capacitor.
  const parent = scratchI32(5, nodeCount, 0);
  for (let k = 0; k < nodeCount; k++) parent[k] = k;
  const find = (k: number): number => {
    while (parent[k] !== k) k = parent[k] = parent[parent[k]!]!;
    return k;
  };
  for (let i = 0; i < elementCount; i++) {
    const el = elements[i]!;
    if (active[i]) parent[find(el.a)] = find(el.b);
  }
  const groundOf = scratchI32(6, nodeCount, -1); // root -> ground node
  for (let i = 0; i < elementCount; i++) {
    const el = elements[i]!;
    if (active[i] && el.type === 'V' && groundOf[find(el.a)] === -1) groundOf[find(el.a)] = el.b;
  }
  if (stepping)
    for (let i = 0; i < elementCount; i++) {
      const el = elements[i]!;
      if (active[i] && el.type === 'C' && groundOf[find(el.a)] === -1) groundOf[find(el.a)] = el.b;
    }

  // Matrix index for every powered, non-ground node; then one row per voltage source.
  const index = scratchI32(7, nodeCount, -1);
  let n = 0;
  for (let node = 0; node < nodeCount; node++) {
    const ground = groundOf[find(node)]!;
    if (ground === -1 || degree[node] === 0) continue;
    powered[node] = 1;
    if (node !== ground) index[node] = n++;
  }
  const sources: number[] = [];
  const diodes: number[] = [];
  const controlled: number[] = [];
  elements.forEach((el, i) => {
    if (!active[i] || !powered[el.a]) return;
    if (el.type === 'V') sources.push(i);
    if (el.type === 'D') diodes.push(i);
    if (el.type === 'F') controlled.push(i);
  });
  /** Which diode (index into `diodes`) each element is, for the sources they control. */
  const diodeSlot = new Map(diodes.map((d, k) => [d, k]));
  const size = n + sources.length;
  return {
    active: active.slice(0, elementCount),
    index: index.slice(0, nodeCount),
    powered,
    prunedElement,
    prunedLeaf,
    sources,
    diodes,
    controlled,
    diodeSlot,
    n,
    size,
  };
}

export function solveNetlist(circuit: Circuit, step?: TimeStep): NetlistSolution {
  const { nodeCount, elements } = circuit;
  // A capacitor over one time step (backward Euler): a conductance C/dt, plus a current
  // source that keeps pushing with the charge it already holds.
  const capG = (el: { farads: number }) => (step ? el.farads / step.dt : 1 / OPEN_SWITCH_RESISTANCE);
  const charge = (el: { cell: number }) => (step ? (step.charges[el.cell] ?? 0) : 0);
  const voltages = new Float64Array(nodeCount);
  const currents = new Float64Array(elements.length);
  let st = step ? structures.get(circuit) : undefined;
  if (!st) {
    st = buildStructure(circuit, !!step);
    if (step) structures.set(circuit, st);
  }
  const { active, index, powered, prunedElement, prunedLeaf, sources, diodes, controlled, diodeSlot, n, size } = st;

  // 3. Newton–Raphson. With no diodes the system is linear and one pass is exact.
  //    Resistors, capacitors and sources don't change between iterations, so they are stamped
  //    once into `base` and copied in; only the diode tangents (and the sources they control)
  //    are re-stamped each pass.
  const vd = scratchF64(0, diodes.length); // linearisation point per diode
  const base = scratchF64(2, size * size);
  const zBase = scratchF64(3, size);
  const z = scratchF64(4, size);
  // Linear circuit: one pass, so solve in place on base and skip the matrix copy.
  const A = diodes.length === 0 ? base : scratchF64(1, size * size);
  const resistors: number[] = [];
  const capacitors: number[] = [];
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!;
    if (!active[i] || !powered[el.a]) continue;
    if (el.type === 'R' || el.type === 'C') {
      // Element order as before, so the floating-point sums come out identical.
      (el.type === 'R' ? resistors : capacitors).push(i);
      const g = el.type === 'R' ? 1 / el.ohms : capG(el);
      const ia = index[el.a]!;
      const ib = index[el.b]!;
      if (ia >= 0) base[ia * size + ia]! += g;
      if (ib >= 0) base[ib * size + ib]! += g;
      if (ia >= 0 && ib >= 0) {
        base[ia * size + ib]! -= g;
        base[ib * size + ia]! -= g;
      }
      if (el.type === 'C') {
        const ieq = -g * charge(el);
        if (ia >= 0) zBase[ia]! -= ieq;
        if (ib >= 0) zBase[ib]! += ieq;
      }
    }
  }
  for (let k = 0; k < sources.length; k++) {
    const el = elements[sources[k]!]!;
    if (el.type !== 'V') continue;
    const row = n + k;
    const ia = index[el.a]!;
    const ib = index[el.b]!;
    if (ia >= 0) base[ia * size + row] = base[row * size + ia] = 1;
    if (ib >= 0) base[ib * size + row] = base[row * size + ib] = -1;
    zBase[row] = el.volts;
  }
  const diodeEls: DiodeElement[] = [];
  for (const d of diodes) {
    const el = elements[d]!;
    if (el.type === 'D') diodeEls.push(el);
  }
  // Diode current/conductance at the current linearisation point vd. The value at the
  // next point is computed during the convergence test, so each pass evaluates exp once.
  const di0 = scratchF64(5, diodeEls.length);
  const dg0 = scratchF64(6, diodeEls.length);
  const vcrit = scratchF64(7, diodeEls.length);
  const warm = step?.warm;
  if (warm?.vd?.length === diodeEls.length) vd.set(warm.vd);
  for (let k = 0; k < diodeEls.length; k++) {
    evalInto(vd[k]!, diodeEls[k]!.model);
    di0[k] = evalI;
    dg0[k] = evalG;
    vcrit[k] = criticalVoltage(diodeEls[k]!.model);
  }
  const V = (node: number, x: Float64Array) => (index[node]! < 0 ? 0 : x[index[node]!]!);

  let converged = size === 0;
  let iterations = 0;
  while (!converged && iterations < MAX_ITERATIONS) {
    iterations++;
    if (A !== base) A.set(base.subarray(0, size * size));
    z.set(zBase.subarray(0, size));
    for (let k = 0; k < diodeEls.length; k++) {
      const el = diodeEls[k]!;
      const i = di0[k]!;
      const g = dg0[k]!;
      const ia = index[el.a]!;
      const ib = index[el.b]!;
      if (ia >= 0) A[ia * size + ia]! += g;
      if (ib >= 0) A[ib * size + ib]! += g;
      if (ia >= 0 && ib >= 0) {
        A[ia * size + ib]! -= g;
        A[ib * size + ia]! -= g;
      }
      const ieq = i - g * vd[k]!; // tangent line: I ≈ g·v + (i − g·vd)
      // Current flowing a → b through the element leaves node a and enters node b.
      if (ia >= 0) z[ia]! -= ieq;
      if (ib >= 0) z[ib]! += ieq;
    }
    // Current-controlled sources (inside transistors): gain × the controlling diode's current,
    // which on its tangent line is g·(V(ca) − V(cb)) + (i − g·vd). The g part is a
    // transconductance stamped against the diode's nodes; the rest is a fixed current.
    for (const f of controlled) {
      const el = elements[f]!;
      if (el.type !== 'F') continue;
      const k = diodeSlot.get(el.ctrl);
      const ctrl = elements[el.ctrl]!;
      if (k === undefined || ctrl.type !== 'D') continue;
      const i = di0[k]!;
      const g = dg0[k]!;
      const gm = el.gain * g;
      const rows = [index[el.a]!, index[el.b]!];
      const cols = [index[ctrl.a]!, index[ctrl.b]!];
      rows.forEach((r, ri) => {
        if (r < 0) return;
        const sign = ri === 0 ? 1 : -1; // leaves a, enters b
        if (cols[0]! >= 0) A[r * size + cols[0]!]! += sign * gm;
        if (cols[1]! >= 0) A[r * size + cols[1]!]! -= sign * gm;
      });
      const ieq = el.gain * (i - g * vd[k]!);
      if (index[el.a]! >= 0) z[index[el.a]!]! -= ieq;
      if (index[el.b]! >= 0) z[index[el.b]!]! += ieq;
    }
    solveLinear(A, z, size);

    converged = true;
    for (let k = 0; k < diodeEls.length; k++) {
      const el = diodeEls[k]!;
      const raw = V(el.a, z) - V(el.b, z);
      const i = di0[k]!;
      const g = dg0[k]!;
      currents[diodes[k]!] = i + g * (raw - vd[k]!);
      const next = limitJunctionStep(raw, vd[k]!, el.model, vcrit[k]!);
      const dv = Math.abs(next - vd[k]!);
      evalInto(next, el.model);
      const di = Math.abs(evalI - i);
      const vSettled = dv <= VOLTAGE_TOLERANCE + RELATIVE_TOLERANCE * Math.abs(next);
      const iSettled = di <= CURRENT_TOLERANCE + RELATIVE_TOLERANCE * Math.abs(i);
      if (next !== raw || !(vSettled || iSettled)) converged = false;
      vd[k] = next;
      di0[k] = evalI;
      dg0[k] = evalG;
    }
    for (const f of controlled) {
      const el = elements[f]!;
      if (el.type === 'F') currents[f] = el.gain * currents[el.ctrl]!;
    }
  }

  if (warm && converged) warm.vd = vd.slice(0, diodeEls.length);

  // Linear-element currents (resistors, capacitors, sources) only matter at the final
  // solution, still held in z.
  if (iterations > 0) {
    for (const r of resistors) {
      const el = elements[r]!;
      if (el.type === 'R') currents[r] = (V(el.a, z) - V(el.b, z)) / el.ohms;
    }
    for (const c of capacitors) {
      const el = elements[c]!;
      if (el.type === 'C') currents[c] = capG(el) * (V(el.a, z) - V(el.b, z) - charge(el));
    }
    for (let k = 0; k < sources.length; k++) currents[sources[k]!] = z[n + k]!;
  }

  for (let node = 0; node < nodeCount; node++) voltages[node] = V(node, z);

  // 4. Pruned elements carry no current, so the voltage across them is 0 (or the EMF
  //    for a battery's source, or the charge a capacitor still holds). Walk back out to
  //    the leaves to give them voltages.
  for (let k = prunedElement.length - 1; k >= 0; k--) {
    const element = prunedElement[k]!;
    const leaf = prunedLeaf[k]!;
    const el = elements[element]!;
    currents[element] = 0;
    const emf = el.type === 'V' ? el.volts : el.type === 'C' ? charge(el) : 0;
    voltages[leaf] = leaf === el.a ? voltages[el.b]! + emf : voltages[el.a]! - emf;
  }

  return { voltages, currents, powered, converged, iterations };
}
