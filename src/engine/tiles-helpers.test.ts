import { describe, expect, it } from 'vitest';

import { battery, changeover, getChangeoverPorts, isTwoTerminal, rotateDirection, switchTile, wire, block, led, meter } from './tiles';
import { DIRECTION_NAMES, DIRECTIONS, E, N, S, W } from './types';

describe('tile helpers', () => {
  it('rotateDirection turns clockwise and wraps', () => {
    expect(rotateDirection(N, 0)).toBe(N);
    expect(rotateDirection(N, 1)).toBe(E);
    expect(rotateDirection(E, 2)).toBe(W);
    expect(rotateDirection(W, 1)).toBe(N);
    expect(rotateDirection(S, 3)).toBe(E);
  });

  it('DIRECTION_NAMES lines up with DIRECTIONS', () => {
    expect(DIRECTIONS.map((d) => DIRECTION_NAMES[d])).toEqual(['N', 'E', 'S', 'W']);
  });

  it('getChangeoverPorts rotates all three ports together', () => {
    const base = getChangeoverPorts(changeover(true, 0));
    const turned = getChangeoverPorts(changeover(true, 1));
    expect(new Set(base).size).toBe(3);
    expect(turned).toEqual(base.map((p) => rotateDirection(p, 1)));
  });

  it('switchTile builds an open switch by default and honours args', () => {
    expect(switchTile()).toEqual({ kind: 'switch', closed: false, rotation: 0 });
    expect(switchTile(true, 2)).toEqual({ kind: 'switch', closed: true, rotation: 2 });
  });

  it('isTwoTerminal is true only for two-port parts', () => {
    for (const t of [battery(), led(), switchTile(), meter()]) expect(isTwoTerminal(t)).toBe(true);
    for (const t of [wire('straight'), block(), changeover()]) expect(isTwoTerminal(t)).toBe(false);
  });
});
