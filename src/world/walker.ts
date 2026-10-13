// The hero walks cell to cell (like classic top-down RPGs), sliding smoothly between them.
// Hold a direction to keep walking, or follow a path from a tap.

import { STEP, faceToward } from './logic';
import type { Facing, Point } from './types';

export const WALK_SPEED = 5; // cells per second

export interface Walker {
  /** The cell the hero stands on (or is walking from). */
  x: number;
  y: number;
  facing: Facing;
  /** The cell being walked into, while moving. */
  to: Point | null;
  /** 0 → 1 across the current step. */
  progress: number;
  /** Direction being held (keyboard / d-pad). */
  held: Facing | null;
  /** Cells still to walk, from a tap. */
  path: Point[];
  /** Turn to face this once the path ends (the person or door that was tapped). */
  faceAtEnd: Point | null;
  /** Walk time, for the walk-cycle animation. */
  clock: number;
}

export function newWalker(x: number, y: number, facing: Facing): Walker {
  return { x, y, facing, to: null, progress: 0, held: null, path: [], faceAtEnd: null, clock: 0 };
}

/** Where to draw the hero right now (cells, fractional while moving). */
export function walkerPosition(w: Walker): Point {
  if (!w.to) return { x: w.x, y: w.y };
  return { x: w.x + (w.to.x - w.x) * w.progress, y: w.y + (w.to.y - w.y) * w.progress };
}

export interface StepResult {
  /** A tapped path just ended next to its target. */
  arrived: boolean;
}

/** Advance the walker by `dt` seconds. `free(x, y)` says whether a cell can be entered. */
export function stepWalker(w: Walker, dt: number, free: (x: number, y: number) => boolean): StepResult {
  let arrived = false;
  let time = dt;
  // A loop, so a fast frame can finish one step and start the next.
  for (let guard = 0; guard < 4 && time > 0; guard++) {
    if (w.to) {
      w.clock += time;
      w.progress += time * WALK_SPEED;
      if (w.progress < 1) return { arrived };
      time = (w.progress - 1) / WALK_SPEED;
      w.x = w.to.x;
      w.y = w.to.y;
      w.to = null;
      w.progress = 0;
    }
    if (w.held) {
      w.path = [];
      w.faceAtEnd = null;
      if (!start(w, w.held, free)) break;
      continue;
    }
    const next = w.path.shift();
    if (next) {
      const facing = faceToward(w, next);
      const moved = start(w, facing, free);
      const to = w.to as Point | null;
      if (!moved || to?.x !== next.x || to?.y !== next.y) {
        // Someone stepped into the way: give up on the rest of the path.
        w.path = [];
        w.faceAtEnd = null;
        break;
      }
      continue;
    }
    if (w.faceAtEnd) {
      w.facing = faceToward(w, w.faceAtEnd);
      w.faceAtEnd = null;
      arrived = true;
    }
    break;
  }
  if (!w.to) w.clock = 0;
  return { arrived };
}

/** Turn to `facing` and start a step if the cell ahead is free. */
function start(w: Walker, facing: Facing, free: (x: number, y: number) => boolean): boolean {
  w.facing = facing;
  const d = STEP[facing];
  if (!free(w.x + d.x, w.y + d.y)) return false;
  w.to = { x: w.x + d.x, y: w.y + d.y };
  w.progress = 0;
  return true;
}

/** Walk-cycle frame (0–3), or 0 when standing still. */
export function walkFrame(w: Walker): number {
  return w.to ? Math.floor(w.clock * 8) % 4 : 0;
}
