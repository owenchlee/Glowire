import { describe, expect, it } from 'vitest';
import { NEW_SAVE, isUnlocked, migrate } from './save';

describe('migrate and unlock edges', () => {
  it('a v1 save keeps job 0 as solved', () => {
    expect(migrate({ version: 1, completed: [0, 3] }).stars).toEqual({ '0': 1, '3': 1 });
  });

  it('keeps a 1-star rating and drops 0 and 4', () => {
    const s = migrate({ stars: { '1': 1, '2': 0, '3': 4 } });
    expect(s.stars).toEqual({ '1': 1 });
  });

  it('daily stars need a real day: month 13 is dropped even if the day number fits', () => {
    const daily = { stars: { '2026-13-05': 2, '2026-02-05': 3 } };
    const s = migrate({ daily });
    expect(s.daily.stars).toEqual({ '2026-02-05': 3 });
  });

  it('the first job in order is open with no stars', () => {
    const save = structuredClone(NEW_SAVE);
    expect(isUnlocked(save, [5, 6], 5)).toBe(true);
    expect(isUnlocked(save, [5, 6], 6)).toBe(false);
  });
});
