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
  return pickHint('intro', board, simulate(board), unsolved, null, new Set(meantDark)).text;
}

describe('hints', () => {
  it('spots batteries pushing against each other', () => {
    expect(hintFor(['┌ R220 ┐', 'B^ . Lv', 'Bv . Lv', '└ ─ ┘'])).toBe(HINTS.cancel);
  });

  it('does not blame batteries for an open circuit', () => {
    expect(hintFor(['┌ R220 .', 'B^ . Lv', 'Bv . Lv', '└ ─ ┘'])).toBe(HINTS.unlinked);
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

describe('brightness hint', () => {
  it('gives the mA and the band when a lit LED is too dim', () => {
    const board = parseBoard(['┌ R220 ┐', 'B^ . Lv', '└ ─ ┘']);
    const evaluation: Evaluation = {
      ...unsolved,
      goals: [{ goal: { kind: 'lit', led: 'A', brightness: 'medium' }, met: false, mA: 1.13 }],
    };
    expect(pickHint('intro', board, simulate(board), evaluation, null, new Set()).text).toBe(
      'An LED glows at 1.1 mA, but this goal wants 4–8.4 mA. Too dim: take out some resistance.',
    );
  });
});
