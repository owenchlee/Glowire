import { describe, expect, it } from 'vitest';

import { STEP, areaDone, areaOfJob, canWalk, faceToward, frontier, jobsLeft } from './logic';
import type { WorldMap } from './types';

// Only the fields these helpers read; three areas of jobs [1,2], [3], [4], on a 3x2 grid.
const map = {
  width: 3,
  height: 2,
  areas: [{ jobs: [1, 2] }, { jobs: [3] }, { jobs: [4] }],
} as unknown as WorldMap;
const done = (...ids: number[]) => (j: number) => ids.includes(j);

describe('world logic helpers', () => {
  it('STEP moves one cell in each facing', () => {
    expect(STEP.up).toEqual({ x: 0, y: -1 });
    expect(STEP.down).toEqual({ x: 0, y: 1 });
    expect(STEP.left).toEqual({ x: -1, y: 0 });
    expect(STEP.right).toEqual({ x: 1, y: 0 });
  });

  it('areaDone needs every job in the area solved', () => {
    expect(areaDone(map.areas[0]!, done(1))).toBe(false);
    expect(areaDone(map.areas[0]!, done(1, 2))).toBe(true);
  });

  it('areaOfJob finds the owning area or -1', () => {
    expect(areaOfJob(map, 2)).toBe(0);
    expect(areaOfJob(map, 4)).toBe(2);
    expect(areaOfJob(map, 99)).toBe(-1);
  });

  it('frontier and jobsLeft follow the story', () => {
    expect(frontier(map, done())).toBe(0);
    expect(jobsLeft(map, done(2))).toEqual([1]);
    expect(frontier(map, done(1, 2))).toBe(1);
    expect(jobsLeft(map, done(1, 2))).toEqual([3]);
    expect(frontier(map, done(1, 2, 3, 4))).toBe(2);
    expect(jobsLeft(map, done(1, 2, 3, 4))).toEqual([]);
  });

  it('canWalk rejects blocked and out-of-bounds cells', () => {
    const blocked = new Uint8Array(6);
    blocked[1 * 3 + 2] = 1; // (2,1)
    expect(canWalk(map, blocked, 0, 0)).toBe(true);
    expect(canWalk(map, blocked, 2, 1)).toBe(false);
    expect(canWalk(map, blocked, -1, 0)).toBe(false);
    expect(canWalk(map, blocked, 3, 0)).toBe(false);
    expect(canWalk(map, blocked, 0, 2)).toBe(false);
  });

  it('faceToward picks the dominant axis, vertical on ties', () => {
    const o = { x: 5, y: 5 };
    expect(faceToward(o, { x: 9, y: 6 })).toBe('right');
    expect(faceToward(o, { x: 1, y: 4 })).toBe('left');
    expect(faceToward(o, { x: 5, y: 7 })).toBe('down');
    expect(faceToward(o, { x: 5, y: 1 })).toBe('up');
    expect(faceToward(o, { x: 7, y: 7 })).toBe('down');
  });
});
