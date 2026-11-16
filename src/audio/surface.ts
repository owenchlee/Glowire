// Which footstep sound a world cell makes, worked out from the tiles drawn there. Pure: no
// React, no audio.

import {
  ATLAS_COLS,
  SHEETS,
  SHORE_PIECES,
  SHORE_TILES,
  type SheetId,
  TERRAIN_TILES,
} from '../world/atlas.generated';
import { at, TILES } from '../world/builder';
import type { WorldMap } from '../world/types';

export type Surface = 'grass' | 'dirt' | 'stone' | 'wood' | 'sand' | 'water';

/** Tiles that name their surface outright (terrain autotiles, shore pieces, planks). */
const BY_TILE = new Map<number, Surface>();
const tag = (s: Surface, tiles: Iterable<number>) => {
  for (const t of tiles) if (t >= 0) BY_TILE.set(t, s);
};
tag('dirt', [...TERRAIN_TILES.dirt.flat(), ...TERRAIN_TILES.darkDirt.flat()]);
tag('stone', [...TERRAIN_TILES.stone.flat(), ...SHORE_PIECES.stone]);
tag('water', [...TERRAIN_TILES.pond.flat(), ...TERRAIN_TILES.sea.flat(), ...SHORE_TILES.water]);
tag('sand', [...SHORE_TILES.sand, ...SHORE_PIECES.ledgeSand, at('water', 140)]);
tag('grass', SHORE_PIECES.ledgeGreen);
tag('wood', [TILES.planks, TILES.planksV]);

/** Everything else goes by the sheet it's cut from (painted squares, roads, hills, seabed). */
const SHEET_ORDER = (Object.entries(SHEETS) as [SheetId, { row: number }][]).sort(
  (a, b) => b[1].row - a[1].row,
);
function bySheet(t: number): Surface {
  const row = Math.floor(t / ATLAS_COLS);
  const [sheet, o] = SHEET_ORDER.find(([, s]) => s.row <= row)!;
  switch (sheet) {
    case 'city':
    case 'town':
      return 'stone';
    case 'water':
      return 'water';
    case 'deep':
    case 'shore':
      return 'sand';
    case 'field':
      return 'dirt';
    case 'relief':
    case 'reef':
      return row - o.row < 5 ? 'grass' : 'sand'; // green hilltops above, sandy mesas below
    default:
      return 'grass';
  }
}

/** Per map: the surface of flat things laid over the ground (bridges, boardwalks, stepping stones). */
const overlays = new WeakMap<WorldMap, Map<number, Surface>>();
function overlayOf(map: WorldMap) {
  let m = overlays.get(map);
  if (!m) {
    m = new Map();
    for (const o of map.objects) {
      if (!o.flat || o.w !== 1 || o.h !== 1) continue;
      const s = BY_TILE.get(o.tiles[0]!);
      if (s === 'wood' || s === 'stone') m.set(o.y * map.width + o.x, s);
    }
    overlays.set(map, m);
  }
  return m;
}

/** The footstep surface of cell (x, y). Off the map or blank ground counts as grass. */
export function surfaceAt(map: WorldMap, x: number, y: number): Surface {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'grass';
  const i = y * map.width + x;
  const over = overlayOf(map).get(i);
  if (over) return over;
  if (map.underwater) return 'sand';
  const t = map.ground[i]!;
  if (t < 0) return 'grass';
  return BY_TILE.get(t) ?? bySheet(t);
}
