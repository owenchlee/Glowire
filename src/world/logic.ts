// Rules of the walking world: how far along the route you are, what's lit, who's standing
// where, where you can walk, and what's in front of you. Pure functions, so they're easy
// to test.

import type { Area, Facing, Point, Resident, Spot, WorldMap } from './types';

export const STEP: Record<Facing, Point> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export type Solved = (job: number) => boolean;

/** Light groups that are on, given which jobs are solved. */
export function litGroups(map: WorldMap, solved: Solved): Set<string> {
  const lit = new Set<string>();
  for (const [group, jobs] of Object.entries(map.groups)) if (jobs.every(solved)) lit.add(group);
  return lit;
}

export const areaDone = (area: Area, solved: Solved) => area.jobs.every(solved);

/**
 * How many areas of the route are open: the first always is, and each one after opens once
 * every area before it is done.
 */
export function openAreas(map: WorldMap, solved: Solved): number {
  let n = 1;
  while (n < map.areas.length && areaDone(map.areas[n - 1]!, solved)) n++;
  return n;
}

/** The area a job belongs to (index), side jobs included, or -1. */
export function areaOfJob(map: WorldMap, job: number): number {
  return map.areas.findIndex((a) => a.jobs.includes(job) || !!a.side?.includes(job));
}

/** Every job in an area: the ones that open the road, then its side jobs. */
export const allJobs = (area: Area) => [...area.jobs, ...(area.side ?? [])];

/** A job can be started once you've reached its area. Jobs within an area go in any order. */
export function jobOpen(map: WorldMap, job: number, solved: Solved): boolean {
  if (solved(job)) return true;
  const a = areaOfJob(map, job);
  return a >= 0 && a < openAreas(map, solved);
}

/** The furthest open area: where the story is right now. */
export function frontier(map: WorldMap, solved: Solved): number {
  return openAreas(map, solved) - 1;
}

/** Jobs still to do in the frontier area, in the order they're listed. */
export function jobsLeft(map: WorldMap, solved: Solved): number[] {
  const area = map.areas[frontier(map, solved)];
  return area ? area.jobs.filter((j) => !solved(j)) : [];
}

/**
 * How dark each cell is beyond the open part of the route: 0 where you can go, 1 in areas
 * still locked. One byte per cell (0–255), ready to upload as a texture.
 */
export function fogMask(map: WorldMap, solved: Solved): Uint8Array {
  const open = openAreas(map, solved);
  const fog = new Uint8Array(map.width * map.height);
  for (let i = 0; i < fog.length; i++) {
    const a = map.areaOf[i]!;
    fog[i] = a !== 255 && a >= open ? 255 : 0;
  }
  return fog;
}

/**
 * Who is out right now. People can arrive later in the story (`after`) or move on (`until`).
 * Someone with several jobs (Officer Dot, the twins) stands only at the first one still to
 * do, or at their last one once all are done.
 */
export function presentResidents(map: WorldMap, solved: Solved, lit = litGroups(map, solved)): Resident[] {
  const here = map.residents.filter((r) => (!r.after || lit.has(r.after)) && (!r.until || !lit.has(r.until)));
  const byWho = new Map<string, Resident[]>();
  for (const r of here) {
    if (r.job === undefined) continue;
    byWho.set(r.who, [...(byWho.get(r.who) ?? []), r]);
  }
  const rank = (r: Resident) => r.job!;
  return here.filter((r) => {
    if (r.job === undefined) return !byWho.has(r.who) || byWho.get(r.who)!.every((x) => solved(x.job!));
    const all = byWho.get(r.who)!.sort((a, b) => rank(a) - rank(b));
    if (all.length === 1) return true;
    const pending = all.find((x) => !solved(x.job!));
    return r === (pending ?? all[all.length - 1]);
  });
}

