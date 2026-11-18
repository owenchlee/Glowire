// Time, for boards with capacitors. A capacitor's charge carries over from one moment to
// the next, so these step the circuit forward a little at a time. Pure TypeScript.

import { type Circuit, buildCircuit } from './circuit';
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
export function stepCircuit(
  board: Board,
  charges: Charges,
  dt: number,
  circuit?: Circuit, // prebuilt from this board: it doesn't depend on the charges
  only?: ReadonlySet<number>, // cells whose results are built; must include every capacitor
): { result: SimulationResult; charges: Charges } {
  const result = simulate(board, { dt, charges }, circuit, only);
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
  watch?: readonly number[], // the only cells `done` reads: the other tile results are skipped
): number | null {
  const circuit = buildCircuit(board);
  const only = watch && new Set(watch);
  const caps: number[] = [];
  board.cells.forEach((t, cell) => t?.kind === 'capacitor' && caps.push(cell));
  if (only) caps.forEach((cell) => only.add(cell));
  let now = charges;
  for (let t = dt; t <= limit + 1e-9; t += dt) {
    const result = simulate(board, { dt, charges: now }, circuit, only);
    if (done(result)) return t;
    const next: Charges = {};
    for (const cell of caps) next[cell] = result.tiles[cell]?.voltage ?? 0; // as chargesOf, without the board scan
    now = next;
  }
  return null;
}
