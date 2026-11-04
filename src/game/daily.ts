// The Daily Blackout: a twist job generated from the date, the same for everyone that day.
//
// 1. Draw a closed loop on the grid: start from a rectangle, then push out random bumps so
//    it winds about. It stays one simple loop the whole time.
// 2. Put the battery, LEDs, maybe a switch and maybe a resistor on straight parts of the
//    loop, each facing along the current.
// 3. Pick the battery and resistor by simulating: every LED must light safely.
// 4. Fill every other cell with decoy wires (some will tempt shorts and bypasses), and let
//    the twist scramble shuffle it. Checked by the solver, never by hand.

import {
  type Direction,
  type LedColor,
  type Tile,
  E,
  N,
  S,
  W,
  battery,
  getPorts,
  led,
  resistor,
  simulate,
  switchTile,
  wire,
} from '../engine';
import { createLevelBoard, evaluateLevel } from '../levels/evaluate';
import type { Goal, LevelDef } from '../levels/types';
import { CAST } from './cast';

/** mulberry32: small, fast, and the same everywhere. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** How hard each weekday is, Monday to Sunday. */
interface Tier {
  name: string;
  width: number;
  height: number;
  leds: number;
  bumps: number;
  colours: boolean;
  switch: boolean;
}

export const TIERS: Tier[] = [
  { name: 'Monday', width: 4, height: 4, leds: 1, bumps: 2, colours: false, switch: false },
  { name: 'Tuesday', width: 5, height: 4, leds: 1, bumps: 4, colours: true, switch: false },
  { name: 'Wednesday', width: 5, height: 5, leds: 2, bumps: 5, colours: false, switch: false },
  { name: 'Thursday', width: 5, height: 5, leds: 2, bumps: 6, colours: true, switch: false },
  { name: 'Friday', width: 6, height: 5, leds: 2, bumps: 8, colours: true, switch: false },
  { name: 'Saturday', width: 6, height: 6, leds: 2, bumps: 10, colours: true, switch: true },
  { name: 'Sunday', width: 6, height: 6, leds: 3, bumps: 12, colours: true, switch: true },
];

/** Monday = 0 … Sunday = 6, for a YYYY-MM-DD key. */
export function weekdayIndex(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

// ---- 1. The loop ----

const STEP: Record<Direction, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };

function directionBetween(w: number, a: number, b: number): Direction {
  const dx = (b % w) - (a % w);
  const dy = Math.floor(b / w) - Math.floor(a / w);
  if (dx === 1) return E;
  if (dx === -1) return W;
  return dy === 1 ? S : N;
}

function makeLoop(w: number, h: number, bumps: number, random: () => number): number[] {
  const pick = (n: number) => Math.floor(random() * n);
  // A rectangle of at least 3×2 cells somewhere on the board.
  const rw = 3 + pick(Math.max(1, w - 4));
  const rh = 2 + pick(Math.max(1, h - 3));
  const x0 = pick(w - rw + 1);
  const y0 = pick(h - rh + 1);
  const loop: number[] = [];
  for (let x = x0; x < x0 + rw; x++) loop.push(y0 * w + x);
  for (let y = y0 + 1; y < y0 + rh; y++) loop.push(y * w + x0 + rw - 1);
  for (let x = x0 + rw - 2; x >= x0; x--) loop.push((y0 + rh - 1) * w + x);
  for (let y = y0 + rh - 2; y > y0; y--) loop.push(y * w + x0);

  // Bumps: swap a straight step a→b for a detour a→c→d→b one cell to the side.
  // Leave about 40% of the board for decoys: that's where the traps come from.
  const maxLength = Math.round(w * h * 0.6);
  for (let tries = 0, done = 0; done < bumps && tries < bumps * 30; tries++) {
    if (loop.length + 2 > maxLength) break;
    const i = pick(loop.length);
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    const d = directionBetween(w, a, b);
    const side = ((d + (random() < 0.5 ? 1 : 3)) % 4) as Direction;
    const [sx, sy] = STEP[side];
    const shift = (cell: number) => {
      const x = (cell % w) + sx;
      const y = Math.floor(cell / w) + sy;
      return x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x;
    };
    const c = shift(a);
    const e = shift(b);
    if (c < 0 || e < 0 || loop.includes(c) || loop.includes(e)) continue;
    loop.splice(i + 1, 0, c, e);
    done++;
  }
  return loop;
}

// ---- 2. Parts on the loop ----

/** Rotation that puts a two-terminal part's + port facing `plus` (rotation 0: + on W). */
const facing = (plus: Direction) => ((plus - W + 4) % 4) as 0 | 1 | 2 | 3;

const LED_COLOURS: LedColor[] = ['red', 'green', 'blue'];

interface Layout {
  tiles: (Tile | null)[];
  resistorCell: number;
}

