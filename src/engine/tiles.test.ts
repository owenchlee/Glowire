import { describe, expect, it } from 'vitest';

import { parseBoard } from './test-helpers';
import { battery, getPorts, getTerminals, isConnected, led, rotateTile, wire } from './tiles';
import { E, N, S, W } from './types';

describe('tiles', () => {
  it('11. rotating any tile four times returns the original ports', () => {
    for (const tile of [
      wire('straight'),
      wire('corner', 1),
      wire('tee', 2),
      wire('cross'),
      led(3),
      battery(1),
    ]) {
      const turned = rotateTile(rotateTile(rotateTile(rotateTile(tile))));
      expect(turned).toEqual(tile);
      expect(getPorts(turned)).toEqual(getPorts(tile));
    }
  });

  it('rotation turns ports clockwise', () => {
    expect(getPorts(wire('corner'))).toEqual([N, E]);
    expect(getPorts(rotateTile(wire('corner')))).toEqual([E, S]);
    expect(getTerminals(led(0))).toEqual([W, E]);
    expect(getTerminals(rotateTile(led(0)))).toEqual([N, S]);
  });

  it('neighbours connect only when both have a port on the shared edge', () => {
    const b = parseBoard(['─ ─ │', '. . .']);
    expect(isConnected(b, 0, E)).toBe(true);
    expect(isConnected(b, 1, E)).toBe(false); // │ has no W port
    expect(isConnected(b, 0, W)).toBe(false); // board edge
    expect(isConnected(b, 2, S)).toBe(false); // empty cell
  });
});
