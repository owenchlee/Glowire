import { describe, expect, it } from 'vitest';

import { clearLine, newWalker, stepWalker, walkerPosition, walkFrame } from './walker';

const wallAt5 = (x: number) => x !== 5;

describe('walker helpers', () => {
  it('walkerPosition reports the draw position', () => {
    expect(walkerPosition(newWalker(2.5, 7, 'up'))).toMatchObject({ x: 2.5, y: 7 });
  });

  it('clearLine is true in the open and false across a wall', () => {
    expect(clearLine({ x: 0, y: 0 }, { x: 4, y: 0 }, () => true)).toBe(true);
    expect(clearLine({ x: 3, y: 0 }, { x: 8, y: 0 }, wallAt5)).toBe(false);
    expect(clearLine({ x: 0, y: 0 }, { x: 3, y: 0 }, wallAt5)).toBe(true);
  });

  it('walkFrame is 0 when still and cycles 0-3 while moving', () => {
    const w = newWalker(0, 0, 'down');
    expect(walkFrame(w)).toBe(0);
    w.moving = true;
    w.clock = 0.13;
    expect(walkFrame(w)).toBe(1);
    w.clock = 0.26;
    expect(walkFrame(w)).toBe(2);
    w.clock = 0.5;
    expect(walkFrame(w)).toBe(0);
  });

  it('walkFrame follows a real walk', () => {
    const w = newWalker(0, 0, 'down');
    w.input = { x: 1, y: 0 };
    stepWalker(w, 0.13, () => true);
    expect(walkFrame(w)).toBe(1);
    w.input = { x: 0, y: 0 };
    stepWalker(w, 0.1, () => true);
    expect(walkFrame(w)).toBe(0);
  });
});
