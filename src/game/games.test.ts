import { describe, expect, it } from 'vitest';

import { bandsOf, colourQuestion, formatOhms, ohmsOf, rng, signalPattern } from './games';
import { NEW_SAVE, recordGame } from './save';

describe('colour code', () => {
  it('reads bands the way electricians do', () => {
    expect(bandsOf(1000)).toEqual([1, 0, 2]); // brown, black, red
    expect(bandsOf(220)).toEqual([2, 2, 1]); // red, red, brown
    expect(bandsOf(4700)).toEqual([4, 7, 2]);
    expect(bandsOf(10)).toEqual([1, 0, 0]);
    for (const v of [10, 47, 100, 220, 470, 1000, 33000, 820000]) expect(ohmsOf(bandsOf(v))).toBe(v);
    expect(formatOhms(4700)).toBe('4.7 kΩ');
    expect(formatOhms(220)).toBe('220 Ω');
  });

  it('always offers four different answers, exactly one of them right', () => {
    const random = rng(5);
    for (let round = 0; round < 200; round++) {
      const q = colourQuestion(round % 12, random);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices.filter((c) => c === q.ohms)).toHaveLength(1);
      expect(ohmsOf(q.bands)).toBe(q.ohms);
    }
  });
});

describe('signal lamp', () => {
  it('never flashes one colour three times running', () => {
    const p = signalPattern(500, rng(9));
    for (let i = 2; i < p.length; i++) expect(p[i] === p[i - 1] && p[i] === p[i - 2]).toBe(false);
  });
});

describe('mini-game rewards', () => {
  it('pays only for beating your best', () => {
    const first = recordGame(NEW_SAVE, 'signal', 5);
    expect(first.earned).toBe(15);
    expect(recordGame(first.save, 'signal', 4).earned).toBe(0);
    expect(recordGame(first.save, 'signal', 7).earned).toBe(6);
  });
});
