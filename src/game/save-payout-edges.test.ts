import { describe, expect, it } from 'vitest';
import { NEW_SAVE, recordGame, recordJob } from './save';

const fresh = () => structuredClone(NEW_SAVE);

describe('payout edges', () => {
  it('pays nothing and is not a first clear for a zero-star job on a new level', () => {
    const save = fresh();
    const r = recordJob(save, 1, 0);
    expect(r.save).toBe(save);
    expect(r.earned).toBe(0);
    expect(r.firstClear).toBe(false);
  });

  it('pays nothing and is not a first clear for a zero score with no stars', () => {
    const save = fresh();
    const r = recordGame(save, 'x', 0);
    expect(r.save).toBe(save);
    expect(r.earned).toBe(0);
    expect(r.firstClear).toBe(false);
  });

  it('a first zero-score run that still earns clear pay is not a first clear', () => {
    const r = recordGame(fresh(), 'x', 0, 1);
    expect(r.earned).toBeGreaterThan(0);
    expect(r.firstClear).toBe(false);
  });

  it('a first positive score is a first clear; beating a best is not', () => {
    const first = recordGame(fresh(), 'x', 4);
    expect(first.firstClear).toBe(true);
    expect(first.save.games.x).toBe(4);
    const again = recordGame(first.save, 'x', 6);
    expect(again.firstClear).toBe(false);
    expect(again.earned).toBe(6);
  });

  it('a tied score earns no record pay and keeps the best', () => {
    const first = recordGame(fresh(), 'x', 4);
    const tie = recordGame(first.save, 'x', 4);
    expect(tie.earned).toBe(0);
    expect(tie.save).toBe(first.save);
  });
});
