import { describe, expect, it } from 'vitest';

import { parseBoard, simulate } from '../engine';
import type { Evaluation } from '../levels/evaluate';
import { HINTS, pickHint } from './hints';

const unsolved: Evaluation = {
  goals: [],
  problem: null,
  wires: 0,
  overBudget: false,
  complete: false,
};

function hintFor(rows: string[], meantDark: number[] = []) {
  const board = parseBoard(rows);
  return pickHint('intro', board, simulate(board), unsolved, false, new Set(meantDark)).text;
}

describe('hints', () => {
  it('spots batteries pushing against each other', () => {
    expect(hintFor(['┌ R220 ┐', 'B^ . Lv', 'Bv . Lv', '└ ─ ┘'])).toBe(HINTS.cancel);
  });

  it('blames the battery when the backwards LED is locked', () => {
    const board = parseBoard(['┌ R220 ┐', 'B^ . L^', '└ ─ ┘']);
    const cells = board.cells.map((t) => (t?.kind === 'led' ? { ...t, locked: true } : t));
    const b = { ...board, cells };
    expect(simulate(b).tiles.some((t) => t?.status === 'REVERSED')).toBe(true);
    expect(pickHint('intro', b, simulate(b), unsolved, false, new Set()).text).toBe(HINTS.batteryBackwards);
  });

  it('does not blame batteries for an open circuit', () => {
    expect(hintFor(['┌ R220 .', 'B^ . Lv', 'Bv . Lv', '└ ─ ┘'])).toBe('intro');
  });

  it('explains LEDs in a row that 3 V cannot light', () => {
    expect(hintFor(['┌ R220 ┐', 'B^ . Lv', '│ . Lv', '└ ─ ┘'])).toBe(HINTS.faint);
  });

  it('explains a hogged LED, unless the level wants it dark', () => {
    const rows = ['┌ R220 ┬ ┐', 'B^ . Lv Lgv', '└ ─ ┴ ┘'];
    expect(hintFor(rows)).toBe(HINTS.faint);
    expect(hintFor(rows, [1 * 4 + 3])).toBe('intro');
  });
});
