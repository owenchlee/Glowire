import { describe, expect, it } from 'vitest';

import {
  MASH_MS,
  chestDifficulty,
  chestGameFor,
  keyHits,
  keyPos,
  keySpeed,
  keyholeCentre,
  keyholeWidth,
  mashDrain,
  mashGain,
  mashPress,
  mashTick,
} from './chestGames';

describe('chestGameFor', () => {
  it('is deterministic and leaves about a third of chests instant', () => {
    const ids = Array.from({ length: 900 }, (_, i) => `chest-${i}`);
    const picks = ids.map((id) => chestGameFor(id, 25));
    expect(ids.map((id) => chestGameFor(id, 40))).toEqual(picks);
    for (const kind of [null, 'keyhole', 'mash'] as const) {
      const n = picks.filter((p) => p === kind).length;
      expect(n).toBeGreaterThan(220);
      expect(n).toBeLessThan(380);
    }
  });

  it('scales difficulty with sparks', () => {
    expect(chestDifficulty(5)).toBe(0);
    expect(chestDifficulty(15)).toBe(0);
    expect(chestDifficulty(27.5)).toBeCloseTo(0.5);
    expect(chestDifficulty(100)).toBe(1);
  });
});

describe('keyhole', () => {
  it('bounces the key between the ends', () => {
    expect(keyPos(0, 1)).toBe(0);
    expect(keyPos(500, 1)).toBeCloseTo(0.5);
    expect(keyPos(1000, 1)).toBeCloseTo(1);
    expect(keyPos(1500, 1)).toBeCloseTo(0.5);
    expect(keyPos(2000, 1)).toBeCloseTo(0);
    for (let t = 0; t < 10000; t += 37) {
      const p = keyPos(t, keySpeed(1));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('is faster and narrower for rich chests, and widens after misses', () => {
    expect(keySpeed(1)).toBeGreaterThan(keySpeed(0));
    expect(keyholeWidth(1, 0)).toBeLessThan(keyholeWidth(0, 0));
    expect(keyholeWidth(1, 2)).toBeGreaterThan(keyholeWidth(1, 0));
    expect(keyholeWidth(1, 99)).toBe(keyholeWidth(1, 4));
  });

  it('hits only inside the zone', () => {
    expect(keyHits(0.5, 0.5, 0.1)).toBe(true);
    expect(keyHits(0.54, 0.5, 0.1)).toBe(true);
    expect(keyHits(0.56, 0.5, 0.1)).toBe(false);
    expect(keyHits(0.44, 0.5, 0.1)).toBe(false);
    expect(keyholeCentre(0)).toBeCloseTo(0.2);
    expect(keyholeCentre(1)).toBeCloseTo(0.8);
  });
});

describe('mash', () => {
  it('fills on presses, caps at 1, drains to 0', () => {
    expect(mashPress(0, 0)).toBeCloseTo(mashGain(0));
    expect(mashPress(0.99, 0)).toBe(1);
    expect(mashTick(0.5, 1000, 0)).toBeCloseTo(0.5 - mashDrain(0));
    expect(mashTick(0.05, 5000, 1)).toBe(0);
  });

  it('can be won with a steady six presses a second at the hardest, but not by waiting', () => {
    const run = (perSecond: number, d: number) => {
      let fill = 0;
      const gap = 1000 / perSecond;
      for (let t = 0, next = 0; t < MASH_MS; t += 16) {
        fill = mashTick(fill, 16, d);
        if (t >= next) {
          fill = mashPress(fill, d);
          next += gap;
        }
        if (fill >= 1) return true;
      }
      return false;
    };
    expect(run(3, 0)).toBe(true);
    expect(run(6, 1)).toBe(true);
    expect(run(1, 1)).toBe(false);
  });
});
