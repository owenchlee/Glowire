// Builds a world map out of big pieces (paths, ponds, houses, trees) instead of thousands
// of hand-placed tiles. Ground is painted as terrain (grass, dirt, water…) and the right
// edge tiles are worked out at the end, so paths can wind and ponds can be any shape.
//
// Tiles come from assets/art/world.png: Kenney's RPG Urban (palette-matched) and the
// village pack's sheets, stacked by scripts/art.mjs. `at(sheet, i)` turns a tile number
// in one source sheet into an atlas tile.

import { ATLAS_COLS, SHEETS, type SheetId, TERRAIN_TILES, type TerrainId } from './atlas.generated';
import type { Area, Facing, LightSource, Point, Puzzle, Rect, Resident, Sighting, Spot, WorldMap, WorldObject } from './types';

export function at(sheet: SheetId, i: number): number {
  const o = SHEETS[sheet];
  return (o.row + Math.floor(i / o.cols)) * ATLAS_COLS + (i % o.cols);
}

/** A block of tiles from a sheet: `w`×`h` starting at tile `i`. */
function cut(sheet: SheetId, i: number, w: number, h: number): number[] {
  const cols = SHEETS[sheet].cols;
  const out: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push(at(sheet, i + y * cols + x));
  return out;
}

/** A 3×3 set of tiles: corners, edges and middle, for stretching a rectangle. */
type Slice = readonly number[];
const slice = (sheet: SheetId, i: number): Slice => cut(sheet, i, 3, 3);

const city = (i: number) => at('city', i);
/** A tile of the drawn town sheet (scripts/town-art.mjs), by column and row. */
const town = (col: number, row: number) => at('town', row * SHEETS.town.cols + col);

/** Where things sit in the town sheet (keep in sync with scripts/town-art.mjs). */
const TOWN = {
  /** Seamless 4×4 cobble patches: first column. */
  cobbles: { grey: 0, warm: 4 },
  /** 3×3 kerb frames (middle empty): first column. */
  kerb: { grey: 8, warm: 11 },
  /** Bits to scatter on a square: row 3, these columns. */
  details: [8, 9, 10, 11, 12, 13],
  /** 4×4 mosaics (rows 4–7): first column, and the cobbles they belong on. */
  mosaics: { star: { col: 0, paving: 'grey' }, sun: { col: 4, paving: 'warm' } },
  /** The 4×4 fountain (rows 4–7): first column. */
  fountain: 8,
  /** 5×10 towers (rows 8–17): first column. */
  towers: { town: 0, moss: 5 },
} as const;
export type TowerStyle = keyof typeof TOWN.towers;

/** A tile of the drawn undersea sheet (scripts/deep-art.mjs), by column and row. */
const deep = (col: number, row: number) => at('deep', row * SHEETS.deep.cols + col);

/** Where things sit in the deep sheet (keep in sync with scripts/deep-art.mjs). */
const DEEP = {
  /** Small things along row 0, by column. `flat`: you walk over it. `glows`: lights with its group. */
  smalls: {
    shell: { col: 4, flat: true },
    starfish: { col: 5, flat: true },
    pebbles: { col: 6, flat: true },
    coral: { col: 7, flat: false },
    brainCoral: { col: 8, flat: false },
    rock: { col: 9, flat: false },
    urchin: { col: 10, flat: false },
    crab: { col: 11, flat: false },
    anemone: { col: 12, flat: false },
    seagrass: { col: 13, flat: true },
    bones: { col: 14, flat: true },
    chest: { col: 15, flat: false },
  },
  /** Two-tall things on rows 1–2: first column and width. */
  talls: {
    kelp: { col: 4, w: 1 },
    kelpGold: { col: 5, w: 1 },
    kelpDark: { col: 6, w: 1 },
    jar: { col: 7, w: 1 },
    anchor: { col: 8, w: 1 },
    coralTree: { col: 9, w: 2 },
    coralTreeOrange: { col: 11, w: 2 },
    signpost: { col: 13, w: 1 },
    pillar: { col: 14, w: 1 },
    vent: { col: 15, w: 1 },
  },
  /** Bigger pieces: top-left tile, size, rows they block at the bottom, the door column. */
  big: {
    dome: { col: 4, row: 3, w: 4, h: 4, solid: 2, door: 2 },
    domeTall: { col: 8, row: 3, w: 4, h: 4, solid: 2, door: 2 },
    heartJar: { col: 12, row: 3, w: 4, h: 5, solid: 2, door: 2 },
    clam: { col: 0, row: 4, w: 4, h: 3, solid: 2, door: 2 },
    wreck: { col: 0, row: 7, w: 6, h: 4, solid: 2, door: 3 },
    bell: { col: 6, row: 8, w: 4, h: 3, solid: 2, door: 2 },
  },
} as const;
export type DeepSmall = keyof typeof DEEP.smalls;
export type DeepTall = keyof typeof DEEP.talls;
export type DeepBig = keyof typeof DEEP.big;

/** Ground you paint with. Grass kinds are plain; the rest blend into the grass around them. */
export type Ground = 'grass' | 'meadow' | 'sand' | TerrainId | 'paved';
const GROUNDS: Ground[] = ['grass', 'meadow', 'sand', 'dirt', 'darkDirt', 'stone', 'pond', 'sea', 'paved'];

const GRASS = [264, 264, 264, 265, 266, 267, 268].map((i) => at('floor', i));
const MEADOW = [275, 275, 275, 276, 277, 278, 279].map((i) => at('floor', i));
const SAND = [140].map((i) => at('water', i));

export const TILES = {
  plaza: slice('city', 81),
  plazaGrey: slice('city', 8),
  sidewalk: slice('city', 8),
  asphalt: [440, 441, 466, 468].map(city),
  dashH: city(433),
  dashV: city(462),
  cross: city(407),
  zebraH: city(435),
  zebraV: city(432),
  /** Wooden boardwalk planks (water sheet), across and along. */
  planks: at('water', 365),
  planksV: at('water', 341),
} as const;

