import { describe, expect, it } from 'vitest';

import { simulate } from './simulate';
import { parseBoard } from './test-helpers';
import type { SimulationResult, TileResult } from './types';

const only = (r: SimulationResult, kind: TileResult['kind']) => r.tiles.find((t) => t?.kind === kind)!;

/** The staircase light: two changeover switches joined by two "traveller" wires. */
const staircase = (s1: 'u' | 'd', s2: 'u' | 'd') =>
  parseBoard([
    '.  ┌    ─ ┐      .',
    `┌  C${s1}   . C${s2}2   ┐`,
    '│  └    ─ ┘      │',
    'B^ .    . .      │',
    '└  ─    L< R100  ┘',
  ]);

describe('changeover switch', () => {
  it('makes a staircase light: either switch flips the lamp', () => {
    const lit = (a: 'u' | 'd', b: 'u' | 'd') => only(simulate(staircase(a, b)), 'led').status === 'OK';
    // With S2 turned round, "up" on S2 joins the bottom traveller: the lamp is on when they differ.
    expect(lit('u', 'd')).toBe(true);
    expect(lit('d', 'u')).toBe(true);
    expect(lit('u', 'u')).toBe(false);
    expect(lit('d', 'd')).toBe(false);
  });

  it('carries the full current through its common terminal', () => {
    const r = simulate(staircase('u', 'd'));
    const led = only(r, 'led');
    const switches = r.tiles.filter((t) => t?.kind === 'changeover');
    for (const s of switches) expect(s!.current).toBeCloseTo(led.current, 6);
  });
});

describe('meters', () => {
  it('an ammeter in the loop reads the LED current and changes nothing', () => {
    const plain = only(simulate(parseBoard(['┌ B< R100 ┐', '└ L>  ─   ┘'])), 'led').current;
    const r = simulate(parseBoard(['┌ B< R100 ┐', '└ L>  MA  ┘']));
    const meter = only(r, 'meter');
    expect(Math.abs(meter.current)).toBeCloseTo(plain, 5);
    expect(only(r, 'led').current).toBeCloseTo(plain, 5);
    expect(meter.status).toBe('OK');
  });

  it('a voltmeter across a resistor reads I × R and draws nothing', () => {
    // The voltmeter hangs under the resistor, joined to both its ends.
    const r = simulate(
      parseBoard([
        '┌ B< ┬    R100 ┬ ┐',
        '│ .  └    MV   ┘ │',
        '└ ─  ─    L>   ─ ┘',
      ]),
    );
    const led = only(r, 'led');
    const v = only(r, 'meter');
    expect(Math.abs(v.voltage)).toBeCloseTo(led.current * 100, 2);
    expect(Math.abs(v.current)).toBeLessThan(1e-8);
    expect(v.status).toBe('OK');
  });
});
