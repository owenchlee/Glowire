import { describe, expect, it } from 'vitest';

import { colourQuestion, formatOhms, rng, signalPattern } from './games';

const constant = (v: number) => () => v;
const sequence = (values: number[], rest: number) => {
  let i = 0;
  return () => values[i++] ?? rest;
};

describe('formatOhms boundaries', () => {
  it('switches unit exactly at 1000 and 1e6', () => {
    expect(formatOhms(999)).toBe('999 Ω');
    expect(formatOhms(1000)).toBe('1 kΩ');
    expect(formatOhms(4700)).toBe('4.7 kΩ');
    expect(formatOhms(999000)).toBe('999 kΩ');
    expect(formatOhms(1e6)).toBe('1 MΩ');
    expect(formatOhms(2.2e6)).toBe('2.2 MΩ');
  });
});

describe('colourQuestion wrong answers', () => {
  it('offers the usual mistakes: extra zero, digits swapped', () => {
    const q = colourQuestion(0, constant(0.5)); // 470 ohms
    expect(q.ohms).toBe(470);
    expect([...q.choices].sort((a, b) => a - b)).toEqual([47, 470, 740, 4700]);
  });

  it('drops a missing zero and does not swap equal digits', () => {
    const q = colourQuestion(0, constant(0.25)); // 220 ohms
    expect(q.ohms).toBe(220);
    expect(q.choices).toContain(2200);
    expect(q.choices).toContain(22);
  });

  it('always gives four distinct choices including the right one', () => {
    for (let seed = 1; seed < 200; seed++) {
      const q = colourQuestion(seed % 12, rng(seed));
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(q.ohms);
      expect(q.choices.every((c) => c >= 1)).toBe(true);
    }
  });
});

describe('signalPattern repeat rule', () => {
  it('refuses a third identical colour in a row', () => {
    // red, red, then red again is rejected and the next draw (green) is used
    expect(signalPattern(3, sequence([0, 0, 0, 0.3], 0.3))).toEqual(['red', 'red', 'green']);
  });

  it('allows a repeat when the two before are not both the same', () => {
    expect(signalPattern(3, sequence([0, 0.3, 0], 0.6))).toEqual(['red', 'green', 'red']);
  });
});
