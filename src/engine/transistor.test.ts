import { describe, expect, it } from 'vitest';

import { simulate } from './simulate';
import { parseBoard } from './test-helpers';
import type { SimulationResult, TileResult } from './types';

const only = (r: SimulationResult, kind: TileResult['kind']) => r.tiles.find((t) => t?.kind === kind)!;

/** A switch, through 1 kΩ, into the base; the lamp (and 100 Ω) on the collector. */
const relay = (sw: 'S0' | 'S1', baseR = 'R1000') =>
  parseBoard([
    '┌  ─  R100  L> ┐',
    `├  ${sw} ${baseR} ─  Q`,
    'B^ .  .     .  │',
    '└  ─  ─     ─  ┘',
  ]);

describe('transistor', () => {
  it('is off with no base current: the lamp stays dark', () => {
    const r = simulate(relay('S0'));
    expect(r.converged).toBe(true);
    expect(only(r, 'led').status).toBe('OFF');
    expect(only(r, 'transistor').status).toBe('OFF');
  });

  it('a small base current switches on a much bigger one', () => {
    const r = simulate(relay('S1'));
    expect(r.converged).toBe(true);
    const led = only(r, 'led');
    const q = only(r, 'transistor');
    expect(led.status).toBe('OK');
    expect(led.brightness).toBeGreaterThan(0.4);
    // Fully on, it drops only a little voltage, collector to emitter.
    expect(q.voltage).toBeLessThan(0.3);
    const base = r.tiles.find((t) => t?.kind === 'resistor' && Math.abs(t.current) < 0.005)!;
    expect(Math.abs(q.current)).toBeGreaterThan(Math.abs(base.current) * 3);
  });

  it('with only a trickle into the base, it lets through about 100 times as much', () => {
    // 3 V through a huge base resistor (1 kΩ × lots, made of a tiny battery instead): use the
    // lamp-less form, a resistor on the collector, and compare currents.
    const r = simulate(
      parseBoard([
        '┌  ─  R100   ─ ┐',
        '├  S1 R1000 ─ Q',
        'B^ .  .     . │',
        '└  ─  ─     ─ ┘',
      ]),
    );
    const q = only(r, 'transistor');
    // Collector current is limited by R100 to under 30 mA: saturated, not 100 × 2.3 mA.
    expect(q.current).toBeLessThan(0.031);
    expect(q.current).toBeGreaterThan(0.025);
    // Through 100 kΩ only about 23 µA reaches the base: then it amplifies, about 100 ×.
    const trickle = simulate(
      parseBoard(['┌  ─  R100     ─ ┐', '├  S1 R100000 ─ Q', 'B^ .  .       . │', '└  ─  ─       ─ ┘']),
    );
    const ib = Math.abs(trickle.tiles.find((t) => t?.kind === 'resistor' && t.current < 1e-4)!.current);
    const ic = only(trickle, 'transistor').current;
    expect(ic / ib).toBeGreaterThan(80);
    expect(ic / ib).toBeLessThan(120);
  });

  it('turned the wrong way, the switch can’t work it', () => {
    // Base on the west still, but collector and emitter swapped (turned upside down).
    const flipped = parseBoard([
      '┌  ─  R100  L> ┐',
      '├  S1 ─     ─  Q2',
      'B^ .  .     .  │',
      '└  ─  ─     ─  ┘',
    ]);
    // Q2: base E, collector S, emitter N. Nothing joins the base now.
    expect(only(simulate(flipped), 'led').status).toBe('OFF');
  });
});
