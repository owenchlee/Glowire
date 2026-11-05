import { describe, expect, it } from 'vitest';

import { DAY_SECONDS } from './daylight';
import { secondsSinceNightFell } from './nightClock';

describe('secondsSinceNightFell', () => {
  it('is Infinity by day', () => expect(secondsSinceNightFell(0.25)).toBe(Infinity));
  it('grows through the night', () => {
    const a = secondsSinceNightFell(0.6);
    const b = secondsSinceNightFell(0.7);
    const c = secondsSinceNightFell(0.8);
    expect(Number.isFinite(a) || Number.isFinite(b)).toBe(true);
    expect(b).toBeGreaterThan(0);
    expect(c).toBeGreaterThan(b);
    expect(c).toBeLessThan(DAY_SECONDS);
  });
});
