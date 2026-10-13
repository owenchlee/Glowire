// The hero moves freely, in any of eight directions, and slides along walls instead of
// sticking to them. Hold keys (or push the stick) to walk, or follow a path from a tap.
//
// Positions are in cells, measured like a tile's top-left corner: standing at (3, 4) means
// standing in the middle of cell (3, 4). The hero's feet are a small box near the bottom of
// that cell, and only the feet collide, so they can pass through one-cell gaps and walk
// right up to a wall.

import { faceToward } from './logic';
import type { Facing, Point } from './types';

export const WALK_SPEED = 5.2; // cells per second

/** The feet, as a box inside the hero's cell: left, right, top and bottom edges. */
const FEET = { left: 0.2, right: 0.8, top: 0.3, bottom: 0.92 };
/** How far the hero will be nudged sideways around a corner they're brushing past. */
const NUDGE = 0.45;
const EPS = 1e-6;

export interface Walker {
  x: number;
  y: number;
  facing: Facing;
  /** Direction being pushed (keys or stick), -1…1 on each axis. */
  input: Point;
  /** Points still to walk to, from a tap (cell positions). */
  path: Point[];
  /** Turn to face this once the path ends (the person or door that was tapped). */
  faceAtEnd: Point | null;
  /** True while the hero moved this frame. */
  moving: boolean;
  /** Walk time, for the walk-cycle animation. */
  clock: number;
}

export function newWalker(x: number, y: number, facing: Facing): Walker {
  return { x, y, facing, input: { x: 0, y: 0 }, path: [], faceAtEnd: null, moving: false, clock: 0 };
}

/** Where to draw the hero right now (cells). */
export function walkerPosition(w: Walker): Point {
  return { x: w.x, y: w.y };
}

/** The middle of the hero's feet. */
function feet(w: Point): Point {
  return { x: w.x + (FEET.left + FEET.right) / 2, y: w.y + (FEET.top + FEET.bottom) / 2 };
}

/** The cell the hero is standing in. */
export function walkerCell(w: Point): Point {
  const f = feet(w);
  return { x: Math.floor(f.x), y: Math.floor(f.y) };
}

export interface StepResult {
  /** A tapped path just ended next to its target. */
  arrived: boolean;
}

type Free = (x: number, y: number) => boolean;

/** Can the feet stand with the hero at (x, y)? */
export function fits(x: number, y: number, free: Free): boolean {
  const x0 = Math.floor(x + FEET.left);
  const x1 = Math.floor(x + FEET.right - EPS);
  const y0 = Math.floor(y + FEET.top);
  const y1 = Math.floor(y + FEET.bottom - EPS);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (!free(cx, cy)) return false;
  return true;
}

/**
 * Move by (dx, dy), one axis at a time so a blocked axis doesn't stop the other one (that's
 * what makes the hero slide along walls). Brushing a corner nudges them round it.
 */
function moveBy(w: Walker, dx: number, dy: number, free: Free): boolean {
  // Small steps, so a long frame can't jump clean over a wall.
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.2));
  let moved = false;
  for (let k = 0; k < n; k++) {
    const sx = dx / n;
    const sy = dy / n;
    let any = false;
    if (sx !== 0) {
      if (slide(w, 'x', sx, free)) any = true;
      else if (sy === 0) any = nudge(w, 'y', Math.sign(sx), 'x', Math.abs(sx), free);
    }
    if (sy !== 0) {
      if (slide(w, 'y', sy, free)) any = true;
      else if (sx === 0) any = nudge(w, 'x', Math.sign(sy), 'y', Math.abs(sy), free);
    }
    if (!any) break;
    moved = true;
  }
  return moved;
}

/** Move along one axis as far as possible (up to `d`), stopping flush against a wall. */
function slide(w: Walker, axis: 'x' | 'y', d: number, free: Free): boolean {
  const at = (t: number) => (axis === 'x' ? fits(w.x + d * t, w.y, free) : fits(w.x, w.y + d * t, free));
  if (at(1)) {
    w[axis] += d;
    return true;
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid)) lo = mid;
    else hi = mid;
  }
  if (Math.abs(d * lo) < 1e-3) return false;
  w[axis] += d * lo;
  return true;
}

/**
 * Walking straight into the edge of a gap: if a small sideways shift would line the hero up
 * with it, slide that way (at most `speed`). `side` is the axis to shift along, `along` the
 * one being walked.
 */
