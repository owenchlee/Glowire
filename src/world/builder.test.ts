import { describe, expect, it } from 'vitest';

import { SHORE_PIECES, SHORE_TILES } from './atlas.generated';
import { MapBuilder } from './builder';
import { blockedCells, findPath } from './logic';

function build(fn: (b: MapBuilder) => void) {
  const b = new MapBuilder(30, 24, 'grass');
  b.area({ id: 'a', name: 'A', jobs: [], entry: { x: 1, y: 20, facing: 'right' } }, [{ x: 0, y: 0, w: 30, h: 24 }]);
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

describe('sand shores', () => {
  const shore = () =>
    build((b) => {
      b.rect('sea', 0, 0, 30, 24);
      b.rect('sand', 8, 8, 6, 5);
    });

  it('picks plain sand inside, edge tiles on the rim, and distinct corners', () => {
    const { map } = shore();
    const t = (x: number, y: number) => map.ground[y * map.width + x];
    const inner = t(10, 10);
    expect(SHORE_TILES.sand.includes(inner as never)).toBe(false); // plain sand
    const rim = [t(10, 8), t(10, 12), t(8, 10), t(13, 10)];
    expect(new Set(rim).size).toBe(4); // top, bottom, left, right edges all differ
    for (const r of rim) expect(SHORE_TILES.sand.includes(r as never)).toBe(true);
    const corners = [t(8, 8), t(13, 8), t(8, 12), t(13, 12)];
    expect(new Set(corners).size).toBe(4);
    expect(corners.some((c) => rim.includes(c))).toBe(false);
    // The water beside the sand has its own foam tiles; open sea stays plain.
    expect(SHORE_TILES.water.includes(t(10, 7) as never)).toBe(true);
    expect(SHORE_TILES.water.includes(t(2, 2) as never)).toBe(false);
  });

  it('turns a concave bend into an inner corner and does not change walkability', () => {
    const { map, blocked } = build((b) => {
      b.rect('sea', 0, 0, 30, 24);
      b.rect('sand', 5, 5, 8, 3);
      b.rect('sand', 5, 5, 3, 8);
    });
    const t = (x: number, y: number) => map.ground[y * map.width + x];
    expect(SHORE_TILES.water.includes(t(8, 8) as never)).toBe(true); // water in the bend
    // Sand is walkable, sea is solid, as before.
    expect(blocked[6 * map.width + 6]).toBe(0);
    expect(blocked[10 * map.width + 10]).toBe(1);
  });
});

describe('ledges and stepping stones', () => {
  it('draws a ledge with its own lip tiles (ends differ from the middle), still one-way', () => {
    const { map } = build((b) => b.ledge(5, 5, 4));
    const t = (x: number) => map.ground[5 * map.width + x];
    expect(SHORE_PIECES.ledgeGreen).toContain(t(5));
    expect(t(5)).not.toBe(t(6));
    expect(t(6)).toBe(t(7));
    expect(t(8)).not.toBe(t(7));
    expect(map.ledges![5 * map.width + 6]).toBe(1);
  });

  it('gives stepping stones their own sprite and keeps them walkable', () => {
    const { map, blocked } = build((b) => {
      b.rect('sea', 0, 0, 30, 24);
      b.stones([[10, 10], [10, 11]]);
    });
    const stone = map.objects.find((o) => o.x === 10 && o.y === 10)!;
    expect(SHORE_PIECES.stone).toContain(stone.tiles[0]);
    expect(blocked[10 * map.width + 10]).toBe(0);
    expect(blocked[12 * map.width + 10]).toBe(1);
  });
});

describe('reserve and clearRect', () => {
  it('reserve keeps trees off; clearRect removes the ones already there', () => {
    const { map } = build((b) => {
      b.tree(5, 5);
      b.clearRect(4, 4, 4, 4);
      b.forest(2, 2, 8, 8, ['round'], 1); // reserved by clearRect: stays clear
      b.reserve(15, 5, 3, 3);
      b.forest(14, 4, 6, 6, ['round'], 1);
    });
    expect(map.objects.filter((o) => o.sway && o.x >= 4 && o.x < 8 && o.y >= 4 && o.y < 8)).toHaveLength(0);
    expect(map.objects.filter((o) => o.sway && o.x >= 15 && o.x < 18 && o.y >= 5 && o.y < 8)).toHaveLength(0);
  });
});
