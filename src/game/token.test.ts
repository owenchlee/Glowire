import { describe, expect, it } from 'vitest';

import { parseToken } from '../engine/parse';
import { battery, block, changeover, diode, getPorts, led, meter, resistor, switchTile, wire } from '../engine/tiles';
import type { Tile } from '../engine/types';
import { tileToken } from './daily';

describe('parseToken', () => {
  it('maps empty and block tokens', () => {
    expect(parseToken('.')).toBeNull();
    expect(parseToken('#')).toEqual(block());
  });

  it('reads LED colour and arrow rotation', () => {
    expect(parseToken('L>')).toEqual(led(0, 'red'));
    expect(parseToken('Lgv')).toEqual(led(1, 'green'));
    expect(parseToken('Lb^')).toEqual(led(3, 'blue'));
  });

  it('batteries default to 3V and point opposite to the arrow', () => {
    expect(parseToken('B>')).toEqual(battery(2, 3));
    expect(parseToken('B9<')).toEqual(battery(0, 9));
  });

  it('parses resistors, switches, diodes, changeovers and meters', () => {
    expect(parseToken('R220')).toEqual(resistor(220, 0));
    expect(parseToken('R100v')).toEqual(resistor(100, 1));
    expect(parseToken('S1')).toEqual(switchTile(true, 0));
    expect(parseToken('S0v')).toEqual(switchTile(false, 1));
    expect(parseToken('D^')).toEqual(diode(3));
    expect(parseToken('Cd2')).toEqual(changeover(false, 2));
    expect(parseToken('Cu')).toEqual(changeover(true, 0));
    expect(parseToken('MV')).toEqual(meter('V', 0));
    expect(parseToken('MAv')).toEqual(meter('A', 1));
  });

  it('parses wire glyphs', () => {
    expect(parseToken('│')).toEqual(wire('straight', 0));
    expect(parseToken('┐')).toEqual(wire('corner', 2));
    expect(parseToken('┼')).toEqual(wire('cross', 0));
  });

  it('throws on unknown tokens', () => {
    expect(() => parseToken('Z9')).toThrow(/unknown token/);
  });
});

describe('tileToken', () => {
  it('writes null as a dot', () => {
    expect(tileToken(null)).toBe('.');
  });

  it('round-trips through parseToken', () => {
    const tiles: Tile[] = [
      block(),
      led(2, 'green'),
      led(1, 'blue'),
      battery(1, 3),
      battery(3, 9),
      resistor(330, 1),
      switchTile(true, 1),
      diode(2),
      changeover(false, 3),
      meter('V', 1),
    ];
    for (const t of tiles) expect(parseToken(tileToken(t))).toEqual(t);
  });

  it('round-trips wire connectivity', () => {
    for (const shape of ['straight', 'corner', 'tee', 'cross'] as const) {
      for (const r of [0, 1, 2, 3] as const) {
        const t = wire(shape, r);
        const back = parseToken(tileToken(t))!;
        expect([...getPorts(back)].sort()).toEqual([...getPorts(t)].sort());
      }
    }
  });
});
