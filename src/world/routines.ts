// Little daily routines for residents: pacing a short path, walking a loop, sitting still,
// turning to face the hero, and going indoors (or to a lamp) at night. Pure and
// deterministic: where someone is depends only on the clock, so it is easy to test.
//
// Waypoints are whole cells joined by straight (horizontal or vertical) legs, and the
// tests check every cell on every leg is walkable on every map. A resident's cell
// is always a whole number, so tapping them works wherever they are.

import type { Facing, Point, Resident } from './types';

export interface Routine {
  /** Cells to walk between: a back-and-forth by default, or a loop. */
  path?: Point[];
  loop?: boolean;
  /** Cells per second (default 0.9). */
  speed?: number;
  /** Seconds to wait at each waypoint (default 3). */
  pause?: number;
  /** When standing still, turn to face the hero this close (cells). */
  look?: number;
  /** Fixed way to face while standing (a bench). */
  sit?: Facing;
  /** At night: go indoors (vanish), or stand somewhere else (by a lamp). Residents with a job never vanish. */
  night?: 'hide' | { x: number; y: number; facing: Facing };
}

/** A resident as placed right now. `key` is stable, for drawing. */
export type Placed = Resident & { key: string; sitting?: boolean };

export function residentKey(r: Pick<Resident, 'who' | 'x' | 'y'>): string {
  return `${r.who}@${r.x},${r.y}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** The corners walked through, round and round (a back-and-forth walks back along its own way). */
export function cycle(r: Routine): Point[] {
  const pts = r.path ?? [];
  if (r.loop || pts.length < 3) return pts;
  return pts.concat(pts.slice(1, -1).reverse());
}

function dir(a: Point, b: Point): Facing {
  if (b.x > a.x) return 'right';
  if (b.x < a.x) return 'left';
  return b.y > a.y ? 'down' : 'up';
}

export function faceHero(from: Point, hero: Point): Facing {
  const dx = hero.x - from.x;
  const dy = hero.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Where this resident is, and where they face, at `seconds` on the shared clock. Null while indoors. */
export function placeResident(
  base: Resident,
  routine: Routine | undefined,
  seconds: number,
  night: boolean,
  hero?: Point,
): Placed | null {
  const key = residentKey(base);
  if (!routine) return { ...base, key };
  if (night && routine.night) {
    if (routine.night === 'hide') {
      if (base.job === undefined) return null;
    } else {
      return { ...base, ...routine.night, key };
    }
  }

  let x = base.x;
  let y = base.y;
  let facing = routine.sit ?? base.facing;
  let moving = false;
  const pts = cycle(routine);
  if (pts.length >= 2) {
    const speed = routine.speed ?? 0.9;
    const pause = routine.pause ?? 3;
    const n = pts.length;
    const legs = pts.map((p, i) => {
      const q = pts[(i + 1) % n]!;
      return { from: p, to: q, walk: (Math.abs(q.x - p.x) + Math.abs(q.y - p.y)) / speed };
    });
    const total = legs.reduce((s, l) => s + pause + l.walk, 0);
    let t = (((seconds + hash(key) * total) % total) + total) % total;
    for (let i = 0; i < n; i++) {
      const l = legs[i]!;
      const prev = legs[(i + n - 1) % n]!;
      if (t < pause) {
        x = l.from.x;
        y = l.from.y;
        facing = routine.sit ?? dir(prev.from, prev.to);
        break;
      }
      t -= pause;
      if (t < l.walk) {
        const f = l.walk > 0 ? t / l.walk : 0;
        x = Math.round(l.from.x + (l.to.x - l.from.x) * f);
        y = Math.round(l.from.y + (l.to.y - l.from.y) * f);
        facing = dir(l.from, l.to);
        moving = true;
        break;
      }
      t -= l.walk;
    }
  }

  if (!moving && !routine.sit && routine.look && hero && Math.hypot(hero.x - x, hero.y - y) <= routine.look) {
    facing = faceHero({ x, y }, hero);
  }
  return { ...base, x, y, facing, key, sitting: routine.sit !== undefined };
}

/** Everyone in the world, placed at this moment. */
export function placeResidents(
  residents: Resident[],
  routines: Record<string, Routine> | undefined,
  seconds: number,
  night: boolean,
  hero?: Point,
): Placed[] {
  const out: Placed[] = [];
  for (const r of residents) {
    const p = placeResident(r, routines?.[residentKey(r)], seconds, night, hero);
    if (p) out.push(p);
  }
  return out;
}

/** Every cell a routine can put its resident in (waypoints, legs, and the night spot). */
export function routineCells(routine: Routine): Point[] {
  const cells: Point[] = [];
  const pts = cycle(routine);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let s = 0; s <= steps; s++)
      cells.push({ x: steps === 0 ? a.x : a.x + Math.sign(b.x - a.x) * s, y: steps === 0 ? a.y : a.y + Math.sign(b.y - a.y) * s });
  }
  if (routine.night && routine.night !== 'hide') cells.push({ x: routine.night.x, y: routine.night.y });
  return cells;
}
