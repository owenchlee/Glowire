// A level's known solution, and the helpers built on it: par turns for twist jobs, and the
// pets' abilities (Scout fixes one piece, Hoot crosses out unneeded parts). Pure TypeScript.

import { type BoardState, setCell } from '../board/board';
import {
  type Direction,
  type Tile,
  getPorts,
  getTerminals,
  isTwoTerminal,
  neighbourIndex,
  opposite,
  parseBoard,
  rotateTile,
} from '../engine';
import { createLevelBoard, partKey, remainingParts } from './evaluate';
import type { LevelDef, PartKey } from './types';

/** The solution picture: `solution`, or for twist levels the drawn board itself. */
export function solutionPicture(level: LevelDef): string[] | null {
  return level.solution ?? (level.twist ? level.board : null);
}

/** The solution's tiles by cell, or null when the level has none. */
export function solutionTiles(level: LevelDef): (Tile | null)[] | null {
  const picture = solutionPicture(level);
  return picture ? [...parseBoard(picture).cells] : null;
}

const portKey = (t: Tile) => [...getPorts(t)].sort().join();

/** Do two tiles do the same job in the circuit (same part, same connections, same polarity)? */
export function sameJob(a: Tile | null | undefined, b: Tile | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'wire' || a.kind === 'block') return portKey(a) === portKey(b);
  if (a.kind === 'resistor' && b.kind === 'resistor' && a.ohms !== b.ohms) return false;
  if (a.kind === 'led' && b.kind === 'led' && a.color !== b.color) return false;
  if (a.kind === 'battery' && b.kind === 'battery' && a.volts !== b.volts) return false;
  if (!isTwoTerminal(a) || !isTwoTerminal(b)) return false;
  // Resistors and switches work either way round; LEDs and batteries don't.
  if (a.kind === 'resistor' || a.kind === 'switch') return portKey(a) === portKey(b);
  const [pa, ma] = getTerminals(a);
  const [pb, mb] = getTerminals(b);
  return pa === pb && ma === mb;
}

/** Quarter turns (clockwise taps) that make `tile` do `want`'s job, or null if none can. */
export function turnsToMatch(tile: Tile, want: Tile): number | null {
  let t = tile;
  for (let n = 0; n < 4; n++) {
    if (sameJob(t, want)) return n;
    t = rotateTile(t);
  }
  return null;
}

/** Twist levels: the taps needed to turn the starting scramble into the drawn picture. */
export function parTurns(level: LevelDef): number {
  const want = solutionTiles(level);
  if (!want) return 0;
  const start = createLevelBoard(level);
  return start.cells.reduce((sum, placed, cell) => {
    if (!placed?.tile.spin) return sum;
    return sum + (turnsToMatch(placed.tile, want[cell]!) ?? 0);
  }, 0);
}

/**
 * Solution cells in the order current follows them from the battery, so hints walk along
 * the circuit instead of jumping around the board.
 */
function circuitOrder(level: LevelDef, want: (Tile | null)[]): number[] {
  const { width, height } = parseBoard(level.board);
  const size = { width, height };
  const start = want.findIndex((t) => t?.kind === 'battery');
  const order: number[] = [];
  const seen = new Set<number>();
  const queue = start >= 0 ? [start] : [];
  while (queue.length) {
    const cell = queue.shift()!;
    if (seen.has(cell)) continue;
    seen.add(cell);
    order.push(cell);
    for (const d of getPorts(want[cell]!) as Direction[]) {
      const n = neighbourIndex(size, cell, d);
      if (n >= 0 && want[n] && getPorts(want[n]!).includes(opposite(d))) queue.push(n);
    }
  }
  // Anything not joined to a battery (decoys in twist levels) comes last.
  want.forEach((t, cell) => t && !seen.has(cell) && order.push(cell));
  return order;
}

export interface DigResult {
  board: BoardState;
  cell: number;
}

/**
 * Scout's dig: fix the first piece (along the circuit) that doesn't match the solution.
 * Twist levels turn the piece; other levels put the solution's tile in the cell, taking a
 * misplaced copy of that part off the board if the tray has run out. Null if nothing to fix.
 */
export function dig(level: LevelDef, state: BoardState): DigResult | null {
  const want = solutionTiles(level);
  if (!want) return null;
  for (const cell of circuitOrder(level, want)) {
    const target = want[cell]!;
    const placed = state.cells[cell];
    if (sameJob(placed?.tile, target)) continue;

    if (level.twist) {
      if (!placed?.tile.spin) continue;
      const n = turnsToMatch(placed.tile, target);
      if (!n) continue;
      let tile = placed.tile;
      for (let i = 0; i < n; i++) tile = rotateTile(tile);
      return { board: setCell(state, cell, tile), cell };
    }

    if (placed?.tile.locked) {
      // A locked part in the right place but turned wrong can't be fixed; skip it.
      continue;
    }
    let board = state;
    const key = partKey(target);
    if (key && (remainingParts(level, board)[key] ?? 0) <= 0) {
      const spare = board.cells.findIndex(
        (p, i) => p && !p.tile.locked && partKey(p.tile) === key && !sameJob(p.tile, want[i]),
      );
      if (spare < 0) continue;
      board = setCell(board, spare, null);
    }
    return { board: setCell(board, cell, { ...target, locked: false }), cell };
  }
  // Every solution piece is in place: clear away anything left over (like a short).
  if (!level.twist) {
    const junk = state.cells.findIndex((p, i) => p && !p.tile.locked && !want[i]);
    if (junk >= 0) return { board: setCell(state, junk, null), cell: junk };
  }
  return null;
}

/** Hoot's wise eye: how many of each tray part the solution doesn't use. */
export function unneededParts(level: LevelDef): Partial<Record<PartKey, number>> {
  const want = solutionTiles(level);
  if (!want) return {};
  const start = createLevelBoard(level);
  const used: Partial<Record<PartKey, number>> = {};
  want.forEach((t, cell) => {
    if (!t || start.cells[cell]?.tile.locked) return;
    const key = partKey(t);
    if (key) used[key] = (used[key] ?? 0) + 1;
  });
  const spare: Partial<Record<PartKey, number>> = {};
  for (const [key, count] of Object.entries(level.inventory) as [PartKey, number][]) {
    const extra = count - (used[key] ?? 0);
    if (extra > 0) spare[key] = extra;
  }
  return spare;
}
