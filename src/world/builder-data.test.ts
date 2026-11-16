import { describe, expect, it } from 'vitest';

import { ATLAS_COLS, SHEETS, TERRAIN_TILES } from './atlas.generated';
import { at, HOUSES, MapBuilder, PROPS, RUINS, TILES } from './builder';
import { EXTRAS } from './people.generated';

describe('atlas data', () => {
  it('lays every sheet inside the atlas width', () => {
    for (const s of Object.values(SHEETS)) expect(s.cols).toBeLessThanOrEqual(ATLAS_COLS);
  });

  it('at() maps a sheet index to an atlas cell', () => {
    expect(at('city', 0)).toBe(SHEETS.city.row * ATLAS_COLS);
    const o = SHEETS.floor;
    expect(at('floor', o.cols + 2)).toBe((o.row + 1) * ATLAS_COLS + 2);
  });

  it('terrain tile lists are 256 masks of non-negative tile ids', () => {
    for (const masks of Object.values(TERRAIN_TILES)) {
      expect(masks).toHaveLength(256);
      for (const tiles of masks) for (const t of tiles) expect(t).toBeGreaterThanOrEqual(0);
    }
  });

  it('lists the speech-bubble extras after the shadow', () => {
    expect(EXTRAS[0]).toBe('shadow');
    expect(new Set(EXTRAS).size).toBe(EXTRAS.length);
  });
});

describe('builder catalogues', () => {
  it('houses and ruins have a door inside their width', () => {
    for (const b of [...Object.values(HOUSES), ...Object.values(RUINS)]) {
      expect(b.door).toBeGreaterThanOrEqual(0);
      expect(b.door).toBeLessThan(b.w);
      expect(b.h).toBeGreaterThan(0);
    }
  });

  it('tiles and props resolve to atlas ids', () => {
    expect(TILES.planks).not.toBe(TILES.planksV);
    for (const p of Object.values(PROPS)) expect(p.t).toBeGreaterThanOrEqual(0);
  });
});

describe('MapBuilder', () => {
  it('starts filled with its base ground and paints inside bounds only', () => {
    const m = new MapBuilder(6, 4, 'sand');
    expect(m.groundAt(0, 0)).toBe('sand');
    expect(m.groundAt(6, 0)).toBeNull();
    m.rect('stone', 1, 1, 2, 2);
    expect(m.groundAt(2, 2)).toBe('stone');
    expect(m.groundAt(3, 3)).toBe('sand');
    m.paint('dirt', -1, 0);
    expect(m.inside(5, 3)).toBe(true);
    expect(m.inside(-1, 0)).toBe(false);
  });
});
