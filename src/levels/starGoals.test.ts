import { describe, expect, it } from 'vitest';

import { wireCount } from '../board/board';
import { createLevelBoard } from './evaluate';
import { getLevel } from './levels';
import { FRESH_RECORD, placedParts, starGoalMet } from './stars';
import { BRIGHTNESS } from './types';

describe('star goals', () => {
  const level = getLevel(1)!;
  const board = createLevelBoard(level);

  it('a fresh record is spotless', () => {
    expect(FRESH_RECORD).toEqual({ burned: false, helped: false, turns: 0 });
  });

  it('placedParts ignores locked parts, wires and blocks', () => {
    const count = placedParts(board);
    const expected = board.cells.filter(
      (p) => p && !p.tile.locked && p.tile.kind !== 'wire' && p.tile.kind !== 'block',
    ).length;
    expect(count).toBe(expected);
    expect(placedParts({ ...board, cells: board.cells.map(() => null) })).toBe(0);
  });

  it('record-based goals read the record', () => {
    const met = (goal: Parameters<typeof starGoalMet>[0], record = FRESH_RECORD) =>
      starGoalMet(goal, level, board, record);
    expect(met({ kind: 'safe' })).toBe(true);
    expect(met({ kind: 'safe' }, { ...FRESH_RECORD, burned: true })).toBe(false);
    expect(met({ kind: 'solo' })).toBe(true);
    expect(met({ kind: 'solo' }, { ...FRESH_RECORD, helped: true })).toBe(false);
    expect(met({ kind: 'turns', max: 3 }, { ...FRESH_RECORD, turns: 3 })).toBe(true);
    expect(met({ kind: 'turns', max: 3 }, { ...FRESH_RECORD, turns: 4 })).toBe(false);
  });

  it('board-based goals compare against the limit', () => {
    const wires = wireCount(board);
    const parts = placedParts(board);
    expect(starGoalMet({ kind: 'wire', max: wires }, level, board, FRESH_RECORD)).toBe(true);
    expect(starGoalMet({ kind: 'wire', max: wires - 1 }, level, board, FRESH_RECORD)).toBe(false);
    expect(starGoalMet({ kind: 'parts', max: parts }, level, board, FRESH_RECORD)).toBe(true);
    expect(starGoalMet({ kind: 'parts', max: parts - 1 }, level, board, FRESH_RECORD)).toBe(false);
  });

  it('a goal star is met only when that goal holds on the board', () => {
    // The untouched starting board has no lit LED yet.
    const lit = { kind: 'lit', led: 'A', brightness: 'bright' } as const;
    expect(starGoalMet({ kind: 'goal', goal: lit }, level, board, FRESH_RECORD)).toBe(false);
  });
});

describe('BRIGHTNESS bands', () => {
  it('are ordered, non-overlapping steps within 0..1', () => {
    expect(BRIGHTNESS.dim.max).toBeLessThan(BRIGHTNESS.medium.min);
    expect(BRIGHTNESS.medium.max).toBeLessThan(BRIGHTNESS.bright.min);
    expect(BRIGHTNESS.bright.max).toBe(1);
    expect(BRIGHTNESS.any).toMatchObject({ min: 0, max: 1, word: '' });
  });
});