function placeParts(
  w: number,
  h: number,
  loop: number[],
  tier: Tier,
  random: () => number,
): Layout | null {
  const n = loop.length;
  const prevDir = (i: number) => directionBetween(w, loop[i]!, loop[(i - 1 + n) % n]!);
  const nextDir = (i: number) => directionBetween(w, loop[i]!, loop[(i + 1) % n]!);
  const straight = loop.map((_, i) => (prevDir(i) + 2) % 4 === nextDir(i));

  // Battery first, then spread the other parts around the loop.
  const straights = loop.map((_, i) => i).filter((i) => straight[i]);
  const parts = 1 + tier.leds + 1 + (tier.switch ? 1 : 0); // battery, LEDs, resistor, switch
  if (straights.length < parts) return null;
  const order = [...straights].sort(() => random() - 0.5);
  const chosen: number[] = [];
  for (const i of order) {
    // Keep parts apart so the loop doesn't look like a solid row of parts.
    if (chosen.some((j) => Math.min(Math.abs(i - j), n - Math.abs(i - j)) < 2)) continue;
    chosen.push(i);
    if (chosen.length === parts) break;
  }
  if (chosen.length < parts) return null;
  chosen.sort((a, b) => a - b);

  const tiles: (Tile | null)[] = Array(w * h).fill(null);
  loop.forEach((cell, i) => {
    const arms = (1 << prevDir(i)) | (1 << nextDir(i));
    const shape = ([N, E, S, W] as Direction[]).filter((d) => arms & (1 << d));
    tiles[cell] = wireFromPorts(shape);
  });

  const [batteryAt, ...rest] = chosen as [number, ...number[]];
  // Current leaves the battery's + towards the next cell along the loop.
  tiles[loop[batteryAt]!] = battery(facing(nextDir(batteryAt)));
  const colours = tier.colours ? LED_COLOURS : (['red'] as LedColor[]);
  const resistorAt = rest.pop()!;
  const switchAt = tier.switch ? rest.pop()! : -1;
  for (const i of rest) {
    const colour = colours[Math.floor(random() * colours.length)]!;
    // Current enters an LED's anode (+) from the previous cell.
    tiles[loop[i]!] = led(facing(prevDir(i)), colour);
  }
  if (switchAt >= 0) {
    tiles[loop[switchAt]!] = switchTile(false, nextDir(switchAt) % 2 === 1 ? 0 : 1);
  }
  tiles[loop[resistorAt]!] = resistor(220, nextDir(resistorAt) % 2 === 1 ? 0 : 1);
  return { tiles, resistorCell: loop[resistorAt]! };
}

function wireFromPorts(ports: Direction[]): Tile {
  // Find the classic shape and turn whose ports match.
  for (const shape of ['straight', 'corner', 'tee', 'cross'] as const) {
    for (let r = 0; r < 4; r++) {
      const t = wire(shape, r as 0 | 1 | 2 | 3);
      const p = getPorts(t);
      if (p.length === ports.length && p.every((d) => ports.includes(d))) return t;
    }
  }
  throw new Error('no wire for ports');
}

// ---- 3. Battery and resistor, by simulation ----

const VOLTS = [3, 6, 9] as const;
const OHMS = [0, 100, 220, 470] as const;

function tune(layout: Layout, w: number, h: number): (Tile | null)[] | null {
  for (const volts of VOLTS) {
    for (const ohms of OHMS) {
      const tiles: (Tile | null)[] = layout.tiles.map((t): Tile | null => {
        if (t?.kind === 'battery') return { ...t, volts };
        if (t?.kind === 'switch') return { ...t, closed: true };
        return t;
      });
      const r = tiles[layout.resistorCell]!;
      // No resistor at all: a plain wire takes its place (blue on 3 V, a string on 6 V…).
      tiles[layout.resistorCell] =
        ohms === 0 ? wireFromPorts(getPorts(r)) : ({ ...r, kind: 'resistor', ohms } as Tile);
      const result = simulate({ width: w, height: h, cells: tiles });
      const leds = result.tiles.filter((t) => t?.kind === 'led');
      // Every LED clearly lit (at least a quarter of full brightness), none burning.
      if (leds.every((t) => t!.status === 'OK' && t!.brightness >= 0.25 && t!.brightness <= 1)) {
        return tiles.map((t) => (t?.kind === 'switch' ? { ...t, closed: false } : t));
      }
    }
  }
  return null;
}

// ---- 4. Decoys, and the picture ----

function decoy(random: () => number): Tile {
  const roll = random();
  const shape = roll < 0.4 ? 'corner' : roll < 0.72 ? 'straight' : 'tee';
  return wire(shape, Math.floor(random() * 4) as 0 | 1 | 2 | 3);
}

