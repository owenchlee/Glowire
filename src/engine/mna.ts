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

import type { Circuit, DiodeModel } from './circuit';
import { GMIN, OPEN_SWITCH_RESISTANCE } from './constants';
import { solveLinear } from './linear';

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

/** Diode current and its derivative (small-signal conductance) at voltage v, including GMIN. */
export function diodeEval(v: number, d: DiodeModel): { i: number; g: number } {
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
  return { i: i + GMIN * v, g: g + GMIN };
}

/**
 * SPICE's junction voltage limiting (pnjlim). The exponential means a raw Newton step
 * from 0 V to 3 V would predict ~10^25 A and blow up. Above the critical voltage we
 * instead move along the log of the step, so each iteration changes the current by a
 * sane factor and the iteration converges from any starting point.
 */
export function limitJunctionStep(vNew: number, vOld: number, d: DiodeModel): number {
  const vcrit = d.nVt * Math.log(d.nVt / (Math.SQRT2 * d.is));
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
}

export function solveNetlist(circuit: Circuit, step?: TimeStep): NetlistSolution {
  const { nodeCount, elements } = circuit;
  // A capacitor over one time step (backward Euler): a conductance C/dt, plus a current
  // source that keeps pushing with the charge it already holds.
  const capG = (el: { farads: number }) => (step ? el.farads / step.dt : 1 / OPEN_SWITCH_RESISTANCE);
  const charge = (el: { cell: number }) => (step ? (step.charges[el.cell] ?? 0) : 0);
  const voltages = new Float64Array(nodeCount);
  const currents = new Float64Array(elements.length);
  const powered = new Uint8Array(nodeCount);

  // 1. Prune dangling elements. A node touched by only one element terminal can't
  //    carry current (KCL), so that element's current is zero. Repeat until stable.
  const touching: number[][] = Array.from({ length: nodeCount }, () => []);
  elements.forEach((el, i) => {
    touching[el.a]!.push(i);
    touching[el.b]!.push(i);
  });
  const degree = touching.map((list) => list.length);
  const active = new Uint8Array(elements.length).fill(1);
  const pruned: { element: number; leaf: number }[] = [];
  const leaves = degree.flatMap((deg, node) => (deg === 1 ? [node] : []));
  while (leaves.length) {
    const leaf = leaves.pop()!;
    if (degree[leaf] !== 1) continue;
    const element = touching[leaf]!.find((i) => active[i])!;
    active[element] = 0;
    pruned.push({ element, leaf });
    const el = elements[element]!;
    for (const n of [el.a, el.b]) if (--degree[n]! === 1) leaves.push(n);
  }

  // 2. Find connected circuits among what's left; only those with a battery (or, stepping
  //    through time, a capacitor that may hold charge) get solved. Each one is grounded at
  //    the − node of its first battery, else of its first capacitor.
  const parent = Array.from({ length: nodeCount }, (_, i) => i);
  const find = (k: number): number => {
    while (parent[k] !== k) k = parent[k] = parent[parent[k]!]!;
    return k;
  };
  elements.forEach((el, i) => {
    if (active[i]) parent[find(el.a)] = find(el.b);
  });
  const groundOf = new Map<number, number>();
  elements.forEach((el, i) => {
    if (active[i] && el.type === 'V' && !groundOf.has(find(el.a))) groundOf.set(find(el.a), el.b);
  });
  if (step)
    elements.forEach((el, i) => {
      if (active[i] && el.type === 'C' && !groundOf.has(find(el.a))) groundOf.set(find(el.a), el.b);
    });

  // Matrix index for every powered, non-ground node; then one row per voltage source.
  const index = new Int32Array(nodeCount).fill(-1);
  let n = 0;
  for (let node = 0; node < nodeCount; node++) {
    const ground = groundOf.get(find(node));
    if (ground === undefined || degree[node] === 0) continue;
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

  // 3. Newton–Raphson. With no diodes the system is linear and one pass is exact.
  const vd = new Float64Array(diodes.length); // linearisation point per diode
  const A = new Float64Array(size * size);
  const z = new Float64Array(size);
  const V = (node: number, x: Float64Array) => (index[node]! < 0 ? 0 : x[index[node]!]!);
  const stampG = (a: number, b: number, g: number) => {
    const ia = index[a]!;
    const ib = index[b]!;
    if (ia >= 0) A[ia * size + ia]! += g;
    if (ib >= 0) A[ib * size + ib]! += g;
    if (ia >= 0 && ib >= 0) {
      A[ia * size + ib]! -= g;
      A[ib * size + ia]! -= g;
    }
  };
  const stampI = (a: number, b: number, i: number) => {
    // Current i flowing a → b through the element leaves node a and enters node b.
    if (index[a]! >= 0) z[index[a]!]! -= i;
    if (index[b]! >= 0) z[index[b]!]! += i;
  };

  let converged = size === 0;
  let iterations = 0;
  while (!converged && iterations < MAX_ITERATIONS) {
    iterations++;
    A.fill(0);
    z.fill(0);
    elements.forEach((el, i) => {
      if (!active[i] || !powered[el.a]) return;
      if (el.type === 'R') stampG(el.a, el.b, 1 / el.ohms);
      if (el.type === 'C') {
        const g = capG(el);
        stampG(el.a, el.b, g);
        stampI(el.a, el.b, -g * charge(el));
      }
    });
    sources.forEach((s, k) => {
      const el = elements[s]!;
      if (el.type !== 'V') return;
      const row = n + k;
      if (index[el.a]! >= 0) A[index[el.a]! * size + row] = A[row * size + index[el.a]!] = 1;
      if (index[el.b]! >= 0) A[index[el.b]! * size + row] = A[row * size + index[el.b]!] = -1;
      z[row] = el.volts;
    });
    diodes.forEach((d, k) => {
      const el = elements[d]!;
      if (el.type !== 'D') return;
      const { i, g } = diodeEval(vd[k]!, el.model);
      stampG(el.a, el.b, g);
      stampI(el.a, el.b, i - g * vd[k]!); // tangent line: I ≈ g·v + (i − g·vd)
    });
    // Current-controlled sources (inside transistors): gain × the controlling diode's current,
    // which on its tangent line is g·(V(ca) − V(cb)) + (i − g·vd). The g part is a
    // transconductance stamped against the diode's nodes; the rest is a fixed current.
    controlled.forEach((f) => {
      const el = elements[f]!;
      if (el.type !== 'F') return;
      const k = diodeSlot.get(el.ctrl);
      const ctrl = elements[el.ctrl]!;
      if (k === undefined || ctrl.type !== 'D') return;
      const { i, g } = diodeEval(vd[k]!, ctrl.model);
      const gm = el.gain * g;
      const rows = [index[el.a]!, index[el.b]!];
      const cols = [index[ctrl.a]!, index[ctrl.b]!];
      rows.forEach((r, ri) => {
        if (r < 0) return;
        const sign = ri === 0 ? 1 : -1; // leaves a, enters b
        if (cols[0]! >= 0) A[r * size + cols[0]!]! += sign * gm;
        if (cols[1]! >= 0) A[r * size + cols[1]!]! -= sign * gm;
      });
      stampI(el.a, el.b, el.gain * (i - g * vd[k]!));
    });
    solveLinear(A, z, size);

    // Record currents at this solution before moving the linearisation point.
    elements.forEach((el, i) => {
      if (!active[i] || !powered[el.a]) return;
      if (el.type === 'R') currents[i] = (V(el.a, z) - V(el.b, z)) / el.ohms;
      if (el.type === 'C') currents[i] = capG(el) * (V(el.a, z) - V(el.b, z) - charge(el));
    });
    sources.forEach((s, k) => (currents[s] = z[n + k]!));

    converged = true;
    diodes.forEach((d, k) => {
      const el = elements[d]!;
      if (el.type !== 'D') return;
      const raw = V(el.a, z) - V(el.b, z);
      const { i, g } = diodeEval(vd[k]!, el.model);
      currents[d] = i + g * (raw - vd[k]!);
      const next = limitJunctionStep(raw, vd[k]!, el.model);
      const dv = Math.abs(next - vd[k]!);
      const di = Math.abs(diodeEval(next, el.model).i - i);
      const vSettled = dv <= VOLTAGE_TOLERANCE + RELATIVE_TOLERANCE * Math.abs(next);
      const iSettled = di <= CURRENT_TOLERANCE + RELATIVE_TOLERANCE * Math.abs(i);
      if (next !== raw || !(vSettled || iSettled)) converged = false;
      vd[k] = next;
    });
    controlled.forEach((f) => {
      const el = elements[f]!;
      if (el.type === 'F') currents[f] = el.gain * currents[el.ctrl]!;
    });
  }

  for (let node = 0; node < nodeCount; node++) voltages[node] = V(node, z);

  // 4. Pruned elements carry no current, so the voltage across them is 0 (or the EMF
  //    for a battery's source, or the charge a capacitor still holds). Walk back out to
  //    the leaves to give them voltages.
  for (let k = pruned.length - 1; k >= 0; k--) {
    const { element, leaf } = pruned[k]!;
    const el = elements[element]!;
    currents[element] = 0;
    const emf = el.type === 'V' ? el.volts : el.type === 'C' ? charge(el) : 0;
    voltages[leaf] = leaf === el.a ? voltages[el.b]! + emf : voltages[el.a]! - emf;
  }

  return { voltages, currents, powered, converged, iterations };
}
