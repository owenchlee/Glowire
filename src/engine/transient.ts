// Time, for boards with capacitors. A capacitor's charge carries over from one moment to
// the next, so these step the circuit forward a little at a time. Pure TypeScript.

import { simulate } from './simulate';
import type { Board, SimulationResult } from './types';

/** Each capacitor's voltage (+ end minus − end), by board cell. */
export type Charges = Record<number, number>;

export const hasCapacitors = (board: Board) => board.cells.some((t) => t?.kind === 'capacitor');

/** The capacitors' voltages in a result. */
export function chargesOf(board: Board, result: SimulationResult): Charges {
  const charges: Charges = {};
  board.cells.forEach((t, cell) => {
    if (t?.kind === 'capacitor') charges[cell] = result.tiles[cell]?.voltage ?? 0;
  });
  return charges;
}

/** The board left alone for a long time: every capacitor charged as far as it will go. */
export function settledCharges(board: Board): Charges {
  return chargesOf(board, simulate(board));
}

/** The board `dt` seconds on from these charges: what it looks like, and the new charges. */
export function stepCircuit(board: Board, charges: Charges, dt: number): { result: SimulationResult; charges: Charges } {
  const result = simulate(board, { dt, charges });
  return { result, charges: chargesOf(board, result) };
}

/** How finely evaluate.ts slices time when it times a lamp. */
export const TIME_STEP = 0.02;

/**
 * Start from `charges` on `board` and let time run (up to `limit` seconds) until `done`
 * says so. Returns the time it took, or null if it never happened.
 */
export function timeUntil(
  board: Board,
  charges: Charges,
  done: (result: SimulationResult) => boolean,
  limit: number,
  dt = TIME_STEP,
): number | null {
  let now = charges;
  for (let t = dt; t <= limit + 1e-9; t += dt) {
    const step = stepCircuit(board, now, dt);
    if (done(step.result)) return t;
    now = step.charges;
  }
  return null;
}
