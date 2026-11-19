import { describe, expect, it } from 'vitest';
import { NEW_SAVE, recordGame, recordJob } from './save';

describe('equal-score edges', () => {
  it('a zero-score run with clear pay does not write a best of 0', () => {
    const r = recordGame(structuredClone(NEW_SAVE), 'x', 0, 1);
    expect(r.earned).toBeGreaterThan(0);
    expect(r.save.games).toEqual({});
  });

  it('matching your best leaves the games record untouched', () => {
    const save = { ...structuredClone(NEW_SAVE), games: { x: 5 } };
    const r = recordGame(save, 'x', 5, 1);
    expect(r.save.games).toBe(save.games);
  });

  it('repeating the same stars pays no star sparks and keeps the stars record', () => {
    const save = { ...structuredClone(NEW_SAVE), stars: { '1': 2 } };
    const r = recordJob(save, 1, 2);
    expect(r.save.stars).toBe(save.stars);
    expect(r.firstClear).toBe(false);
  });
});
