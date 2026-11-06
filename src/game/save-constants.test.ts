import { describe, expect, it } from 'vitest';

import {
  DAILY_BASE,
  DAILY_STREAK_BONUS,
  GAME_SPARKS_PER_POINT,
  NEW_SAVE,
  STAR_SPARKS,
  recordDaily,
  recordGame,
  sparksForStars,
  totalStars,
  withPetBonus,
} from './save';

const fresh = () => structuredClone(NEW_SAVE);

describe('save payout constants', () => {
  it('STAR_SPARKS drives sparksForStars star by star', () => {
    expect(STAR_SPARKS).toEqual([10, 10, 15]);
    expect(sparksForStars(0, 3)).toBe(STAR_SPARKS.reduce((a, b) => a + b, 0));
    expect(sparksForStars(2, 3)).toBe(STAR_SPARKS[2]);
  });

  it('first daily clear pays base plus one streak day', () => {
    const r = recordDaily(fresh(), '2026-11-05', 1);
    expect(r.earned).toBe(STAR_SPARKS[0] + DAILY_BASE + DAILY_STREAK_BONUS);
  });

  it('streak bonus is capped at seven days', () => {
    const save = { ...fresh(), daily: { last: '2026-11-04', streak: 20, best: 20, stars: {} } };
    const r = recordDaily(save, '2026-11-05', 1);
    expect(r.earned).toBe(STAR_SPARKS[0] + DAILY_BASE + DAILY_STREAK_BONUS * 7);
  });

  it('mini-game sparks scale by GAME_SPARKS_PER_POINT', () => {
    expect(recordGame(fresh(), 'x', 4).earned).toBe(4 * GAME_SPARKS_PER_POINT);
  });
});

describe('withPetBonus', () => {
  it('only Penny multiplies sparks, rounding to a whole number', () => {
    const penny = { ...fresh(), equipped: { ...fresh().equipped, pet: 'penny' } };
    expect(withPetBonus(penny, 10)).toBe(15);
    expect(withPetBonus(penny, 5)).toBe(8);
    expect(withPetBonus(fresh(), 10)).toBe(10);
  });
});

describe('totalStars', () => {
  it('sums best stars across jobs', () => {
    expect(totalStars(fresh())).toBe(0);
    expect(totalStars({ ...fresh(), stars: { '1': 3, '2': 1, '7': 2 } })).toBe(6);
  });
});
