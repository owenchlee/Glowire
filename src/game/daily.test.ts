import { describe, expect, it } from 'vitest';

import { createLevelBoard, evaluateLevel } from '../levels/evaluate';
import { dig, parTurns } from '../levels/solution';
import { DAILY_ID_BASE, TIERS, dailyLevel, weekdayIndex } from './daily';
import { dayKey } from './save';

/** Every day for a while, starting on a Monday. */
const DAYS = Array.from({ length: 400 }, (_, i) => dayKey(new Date(2026, 9, 5 + i)));

describe('daily blackout', () => {
  it('knows the weekday', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0); // Monday
    expect(weekdayIndex('2026-10-11')).toBe(6); // Sunday
  });

  it('is the same job for everyone on the same day, and new every day', () => {
    expect(dailyLevel('2026-10-08')).toEqual(dailyLevel('2026-10-08'));
    const boards = new Set(DAYS.slice(0, 60).map((d) => dailyLevel(d).board.join('/')));
    expect(boards.size).toBe(60);
    expect(dailyLevel('2026-01-01').id).toBe(DAILY_ID_BASE);
  });

  it('every day for 400 days: solvable, scrambled, and sized for its weekday', () => {
    for (const day of DAYS) {
      const level = dailyLevel(day);
      const tier = TIERS[weekdayIndex(day)]!;
      expect(level.board, day).toHaveLength(tier.height);
      expect(level.board[0]!.split(/\s+/), day).toHaveLength(tier.width);
      const solved = createLevelBoard({ ...level, twist: undefined });
      expect(evaluateLevel(level, solved).complete, day).toBe(true);
      const start = createLevelBoard(level);
      expect(evaluateLevel(level, start).complete, day).toBe(false);
      // A real puzzle: plenty of turning to do.
      expect(parTurns(level), day).toBeGreaterThanOrEqual(8);
    }
  });

  it('Scout can always dig a daily job out', () => {
    for (const day of DAYS.slice(0, 30)) {
      const level = dailyLevel(day);
      let board = createLevelBoard(level);
      for (let next = dig(level, board); next; next = dig(level, board)) board = next.board;
      expect(evaluateLevel(level, board).complete, day).toBe(true);
    }
  });

  it('weekend jobs have a switch that must turn every LED off', () => {
    const sunday = dailyLevel('2026-10-11');
    expect(sunday.board.join(' ')).toMatch(/S0/);
    expect(sunday.goals).toHaveLength(2);
  });
});
