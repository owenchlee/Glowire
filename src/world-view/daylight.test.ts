import { describe, expect, it } from 'vitest';

import { ambientColor, clockText, currentPhase, dayLevel, daylight, setDayOverride, wrapPhase } from './daylight';

const NIGHT: [number, number, number] = [0.42, 0.45, 0.68];
const lum = (c: readonly number[]) => c[0]! * 0.3 + c[1]! * 0.59 + c[2]! * 0.11;

describe('daylight', () => {
  it('wraps phases', () => {
    expect(wrapPhase(1.25)).toBeCloseTo(0.25);
    expect(wrapPhase(-0.25)).toBeCloseTo(0.75);
  });

  it('is brightest at noon and darkest at midnight', () => {
    expect(lum(ambientColor(0.25, NIGHT))).toBeGreaterThan(lum(ambientColor(0.75, NIGHT)) + 0.3);
    expect(ambientColor(0.75, NIGHT)).toEqual(NIGHT);
  });

  it('is warm at dawn and orange at dusk', () => {
    for (const p of [0, 0.5]) {
      const c = ambientColor(p, NIGHT);
      expect(c[0]).toBeGreaterThan(c[2]);
    }
  });

  it('is continuous across the wrap and between keys', () => {
    let prev = ambientColor(0, NIGHT);
    for (let i = 1; i <= 1000; i++) {
      const c = ambientColor(i / 1000, NIGHT);
      for (let k = 0; k < 3; k++) expect(Math.abs(c[k]! - prev[k]!)).toBeLessThan(0.05);
      prev = c;
    }
    const a = ambientColor(0.9999, NIGHT);
    const b = ambientColor(0, NIGHT);
    for (let k = 0; k < 3; k++) expect(Math.abs(a[k]! - b[k]!)).toBeLessThan(0.01);
  });

  it('lamps are strongest at night, faint by day', () => {
    expect(daylight(0.75).lamp).toBeCloseTo(1);
    expect(daylight(0.25).lamp).toBeLessThan(0.2);
    expect(daylight(0.5).lamp).toBeGreaterThan(daylight(0.25).lamp);
  });

  it('shows stars and fireflies only after dark, birds only by day', () => {
    expect(daylight(0.75).stars).toBe(true);
    expect(daylight(0.25).stars).toBe(false);
    expect(daylight(0.75).fireflies).toBeGreaterThan(0.9);
    expect(daylight(0.25).fireflies).toBe(0);
    expect(daylight(0.25).birds).toBeGreaterThan(0.9);
    expect(daylight(0.75).birds).toBe(0);
    expect(daylight(0.55).fireflies).toBeGreaterThan(0);
  });

  it('keeps day level within 0..1 and calls midnight night', () => {
    for (let i = 0; i <= 200; i++) {
      const d = dayLevel(i / 200);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
    expect(daylight(0.75).night).toBe(true);
    expect(daylight(0.25).night).toBe(false);
  });

  it('formats a clock and honours the override', () => {
    expect(clockText(0)).toBe('06:00');
    expect(clockText(0.25)).toBe('12:00');
    expect(clockText(0.75)).toBe('00:00');
    setDayOverride('night');
    expect(currentPhase()).toBe(0.75);
    setDayOverride(null);
    expect(currentPhase()).toBeCloseTo(0.5, 1);
  });
});
