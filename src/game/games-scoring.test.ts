import { describe, expect, it } from 'vitest';

import {
  BAND_NAMES,
  COLOUR_ROUNDS,
  COLOUR_TIME,
  SEA_ANSWERS_AT,
  SIGNAL_COLOURS,
  bandsOf,
  colourPoints,
  flashMs,
  rng,
  signalPattern,
} from './games';

describe('colour code scoring', () => {
  it('gives nothing for a wrong answer, however fast', () => {
    expect(colourPoints(false, COLOUR_TIME)).toBe(0);
  });

  it('gives a bonus point only in the first half of the time', () => {
    expect(colourPoints(true, COLOUR_TIME)).toBe(2);
    expect(colourPoints(true, COLOUR_TIME / 2 + 0.1)).toBe(2);
    expect(colourPoints(true, COLOUR_TIME / 2)).toBe(1);
    expect(colourPoints(true, 0)).toBe(1);
  });

  it('has a perfect game worth twice the number of rounds', () => {
    expect(COLOUR_ROUNDS * colourPoints(true, COLOUR_TIME)).toBe(COLOUR_ROUNDS * 2);
  });

  it('names one band colour per digit', () => {
    expect(BAND_NAMES).toHaveLength(10);
    expect(new Set(BAND_NAMES).size).toBe(10);
    expect(BAND_NAMES[bandsOf(220)[0]]).toBe('red');
    expect(BAND_NAMES[bandsOf(4700)[1]]).toBe('violet');
  });
});

describe('signal lamp timing', () => {
  it('flashes quicker as the pattern grows, never below the floor', () => {
    expect(flashMs(1)).toBe(590);
    expect(flashMs(5)).toBeLessThan(flashMs(2));
    expect(flashMs(11)).toBe(290);
    expect(flashMs(12)).toBe(260);
    expect(flashMs(100)).toBe(260);
  });

  it('only uses the four signal colours and avoids triples', () => {
    expect(SIGNAL_COLOURS).toEqual(['red', 'green', 'blue', 'gold']);
    const pattern = signalPattern(SEA_ANSWERS_AT * 4, rng(7));
    for (const c of pattern) expect(SIGNAL_COLOURS).toContain(c);
    pattern.forEach((c, i) => {
      if (i >= 2) expect(!(pattern[i - 1] === c && pattern[i - 2] === c)).toBe(true);
    });
  });

  it('is reachable: the sea answers at a length the game can show', () => {
    expect(Number.isInteger(SEA_ANSWERS_AT)).toBe(true);
    expect(flashMs(SEA_ANSWERS_AT)).toBeGreaterThan(260);
  });
});
