// Rules of the walking world: what's lit, who's standing where, where you can walk, and
// what's in front of you. Pure functions, so they're easy to test.

import type { Facing, Point, Resident, Spot, WorldMap } from './types';

export const STEP: Record<Facing, Point> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Light groups that are on, given which jobs are solved. */
export function litGroups(map: WorldMap, solved: (job: number) => boolean): Set<string> {
  const lit = new Set<string>();
  for (const [group, jobs] of Object.entries(map.groups)) if (jobs.every(solved)) lit.add(group);
  return lit;
}

/**
 * Who is out on the street right now. Someone with several jobs (Officer Dot, the twins)
 * stands only at the first one still to do, or at their last one once all are done.
 */
export function presentResidents(map: WorldMap, order: number[], solved: (job: number) => boolean): Resident[] {
  const byWho = new Map<string, Resident[]>();
  for (const r of map.residents) {
    if (r.job === undefined) continue;
    byWho.set(r.who, [...(byWho.get(r.who) ?? []), r]);
  }
  const rank = (r: Resident) => order.indexOf(r.job!);
  return map.residents.filter((r) => {
    if (r.job === undefined) return true;
    const all = byWho.get(r.who)!.sort((a, b) => rank(a) - rank(b));
    if (all.length === 1) return true;
    const pending = all.find((x) => !solved(x.job!));
    return r === (pending ?? all[all.length - 1]);
  });
}

export function inBounds(map: WorldMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

/** Cells nobody can walk into: walls, props, and the people standing around. */
export function blockedCells(map: WorldMap, residents: Resident[]): Uint8Array {
  const blocked = new Uint8Array(map.solid);
  // Residents who aren't out right now free up their spot.
  for (const r of map.residents) blocked[r.y * map.width + r.x] = 0;
  for (const r of residents) blocked[r.y * map.width + r.x] = 1;
  return blocked;
}

export function canWalk(map: WorldMap, blocked: Uint8Array, x: number, y: number): boolean {
  return inBounds(map, x, y) && !blocked[y * map.width + x];
}

/** What's in the cell the hero is facing: a person first, else a door or sign. */
export type Target = { kind: 'resident'; resident: Resident } | { kind: 'spot'; spot: Spot };

export function targetAt(residents: Resident[], map: WorldMap, x: number, y: number): Target | null {
  const resident = residents.find((r) => r.x === x && r.y === y);
  if (resident) return { kind: 'resident', resident };
  const spot = map.spots.find((s) => s.x === x && s.y === y);
  return spot ? { kind: 'spot', spot } : null;
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
  const prev = new Int32Array(map.width * map.height).fill(-1);
  prev[start] = start;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]!;
    if (goals.has(cur)) {
      const path: Point[] = [];
      for (let c = cur; c !== start; c = prev[c]!) path.push({ x: c % map.width, y: Math.floor(c / map.width) });
      return path.reverse();
    }
    const cx = cur % map.width;
    const cy = Math.floor(cur / map.width);
    for (const d of Object.values(STEP)) {
      const x = cx + d.x;
      const y = cy + d.y;
      if (!canWalk(map, blocked, x, y)) continue;
      const n = y * map.width + x;
      if (prev[n] !== -1) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  return null;
}
