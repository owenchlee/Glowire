import { describe, expect, it } from 'vitest';

import { MapBuilder } from './builder';
import { FISH, rollFish, verdict } from './fishing';
import { blockedCells, findPath } from './logic';
import { newRocks, pushRock, rockIndex, withRocks } from './rocks';
import { type Free, newWalker, stepWalker } from './walker';

function build(fn: (b: MapBuilder) => void) {
  const b = new MapBuilder(30, 24, 'grass');
  b.area({ id: 'a', name: 'A', jobs: [], entry: { x: 1, y: 20, facing: 'right' } }, [{ x: 0, y: 0, w: 30, h: 24 }]);
  fn(b);
  const map = b.finish({ id: 't', name: 'T', spawn: { x: 1, y: 20, facing: 'right' } });
  return { map, blocked: blockedCells(map, [], () => true) };
}

describe('pushable rocks', () => {
  it('slides one cell onto free ground', () => {
    const { map, blocked } = build((b) => b.rock(5, 5));
    const r = pushRock(map, blocked, newRocks(map), 5, 5, 'right')!;
    expect(r.to).toEqual({ x: 6, y: 5 });
    expect(r.filled).toBe(false);
    expect(rockIndex(r.state, 6, 5)).toBe(0);
    expect(rockIndex(r.state, 5, 5)).toBe(-1);
  });

  it('is blocked by walls, other rocks, signs, ledges and the map edge', () => {
    const { map, blocked } = build((b) => {
      b.rock(5, 5);
      b.rock(6, 5);
      b.block(5, 4, 1, 1);
      b.rockReset(5, 7);
      b.ledge(4, 5, 1);
      b.rock(0, 10);
    });
    const s = newRocks(map);
    expect(pushRock(map, blocked, s, 5, 5, 'right')).toBeNull(); // other rock
    expect(pushRock(map, blocked, s, 5, 5, 'up')).toBeNull(); // wall
    expect(pushRock(map, blocked, s, 5, 5, 'down')).not.toBeNull();
    expect(pushRock(map, blocked, s, 5, 5, 'left')).toBeNull(); // ledge
    expect(pushRock(map, blocked, s, 0, 10, 'left')).toBeNull(); // edge
    expect(pushRock(map, blocked, s, 9, 9, 'up')).toBeNull(); // no rock there
  });

  it('fills water, making a walkable stepping stone, and no more than once', () => {
    const { map, blocked } = build((b) => {
      b.rect('pond', 0, 10, 30, 3);
      b.rock(8, 9);
      b.rock(8, 8);
    });
    const dry = withRocks(map, blocked, newRocks(map));
    expect(findPath(map, dry, { x: 8, y: 6 }, { x: 8, y: 14 })).toBeNull();
    let s = newRocks(map);
    const first = pushRock(map, blocked, s, 8, 9, 'down')!;
    expect(first.filled).toBe(true);
    s = first.state;
    expect(s.rocks).toHaveLength(1);
    // The second rock rolls over the stone, then has to fill the next row.
    s = pushRock(map, blocked, s, 8, 8, 'down')!.state;
    expect(rockIndex(s, 8, 9)).toBe(0);
    s = pushRock(map, blocked, s, 8, 9, 'down')!.state;
    expect(rockIndex(s, 8, 10)).toBe(0);
    s = pushRock(map, blocked, s, 8, 10, 'down')!.state;
    expect(s.rocks).toHaveLength(0);
    const wet = withRocks(map, blocked, s);
    expect(wet[10 * map.width + 8]).toBe(0);
    expect(wet[11 * map.width + 8]).toBe(0);
    expect(wet[12 * map.width + 8]).toBe(1);
  });

  it('blocks the way until the rock is moved', () => {
    const { map, blocked } = build((b) => {
      b.block(0, 10, 10, 1);
      b.block(12, 10, 18, 1);
      b.rock(10, 10);
      b.rock(11, 10);
    });
    const s = newRocks(map);
    const gap = (st = s) => findPath(map, withRocks(map, blocked, st), { x: 10, y: 15 }, { x: 10, y: 5 });
    expect(gap()).toBeNull();
    // One rock is not enough: the other is behind it.
    expect(pushRock(map, blocked, s, 10, 10, 'up')).not.toBeNull();
  });
});

describe('ledges', () => {
  const free: Free = Object.assign(
    (x: number, y: number) => x >= 0 && x < 10 && y >= 0 && y < 10,
    { ledge: (x: number, y: number) => y === 5 && x >= 0 && x < 10 },
  );

  it('lets you step off downward but not climb back up', () => {
    const down = newWalker(4, 4, 'down');
    down.input = { x: 0, y: 1 };
    for (let i = 0; i < 20; i++) stepWalker(down, 0.05, free);
    expect(down.y).toBeGreaterThan(6);
    const up = newWalker(4, 7, 'up');
    up.input = { x: 0, y: -1 };
    for (let i = 0; i < 40; i++) stepWalker(up, 0.05, free);
    expect(up.y).toBeGreaterThan(5.5);
    expect(up.y).toBeLessThan(7);
    // Sliding along the ledge's foot doesn't get you up it either.
    up.input = { x: 1, y: -1 };
    for (let i = 0; i < 40; i++) stepWalker(up, 0.05, free);
    expect(up.y).toBeGreaterThan(5.5);
  });

  it('is respected by path-finding', () => {
    const { map, blocked } = build((b) => {
      b.block(0, 10, 12, 1);
      b.block(14, 10, 16, 1);
      b.ledge(12, 10, 2);
    });
    const downhill = findPath(map, blocked, { x: 12, y: 8 }, { x: 12, y: 12 })!;
    expect(downhill).toHaveLength(4);
    expect(findPath(map, blocked, { x: 12, y: 12 }, { x: 12, y: 8 })).toBeNull();
  });
});

describe('fishing', () => {
  it('rolls every kind of fish, the common ones most', () => {
    expect(rollFish(0).id).toBe('minnow');
    expect(rollFish(0.99).id).toBe('carp');
    expect(new Set([0, 0.7, 0.99].map((r) => rollFish(r).id)).size).toBe(FISH.length);
  });

  it('judges the press by when the bobber dipped', () => {
    const f = FISH[0]!;
    expect(verdict(-0.2, f)).toBe('early');
    expect(verdict(0.3, f)).toBe('caught');
    expect(verdict(f.window + 0.1, f)).toBe('late');
  });
});