/** Village houses (house sheet): top-left tile, size, and the door's column. */
export const HOUSES = {
  orange: { i: 0, w: 4, h: 3, door: 1 },
  tan: { i: 4, w: 4, h: 3, door: 1 },
  orangeB: { i: 8, w: 4, h: 3, door: 1 },
  red: { i: 12, w: 4, h: 3, door: 1 },
  shop: { i: 16, w: 3, h: 3, door: 1 },
  green: { i: 19, w: 4, h: 3, door: 2 },
  round: { i: 23, w: 3, h: 3, door: 1 },
  barn: { i: 26, w: 3, h: 3, door: 1 },
} as const;
export type HouseStyle = keyof typeof HOUSES;

/**
 * Mossy, half-abandoned buildings (village pack, abandoned sheet): top-left tile, size,
 * and the door's column.
 */
export const RUINS = {
  stoneHut: { i: 0, w: 4, h: 3, door: 1 },
  kiln: { i: 4, w: 2, h: 3, door: 1 },
  mossHouse: { i: 11, w: 3, h: 3, door: 1 },
  paleHouse: { i: 71, w: 3, h: 3, door: 1 },
  stiltHut: { i: 14, w: 3, h: 5, door: 1 },
  aFrame: { i: 132, w: 4, h: 5, door: 1 },
  mound: { i: 116, w: 4, h: 5, door: 2 },
} as const;
export type RuinStyle = keyof typeof RUINS;

/** Big mossy things from the same sheet: size and top-left tile. */
const MOSSY = {
  bigTree: { i: 120, w: 4, h: 3 },
  bigTree2: { i: 180, w: 4, h: 3 },
  tree: { i: 124, w: 2, h: 2 },
  tree2: { i: 184, w: 2, h: 2 },
  boulder: { i: 107, w: 2, h: 2 },
  frog: { i: 109, w: 2, h: 2 },
  pillar: { i: 167, w: 2, h: 4 },
} as const;
export type MossyStyle = keyof typeof MOSSY;

/** City buildings (Kenney): roofs seen from above, then a brick front. */
const CITY_ROOFS = { tan: slice('city', 81), slate: slice('city', 89) } as const;
const CITY_WALLS = {
  red: { top: [17, 18, 19].map(city), bottom: [98, 99, 100].map(city) },
  orange: { top: [125, 126, 127].map(city), bottom: [206, 207, 208].map(city) },
} as const;
const CITY_WINDOWS = { arch: city(336), square: city(363), wide: city(390), tall: city(417) } as const;
const CITY_DOORS = { wood: city(283), double: city(284), glass: city(285), shop: city(257) } as const;
const STOREFRONT = [359, 360, 361].map(city);

/** Trees: size, tiles, and how many rows at the bottom are trunk (solid). */
const TREES = {
  round: { w: 2, h: 2, tiles: cut('nature', 0, 2, 2) },
  pine: { w: 2, h: 2, tiles: cut('nature', 2, 2, 2) },
  dead: { w: 2, h: 2, tiles: cut('nature', 4, 2, 2) },
  cherry: { w: 2, h: 2, tiles: cut('nature', 14, 2, 2) },
  oak: { w: 2, h: 2, tiles: cut('nature', 16, 2, 2) },
  lime: { w: 2, h: 2, tiles: cut('nature', 18, 2, 2) },
  bigPink: { w: 3, h: 3, tiles: cut('nature', 432, 3, 3) },
  bigGreen: { w: 3, h: 3, tiles: cut('nature', 435, 3, 3) },
  bigAutumn: { w: 3, h: 3, tiles: cut('nature', 441, 3, 3) },
  /** City trees (Kenney): tall and thin. */
  teal: { w: 1, h: 2, tiles: [259, 286].map(city) },
  autumn: { w: 1, h: 2, tiles: [313, 340].map(city) },
} as const;
export type TreeStyle = keyof typeof TREES;

/** Raised ground (village pack, relief sheet): 3×3 slices, and 1-wide strips for narrow ridges. */
const RELIEF = {
  green: { slice: slice('relief', 1), strip: [0, 20, 40].map((i) => at('relief', i)) },
  sand: { slice: slice('relief', 101), strip: [100, 120, 140].map((i) => at('relief', i)) },
} as const;
export type ReliefStyle = keyof typeof RELIEF;
/** The plain wall tiles (left, middle, right) that stack above a plateau's cliff edge to make it taller. */
const WALL = { green: [24, 25, 26].map((i) => at('relief', i)), sand: [124, 125, 126].map((i) => at('relief', i)) } as const;
const LADDER = { green: at('reliefDetail', 15), sand: at('reliefDetail', 51) } as const;
/** Cave mouths set into a hillside: 3×3, door in the bottom middle. */
const CAVES = { green: cut('reliefDetail', 84, 3, 3), sand: cut('reliefDetail', 87, 3, 3) } as const;
const CHEST = at('element', 19);
/** The pushable boulder, and the flat stone a pushed one leaves in the water. */
export const ROCK_TILE = at('nature', 296);
export const FILLED_TILE = at('water', 12);

/** One-tile props: atlas tile, and whether it blocks the way. */
export const PROPS = {
  bench: { t: city(250), solid: true },
  bin: { t: city(279), solid: true },
  mailbox: { t: city(305), solid: true },
  planter: { t: city(276), solid: true },
  fruit: { t: city(277), solid: true },
  crate: { t: city(275), solid: true },
  hydrant: { t: city(251), solid: true },
  cone: { t: city(307), solid: true },
  barrel: { t: at('house', 380), solid: true },
  pot: { t: at('house', 413), solid: true },
  sign: { t: at('element', 34), solid: true },
  well: { t: at('element', 2), solid: true },
  grave: { t: at('element', 36), solid: true },
  cross: { t: at('element', 35), solid: true },
  stump: { t: at('nature', 196), solid: true },
  log: { t: at('nature', 197), solid: true },
  rock: { t: at('nature', 329), solid: true },
  pebbles: { t: at('nature', 448), solid: false },
  mushroom: { t: at('nature', 276), solid: false },
  clover: { t: at('nature', 266), solid: false },
  sunflower: { t: at('nature', 264), solid: true },
  daisy: { t: at('nature', 270), solid: false },
  tulip: { t: at('nature', 267), solid: false },
  fern: { t: at('nature', 247), solid: false },
  reeds: { t: at('nature', 271), solid: false },
  lily: { t: at('water', 95), solid: true },
} as const;
export type PropName = keyof typeof PROPS;

