import { describe, expect, it } from 'vitest';

import { simulate } from './simulate';
import { parseBoard } from './test-helpers';
import type { SimulationResult, TileResult } from './types';

// Expected values come from solving each single loop by hand:
//   V_batt = I·(R_internal + R + R_wires + R_led_series) + n·Vt·ln(I/Is + 1)
// with the red-LED fit Is = 1.52e-17 A, n = 2, Rs = 10 Ω (2.0 V at 20 mA).

const mA = 1e-3;

function find(result: SimulationResult, kind: TileResult['kind']): TileResult[] {
  return result.tiles.filter((t): t is TileResult => t?.kind === kind);
}
function only(result: SimulationResult, kind: TileResult['kind']): TileResult {
  const [t] = find(result, kind);
  if (!t) throw new Error(`no ${kind}`);
  return t;
}

describe('simulate', () => {
  it('1. 3 V + 100 Ω + red LED lights at about 11 mA', () => {
    const r = simulate(parseBoard(['┌ B< R100 ┐', '└ L>  ─   ┘']));
    const ledR = only(r, 'led');
    expect(r.converged).toBe(true);
    expect(ledR.status).toBe('OK');
    expect(ledR.current).toBeCloseTo(11.148 * mA, 5);
    expect(ledR.voltage).toBeGreaterThan(1.8);
    expect(ledR.voltage).toBeLessThan(2.0);
    expect(ledR.brightness).toBeCloseTo(11.148 / 20, 3);
    expect(r.batteryCurrent).toBeCloseTo(11.148 * mA, 5);
    expect(r.shortCircuit).toBe(false);
  });

  it('1b. bigger resistors make the LED dimmer (220 Ω: 5.5 mA, 1 kΩ: 1.3 mA)', () => {
    const r220 = simulate(parseBoard(['┌ B< R220 ┐', '└ L>  ─   ┘']));
    const r1k = simulate(parseBoard(['┌ B< R1000 ┐', '└ L>  ─    ┘']));
    expect(only(r220, 'led').current).toBeCloseTo(5.499 * mA, 5);
    expect(only(r1k, 'led').current).toBeCloseTo(1.327 * mA, 5);
  });

  it('2. reversed LED blocks current', () => {
    const r = simulate(parseBoard(['┌ B< R100 ┐', '└ L<  ─   ┘']));
    const ledR = only(r, 'led');
    expect(ledR.status).toBe('REVERSED');
    expect(Math.abs(ledR.current)).toBeLessThan(1e-9);
    expect(ledR.voltage).toBeCloseTo(-3, 3);
    expect(ledR.brightness).toBe(0);
  });

  it('3. LED straight across 3 V burns out (~107 mA)', () => {
    const r = simulate(parseBoard(['┌ B< ─ ┐', '└ L> ─ ┘']));
    const ledR = only(r, 'led');
    expect(ledR.current).toBeCloseTo(107.44 * mA, 4);
    expect(ledR.status).toBe('BURNED_OUT');
    expect(ledR.brightness).toBe(0);
    expect(r.shortCircuit).toBe(false);
  });

  it('4. wire across the battery is a short circuit (3 V / 0.35 Ω)', () => {
    const r = simulate(parseBoard(['┌ B< ┐', '└ ─  ┘']));
    expect(r.shortCircuit).toBe(true);
    expect(r.batteryCurrent).toBeCloseTo(3 / 0.35, 6);
    expect(only(r, 'battery').status).toBe('SHORT_CIRCUIT');
    for (const w of find(r, 'wire')) expect(w.status).toBe('SHORT_CIRCUIT');
  });

  it('5. wire across the LED bypasses it', () => {
    const r = simulate(parseBoard(['┌ B< R100 ┐', '├ L>  ┬   ┘', '└ ─   ┘   .']));
    const ledR = only(r, 'led');
    expect(ledR.status).toBe('BYPASSED');
    expect(Math.abs(ledR.current)).toBeLessThan(1e-9);
    // All current takes the wire: 3 V / (100 + 0.3 + wires) ≈ 29.9 mA.
    expect(r.batteryCurrent).toBeCloseTo(3 / 100.37, 4);
  });

  it('6. two LED + resistor branches in parallel: battery current is their sum', () => {
    const r = simulate(parseBoard(['┌ B<  ─    ┐', '├ L>  R100 ┤', '└ L>  R100 ┘']));
    const leds = find(r, 'led');
    expect(leds).toHaveLength(2);
    for (const l of leds) {
      expect(l.status).toBe('OK');
      expect(l.current).toBeCloseTo(11.1 * mA, 3);
    }
    const sum = leds.reduce((s, l) => s + l.current, 0);
    expect(r.batteryCurrent).toBeCloseTo(sum, 9);
  });

  it('7. two LEDs in series on 3 V are (almost) off: ~60 µA', () => {
    const r = simulate(parseBoard(['┌ B< ─ ┐', '└ L> L> ┘']));
    for (const l of find(r, 'led')) {
      expect(l.status).toBe('OFF');
      expect(l.current).toBeCloseTo(59.71e-6, 7);
      expect(l.brightness).toBeLessThan(0.005);
    }
  });

  it('8. open circuit: no current anywhere', () => {
    const r = simulate(parseBoard(['┌ B< R100 ┐', '└ L>  .   ┘']));
    for (const t of r.tiles) if (t) expect(Math.abs(t.current)).toBeLessThan(1e-9);
    expect(only(r, 'led').status).toBe('OFF');
  });

  it('9. floating sections and lone tiles do not crash the solver', () => {
    const r = simulate(
      parseBoard([
        '┌ B< R100 ┐ .',
        '└ L>  ─   ┘ ─',
        '. .   .   . .',
        '┌ L> R100 ┐ Lv',
        '└ ─   ─   ┘ .',
      ]),
    );
    const leds = find(r, 'led');
    expect(leds.filter((l) => l.status === 'OK')).toHaveLength(1);
    expect(leds.filter((l) => l.status === 'OFF')).toHaveLength(2);
    expect(r.batteryCurrent).toBeCloseTo(11.148 * mA, 5);
  });

  it('empty board and battery-only board give zero current', () => {
    expect(simulate(parseBoard(['. .', '. .'])).batteryCurrent).toBe(0);
    expect(simulate(parseBoard(['B<'])).batteryCurrent).toBe(0);
  });

  it('a short in one branch is flagged even with an LED in another', () => {
    const r = simulate(parseBoard(['┌ B<  ─    ┐', '├ L>  R100 ┤', '└ ─   ─    ┘']));
    expect(r.shortCircuit).toBe(true);
  });
});

describe('switches and blocks', () => {
  it('a closed switch acts like a wire, an open one breaks the loop', () => {
    const closed = simulate(parseBoard(['┌ B< R100 ┐', '└ L>  S1  ┘']));
    const open = simulate(parseBoard(['┌ B< R100 ┐', '└ L>  S0  ┘']));
    expect(only(closed, 'led').current).toBeCloseTo(11.148e-3, 4);
    expect(only(closed, 'switch').status).toBe('OK');
    expect(only(open, 'led').status).toBe('OFF');
    expect(Math.abs(only(open, 'led').current)).toBeLessThan(1e-8);
    expect(only(open, 'switch').status).toBe('OFF');
  });

  it('blocks have no ports and never conduct', () => {
    const r = simulate(parseBoard(['┌ B< R100 ┐', '└ L>  #   ┘']));
    expect(only(r, 'led').status).toBe('OFF');
    expect(only(r, 'block').current).toBe(0);
  });
});
