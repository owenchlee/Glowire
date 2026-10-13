// Builds a city map out of big pieces (roads, blocks, buildings, props) instead of
// thousands of hand-placed tiles. Tile numbers index the city sheet (assets/art/city.png,
// 27 tiles across), built from Kenney's RPG Urban pack.

import type { Facing, LightSource, Point, Resident, Spot, WorldMap, WorldObject } from './types';

/** A 3×3 set of tiles: corners, edges and middle, for stretching a rectangle. */
type Slice = readonly [number, number, number, number, number, number, number, number, number];

const ATLAS_COLS = 27;
/** Village-pack sheets packed under the city tiles (see scripts/art.mjs). */
const floor = (i: number) => (18 + Math.floor(i / 22)) * ATLAS_COLS + (i % 22);
const nature = (i: number) => (44 + Math.floor(i / 24)) * ATLAS_COLS + (i % 24);
/** A 2×2 piece of the nature sheet whose top-left tile is `i`. */
const big = (i: number) => [nature(i), nature(i + 1), nature(i + 24), nature(i + 25)];

const GRASS = floor(264);

export const CITY = {
  sidewalk: [8, 9, 10, 35, 36, 37, 62, 63, 64] as Slice,
  grass: [GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS, GRASS] as Slice,
  grassTufts: [floor(265), floor(266), floor(267), floor(268), floor(244), floor(245)],
  water: [170, 171, 172, 197, 198, 199, 224, 225, 226] as Slice,
  plaza: [81, 82, 83, 108, 109, 110, 135, 136, 137] as Slice,
  asphalt: [440, 441, 466, 468],
  dashH: 433,
  dashV: 462,
  cross: 407,
  zebraH: 435, // stripes for crossing a road that runs left–right
  zebraV: 432, // stripes for crossing a road that runs up–down
  roofs: {
    tan: [81, 82, 83, 108, 109, 110, 135, 136, 137] as Slice,
    slate: [89, 90, 91, 116, 117, 118, 143, 144, 145] as Slice,
  },
  walls: {
    red: { top: [17, 18, 19], band: [44, 45, 46], mid: [71, 72, 73], bottom: [98, 99, 100] },
    orange: {
      top: [125, 126, 127],
      band: [152, 153, 154],
      mid: [179, 180, 181],
      bottom: [206, 207, 208],
    },
  },
  windows: { arch: 336, square: 363, wide: 390, tall: 417 },
  doors: { wood: 283, double: 284, glass: 285, shop: 257 },
  storefront: [359, 360, 361],
  /** Two-tile props: [top, bottom]. */
  lamps: { twin: [162, 189], hook: [164, 191], post: [168, 195], park: [169, 196] },
  /** Big 2×2 trees from the village pack. */
  trees: { round: big(0), pine: big(2), cherry: big(14), oak: big(16), lime: big(18) },
  bushes: [nature(240), nature(241), nature(242), nature(246)],
  flowers: [nature(264), nature(265), nature(267), nature(270)],
  props: {
    bench: 381,
    bin: 279,
    mailbox: 305,
    planter: 276,
    flowers: 277,
    hydrant: 251,
    cone: 307,
    hedge: 330,
    fence: 383,
  },
} as const;

export type RoofStyle = keyof typeof CITY.roofs;
export type WallStyle = keyof typeof CITY.walls;
export type DoorStyle = keyof typeof CITY.doors;
export type LampStyle = keyof typeof CITY.lamps;
export type TreeStyle = keyof typeof CITY.trees;
export type PropName = keyof typeof CITY.props;

export interface BuildingSpec {
  x: number;
  y: number;
  w: number;
  /** Rows of roof seen from above (2–3). */
  roof?: number;
  roofStyle?: RoofStyle;
  wall?: WallStyle;
  door?: DoorStyle;
  /** Column of the door, counted from the building's left edge. Default: middle. */
  doorAt?: number;
  /** A shop window along the bottom row, left of the door. */
  storefront?: boolean;
  window?: keyof typeof CITY.windows;
  /** Light group for its windows (e.g. "job:3"). */
  group?: string;
}