function nudge(w: Walker, side: 'x' | 'y', dir: number, along: 'x' | 'y', speed: number, free: Free): boolean {
  const step = 0.05;
  const base = w[side];
  let best: number | null = null;
  for (const sign of [1, -1]) {
    for (let off = step; off <= NUDGE + EPS; off += step) {
      const p = { x: w.x, y: w.y };
      p[side] = base + sign * off;
      if (!fits(p.x, p.y, free)) break;
      p[along] += dir * 0.08;
      if (fits(p.x, p.y, free)) {
        if (best === null || off < Math.abs(best)) best = sign * off;
        break;
      }
    }
  }
  if (best === null) return false;
  const shift = Math.sign(best) * Math.min(Math.abs(best), speed);
  if (!fits(side === 'x' ? base + shift : w.x, side === 'y' ? base + shift : w.y, free)) return false;
  w[side] = base + shift;
  return true;
}

/** Face the way you're walking. Holding two keys keeps the facing you already have, if it fits. */
function faceFor(w: Walker, dx: number, dy: number): Facing {
  const h: Facing | null = dx > 0.2 ? 'right' : dx < -0.2 ? 'left' : null;
  const v: Facing | null = dy > 0.2 ? 'down' : dy < -0.2 ? 'up' : null;
  if (h && v) {
    if (w.facing === h || w.facing === v) return w.facing;
    return Math.abs(dx) >= Math.abs(dy) ? h : v;
  }
  return h ?? v ?? w.facing;
}

/** Advance the walker by `dt` seconds. `free(x, y)` says whether a cell can be entered. */
export function stepWalker(w: Walker, dt: number, free: Free): StepResult {
  let arrived = false;
  let { x: ix, y: iy } = w.input;
  const len = Math.hypot(ix, iy);

  if (len > 0.15) {
    // Steering by hand cancels a tapped path.
    w.path = [];
    w.faceAtEnd = null;
    const scale = Math.min(1, len) / len;
    ix *= scale;
    iy *= scale;
    w.facing = faceFor(w, ix, iy);
    w.moving = moveBy(w, ix * WALK_SPEED * dt, iy * WALK_SPEED * dt, free);
  } else if (w.path.length) {
    let budget = WALK_SPEED * dt;
    w.moving = false;
    while (budget > 1e-6 && w.path.length) {
      const next = w.path[0]!;
      const dx = next.x - w.x;
      const dy = next.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-4) {
        w.path.shift();
        continue;
      }
      w.facing = faceFor(w, dx / d, dy / d);
      const s = Math.min(budget, d);
      if (!moveBy(w, (dx / d) * s, (dy / d) * s, free)) {
        // Someone stepped into the way: give up on the rest of the path.
        w.path = [];
        w.faceAtEnd = null;
        break;
      }
      w.moving = true;
      budget -= s;
      if (s >= d - 1e-6) {
        w.x = next.x;
        w.y = next.y;
        w.path.shift();
      }
    }
    if (!w.path.length && w.faceAtEnd) {
      w.facing = faceToward(w, w.faceAtEnd);
      w.faceAtEnd = null;
      arrived = true;
    }
  } else {
    w.moving = false;
    if (w.faceAtEnd) {
      w.facing = faceToward(w, w.faceAtEnd);
      w.faceAtEnd = null;
      arrived = true;
    }
  }
  w.clock = w.moving ? w.clock + dt : 0;
  return { arrived };
}

/**
 * Turn a path of cells into fewer, straighter legs: skip any corner the hero could cut
 * straight across, so tapped walks go diagonally instead of in stair steps.
 */
export function smoothPath(from: Point, cells: Point[], free: Free): Point[] {
  if (cells.length < 2) return cells;
  const out: Point[] = [];
  let at = from;
  let i = 0;
  while (i < cells.length) {
    let far = i;
    for (let j = cells.length - 1; j > i; j--)
      if (clearLine(at, cells[j]!, free)) {
        far = j;
        break;
      }
    out.push(cells[far]!);
    at = cells[far]!;
    i = far + 1;
  }
  return out;
}

/** Could the feet slide straight from a to b without touching anything? */
export function clearLine(a: Point, b: Point, free: Free): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d / 0.2));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    if (!fits(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, free)) return false;
  }
  return true;
}

/**
 * Cells in front of the hero, best first: straight ahead, then a little to either side (the
 * hero can stand half a cell off from someone and still talk to them).
 */
export function facingCells(w: Walker): Point[] {
  const f = feet(w);
  const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[w.facing] as [number, number];
  const reach = 0.75;
  const out: Point[] = [];
  for (const side of [0, 0.32, -0.32]) {
    const px = f.x + d[0] * reach + (d[1] !== 0 ? side : 0);
    const py = f.y + d[1] * reach + (d[0] !== 0 ? side : 0);
    const c = { x: Math.floor(px), y: Math.floor(py) };
    if (!out.some((o) => o.x === c.x && o.y === c.y)) out.push(c);
  }
  return out;
}

/** Walk-cycle frame (0–3), or 0 when standing still. */
export function walkFrame(w: Walker): number {
  return w.moving ? Math.floor(w.clock * 8) % 4 : 0;
}
