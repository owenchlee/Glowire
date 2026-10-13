import { describe, expect, it } from 'vitest';

import { WALK_SPEED, facingCells, fits, newWalker, smoothPath, stepWalker, walkerCell } from './walker';

const open = () => true;
/** A wall down column 5. */
const wallAt5 = (x: number) => x !== 5;

describe('walker', () => {
  it('walks smoothly while a direction is held, and stops when it is let go', () => {
    const w = newWalker(0, 0, 'down');
    w.input = { x: 1, y: 0 };
    stepWalker(w, 0.1, open);
    expect(w.x).toBeCloseTo(WALK_SPEED * 0.1);
    expect(w.facing).toBe('right');
    w.input = { x: 0, y: 0 };
    stepWalker(w, 1, open);
    expect(w.x).toBeCloseTo(WALK_SPEED * 0.1);
    expect(w.moving).toBe(false);
  });

  it('walks diagonally at the same speed, holding two keys at once', () => {
    const w = newWalker(0, 0, 'right');
    w.input = { x: 1, y: 1 };
    stepWalker(w, 0.2, open);
    expect(Math.hypot(w.x, w.y)).toBeCloseTo(WALK_SPEED * 0.2);
    expect(w.x).toBeCloseTo(w.y);
    // It keeps facing right (one of the two ways it is going) instead of flickering.
    expect(w.facing).toBe('right');
  });

  it('slides along a wall instead of stopping dead', () => {
    const w = newWalker(4, 3, 'right');
    w.input = { x: 1, y: 1 };
    for (let i = 0; i < 10; i++) stepWalker(w, 0.05, wallAt5);
    expect(w.x).toBeLessThan(4.21);
    expect(w.y).toBeGreaterThan(4);
  });

  it('turns to face a wall without moving into it', () => {
    const w = newWalker(4, 3, 'down');
    w.input = { x: 1, y: 0 };
    stepWalker(w, 0.5, wallAt5);
    expect(w.facing).toBe('right');
    expect(fits(w.x, w.y, wallAt5)).toBe(true);
    expect(walkerCell(w)).toEqual({ x: 4, y: 3 });
  });

  it('is nudged round a corner into a one-cell gap', () => {
    // A wall along row 2 with a gap at column 3; the hero is a little off to the side.
    const free = (x: number, y: number) => y !== 2 || x === 3;
    const w = newWalker(3.3, 3, 'up');
    w.input = { x: 0, y: -1 };
    for (let i = 0; i < 30; i++) stepWalker(w, 0.05, free);
    expect(w.y).toBeLessThan(1.5);
  });

  it('follows a tapped path, then faces what was tapped and reports arriving', () => {
    const w = newWalker(0, 0, 'down');
    w.path = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    w.faceAtEnd = { x: 2, y: 1 };
    let arrived = false;
    for (let i = 0; i < 40 && !arrived; i++) arrived = stepWalker(w, 0.05, open).arrived;
    expect(arrived).toBe(true);
    expect({ x: w.x, y: w.y }).toEqual({ x: 1, y: 1 });
    expect(w.facing).toBe('right');
  });

  it('cuts corners on a tapped path where nothing is in the way', () => {
    const steps = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ];
    expect(smoothPath({ x: 0, y: 0 }, steps, open)).toEqual([{ x: 2, y: 2 }]);
  });

  it('drops the rest of a path when the way gets blocked', () => {
    const w = newWalker(0, 0, 'down');
    w.path = [{ x: 3, y: 0 }];
    for (let i = 0; i < 20; i++) stepWalker(w, 0.05, (x) => x < 2);
    expect(w.x).toBeLessThan(1.3);
    expect(w.path).toHaveLength(0);
  });

  it('looks at the cell straight ahead first', () => {
    const w = newWalker(3, 3, 'up');
    expect(facingCells(w)[0]).toEqual({ x: 3, y: 2 });
    w.facing = 'right';
    expect(facingCells(w)[0]).toEqual({ x: 4, y: 3 });
  });
});
