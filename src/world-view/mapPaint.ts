// Paints a world as a clean night-time map: one flat colour per terrain (grass, road, water,
// buildings…) at a few pixels per cell, with outlines so roads and water read at a glance,
// and dark starry fog over what the hero hasn't seen. Pure (RGBA bytes out), so the map
// screen and the preview script share it.

import { SHEETS, ATLAS_COLS, SHORE_TILES, TERRAIN_TILES } from '../world/atlas.generated';
import { FILLED_TILE, TILES, hash } from '../world/builder';
import { type Solved, areaDone, litGroups } from '../world/logic';
import type { WorldMap } from '../world/types';
import { type Explored, isExplored } from './explored';

export type Terrain = 'none' | 'grass' | 'sand' | 'road' | 'water' | 'cliff' | 'tree' | 'building' | 'lit' | 'prop' | 'gate';

const RGB: Record<Terrain, [number, number, number]> = {
  none: [13, 15, 30],
  grass: [44, 72, 58],
  sand: [120, 106, 80],
  road: [214, 176, 108],
  water: [38, 86, 140],
  cliff: [74, 70, 98],
  tree: [26, 48, 38],
  building: [120, 72, 62],
  lit: [232, 149, 90],
  prop: [36, 60, 48],
  gate: [209, 75, 52],
};
// Under the sea the ground is a dim teal seabed instead of grass.
const SEABED: Partial<Record<Terrain, [number, number, number]>> = { grass: [38, 70, 82], prop: [30, 56, 68], tree: [24, 46, 56] };
const FOG: [number, number, number] = [9, 10, 22];
const STAR: [number, number, number] = [52, 58, 102];
const INK: [number, number, number] = [20, 27, 27];

const set = (...lists: (readonly (readonly number[] | number)[])[]) =>
  new Set(lists.flat(2).filter((t): t is number => typeof t === 'number' && t >= 0));
const WATER = set(TERRAIN_TILES.pond, TERRAIN_TILES.sea, SHORE_TILES.water);
const ROAD = set(TERRAIN_TILES.dirt, TERRAIN_TILES.darkDirt, TERRAIN_TILES.stone, Object.values(TILES), [FILLED_TILE]);
const SAND_SHORE = set(SHORE_TILES.sand);

const sheetRows = Object.entries(SHEETS).sort((a, b) => a[1].row - b[1].row);
function sheetOf(tile: number): string {
  const row = Math.floor(tile / ATLAS_COLS);
  let best = '';
  for (const [id, s] of sheetRows) if (s.row <= row) best = id;
  return best;
}

function groundTerrain(tile: number): Terrain {
  if (tile < 0) return 'none';
  if (WATER.has(tile)) return 'water';
  if (ROAD.has(tile)) return 'road';
  if (SAND_SHORE.has(tile)) return 'sand';
  switch (sheetOf(tile)) {
    case 'city':
    case 'town':
      return 'road';
    case 'relief':
    case 'reef':
      return 'cliff';
    // shortcut: the water sheet's remaining tiles are taken as sand (beach); split it if a new water tile shows up as sand.
    case 'water':
    case 'shore':
      return 'sand';
    default:
      return 'grass';
  }
}

