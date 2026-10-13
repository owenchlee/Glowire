import { describe, expect, it } from 'vitest';

import { newWalker, stepWalker, walkerPosition } from './walker';

const open = () => true;

describe('walker', () => {
  it('walks five cells a second while a direction is held, and finishes the step on release', () => {
    const w = newWalker(0, 0, 'down');
    w.held = 'right';
    stepWalker(w, 0.1, open);
    expect(walkerPosition(w).x).toBeCloseTo(0.5);
    stepWalker(w, 0.2, open);
    expect(walkerPosition(w).x).toBeCloseTo(1.5);
    w.held = null;
    stepWalker(w, 1, open);
    expect(w.to).toBeNull();
    expect(w.x).toBe(2);
  });

  it('turns to face a wall without moving', () => {
    const w = newWalker(3, 3, 'down');
    w.held = 'up';
    stepWalker(w, 0.5, () => false);
    expect(w.facing).toBe('up');
    expect(w.to).toBeNull();
    expect({ x: w.x, y: w.y }).toEqual({ x: 3, y: 3 });
  });

  it('follows a path, then faces what was tapped and reports arriving', () => {
    const w = newWalker(0, 0, 'down');
    w.path = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    w.faceAtEnd = { x: 2, y: 1 };
    let arrived = false;
    for (let i = 0; i < 20 && !arrived; i++) arrived = stepWalker(w, 0.05, open).arrived;
    expect(arrived).toBe(true);
    expect({ x: w.x, y: w.y }).toEqual({ x: 1, y: 1 });
    expect(w.facing).toBe('right');
  });

  it('drops the rest of a path when the way gets blocked', () => {
    const w = newWalker(0, 0, 'down');
    w.path = [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    stepWalker(w, 0.25, (x) => x < 2);
    stepWalker(w, 0.5, (x) => x < 2);
    expect(w.x).toBe(1);
    expect(w.path).toHaveLength(0);
  });
});
