import { describe, expect, it } from 'vitest';

import { LED_MODELS } from '../engine';
import { needleQuestion } from './games';

function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('needleQuestion safety', () => {
  it('every resistor reads distinct, above 0.3 mA and below the lamp limit', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const random = lcg(seed);
      for (let round = 0; round < 10; round++) {
        const q = needleQuestion(round, random);
        const values = Object.values(q.readings);
        const limit = LED_MODELS[q.lamp].maxCurrent * 1000;
        expect(new Set(values.map((v) => Math.round(v))).size).toBe(values.length);
        for (const v of values) {
          expect(v).toBeLessThan(limit);
          expect(v).toBeGreaterThan(0.3);
        }
      }
    }
  });
});
