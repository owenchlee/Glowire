// What the hero has seen of a world, for the map screen: one bit per cell, packed into a
// short string that lives in the save (as a `seen` entry, `explored:<worldId>:<base64>`).
// Plus where to head next. Pure functions, no React.

import { CAST } from '../game/cast';
import { type Solved, frontier, jobsLeft, openAreas } from '../world/logic';
import type { Point, WorldMap } from '../world/types';
import { WORLDS } from '../world/worlds';

/** One bit per cell, row by row (cell i is bit i % 8 of byte i >> 3). */
export type Explored = Uint8Array;

export const emptyExplored = (map: WorldMap): Explored => new Uint8Array(Math.ceil((map.width * map.height) / 8));

export function isExplored(explored: Explored, map: WorldMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  const i = y * map.width + x;
  return ((explored[i >> 3]! >> (i & 7)) & 1) === 1;
}

/** Marks every cell within `radius` of (x, y) as seen. Returns true if anything was new. */
export function revealAround(explored: Explored, map: WorldMap, x: number, y: number, radius: number): boolean {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const r = Math.ceil(radius);
  let changed = false;
  for (let yy = Math.max(0, cy - r); yy <= Math.min(map.height - 1, cy + r); yy++)
    for (let xx = Math.max(0, cx - r); xx <= Math.min(map.width - 1, cx + r); xx++) {
      if ((xx - cx) ** 2 + (yy - cy) ** 2 > radius * radius) continue;
      const i = yy * map.width + xx;
      const bit = 1 << (i & 7);
      if (explored[i >> 3]! & bit) continue;
      explored[i >> 3]! |= bit;
      changed = true;
    }
  return changed;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[n >> 18]! + B64[(n >> 12) & 63]!;
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '=';
    out += i + 2 < bytes.length ? B64[n & 63]! : '=';
  }
  return out;
}

/** Null on anything that isn't base64 (a corrupt save). */
export function fromBase64(s: string): Uint8Array | null {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  return out;
}

export const encodeExplored = (explored: Explored): string => toBase64(explored);

/** Back to a bitset for this map; a missing, corrupt or wrong-sized string gives an empty one. */
export function decodeExplored(s: string | undefined, map: WorldMap): Explored {
  const empty = emptyExplored(map);
  const bytes = s ? fromBase64(s) : null;
  if (bytes && bytes.length === empty.length) return bytes;
  return empty;
}

const PREFIX = (worldId: string) => `explored:${worldId}:`;

/** The explored bitset stored in a save's `seen` list for this world. */
export function readExplored(seen: readonly string[], map: WorldMap): Explored {
  const p = PREFIX(map.id);
  return decodeExplored(seen.find((k) => k.startsWith(p))?.slice(p.length), map);
}

/** A new `seen` list with this world's explored entry replaced. */
export function writeExplored(seen: readonly string[], map: WorldMap, explored: Explored): string[] {
  const p = PREFIX(map.id);
  return [...seen.filter((k) => !k.startsWith(p)), p + encodeExplored(explored)];
}

export interface Goal extends Point {
  /** A road job in the area you're in, a side job, the way on into the next area, or the way to the next world. */
  kind: 'job' | 'side' | 'gate' | 'exit';
  label: string;
  /** The job, for kind 'job' and 'side'. */
  job?: number;
}

function jobGoal(map: WorldMap, job: number, kind: 'job' | 'side'): Goal | null {
  const spot = map.spots.find((s) => s.kind === 'job' && s.job === job);
  if (!spot) return null;
  const who = map.residents.find((r) => r.job === job)?.who;
  const name = who ? (CAST[who]?.name ?? who) : null;
  return { x: spot.x, y: spot.y, kind, job, label: name ? `Help ${name}` : 'A job' };
}

/**
 * Where to head next: the first unfinished job that holds up the road in the area you've
 * reached. If that job is somewhere you haven't been yet (pass `explored`), the opened gate
 * into its area comes first. Once the road is done: side jobs still open, then the way to
 * the next world. Null when there's nothing left.
 */
export function nextGoal(map: WorldMap, solved: Solved, explored?: Explored): Goal | null {
  const front = frontier(map, solved);
  for (const job of jobsLeft(map, solved)) {
    const goal = jobGoal(map, job, 'job');
    if (!goal) continue;
    const gate = front > 0 ? map.gates.find((g) => g.area === front - 1) : undefined;
    if (explored && gate && !isExplored(explored, map, goal.x, goal.y)) {
      const mid = gate.cells[Math.floor(gate.cells.length / 2)]!;
      return { x: mid.x, y: mid.y, kind: 'gate', label: `Way to ${map.areas[front]!.name}` };
    }
    return goal;
  }
  const open = openAreas(map, solved);
  for (const area of map.areas.slice(0, open))
    for (const job of area.side ?? []) if (!solved(job)) {
      const goal = jobGoal(map, job, 'side');
      if (goal) return goal;
    }
  const exits = map.spots.filter((s) => s.kind === 'exit');
  const next = WORLDS[WORLDS.findIndex((w) => w.id === map.id) + 1];
  const exit = exits.find((s) => s.to === next?.id);
  if (exit && next) return { x: exit.x, y: exit.y, kind: 'exit', label: `On to ${next.name}` };
  return null;
}
