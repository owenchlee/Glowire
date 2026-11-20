import { describe, expect, it } from 'vitest';
import { nextDrop } from './games';

const dark = (t: number, roll: number) => nextDrop(t, () => roll).dark;

describe('nextDrop dark chance', () => {
  it('never drops dark in the first 8 seconds, even on the luckiest roll', () => {
    expect(dark(8, 0)).toBe(false);
    expect(dark(8.01, 0)).toBe(true);
  });

  it('chance grows with time: 0.12 + t/150', () => {
    expect(dark(9, 0.17)).toBe(true);
    expect(dark(9, 0.19)).toBe(false);
  });

  it('chance is capped at 0.35', () => {
    expect(dark(100, 0.34)).toBe(true);
    expect(dark(100, 0.36)).toBe(false);
  });
});