const WIRE_CHARS: Record<string, string> = {
  '0,2': '│',
  '1,3': '─',
  '0,1': '└',
  '1,2': '┌',
  '2,3': '┐',
  '0,3': '┘',
  '1,2,3': '┬',
  '0,2,3': '┤',
  '0,1,3': '┴',
  '0,1,2': '├',
  '0,1,2,3': '┼',
};
const ARROWS = ['>', 'v', '<', '^'] as const;
const LED_LETTER: Record<LedColor, string> = { red: '', green: 'g', blue: 'b' };

/** The parse.ts token for a tile, so generated jobs are ordinary level pictures. */
export function tileToken(t: Tile | null): string {
  if (!t) return '.';
  switch (t.kind) {
    case 'wire':
      return WIRE_CHARS[[...getPorts(t)].sort().join()]!;
    case 'block':
      return '#';
    case 'led':
      return `L${LED_LETTER[t.color]}${ARROWS[t.rotation]}`;
    case 'battery':
      return `B${t.volts === 3 ? '' : t.volts}${ARROWS[(t.rotation + 2) % 4]}`;
    case 'resistor':
      return `R${t.ohms}${t.rotation % 2 ? 'v' : ''}`;
    case 'switch':
      return `S${t.closed ? 1 : 0}${t.rotation % 2 ? 'v' : ''}`;
    case 'diode':
      return `D${ARROWS[t.rotation]}`;
    case 'changeover':
      return `C${t.up ? 'u' : 'd'}${t.rotation || ''}`;
    case 'meter':
      return `M${t.mode}${t.rotation % 2 ? 'v' : ''}`;
    case 'capacitor':
      return `C${t.uf}${t.rotation % 2 ? 'v' : ''}`;
    case 'transistor':
      return `Q${t.rotation || ''}`;
  }
}

function picture(tiles: (Tile | null)[], w: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < tiles.length / w; y++) {
    rows.push(
      tiles
        .slice(y * w, y * w + w)
        .map(tileToken)
        .join(' '),
    );
  }
  return rows;
}

// ---- The job ----

const THINGS = [
  'porch light',
  'shop sign',
  'garden lamp',
  'reading lamp',
  'kitchen light',
  'boat lights',
  'night light',
  'doorbell light',
  'fish tank light',
  'bike light',
];
const ASKS = [
  'Grumble zapped my {thing} last night! Could you sort it out?',
  'My {thing} is all twisted around. Pip says you’re good at this.',
  'Emergency! My {thing} went dark and I can’t find the switch… or the wires… or anything.',
  'Could you have a look at my {thing}? It’s been sulking since the storm.',
];

/** Day number since 2026-01-01, so every day gets its own id for the job. */
function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
}

export const DAILY_ID_BASE = 100000;

export function dailyLevel(day: string): LevelDef {
  const tier = TIERS[weekdayIndex(day)]!;
  const { width: w, height: h } = tier;
  for (let attempt = 0; attempt < 500; attempt++) {
    const random = rng(hash(`${day}#${attempt}`));
    const loop = makeLoop(w, h, tier.bumps, random);
    const layout = placeParts(w, h, loop, tier, random);
    if (!layout) continue;
    const tuned = tune(layout, w, h);
    if (!tuned) continue;
    const tiles = tuned.map((t) => t ?? decoy(random));
    const leds = tiles.filter((t) => t?.kind === 'led').length;
    const ledNames = Array.from({ length: leds }, (_, i) => String.fromCharCode(65 + i));
    const goals: Goal[] = tier.switch
      ? [
          { kind: 'only', leds: ledNames, when: { S1: true } },
          { kind: 'only', leds: [], when: {} },
        ]
      : [{ kind: 'only', leds: ledNames }];

    const clients = Object.keys(CAST).filter((id) => id !== 'gran');
    const client = clients[Math.floor(random() * clients.length)]!;
    const thing = THINGS[Math.floor(random() * THINGS.length)]!;
    const ask = ASKS[Math.floor(random() * ASKS.length)]!.replace('{thing}', thing);
    const level: LevelDef = {
      id: DAILY_ID_BASE + dayNumber(day),
      title: `${tier.name} Blackout`,
      intro: tier.switch
        ? 'Turn the pieces so the switch turns every LED on and off.'
        : 'Turn the pieces until every LED lights up.',
      board: picture(tiles, w),
      twist: { seed: hash(`${day}#scramble#${attempt}`) },
      inventory: {},
      wireBudget: null,
      goals,
      tip: 'Start at the battery’s + and follow the loop, one piece at a time.',
      job: {
        client,
        place: `${CAST[client]!.name}’s ${thing}`,
        building: 'house',
        ask,
        thanks: 'Lights on! You’re the best electrician in Glowtown.',
      },
    };
    // The drawn picture must solve it, and the scramble must not already.
    if (!evaluateLevel(level, createLevelBoard({ ...level, twist: undefined })).complete) continue;
    if (evaluateLevel(level, createLevelBoard(level)).complete) continue;
    return level;
  }
  throw new Error(`could not generate a daily job for ${day}`);
}