/** What each cell looks like on the map, ignoring fog. */
export function terrainGrid(map: WorldMap, solved: Solved): Terrain[] {
  const n = map.width * map.height;
  const out: Terrain[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = map.water?.[i] ? 'water' : groundTerrain(map.ground[i]!);
  const lit = litGroups(map, solved);
  for (const o of map.objects) {
    if (o.until && lit.has(o.until)) continue;
    if (o.after && !lit.has(o.after)) continue;
    const bridge = o.flat && o.tiles.some((t) => t === TILES.planks || t === TILES.planksV);
    const kind: Terrain | null = bridge
      ? 'road'
      : o.flat
        ? null
        : o.sway
          ? 'tree'
          : o.w >= 3 && o.h >= 2
            ? o.group && lit.has(o.group)
              ? 'lit'
              : 'building'
            : 'prop';
    if (!kind) continue;
    for (let y = Math.max(0, o.y); y < Math.min(map.height, o.y + o.h); y++)
      for (let x = Math.max(0, o.x); x < Math.min(map.width, o.x + o.w); x++) {
        const i = y * map.width + x;
        // Only the cells the object really fills: its blocking footprint, or the planks.
        if (kind === 'road' || map.solid[i]) out[i] = kind;
      }
  }
  for (const g of map.gates)
    if (!areaDone(map.areas[g.area]!, solved)) for (const c of g.cells) out[c.y * map.width + c.x] = 'gate';
  return out;
}

export interface MapImage {
  width: number;
  height: number;
  /** RGBA, row by row. */
  data: Uint8ClampedArray;
}

/** The map at `scale` pixels per cell. Unexplored cells are fog. */
export function paintMap(map: WorldMap, explored: Explored, solved: Solved, scale = 6): MapImage {
  const terrain = terrainGrid(map, solved);
  const W = map.width * scale;
  const H = map.height * scale;
  const data = new Uint8ClampedArray(W * H * 4);
  const at = (x: number, y: number): Terrain | null =>
    x < 0 || y < 0 || x >= map.width || y >= map.height ? null : terrain[y * map.width + x]!;
  const seen = (x: number, y: number) => isExplored(explored, map, x, y);
  // One 32-bit store per pixel (typed arrays are little-endian on every phone): 0xAABBGGRR.
  const px32 = new Uint32Array(data.buffer);
  const pack = (c: readonly number[]) => (0xff000000 | (c[2]! << 16) | (c[1]! << 8) | c[0]!) >>> 0;
  const shade = (c: readonly number[], k: number) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  const FOG32 = pack(FOG);
  const STAR32 = pack(STAR);
  const INK32 = pack(INK);
  const WINDOW32 = pack([255, 214, 120]);

  for (let cy = 0; cy < map.height; cy++)
    for (let cx = 0; cx < map.width; cx++) {
      const t = at(cx, cy)!;
      const x0 = cx * scale;
      const y0 = cy * scale;
      if (!seen(cx, cy)) {
        for (let py = 0; py < scale; py++) {
          const o = (y0 + py) * W + x0;
          px32.fill(FOG32, o, o + scale);
        }
        if (hash(cx, cy) < 0.04) px32[(y0 + Math.floor(hash(cx + 7, cy) * scale)) * W + x0 + Math.floor(hash(cy, cx) * scale)] = STAR32;
        continue;
      }
      // Cells at the edge of what you've seen fade into the fog.
      const fogAt = (x: number, y: number) => at(x, y) !== null && !seen(x, y);
      const edge = fogAt(cx - 1, cy) || fogAt(cx + 1, cy) || fogAt(cx, cy - 1) || fogAt(cx, cy + 1);
      let base: readonly number[] = map.underwater && SEABED[t] ? SEABED[t] : RGB[t];
      if (t === 'grass' && hash(cx, cy) < 0.2) base = shade(base, 0.92);
      if (t === 'water' && ![-1, 1].some((d) => at(cx + d, cy) !== 'water' || at(cx, cy + d) !== 'water')) base = shade(base, 0.85);
      if (edge) base = shade(base, 0.6);
      const base32 = pack(base);
      // Outlines: an edge line where a road, water, building or cliff meets something else.
      const differs = (dx: number, dy: number) => {
        const n = at(cx + dx, cy + dy);
        return n !== null && n !== t;
      };
      const dL = differs(-1, 0);
      const dR = differs(1, 0);
      const dU = differs(0, -1);
      const dD = differs(0, 1);
      let line32 = base32;
      if (t === 'road') line32 = pack(shade(base, 0.62));
      else if (t === 'water') line32 = pack(shade(base, 1.55));
      else if (t === 'building' || t === 'lit' || t === 'cliff' || t === 'gate') line32 = INK32;
      else if (t === 'tree') line32 = pack(shade(base, 0.7));
      const glint32 = t === 'tree' ? pack(shade(base, 1.5)) : base32;
      const lit = t === 'lit';
      for (let py = 0; py < scale; py++) {
        const ny = py === 0 ? dU : py === scale - 1 && dD;
        let o = (y0 + py) * W + x0;
        for (let px = 0; px < scale; px++, o++) {
          const border = ny || (px === 0 ? dL : px === scale - 1 && dR);
          px32[o] = border ? line32 : lit && (px + py) % 3 === 0 ? WINDOW32 : t === 'tree' && px === 1 && py === 1 ? glint32 : base32;
        }
      }
    }
  return { width: W, height: H, data };
}

/** A BMP of the image, as base64: <Image> shows it everywhere without a canvas. 8-bit palette when the map has <= 256 colours (3x fewer bytes), else 24-bit. */
export function bmpBase64(img: MapImage, toBase64: (b: Uint8Array) => string): string {
  const px32 = new Uint32Array(img.data.buffer, img.data.byteOffset, img.width * img.height);
  const index = new Map<number, number>();
  const colours: number[] = [];
  const idx = new Uint8Array(px32.length);
  let last = -1;
  let lastI = 0;
  let paletted = true;
  for (let i = 0; i < px32.length; i++) {
    const c = px32[i]!;
    if (c !== last) {
      let k = index.get(c);
      if (k === undefined) {
        if (colours.length === 256) {
          paletted = false;
          break;
        }
        k = colours.length;
        index.set(c, k);
        colours.push(c);
      }
      last = c;
      lastI = k;
    }
    idx[i] = lastI;
  }
  const bits = paletted ? 8 : 24;
  const row = Math.ceil((img.width * (bits / 8)) / 4) * 4;
  const head = paletted ? 54 + 1024 : 54;
  const size = head + row * img.height;
  const buf = new Uint8Array(size);
  const dv = new DataView(buf.buffer);
  buf[0] = 0x42;
  buf[1] = 0x4d;
  dv.setUint32(2, size, true);
  dv.setUint32(10, head, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, img.width, true);
  dv.setInt32(22, img.height, true); // bottom-up rows: every decoder reads these
  dv.setUint16(26, 1, true);
  dv.setUint16(28, bits, true);
  dv.setUint32(34, row * img.height, true);
  if (paletted) {
    dv.setUint32(46, colours.length, true);
    // BMP palette entries are B, G, R, 0; our pixels are 0xAABBGGRR.
    colours.forEach((c, i) => dv.setUint32(54 + i * 4, ((c & 0xff) << 16) | (c & 0xff00) | ((c >>> 16) & 0xff), true));
    for (let y = 0; y < img.height; y++)
      buf.set(idx.subarray(y * img.width, (y + 1) * img.width), head + (img.height - 1 - y) * row);
    return toBase64(buf);
  }
  const src = img.data;
  for (let y = 0; y < img.height; y++) {
    let s = y * img.width * 4;
    let o = head + (img.height - 1 - y) * row;
    for (let x = 0; x < img.width; x++, s += 4) {
      buf[o++] = src[s + 2]!;
      buf[o++] = src[s + 1]!;
      buf[o++] = src[s]!;
    }
  }
  return toBase64(buf);
}
