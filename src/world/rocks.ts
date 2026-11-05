// Pushable rocks (Zelda / Pokemon "strength" style). Walk into a rock and it slides one
// cell if the cell beyond is free. A rock pushed into open water fills it and becomes a
// stepping stone. Pure functions over an immutable state, so every puzzle can be tested.
//
// Rocks can't be pulled, so a rock can end up stuck; the screen resets them whenever you
// walk into a map again, and a small sign next to each puzzle resets them on request.

import { STEP, canWalk } from './logic';
import type { Facing, Point, WorldMap } from './types';

export interface RockState {
  rocks: Point[];
  /** Water cells already filled (y * width + x): walkable stepping stones now. */
  filled: Set<number>;
}

export function newRocks(map: WorldMap): RockState {
  return { rocks: (map.rocks ?? []).map((r) => ({ ...r })), filled: new Set() };
}

export function rockIndex(state: RockState, x: number, y: number): number {
  return state.rocks.findIndex((r) => r.x === x && r.y === y);
}

/** Solid cells with the rocks and filled water folded in (use in place of map.solid). */
export function withRocks(map: WorldMap, blocked: Uint8Array, state: RockState | undefined): Uint8Array {
  if (!state) return blocked;
  const out = new Uint8Array(blocked);
  for (const i of state.filled) out[i] = 0;
  for (const r of state.rocks) out[r.y * map.width + r.x] = 1;
  return out;
}

export interface Pushed {
  state: RockState;
  /** Where the rock went. */
  to: Point;
  /** It dropped into water and made a stepping stone. */
  filled: boolean;
}

/**
 * Push the rock at (x, y) one cell toward `dir`. `blocked` is the map's blocked cells
 * (walls, people, gates) without rocks; null when the rock can't move: something solid,
 * another rock, a sign or door, or a ledge is in the way.
 */
export function pushRock(map: WorldMap, blocked: Uint8Array, state: RockState, x: number, y: number, dir: Facing): Pushed | null {
  const i = rockIndex(state, x, y);
  if (i < 0) return null;
  const to = { x: x + STEP[dir].x, y: y + STEP[dir].y };
  if (to.x < 0 || to.y < 0 || to.x >= map.width || to.y >= map.height) return null;
  const cell = to.y * map.width + to.x;
  if (rockIndex(state, to.x, to.y) >= 0) return null;
  const rocks = state.rocks.filter((_, k) => k !== i);
  if (map.water?.[cell] && !state.filled.has(cell)) {
    return { state: { rocks, filled: new Set([...state.filled, cell]) }, to, filled: true };
  }
  if (!canWalk(map, withRocks(map, blocked, state), to.x, to.y)) return null;
  if (map.ledges?.[cell]) return null;
  if (map.spots.some((s) => s.x === to.x && s.y === to.y)) return null;
  return { state: { rocks: [...rocks, to], filled: state.filled }, to, filled: false };
}

/** The rocks after every rock puzzle on the map has been solved, by the recorded pushes (null if one fails). */
export function solvedRocks(map: WorldMap, blocked: Uint8Array): RockState | null {
  let state = newRocks(map);
  for (const p of map.puzzles ?? []) {
    if (p.kind !== 'rocks') continue;
    for (const push of p.pushes) {
      const next = pushRock(map, blocked, state, push.rock.x, push.rock.y, push.dir);
      if (!next) return null;
      state = next.state;
    }
  }
  return state;
}
