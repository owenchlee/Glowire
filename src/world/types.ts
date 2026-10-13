// An explorable world: a grid of 16px tiles the hero walks around on. Pure data, no React.
//
// A world is a route: one path through a row of areas, each its own kind of place. The
// road beyond the area you're in stays dark (and a gate bars the way) until every job in
// that area is done.

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
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
  /** Only drawn until this group is lit (a barricade that goes once the way is open). */
  until?: string;
  /** Drawn flat on the ground, under everyone (rugs, bridges, crops). */
  flat?: boolean;
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
  /** What they say when there's no job (or it's done). */
  chat?: string;
  /** Only out once this group is lit (someone who arrives later in the story). */
  after?: string;
  /** Gone once this group is lit (someone who moves on). */
  until?: string;
}

/** Something to use by walking up to it: a door, a notice board… */
export type Spot =
  | { kind: 'job'; x: number; y: number; job: number }
  | { kind: 'shop'; x: number; y: number }
  | { kind: 'daily'; x: number; y: number }
  | { kind: 'sign'; x: number; y: number; text: string }
  | { kind: 'note'; x: number; y: number; note: string }
  | { kind: 'exit'; x: number; y: number; to: string };

/** One stretch of the route. */
export interface Area {
  id: string;
  name: string;
  /** Jobs to finish before the way on opens. */
  jobs: number[];
  /** Story scene (game/lore.ts) the first time you walk in. */
  intro?: string;
  /** Story scene once its last job is done. */
  outro?: string;
  /** Where to stand when travelling here from the map. */
  entry: Point & { facing: Facing };
  /** What Pip says at the gate while it's shut. */
  gate?: string;
}

export interface WorldMap {
  id: string;
  name: string;
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
  /** The route, in order. */
  areas: Area[];
  /** Which area each cell belongs to (index into areas), or 255 for none. */
  areaOf: Uint8Array;
  /** Cells that are walls until the area (by index) before them is done. */
  gates: { area: number; cells: Point[] }[];
}
