import { describe, expect, it } from 'vitest';

import { solveLinear } from './linear';

describe('solveLinear', () => {
  it('solves a 2x2 system', () => {
    // 2x + y = 5, x + 3y = 10 -> x = 1, y = 3
    const b = Float64Array.of(5, 10);
    solveLinear(Float64Array.of(2, 1, 1, 3), b, 2);
    expect(b[0]).toBeCloseTo(1, 12);
    expect(b[1]).toBeCloseTo(3, 12);
  });

  it('pivots when the leading entry is zero', () => {
    // y = 4, x + y = 7 -> x = 3, y = 4
    const b = Float64Array.of(4, 7);
    solveLinear(Float64Array.of(0, 1, 1, 1), b, 2);
    expect(b[0]).toBeCloseTo(3, 12);
    expect(b[1]).toBeCloseTo(4, 12);
  });

  it('solves a 3x3 system', () => {
    // x + y + z = 6, 2y + 5z = -4, 2x + 5y - z = 27 -> 5, 3, -2
    const b = Float64Array.of(6, -4, 27);
    solveLinear(Float64Array.of(1, 1, 1, 0, 2, 5, 2, 5, -1), b, 3);
    expect(Array.from(b)).toEqual([
      expect.closeTo(5, 10),
      expect.closeTo(3, 10),
      expect.closeTo(-2, 10),
    ]);
  });

  it('throws on a singular matrix', () => {
    expect(() => solveLinear(Float64Array.of(1, 2, 2, 4), Float64Array.of(1, 2), 2)).toThrow(
      /singular/,
    );
  });
});
