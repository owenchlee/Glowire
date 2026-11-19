import { describe, expect, it } from 'vitest';
import { colourQuestion } from './games';

/** A random() that replays `values`, then zeros, and counts its calls. */
function script(...values: number[]) {
  let calls = 0;
  const random = () => values[calls++] ?? 0;
  return { random, calls: () => calls };
}

describe('colour code, scripted rolls', () => {
  it('uses the job resistors before round 4 and E12 values from round 4', () => {
    expect(colourQuestion(3, script().random).ohms).toBe(100);
    expect(colourQuestion(4, script().random).ohms).toBe(10);
  });

  it('widens the zeros range at round 8', () => {
    expect(colourQuestion(7, script(0, 0.9).random).ohms).toBe(1000);
    expect(colourQuestion(8, script(0, 0.9).random).ohms).toBe(100000);
  });

  it('stops hunting once it has three wrong answers, and shuffles in place', () => {
    const s = script(0.5, 0.99, 0.99, 0.99);
    const q = colourQuestion(0, s.random);
    expect(q.bands).toEqual([4, 7, 1]);
    expect(q.choices).toEqual([470, 4700, 47, 740]);
    expect(s.calls()).toBe(4);
  });

  it('never offers a fraction of an ohm and gives up after 50 tries', () => {
    const s = script();
    const q = colourQuestion(4, s.random);
    expect(q.choices).toEqual([100, 10]);
    expect(s.calls()).toBe(103);
  });
});
