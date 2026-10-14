import { describe, expect, it } from 'vitest';

import { simulate } from './simulate';
import { parseBoard } from './test-helpers';
import { settledCharges, stepCircuit, timeUntil } from './transient';
import type { Board, SimulationResult } from './types';

const switched = (b: Board, closed: boolean): Board => ({
  ...b,
  cells: b.cells.map((t) => (t?.kind === 'switch' ? { ...t, closed } : t)),
});
const ledLit = (r: SimulationResult) => r.tiles.some((t) => t?.kind === 'led' && t.status === 'OK');

/** The stair light: a jar across the lamp's path, after the switch. */
const stair = (uf: number) => parseBoard(['┌  S1 ┬      R100 ┐', `B^ .  C${uf}v .    Lv`, '└  ─  ┴      ─    ┘']);

/** Seconds the lamp keeps glowing after the switch goes off. */
const hold = (b: Board) => timeUntil(switched(b, false), settledCharges(b), (r) => !ledLit(r), 20);

describe('capacitor', () => {
  it('blocks steady current once it has filled up', () => {
    const r = simulate(parseBoard(['┌ B< C1000 ┐', '└ L>  R100  ┘']));
    expect(r.tiles.find((t) => t?.kind === 'led')!.status).toBe('OFF');
    // …and holds most of the battery's push (the LED keeps a little for itself).
    expect(Math.abs(r.tiles.find((t) => t?.kind === 'capacitor')!.voltage)).toBeGreaterThan(1.5);
  });

  it('keeps the lamp glowing after the switch goes off, longer for a bigger jar', () => {
    const small = hold(stair(2200))!;
    const big = hold(stair(4700))!;
    expect(small).toBeGreaterThan(0.5);
    expect(big / small).toBeCloseTo(4700 / 2200, 1);
    // Without a jar the lamp goes out at once.
    const none = timeUntil(
      switched(parseBoard(['┌  S1 ─ R100 ┐', 'B^ .  . .    Lv', '└  ─  ─ ─    ┘']), false),
      {},
      (r) => !ledLit(r),
      5,
    );
    expect(none).toBeLessThan(0.05);
  });

  it('fills up gradually through a resistor', () => {
    const b = parseBoard(['┌ B< R1000 ┐', '└ ─  C4700 ┘']);
    let charges = {};
    const volts: number[] = [];
    for (let i = 0; i < 5; i++) {
      const s = stepCircuit(b, charges, 1);
      charges = s.charges;
      volts.push(Math.abs(Object.values(s.charges)[0]!));
    }
    // RC = 4.7 s: it climbs, a little less each second, toward 3 V.
    for (let i = 1; i < volts.length; i++) expect(volts[i]!).toBeGreaterThan(volts[i - 1]!);
    expect(volts[0]!).toBeGreaterThan(0.3);
    expect(volts.at(-1)!).toBeLessThan(2.5);
  });

  it('a charged jar lights a lamp with no battery anywhere', () => {
    // A gap in the lamp's loop: nothing flows and the jar keeps its charge.
    const open = parseBoard(['┌ C4700 R100 ┐', '└ L>    .    ┘']);
    const cap = open.cells.findIndex((t) => t?.kind === 'capacitor');
    expect(stepCircuit(open, { [cap]: 3 }, 0.05).charges[cap]).toBeCloseTo(3, 6);
    // Close the loop and the lamp lights from the jar alone.
    const closed = parseBoard(['┌ C4700 R100 ┐', '└ L>    ─    ┘']);
    const lit = stepCircuit(closed, { [cap]: 3 }, 0.05);
    expect(ledLit(lit.result)).toBe(true);
    expect(lit.charges[cap]!).toBeLessThan(3);
  });
});