/** Deterministic noise so maps come out the same every time. */
function hash(x: number, y: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export class MapBuilder {
  readonly ground: Int16Array;
  readonly decal: Int16Array;
  readonly solid: Uint8Array;
  readonly objects: WorldObject[] = [];
  readonly lights: LightSource[] = [];
  readonly residents: Resident[] = [];
  readonly spots: Spot[] = [];
  readonly groups: Record<string, number[]> = {};

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.ground = new Int16Array(width * height).fill(-1);
    this.decal = new Int16Array(width * height).fill(-1);
    this.solid = new Uint8Array(width * height);
  }

  private inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  setGround(x: number, y: number, tile: number) {
    if (this.inside(x, y)) this.ground[y * this.width + x] = tile;
  }

  setDecal(x: number, y: number, tile: number) {
    if (this.inside(x, y)) this.decal[y * this.width + x] = tile;
  }

  block(x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if (this.inside(x + i, y + j)) this.solid[(y + j) * this.width + x + i] = 1;
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

  /** Plain asphalt with a little variety. */
  asphalt(x: number, y: number, w: number, h: number) {
    const a = CITY.asphalt;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const n = hash(x + i, y + j);
        this.setGround(x + i, y + j, n < 0.7 ? a[0] : a[1 + Math.floor((n - 0.7) * 10) % 3]!);
      }
  }

  /** A three-lane road across the map; `at` is its top row (or left column). */
  road(dir: 'h' | 'v', at: number, from = 0, to = dir === 'h' ? this.width : this.height) {
    if (dir === 'h') {
      this.asphalt(from, at, to - from, 3);
      for (let x = from; x < to; x++) if (x % 2 === 0) this.setDecal(x, at + 1, CITY.dashH);
    } else {
      this.asphalt(at, from, 3, to - from);
      for (let y = from; y < to; y++) if (y % 2 === 0) this.setDecal(at + 1, y, CITY.dashV);
    }
  }

  /** Where two roads meet: clear the lane dashes, paint zebra crossings around it. */
  junction(x: number, y: number) {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) this.setDecal(x + i, y + j, -1);
    this.setDecal(x + 1, y + 1, CITY.cross);
    for (let k = 0; k < 3; k++) {
      this.setDecal(x - 1, y + k, CITY.zebraH);
      this.setDecal(x + 3, y + k, CITY.zebraH);
      this.setDecal(x + k, y - 1, CITY.zebraV);
      this.setDecal(x + k, y + 3, CITY.zebraV);
    }
  }

  sidewalk(x: number, y: number, w: number, h: number) {
    this.fill(x, y, w, h, CITY.sidewalk);
  }

  /** Grass, with a few tufts scattered over it. */
  park(x: number, y: number, w: number, h: number) {
    this.fill(x, y, w, h, CITY.grass);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const n = hash(x + i + 0.3, y + j + 0.7);
        if (n < 0.18) this.setGround(x + i, y + j, CITY.grassTufts[Math.floor(n * 33) % 6]!);
      }
  }

  bush(x: number, y: number) {
    this.object(x, y, 1, 1, [CITY.bushes[Math.floor(hash(x, y) * 4)]!]);
    this.block(x, y, 1, 1);
  }

  /** Flowers you can walk through. */
  flowers(x: number, y: number) {
    this.object(x, y, 1, 1, [CITY.flowers[Math.floor(hash(x, y) * 4)]!]);
  }

  pond(x: number, y: number, w: number, h: number) {
    this.fill(x, y, w, h, CITY.water);
    this.block(x, y, w, h);
  }

  object(x: number, y: number, w: number, h: number, tiles: number[], group?: string) {
    this.objects.push({ x, y, w, h, tiles, group });
  }

  /**
   * A building: a roof seen from above, then a two-row brick front with windows on top and
   * a door below. Returns the tile just outside its door.
   */
  building(spec: BuildingSpec): Point {
    const { x, y, w, roof = 2, roofStyle = 'tan', wall = 'red', door = 'wood', window = 'arch' } = spec;
    const doorAt = spec.doorAt ?? Math.floor(w / 2);
    const r = CITY.roofs[roofStyle];
    const walls = CITY.walls[wall];
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
    for (let i = 1; i < w - 1; i++) if (i % 2 === 1 || w <= 4) front[roof * w + i] = CITY.windows[window];
    front[(roof + 1) * w + doorAt] = CITY.doors[door];
    if (spec.storefront && doorAt >= 3) {
      CITY.storefront.forEach((t, k) => (front[(roof + 1) * w + doorAt - 3 + k] = t));
    } else {
      for (let i = 1; i < w - 1; i++)
        if (Math.abs(i - doorAt) > 1 && i % 2 === 1) front[(roof + 1) * w + i] = CITY.windows.square;
    }
    this.object(x, y, w, h, front, spec.group);
    this.block(x, y, w, h);
    return { x: x + doorAt, y: y + h };
  }

  /** A two-tile street lamp. Its bulb glows and lights the street once `group` is lit. */
  lamp(x: number, y: number, group: string, style: LampStyle = 'post') {
    const [top, bottom] = CITY.lamps[style];
    this.object(x, y - 1, 1, 2, [top, bottom], group);
    this.block(x, y, 1, 1);
    this.lights.push({ x: x + 0.5, y: y - 0.4, radius: 4.2, color: '#ffd27a', group });
  }

  /** A big tree whose trunk stands on (x, y) and (x+1, y); its crown overhangs the row above. */
  tree(x: number, y: number, style: TreeStyle = 'round') {
    this.object(x, y - 1, 2, 2, [...CITY.trees[style]]);
    this.block(x, y, 2, 1);
  }

  prop(x: number, y: number, name: PropName, solid = true) {
    this.object(x, y, 1, 1, [CITY.props[name]]);
    if (solid) this.block(x, y, 1, 1);
  }

  /** Light that spills out of a doorway once the building's lights are fixed. */
  doorLight(p: Point, group: string) {
    this.lights.push({ x: p.x + 0.5, y: p.y - 0.2, radius: 3.4, color: '#ffc463', group });
  }

  resident(who: string, x: number, y: number, facing: Facing, extra: Partial<Resident> = {}) {
    this.residents.push({ who, x, y, facing, ...extra });
    this.block(x, y, 1, 1);
  }

  group(id: string, jobs: number[]) {
    this.groups[id] = jobs;
  }

  finish(meta: {
    id: string;
    name: string;
    spawn: Point & { facing: Facing };
  }): WorldMap {
    return {
      ...meta,
      sheet: 'city',
      width: this.width,
      height: this.height,
      ground: this.ground,
      decal: this.decal,
      objects: this.objects,
      solid: this.solid,
      lights: this.lights,
      residents: this.residents,
      spots: this.spots,
      groups: this.groups,
    };
  }
}