const BUSHES = [240, 241, 242, 246].map((i) => at('nature', i));
const FLOWERS = [264, 265, 267, 270].map((i) => at('nature', i));
const LAMPS = { twin: [162, 189], hook: [164, 191], post: [168, 195], park: [169, 196] } as const;
export type LampStyle = keyof typeof LAMPS;

/** Wooden fence (city sheet): posts along a row. */
const FENCE = { left: city(382), mid: city(383), right: city(384) };
const FENCE_POST = city(385);
const HEDGE = { left: city(328), mid: city(329), right: city(331) };
const BARRIER = [city(221), city(222)];

export interface BuildingSpec {
  x: number;
  y: number;
  w: number;
  /** Rows of roof seen from above (2–3). */
  roof?: number;
  roofStyle?: keyof typeof CITY_ROOFS;
  wall?: keyof typeof CITY_WALLS;
  door?: keyof typeof CITY_DOORS;
  /** Column of the door, counted from the building's left edge. Default: middle. */
  doorAt?: number;
  /** A shop window along the bottom row, left of the door. */
  storefront?: boolean;
  window?: keyof typeof CITY_WINDOWS;
  /** Light group for its windows (e.g. "job:3"). */
  group?: string;
}

/** Deterministic noise so maps come out the same every time. */
export function hash(x: number, y: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const N = 1, E = 2, S = 4, W = 8, NE = 16, SE = 32, SW = 64, NW = 128;

export class MapBuilder {
  readonly terrain: Uint8Array;
  readonly ground: Int16Array;
  readonly decal: Int16Array;
  readonly solid: Uint8Array;
  readonly areaOf: Uint8Array;
  readonly objects: WorldObject[] = [];
  readonly lights: LightSource[] = [];
  readonly residents: Resident[] = [];
  readonly spots: Spot[] = [];
  readonly sightings: Sighting[] = [];
  readonly groups: Record<string, number[]> = {};
  readonly areas: Area[] = [];
  readonly gates: { area: number; cells: Point[] }[] = [];
  readonly rocks: Point[] = [];
  readonly puzzles: Puzzle[] = [];
  readonly ledges: Uint8Array;
  /** Cells that can be walked on whatever the terrain says (bridges). */
  private readonly walkable: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    base: Ground = 'grass',
  ) {
    const n = width * height;
    this.terrain = new Uint8Array(n).fill(GROUNDS.indexOf(base));
    this.ground = new Int16Array(n).fill(-1);
    this.decal = new Int16Array(n).fill(-1);
    this.solid = new Uint8Array(n);
    this.walkable = new Uint8Array(n);
    this.ledges = new Uint8Array(n);
    this.areaOf = new Uint8Array(n).fill(255);
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  cityTile(i: number) {
    return city(i);
  }

  waterTile(i: number) {
    return at('water', i);
  }

  /** A hidden thing to find (see game/lore.ts SECRETS). */
  secret(s: { id: string; x: number; y: number }) {
    this.spots.push({ kind: 'secret', x: s.x, y: s.y, secret: s.id });
  }

  /** Someone glimpsed in the distance, who vanishes when you come close. */
  sighting(s: Sighting) {
    this.sightings.push(s);
  }

  // ── Ground ─────────────────────────────────────────────────────────────────

  paint(g: Ground, x: number, y: number) {
    if (this.inside(x, y)) this.terrain[y * this.width + x] = GROUNDS.indexOf(g);
  }

  groundAt(x: number, y: number): Ground | null {
    return this.inside(x, y) ? GROUNDS[this.terrain[y * this.width + x]!]! : null;
  }

  rect(g: Ground, x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.paint(g, x + i, y + j);
  }

  /** An ellipse, its edge roughened a little so it doesn't look drawn with a compass. */
  blob(g: Ground, cx: number, cy: number, rx: number, ry: number, rough = 0.18) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (d <= 1 + (hash(x, y) - 0.5) * rough * 2) this.paint(g, x, y);
      }
  }

  /** A path through these points, `width` cells wide, with gently wobbling edges. */
  path(g: Ground, points: Point[], width = 2) {
    const r = width / 2;
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k]!;
      const b = points[k + 1]!;
      const minX = Math.floor(Math.min(a.x, b.x) - r - 1);
      const maxX = Math.ceil(Math.max(a.x, b.x) + r + 1);
      const minY = Math.floor(Math.min(a.y, b.y) - r - 1);
      const maxY = Math.ceil(Math.max(a.y, b.y) + r + 1);
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) {
          const d = distToSegment({ x: x + 0.5, y: y + 0.5 }, a, b);
          if (d <= r + (hash(x * 0.7, y * 1.3) - 0.5) * 0.5) this.paint(g, x, y);
        }
    }
  }

  setGround(x: number, y: number, tile: number) {
    if (!this.inside(x, y)) return;
    this.terrain[y * this.width + x] = GROUNDS.indexOf('paved');
    this.ground[y * this.width + x] = tile;
  }

  setDecal(x: number, y: number, tile: number) {
    if (this.inside(x, y)) this.decal[y * this.width + x] = tile;
  }

  /** Stretch a 3×3 slice over a rectangle of ground. */
  fill(x: number, y: number, w: number, h: number, s: Slice) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const col = i === 0 ? 0 : i === w - 1 ? 2 : 1;
        const row = j === 0 ? 0 : j === h - 1 ? 2 : 1;
        this.setGround(x + i, y + j, s[row * 3 + col]!);
      }
  }

  /**
   * A cobbled square with kerbstones round its edge, and a few drains, cracks and puddles
   * scattered over it so a big square doesn't look like a flat colour.
   */
  plaza(x: number, y: number, w: number, h: number, grey = false) {
    const paving = grey ? 'grey' : 'warm';
    const c0 = TOWN.cobbles[paving];
    const k0 = TOWN.kerb[paving];
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const cx = x + i;
        const cy = y + j;
        this.setGround(cx, cy, town(c0 + (((cx % 4) + 4) % 4), ((cy % 4) + 4) % 4));
        const col = i === 0 ? 0 : i === w - 1 ? 2 : 1;
        const row = j === 0 ? 0 : j === h - 1 ? 2 : 1;
        if (col !== 1 || row !== 1) this.setDecal(cx, cy, town(k0 + col, row));
        else {
          this.setDecal(cx, cy, -1);
          const n = hash(cx * 1.31, cy * 0.77);
          if (n < 0.045) this.setDecal(cx, cy, town(TOWN.details[Math.floor(n * 1000) % TOWN.details.length]!, 3));
        }
      }
  }

  /** A round mosaic (4×4) set into a square, its top-left at (x, y). */
  mosaic(x: number, y: number, kind: keyof typeof TOWN.mosaics) {
    const m = TOWN.mosaics[kind];
    const c0 = TOWN.cobbles[m.paving];
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 4; i++) {
        this.setGround(x + i, y + j, town(c0 + (((x + i) % 4) + 4) % 4, (((y + j) % 4) + 4) % 4));
        this.setDecal(x + i, y + j, town(m.col + i, 4 + j));
      }
  }

  /** A round fountain (4×4) on a square. Its water glows once `group` is lit. */
  fountain(x: number, y: number, group?: string) {
    const tiles: number[] = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) tiles.push(town(TOWN.fountain + i, 4 + j));
    this.object(x, y, 4, 4, tiles, group);
    this.block(x, y + 1, 4, 3);
  }

  /**
   * A clocktower (5 wide, 10 tall). Its clock face and windows glow once `group` is lit.
   * Returns the cell just outside its door.
   */
  clocktower(x: number, y: number, style: TowerStyle = 'town', group?: string): Point {
    const c0 = TOWN.towers[style];
    const tiles: number[] = [];
    for (let j = 0; j < 10; j++) for (let i = 0; i < 5; i++) tiles.push(town(c0 + i, 8 + j));
    this.object(x, y, 5, 10, tiles, group);
    // Only the bottom storeys stand on the ground; the top is seen from in front.
    this.block(x, y + 5, 5, 5);
    return { x: x + 2, y: y + 10 };
  }

  // ── Under the sea (Brightwater Deep) ──────────────────────────────────────

  /**
   * A reef over columns x0..x1, from the top of the map down to about row `edge` (side
   * 'top') or from about `edge` to the bottom: kelp, coral and rocks, too thick to get
   * through. The edge wanders, like a tree line.
   */
  reef(x0: number, x1: number, side: 'top' | 'bottom', edge: number) {
    const wander = (x: number) => Math.round(Math.sin(x * 0.41) * 1.3 + Math.sin(x * 0.13 + 1) * 1.2);
    const kinds: DeepTall[] = ['kelp', 'kelpDark', 'kelp', 'kelpGold', 'kelpDark'];
    for (let x = x0; x < x1; x++) {
      const lim = edge + wander(x);
      const [from, to] = side === 'top' ? [0, lim] : [lim, this.height - 1];
      this.block(x, from, 1, to - from + 1);
      // Something two tall standing on every other row (staggered by column), so the reef has
      // no gaps: its foot on row `foot`, its top on the row above.
      for (let foot = from; foot <= to; foot++) {
        const n = hash(x * 1.3, foot * 0.7);
        const t = DEEP.talls[kinds[Math.floor(n * 100) % kinds.length]!];
        // Rocks and coral clumps at the kelp's feet, so the reef reads as a solid mass.
        const clump = n < 0.18 ? 'rock' : n < 0.36 ? 'brainCoral' : n < 0.44 ? 'coral' : null;
        if (clump) this.object(x, foot - 1, 1, 2, [deep(t.col, 1), deep(DEEP.smalls[clump].col, 0)]);
        else this.object(x, foot - 1, 1, 2, [deep(t.col, 1), deep(t.col, 2)]);
      }
    }
  }

  /** A wall of reef down column `x`, with a gap at rows gapFrom..gapTo where the way goes through. */
  reefWall(x: number, gapFrom: number, gapTo: number) {
    for (let y = 0; y < this.height; y++) {
      if (y >= gapFrom && y <= gapTo) continue;
      const i = y * this.width + x;
      if (!this.solid[i] && !this.taken.has(i)) {
        const n = hash(x, y * 1.1);
        this.object(x, y - 1, 1, 2, [deep(DEEP.talls[n < 0.5 ? 'kelpDark' : 'kelp'].col, 1), deep(DEEP.talls[n < 0.5 ? 'kelpDark' : 'kelp'].col, 2)]);
      }
      this.block(x, y, 1, 1);
    }
  }

  /** Rippled seabed over a rectangle, with shells, pebbles and sea grass strewn about. */
  seabed(x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const cx = x + i;
        const cy = y + j;
        this.setGround(cx, cy, deep(((cx % 4) + 4) % 4, ((cy % 4) + 4) % 4));
        this.setDecal(cx, cy, -1);
        const n = hash(cx * 0.91, cy * 1.73);
        const strewn: DeepSmall[] = ['pebbles', 'seagrass', 'shell', 'pebbles', 'seagrass', 'starfish'];
        if (n < 0.05) this.setDecal(cx, cy, deep(DEEP.smalls[strewn[Math.floor(n * 1000) % strewn.length]!].col, 0));
      }
  }

  /** Something small on the seabed: flat ones you walk over, the rest are in the way. */
  deepProp(x: number, y: number, name: DeepSmall, group?: string) {
    const s = DEEP.smalls[name];
    this.object(x, y, 1, 1, [deep(s.col, 0)], group, s.flat);
    if (!s.flat) this.block(x, y, 1, 1);
  }

  /** Something two tall standing on row `y` (kelp, an anchor, a coral tree…). */
  deepTall(x: number, y: number, name: DeepTall, group?: string) {
    const t = DEEP.talls[name];
    const tiles: number[] = [];
    for (let j = 0; j < 2; j++) for (let i = 0; i < t.w; i++) tiles.push(deep(t.col + i, 1 + j));
    this.object(x, y - 1, t.w, 2, tiles, group);
    this.block(x, y, t.w, 1);
  }

  /**
   * A jar lamp: lightning in a jar on a post. Its glass glows and lights the seabed round it
   * once `group` is lit.
   */
  jarLamp(x: number, y: number, group: string) {
    this.deepTall(x, y, 'jar', group);
    this.lights.push({ x: x + 0.5, y: y - 0.6, radius: 4.6, color: '#ffe8a0', group });
  }

  /** A big piece (a dome house, the Heart Jar, the wreck…). Returns the cell outside its door. */
  deepBig(x: number, y: number, name: DeepBig, group?: string): Point {
    const b = DEEP.big[name];
    const tiles: number[] = [];
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) tiles.push(deep(b.col + i, b.row + j));
    this.object(x, y, b.w, b.h, tiles, group);
    this.block(x, y + b.h - b.solid, b.w, b.solid);
    return { x: x + b.door, y: y + b.h };
  }

  /** Plain asphalt with a little variety (it clears any kerb or crack drawn there). */
  asphalt(x: number, y: number, w: number, h: number) {
    const a = TILES.asphalt;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        this.setDecal(x + i, y + j, -1);
        const n = hash(x + i, y + j);
        this.setGround(x + i, y + j, n < 0.7 ? a[0]! : a[1 + (Math.floor((n - 0.7) * 10) % 3)]!);
      }
  }

  /** A three-lane road; `at` is its top row (or left column). */
  road(dir: 'h' | 'v', at: number, from: number, to: number) {
    if (dir === 'h') {
      this.asphalt(from, at, to - from, 3);
      for (let x = from; x < to; x++) if (x % 2 === 0) this.setDecal(x, at + 1, TILES.dashH);
    } else {
      this.asphalt(at, from, 3, to - from);
      for (let y = from; y < to; y++) if (y % 2 === 0) this.setDecal(at + 1, y, TILES.dashV);
    }
  }

  /** Zebra stripes across a road, one cell wide. */
  zebra(dir: 'h' | 'v', x: number, y: number) {
    for (let k = 0; k < 3; k++)
      if (dir === 'h') this.setDecal(x, y + k, TILES.zebraH);
      else this.setDecal(x + k, y, TILES.zebraV);
  }

  /** Where two roads meet: clear the lane dashes. */
  junction(x: number, y: number) {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) this.setDecal(x + i, y + j, -1);
    this.setDecal(x + 1, y + 1, TILES.cross);
  }

  /**
   * A boardwalk or bridge: planks you can walk on, even over water. A bridge has rails
   * along its sides, so you can only get on and off at its ends.
   */
  boards(x: number, y: number, w: number, h: number, along: 'h' | 'v' = 'h', rails = false) {
    if (rails) {
      if (along === 'h') {
        this.block(x, y - 1, w, 1);
        this.block(x, y + h, w, 1);
      } else {
        this.block(x - 1, y, 1, h);
        this.block(x + w, y, 1, h);
      }
    }
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        this.object(x + i, y + j, 1, 1, [along === 'h' ? TILES.planks : TILES.planksV], undefined, true);
        if (this.inside(x + i, y + j)) this.walkable[(y + j) * this.width + x + i] = 1;
      }
  }

  // ── Hills, caves, stones and chests ───────────────────────────────────────

  /**
   * A raised hill seen from the front: grass on top, a cliff face along the bottom. Its rim
   * (left, right, top and the cliff) is solid; the inside is walkable. Get up with a ladder.
   * Needs w ≥ 3 and h ≥ 3 to have an inside.
   */
  plateau(x: number, y: number, w: number, h: number, style: ReliefStyle = 'green') {
    const r = RELIEF[style];
    // The cliff is two tiles tall when there's room: plain wall, then the cliff's ragged foot.
    const tall = h >= 5 && w >= 3;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const row = j === 0 ? 0 : j === h - 1 ? 2 : 1;
        const col = i === 0 ? 0 : i === w - 1 ? 2 : 1;
        const wall = tall && j === h - 2;
        this.setGround(x + i, y + j, wall ? WALL[style][col]! : w === 1 ? r.strip[row]! : r.slice[row * 3 + col]!);
        const rim = i === 0 || i === w - 1 || j === 0 || j >= h - (tall ? 2 : 1);
        if (rim && this.inside(x + i, y + j)) this.solid[(y + j) * this.width + x + i] = 1;
        else if (this.inside(x + i, y + j)) this.solid[(y + j) * this.width + x + i] = 0;
        this.taken.add((y + j) * this.width + x + i);
      }
  }

  /** A ladder up a cliff face (the cell on the plateau's bottom row). Opens a way through the rim. */
  ladder(x: number, y: number, style: ReliefStyle = 'green') {
    // Up the whole face: the bottom row y, and the wall row above it if the cliff is tall.
    for (const yy of [y, y - 1]) {
      if (!this.inside(x, yy)) continue;
      if (yy !== y && !this.solid[yy * this.width + x]) continue;
      this.setDecal(x, yy, LADDER[style]);
      this.solid[yy * this.width + x] = 0;
    }
  }

  /** A cave mouth in a hillside. Solid; its doorway is the spot at (x+1, y+2). Returns that cell. */
  cave(x: number, y: number, style: ReliefStyle = 'green'): Point {
    this.object(x, y, 3, 3, CAVES[style].slice());
    this.block(x, y, 3, 3);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) this.taken.add((y + j) * this.width + x + i);
    return { x: x + 1, y: y + 2 };
  }

  /** Stepping stones across water: you can walk on each one. */
  stones(cells: (readonly [number, number])[]) {
    for (const [x, y] of cells) {
      if (!this.inside(x, y)) continue;
      this.object(x, y, 1, 1, [at('water', 12)], undefined, true);
      this.walkable[y * this.width + x] = 1;
    }
  }

  /** A hidden chest of sparks. Solid, so you stand beside it. */
  chest(id: string, x: number, y: number, sparks: number) {
    this.object(x, y, 1, 1, [CHEST]);
    this.block(x, y, 1, 1);
    this.spots.push({ kind: 'chest', x, y, id, sparks });
  }

  // ── Puzzles: rocks, ledges, fishing ───────────────────────────────────────

  /** A boulder you can push (world/rocks.ts). It starts on open ground; the screen draws it. */
  rock(x: number, y: number) {
    if (!this.inside(x, y)) return;
    this.rocks.push({ x, y });
    this.taken.add(y * this.width + x);
  }

  /** A sign that puts every rock back where it started. */
  rockReset(x: number, y: number) {
    this.prop(x, y, 'sign');
    this.spots.push({ kind: 'reset', x, y });
  }

  /**
   * A one-way ledge, `w` cells wide: step off it downward, but you can't climb up into it from
   * below. Its ends need something solid beside them, or you could walk round.
   */
  ledge(x: number, y: number, w: number, style: ReliefStyle = 'green') {
    for (let i = 0; i < w; i++) {
      if (!this.inside(x + i, y)) continue;
      this.setGround(x + i, y, RELIEF[style].slice[7]!);
      this.solid[y * this.width + x + i] = 0;
      this.ledges[y * this.width + x + i] = 1;
      this.taken.add(y * this.width + x + i);
    }
  }

  /** Keep trees and other clutter off this rectangle from now on. */
  reserve(x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (this.inside(x + i, y + j)) this.taken.add((y + j) * this.width + x + i);
  }

  /** Pull out the trees and bushes (anything that sways) standing on a rectangle, and free their cells. */
  clearRect(x: number, y: number, w: number, h: number) {
    const hit = (o: WorldObject) => o.sway && o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y;
    for (let k = this.objects.length - 1; k >= 0; k--) {
      const o = this.objects[k]!;
      if (!hit(o)) continue;
      // The trunk row is the solid one.
      for (let i = 0; i < o.w; i++) if (this.inside(o.x + i, o.y + o.h - 1)) this.solid[(o.y + o.h - 1) * this.width + o.x + i] = 0;
      this.objects.splice(k, 1);
    }
    this.reserve(x, y, w, h);
  }

  /** A water cell to fish in from the shore. */
  fish(id: string, x: number, y: number) {
    this.spots.push({ kind: 'fish', x, y, id });
  }

  // ── Things standing on the ground ─────────────────────────────────────────

  block(x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if (this.inside(x + i, y + j)) this.solid[(y + j) * this.width + x + i] = 1;
  }

  object(x: number, y: number, w: number, h: number, tiles: number[], group?: string, flat = false) {
    this.objects.push({ x, y, w, h, tiles, group, flat: flat || undefined });
  }

  /** A village house. Returns the cell just outside its door. */
  house(style: HouseStyle, x: number, y: number, group?: string): Point {
    const h = HOUSES[style];
    this.object(x, y, h.w, h.h, cut('house', h.i, h.w, h.h), group);
    this.block(x, y, h.w, h.h);
    return { x: x + h.door, y: y + h.h };
  }

  /** An old mossy building. Returns the cell just outside its door. */
  ruin(style: RuinStyle, x: number, y: number, group?: string): Point {
    const r = RUINS[style];
    this.object(x, y, r.w, r.h, cut('abandoned', r.i, r.w, r.h), group);
    this.block(x, y + Math.max(0, r.h - 3), r.w, Math.min(3, r.h));
    return { x: x + r.door, y: y + r.h };
  }

  /** A big mossy tree, boulder or statue; it blocks its bottom row (two rows for pillars). */
  mossy(style: MossyStyle, x: number, y: number) {
    const m = MOSSY[style];
    this.object(x, y, m.w, m.h, cut('abandoned', m.i, m.w, m.h));
    this.block(x, y + m.h - 1, m.w, 1);
  }

  /**
   * A city building: a roof seen from above, then a two-row brick front with windows on
   * top and a door below. Returns the tile just outside its door.
   */
  building(spec: BuildingSpec): Point {
    const { x, y, w, roof = 2, roofStyle = 'tan', wall = 'red', door = 'wood', window = 'arch' } = spec;
    const doorAt = spec.doorAt ?? Math.floor(w / 2);
    const r = CITY_ROOFS[roofStyle];
    const walls = CITY_WALLS[wall];
    const h = roof + 2;
    const tiles: number[] = [];
    for (let j = 0; j < roof; j++)
      for (let i = 0; i < w; i++) {
        const col = i === 0 ? 0 : i === w - 1 ? 2 : 1;
        const row = j === 0 ? 0 : j === roof - 1 ? 2 : 1;
        tiles.push(r[row * 3 + col]!);
      }
    const edge = (row: readonly number[], i: number) => row[i === 0 ? 0 : i === w - 1 ? 2 : 1]!;
    for (let i = 0; i < w; i++) tiles.push(edge(walls.top, i));
    for (let i = 0; i < w; i++) tiles.push(edge(walls.bottom, i));
    this.object(x, y, w, h, tiles, spec.group);

    // Windows and door sit in front of the brick, as a second layer.
    const front: number[] = new Array(w * h).fill(-1);
    for (let i = 1; i < w - 1; i++) if (i % 2 === 1 || w <= 4) front[roof * w + i] = CITY_WINDOWS[window];
    front[(roof + 1) * w + doorAt] = CITY_DOORS[door];
    if (spec.storefront && doorAt >= 3) {
      STOREFRONT.forEach((t, k) => (front[(roof + 1) * w + doorAt - 3 + k] = t));
    } else {
      for (let i = 1; i < w - 1; i++)
        if (Math.abs(i - doorAt) > 1 && i % 2 === 1) front[(roof + 1) * w + i] = CITY_WINDOWS.square;
    }
    this.object(x, y, w, h, front, spec.group);
    this.block(x, y, w, h);
    return { x: x + doorAt, y: y + h };
  }

  /**
   * A row of town buildings (nobody's job) filling columns x0..x1 with their fronts on row
   * `bottom`, so a city street has a skyline instead of an edge. Their windows stay dark
   * until `group` is lit.
   */
  skyline(x0: number, x1: number, bottom: number, group?: string) {
    const roofs = ['tan', 'slate'] as const;
    const walls = ['red', 'orange'] as const;
    const windows = ['arch', 'square', 'wide', 'tall'] as const;
    let x = x0;
    for (let k = 0; x < x1; k++) {
      const w = Math.min(x1 - x, 4 + Math.floor(hash(x, bottom) * 4));
      if (w < 3) break;
      const roof = 2 + Math.floor(hash(x + 3, bottom) * 2);
      this.building({
        x,
        y: bottom - roof - 1,
        w,
        roof,
        roofStyle: roofs[k % 2],
        wall: walls[Math.floor(hash(x, 7) * 2)]!,
        window: windows[Math.floor(hash(x, 11) * 4)]!,
        door: 'wood',
        group,
      });
      x += w;
    }
  }

  /** A tree whose trunk stands on row `y` (its crown reaches up above). */
  tree(x: number, y: number, style: TreeStyle = 'round') {
    const t = TREES[style];
    this.object(x, y - t.h + 1, t.w, t.h, [...t.tiles]);
    this.objects[this.objects.length - 1]!.sway = true;
    if (t.w === 3) this.block(x, y, 3, 1);
    else this.block(x, y, t.w, 1);
  }

  /** Trees scattered over a rectangle, skipping cells that are already taken. */
  forest(x: number, y: number, w: number, h: number, styles: TreeStyle[], density = 0.5) {
    for (let j = 0; j < h; j += 2)
      for (let i = 0; i < w; i += 2) {
        const n = hash(x + i + 0.11, y + j + 0.37);
        if (n > density) continue;
        const style = styles[Math.floor(hash(x + i, y + j + 5) * styles.length)]!;
        const t = TREES[style];
        const tx = x + i + (n < density / 2 ? 0 : 1) * (t.w === 1 ? 1 : 0);
        const ty = y + j + 1;
        if (!this.free(tx, ty - t.h + 1, t.w, t.h)) continue;
        this.tree(tx, ty, style);
      }
  }

  /**
   * A thick, natural-looking tree line over columns x0..x1: from the top of the map down to
   * about row `edge` (side 'top'), or from about row `edge` to the bottom ('bottom'). The
   * edge wanders a little, and trees are staggered so no grid shows through.
   */
  treeLine(x0: number, x1: number, side: 'top' | 'bottom', edge: number, styles: TreeStyle[]) {
    const wander = (x: number) => Math.round(Math.sin(x * 0.45) * 1.2 + Math.sin(x * 0.17 + 2) * 1.3);
    const rows: number[] = [];
    if (side === 'top') for (let y = edge + 2; y >= -1; y -= 1) rows.push(y);
    else for (let y = edge - 1; y < this.height; y += 1) rows.push(y);
    for (const y of rows)
      for (let x = x0 - 1 + (y & 1); x < x1; x += 2) {
        const lim = edge + wander(x);
        if (side === 'top' ? y > lim : y - 1 < lim) continue;
        const style = styles[Math.floor(hash(x * 1.7, y * 0.9) * styles.length)]!;
        const t = TREES[style];
        const tx = x + (t.w === 3 ? -1 : 0);
        if (tx < x0 - 1 || tx + t.w > x1 + 1) continue;
        if (!this.free(tx, y - t.h + 1, t.w, t.h, true)) continue;
        this.tree(tx, y, style);
        this.claim(tx, y - t.h + 1, t.w, t.h);
      }
  }

  /** Cells covered by a tree's crown, so the next tree doesn't stand inside it. */
  private readonly taken = new Set<number>();
  private claim(x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.taken.add((y + j) * this.width + x + i);
  }

  /** Nothing solid or standing in this rectangle yet. */
  free(x: number, y: number, w: number, h: number, offMapOk = false): boolean {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        if (!this.inside(x + i, y + j)) {
          if (offMapOk) continue;
          return false;
        }
        if (this.solid[(y + j) * this.width + x + i] || this.taken.has((y + j) * this.width + x + i)) return false;
        const g = this.groundAt(x + i, y + j);
        if (g !== 'grass' && g !== 'meadow') return false;
      }
    return true;
  }

  prop(x: number, y: number, name: PropName) {
    const p = PROPS[name];
    this.object(x, y, 1, 1, [p.t]);
    if (name === 'reeds' || name === 'fern' || name === 'sunflower' || name === 'tulip' || name === 'daisy') this.objects[this.objects.length - 1]!.sway = true;
    if (p.solid) this.block(x, y, 1, 1);
  }

  bush(x: number, y: number) {
    this.object(x, y, 1, 1, [BUSHES[Math.floor(hash(x, y) * BUSHES.length)]!]);
    this.objects[this.objects.length - 1]!.sway = true;
    this.block(x, y, 1, 1);
  }

  /** Flowers you can walk through. */
  flowers(x: number, y: number) {
    this.object(x, y, 1, 1, [FLOWERS[Math.floor(hash(x, y) * FLOWERS.length)]!], undefined, true);
    this.objects[this.objects.length - 1]!.sway = true;
  }

  /** A row of fence (or hedge) from x to x+w-1. */
  fence(x: number, y: number, w: number, kind: 'fence' | 'hedge' = 'fence') {
    const f = kind === 'fence' ? FENCE : HEDGE;
    for (let i = 0; i < w; i++) this.object(x + i, y, 1, 1, [i === 0 ? f.left : i === w - 1 ? f.right : f.mid]);
    this.block(x, y, w, 1);
  }

  /** A raised garden bed (field sheet) of crops or grass, w×h cells, w and h at least 2. */
  bed(x: number, y: number, w: number, h: number, kind: 'soil' | 'grass' | 'meadow' = 'soil') {
    const base = { soil: 0, grass: 15, meadow: 30 }[kind];
    const tiles: number[] = [];
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const col = i === 0 ? 0 : i === w - 1 ? 2 : 1;
        const row = j === 0 ? 0 : j === h - 1 ? 2 : 1;
        tiles.push(at('field', base + row * 5 + col));
      }
    this.object(x, y, w, h, tiles);
    this.block(x, y, w, h);
  }

  /** A two-tile street lamp. Its bulb glows and lights the street once `group` is lit. */
  lamp(x: number, y: number, group: string, style: LampStyle = 'post') {
    const [top, bottom] = LAMPS[style];
    this.object(x, y - 1, 1, 2, [city(top), city(bottom)], group);
    this.block(x, y, 1, 1);
    this.lights.push({ x: x + 0.5, y: y - 0.4, radius: 4.2, color: '#ffd27a', group });
  }

  /** Light that spills out of a doorway once the building's lights are fixed. */
  doorLight(p: Point, group: string) {
    this.lights.push({ x: p.x + 0.5, y: p.y - 0.2, radius: 3.4, color: '#ffc463', group });
  }

  glow(x: number, y: number, group: string, radius = 3, color = '#ffcf7a') {
    this.lights.push({ x, y, radius, color, group });
  }

  resident(who: string, x: number, y: number, facing: Facing, extra: Partial<Resident> = {}) {
    this.residents.push({ who, x, y, facing, ...extra });
    // People who come and go don't block their spot for good (see logic.blockedCells).
    if (!extra.after && !extra.until) this.block(x, y, 1, 1);
  }

  group(id: string, jobs: number[]) {
    this.groups[id] = jobs;
  }

  // ── The route ─────────────────────────────────────────────────────────────

  /**
   * Add the next area of the route, covering these rectangles (later areas win where they
   * overlap). Its light group `area:<id>` comes on once all its jobs are done.
   */
  area(spec: Area, rects: Rect[]): number {
    const index = this.areas.length;
    this.areas.push(spec);
    this.group(`area:${spec.id}`, spec.jobs);
    for (const j of spec.side ?? []) this.group(`job:${j}`, [j]);
    for (const r of rects)
      for (let j = 0; j < r.h; j++)
        for (let i = 0; i < r.w; i++) if (this.inside(r.x + i, r.y + j)) this.areaOf[(r.y + j) * this.width + r.x + i] = index;
    return index;
  }

  /**
   * A wall down column `x`, from the top of the map to the bottom, leaving a gap at rows
   * gapFrom..gapTo (where the road goes through). Bushes in the country, fence in town.
   */
  wall(x: number, gapFrom: number, gapTo: number, kind: 'bush' | 'fence' = 'bush') {
    for (let y = 0; y < this.height; y++) {
      if (y >= gapFrom && y <= gapTo) continue;
      const i = y * this.width + x;
      const g = this.groundAt(x, y);
      if (g === 'sea' || g === 'pond') continue; // water stops you already
      if (!this.solid[i] && !this.taken.has(i)) {
        if (kind === 'bush') this.object(x, y, 1, 1, [BUSHES[Math.floor(hash(x, y) * BUSHES.length)]!]);
        else this.object(x, y, 1, 1, [FENCE_POST]);
      }
      this.block(x, y, 1, 1);
    }
  }

  /**
   * A barrier across the way out of area `index`: road barriers on these cells, gone once
   * the area's jobs are done.
   */
  gate(index: number, cells: Point[], look: 'barrier' | 'kelp' = 'barrier') {
    const group = `area:${this.areas[index]!.id}`;
    // Under the sea, a thicket of dark kelp blocks the way instead of road barriers.
    const tiles = look === 'kelp' ? [deep(DEEP.talls.kelpDark.col, 2), deep(DEEP.talls.kelp.col, 2)] : BARRIER;
    cells.forEach((c, k) => this.objects.push({ x: c.x, y: c.y, w: 1, h: 1, tiles: [tiles[k % 2]!], until: group }));
    this.gates.push({ area: index, cells });
  }

  private water = new Uint8Array(0);

  finish(meta: { id: string; name: string; spawn: Point & { facing: Facing }; night?: string; underwater?: boolean }): WorldMap {
    this.water = new Uint8Array(this.width * this.height);
    this.resolveGround();
    return {
      ...meta,
      width: this.width,
      height: this.height,
      ground: this.ground,
      decal: this.decal,
      objects: this.objects,
      solid: this.solid,
      lights: this.lights,
      residents: this.residents,
      spots: this.spots,
      sightings: this.sightings,
      groups: this.groups,
      areas: this.areas,
      areaOf: this.areaOf,
      gates: this.gates,
      rocks: this.rocks,
      ledges: this.ledges,
      water: this.water,
      puzzles: this.puzzles,
    };
  }

  /** Turn painted terrain into tiles, picking edge pieces from the neighbours. */
  private resolveGround() {
    const { width, height } = this;
    const kind = (x: number, y: number) =>
      this.inside(x, y) ? GROUNDS[this.terrain[y * width + x]!]! : GROUNDS[this.terrain[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))]!]!;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const g = kind(x, y);
        const pick = (list: readonly number[]) => list[Math.floor(hash(x + 0.5, y + 0.25) * list.length)]!;
        if (g === 'paved') continue;
        if (g === 'grass') this.ground[i] = pick(GRASS);
        else if (g === 'meadow') this.ground[i] = pick(MEADOW);
        else if (g === 'sand') this.ground[i] = pick(SAND);
        else {
          const same = (dx: number, dy: number) => kind(x + dx, y + dy) === g;
          let mask = 0;
          if (same(0, -1)) mask |= N;
          if (same(1, 0)) mask |= E;
          if (same(0, 1)) mask |= S;
          if (same(-1, 0)) mask |= W;
          if (same(1, -1)) mask |= NE;
          if (same(1, 1)) mask |= SE;
          if (same(-1, 1)) mask |= SW;
          if (same(-1, -1)) mask |= NW;
          const options = TERRAIN_TILES[g][mask]!;
          this.ground[i] = pick(options.length ? options : TERRAIN_TILES[g][255]!);
        }
        if ((g === 'pond' || g === 'sea') && !this.walkable[i]) {
          this.solid[i] = 1;
          this.water[i] = 1;
        }
      }
  }
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