export function inBounds(map: WorldMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

/** Cells nobody can walk into: walls, props, shut gates, and the people standing around. */
export function blockedCells(map: WorldMap, residents: Resident[], solved: Solved = () => false): Uint8Array {
  const blocked = new Uint8Array(map.solid);
  for (const g of map.gates)
    if (!areaDone(map.areas[g.area]!, solved)) for (const c of g.cells) blocked[c.y * map.width + c.x] = 1;
  for (const r of residents) blocked[r.y * map.width + r.x] = 1;
  return blocked;
}

/** The shut gate covering this cell, if any (its area index). */
export function gateAt(map: WorldMap, solved: Solved, x: number, y: number): number | null {
  for (const g of map.gates)
    if (!areaDone(map.areas[g.area]!, solved) && g.cells.some((c) => c.x === x && c.y === y)) return g.area;
  return null;
}

/** Climbing from (fx, fy) up into the ledge cell (tx, ty) is not allowed: ledges are one-way, down. */
export function enteringLedgeUp(map: WorldMap, fx: number, fy: number, tx: number, ty: number): boolean {
  const l = map.ledges;
  return !!l && ty < fy && !!l[ty * map.width + tx] && !l[fy * map.width + fx];
}

export function canWalk(map: WorldMap, blocked: Uint8Array, x: number, y: number): boolean {
  return inBounds(map, x, y) && !blocked[y * map.width + x];
}

/** What's in the cell the hero is facing: a person first, else a door or sign, else a gate. */
export type Target =
  | { kind: 'resident'; resident: Resident }
  | { kind: 'spot'; spot: Spot }
  | { kind: 'gate'; area: number };

export function targetAt(
  residents: Resident[],
  map: WorldMap,
  x: number,
  y: number,
  solved: Solved = () => false,
): Target | null {
  const resident = residents.find((r) => r.x === x && r.y === y);
  if (resident) return { kind: 'resident', resident };
  const spot = map.spots.find((s) => s.x === x && s.y === y);
  if (spot) return { kind: 'spot', spot };
  const gate = gateAt(map, solved, x, y);
  return gate === null ? null : { kind: 'gate', area: gate };
}

export function faceToward(from: Point, to: Point): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * Shortest walk (4 directions) from `from` to `to`. If `to` can't be stood on (a person,
 * a door), the walk ends next to it instead. Returns the steps after `from`, or null.
 */
export function findPath(map: WorldMap, blocked: Uint8Array, from: Point, to: Point): Point[] | null {
  if (!inBounds(map, to.x, to.y)) return null;
  const goals = new Set<number>();
  if (canWalk(map, blocked, to.x, to.y)) goals.add(to.y * map.width + to.x);
  else
    for (const d of Object.values(STEP)) {
      const x = to.x + d.x;
      const y = to.y + d.y;
      if (canWalk(map, blocked, x, y) || (x === from.x && y === from.y)) goals.add(y * map.width + x);
    }
  if (goals.size === 0) return null;

  const start = from.y * map.width + from.x;
  if (goals.has(start)) return [];
  const w = map.width;
  const h = map.height;
  const size = w * h;
  if (bfs.seen.length < size || bfs.stamp > 0xfffffff0) {
    bfs.seen = new Uint32Array(size);
    bfs.prev = new Int32Array(size);
    bfs.queue = new Int32Array(size);
    bfs.stamp = 0;
  }
  // Buffers are reused between walks; a cell counts as visited only if it carries this walk's stamp.
  const stamp = ++bfs.stamp;
  const { seen, prev, queue } = bfs;
  const goalStamp = stamp + 1;
  bfs.stamp = goalStamp;
  for (const g of goals) if (g >= 0 && g < size) seen[g] = goalStamp;
  seen[start] = stamp;
  queue[0] = start;
  let tail = 1;
  const pathTo = (end: number, from: number): Point[] => {
    prev[end] = from;
    const path: Point[] = [];
    for (let c = end; c !== start; c = prev[c]!) path.push({ x: c % w, y: Math.floor(c / w) });
    return path.reverse();
  };
  // Hot loop: neighbours inlined in STEP order (down, up, left, right) so paths stay identical.
  // The queue is first-in first-out, so the first goal reached is the one the search would take
  // out first: stopping as soon as it's reached gives the same path.
  for (let head = 0; head < tail; head++) {
    const cur = queue[head]!;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    let n = cur + w;
    if (cy + 1 < h && !blocked[n] && seen[n] !== stamp) {
      if (seen[n] === goalStamp) return pathTo(n, cur);
      seen[n] = stamp;
      prev[n] = cur;
      queue[tail++] = n;
    }
    n = cur - w;
    if (cy > 0 && !blocked[n] && seen[n] !== stamp && !enteringLedgeUp(map, cx, cy, cx, cy - 1)) {
      if (seen[n] === goalStamp) return pathTo(n, cur);
      seen[n] = stamp;
      prev[n] = cur;
      queue[tail++] = n;
    }
    n = cur - 1;
    if (cx > 0 && !blocked[n] && seen[n] !== stamp) {
      if (seen[n] === goalStamp) return pathTo(n, cur);
      seen[n] = stamp;
      prev[n] = cur;
      queue[tail++] = n;
    }
    n = cur + 1;
    if (cx + 1 < w && !blocked[n] && seen[n] !== stamp) {
      if (seen[n] === goalStamp) return pathTo(n, cur);
      seen[n] = stamp;
      prev[n] = cur;
      queue[tail++] = n;
    }
  }
  return null;
}

/** Scratch space for findPath, kept between calls so each walk doesn't allocate and clear it. */
const bfs = { seen: new Uint32Array(0), prev: new Int32Array(0), queue: new Int32Array(0), stamp: 0 };
