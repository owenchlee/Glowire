import { describe, expect, it } from 'vitest';

import { MapBuilder } from './builder';
import { blockedCells, findPath } from './logic';

function build(fn: (b: MapBuilder) => void) {
  const b = new MapBuilder(30, 24, 'grass');
  b.area({ id: 'a', name: 'A', jobs: [] }, [{ x: 0, y: 0, w: 30, h: 24 }]);
  fn(b);
  const map = b.finish({ id: 't', name: 'T', spawn: { x: 1, y: 20, facing: 'right' } });
  return { map, blocked: blockedCells(map, [], () => true) };
}

describe('plateau', () => {
  it('has a solid rim and cliff, a walkable top, and is entered by the ladder only', () => {
    const { map, blocked } = build((b) => {
      b.plateau(8, 4, 10, 8);
      b.ladder(12, 11);
      b.chest('top', 14, 7, 20);
    });
    const at = (x: number, y: number) => blocked[y * map.width + x];
    // Rim: left, right, top and the two cliff rows.
    expect(at(8, 7)).toBe(1);
    expect(at(17, 7)).toBe(1);
    expect(at(12, 4)).toBe(1);
    expect(at(10, 11)).toBe(1);
    expect(at(10, 10)).toBe(1);
    // Inside, and the ladder's two cells.
    expect(at(12, 6)).toBe(0);
    expect(at(12, 10)).toBe(0);
    expect(at(12, 11)).toBe(0);
    // The chest on top can be reached, through the ladder.
    expect(findPath(map, blocked, { x: 12, y: 13 }, { x: 14, y: 7 })).not.toBeNull();
  });

  it('keeps the top out of reach with no ladder', () => {
    const { map, blocked } = build((b) => {
      b.plateau(8, 4, 10, 8);
      b.chest('top', 14, 7, 20);
    });
    expect(findPath(map, blocked, { x: 1, y: 20 }, { x: 14, y: 7 })).toBeNull();
  });
});

describe('stepping stones', () => {
  it('lets you walk across a pond to a chest, and not without them', () => {
    const wet = (stones: boolean) =>
      build((b) => {
        b.blob('pond', 15, 10, 6, 4, 0);
        if (stones) b.stones([[15, 13], [15, 12], [15, 11]]);
        b.chest('pond', 15, 10, 25);
      });
    const dry = wet(false);
    expect(findPath(dry.map, dry.blocked, { x: 15, y: 16 }, { x: 15, y: 10 })).toBeNull();
    const ok = wet(true);
    expect(findPath(ok.map, ok.blocked, { x: 15, y: 16 }, { x: 15, y: 10 })).not.toBeNull();
  });
});

describe('cave', () => {
  it('is solid, with its doorway spot reachable from in front', () => {
    const { map, blocked } = build((b) => {
      const door = b.cave(10, 5);
      b.secret({ id: 'x', x: door.x, y: door.y });
    });
    expect(blocked[6 * map.width + 11]).toBe(1);
    expect(findPath(map, blocked, { x: 1, y: 20 }, { x: 11, y: 7 })).not.toBeNull();
  });
});
