// Test-only helpers: build boards from little box-drawing pictures.
import { battery, getPorts, led, opposite, resistor, wire } from './tiles';
import {
  type Board,
  type Direction,
  type Rotation,
  type Tile,
  type WireShape,
  E,
  N,
  S,
  W,
} from './types';

/**
 * Tokens (space separated, one row per string):
 *   ─ │            straight wires          . empty cell
 *   ┌ ┐ └ ┘        corners                 ├ ┤ ┬ ┴  tees      ┼ cross
 *   B< B> B^ Bv    battery; the arrow is the way current leaves through + (B< has + on W)
 *   L> L< Lv L^    LED; the arrow points anode → cathode (L> has anode on W)
 *   R100 R100v     resistor, horizontal / vertical
 */
export function parseBoard(rows: string[]): Board {
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const width = grid[0]?.length ?? 0;
  const cells: (Tile | null)[] = [];
  for (const row of grid) {
    if (row.length !== width) throw new Error(`ragged board row: ${row.join(' ')}`);
    for (const token of row) cells.push(parseToken(token));
  }
  return { width, height: grid.length, cells };
}

const ARROW_ROTATION = { '>': 0, v: 1, '<': 2, '^': 3 } as const;

function parseToken(token: string): Tile | null {
  switch (token) {
    case '.':
      return null;
    case '│':
      return wire('straight', 0);
    case '─':
      return wire('straight', 1);
    case '└':
      return wire('corner', 0);
    case '┌':
      return wire('corner', 1);
    case '┐':
      return wire('corner', 2);
    case '┘':
      return wire('corner', 3);
    case '┬':
      return wire('tee', 0);
    case '┤':
      return wire('tee', 1);
    case '┴':
      return wire('tee', 2);
    case '├':
      return wire('tee', 3);
    case '┼':
      return wire('cross', 0);
  }
  const kind = token[0];
  if (kind === 'L' || kind === 'B') {
    const rot = ARROW_ROTATION[token.slice(1) as keyof typeof ARROW_ROTATION];
    if (rot === undefined) throw new Error(`bad token ${token}`);
    // Battery: current leaves + and travels through the part − → +, so "B<" means + on W
    // (rotation 0), the opposite arrow convention to an LED.
    return kind === 'L' ? led(rot) : battery(((rot + 2) % 4) as 0 | 1 | 2 | 3);
  }
  const m = /^R(\d+)(v?)$/.exec(token);
  if (m) return resistor(Number(m[1]), m[2] ? 1 : 0);
  throw new Error(`unknown token ${token}`);
}

/** Deterministic PRNG (mulberry32) so random-board tests are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomTile(rand: () => number): Tile | null {
  const rot = Math.floor(rand() * 4) as Rotation;
  const p = rand();
  if (p < 0.15) return null;
  if (p < 0.35) return wire('straight', rot);
  if (p < 0.55) return wire('corner', rot);
  if (p < 0.68) return wire('tee', rot);
  if (p < 0.75) return wire('cross', rot);
  if (p < 0.87) return led(rot);
  if (p < 0.95) return resistor([100, 220, 1000][Math.floor(rand() * 3)] ?? 100, rot);
  return battery(rot);
}

/** A random wire of `shape` whose ports include all of `need`, if any rotation fits. */
function fitWire(rand: () => number, shape: WireShape, need: Direction[]): Tile | null {
  const fits = ([0, 1, 2, 3] as Rotation[]).filter((r) =>
    need.every((d) => getPorts(wire(shape, r)).includes(d)),
  );
  const r = fits[Math.floor(rand() * fits.length)];
  return r === undefined ? null : wire(shape, r);
}

/**
 * Random noise everywhere, then a closed rectangular loop through a battery so most
 * boards actually carry current. Loop tiles are sometimes tees/crosses, which hook the
 * noise into the loop and create parallel branches, shorts and dead ends.
 */
export function randomBoard(rand: () => number, size: number): Board {
  const cells = Array.from({ length: size * size }, () => randomTile(rand));
  const x0 = Math.floor(rand() * (size - 1));
  const y0 = Math.floor(rand() * (size - 1));
  const x1 = x0 + 1 + Math.floor(rand() * (size - 1 - x0));
  const y1 = y0 + 1 + Math.floor(rand() * (size - 1 - y0));
  let batteryPlaced = false;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      const need: Direction[] = [];
      if (y > y0 && (x === x0 || x === x1)) need.push(N);
      if (y < y1 && (x === x0 || x === x1)) need.push(S);
      if (x > x0 && (y === y0 || y === y1)) need.push(W);
      if (x < x1 && (y === y0 || y === y1)) need.push(E);
      const straight = need.length === 2 && opposite(need[0]!) === need[1];
      const p = rand();
      let tile: Tile | null;
      if (straight && (!batteryPlaced || p < 0.35)) {
        // Two-terminal part along the loop, random polarity.
        const axis: Rotation = need.includes(W) ? 0 : 1;
        const rot = (axis + (rand() < 0.5 ? 0 : 2)) as Rotation;
        const q = rand();
        tile = !batteryPlaced
          ? battery(rot)
          : q < 0.5
            ? led(rot)
            : resistor([100, 220, 1000][Math.floor(rand() * 3)] ?? 100, rot);
        batteryPlaced ||= tile.kind === 'battery';
      } else if (p < 0.55) {
        tile = fitWire(rand, straight ? 'straight' : 'corner', need);
      } else if (p < 0.85) {
        tile = fitWire(rand, 'tee', need);
      } else {
        tile = wire('cross');
      }
      cells[y * size + x] = tile;
    }
  }
  return { width: size, height: size, cells };
}
