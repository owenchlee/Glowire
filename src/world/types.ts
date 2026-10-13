// An explorable world: a grid of 16px tiles the hero walks around on. Pure data, no React.

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

/** A stack of tiles drawn as one piece and depth-sorted by its bottom row (trees, lamps, buildings). */
export interface WorldObject {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Tile indices, row by row (w × h); -1 leaves a cell empty. */
  tiles: number[];
  /** Light group: its glowing pixels light up once this group is lit. */
  group?: string;
}

/** A pool of light (lamp, lit doorway). Shines only while its group is lit. */
export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  group: string;
}

/** A townsperson standing somewhere in the world. */
export interface Resident {
  /** Cast id (game/cast.ts); also picks the sprite. */
  who: string;
  x: number;
  y: number;
  facing: Facing;
  /** The job (level id) they need help with. */
  job?: number;
  /** What they say when there's no job (or it's locked). */
  chat?: string;
}

/** Something to use by walking up to it: a door, a notice board… */
export type Spot =
  | { kind: 'job'; x: number; y: number; job: number }
  | { kind: 'shop'; x: number; y: number }
  | { kind: 'daily'; x: number; y: number }
  | { kind: 'sign'; x: number; y: number; text: string }
  | { kind: 'exit'; x: number; y: number; to: string };

export interface WorldMap {
  id: string;
  name: string;
  /** Which tile sheet the map uses. */
  sheet: 'city';
  width: number;
  height: number;
  /** Ground tiles, row by row; -1 for none. */
  ground: Int16Array;
  /** Markings drawn over the ground (crosswalks, drains); -1 for none. */
  decal: Int16Array;
  objects: WorldObject[];
  /** 1 where nobody can walk. */
  solid: Uint8Array;
  lights: LightSource[];
  residents: Resident[];
  spots: Spot[];
  spawn: Point & { facing: Facing };
  /**
   * What lights each group: the job ids that must be solved. An empty list means the
   * group is lit from the start.
   */
  groups: Record<string, number[]>;
}
