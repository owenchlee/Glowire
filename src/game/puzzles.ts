// Brain games: one puzzle per world, each tied to that world's story and each adding a twist
// to the last. They test deduction, spatial planning, sequencing and estimation, with
// electronics as what you learn on the way. Pure TypeScript; every function takes the random
// source as an argument so tests can rig it.
//
// - Dead Lamp Hunt (Glowtown, Gran): Grumble's zap killed one street lamp in a long series
//   string. You have a few voltmeter probes. Find it. (Deduction: binary search.)
// - Dockyard Wiring (Driftwood Harbour, Bolt): turn the pipes to carry power from the battery
//   to every lamp. Diodes only let it through one way. (Spatial planning.)
// - Clock Panel (Mossbell Hollow, Hazel): every clock stopped at 11:52. Each switch flips
//   itself and its neighbours. Bring them all back on. (Sequencing.)
// - Lantern Budget (Brightwater Deep, Pearl): your lantern runs down while the Hush feeds on
//   it. Which of three circuits makes the lamp brightest? (Estimation under pressure.)

export type Random = () => number;

// ── Dead Lamp Hunt ───────────────────────────────────────────────────────────

export interface ProbeRound {
  lamps: number;
  /** Which lamp (0-based) is dead. */
  dead: number;
  /** Voltmeter readings you can take. Enough to halve the string every time, plus one spare. */
  probes: number;
  volts: number;
}

const PROBE_LAMPS = [6, 8, 8, 10, 12, 12, 16, 16];

export function probeRound(round: number, random: Random): ProbeRound {
  const lamps = PROBE_LAMPS[Math.min(round, PROBE_LAMPS.length - 1)]!;
  return {
    lamps,
    dead: Math.floor(random() * lamps),
    probes: Math.ceil(Math.log2(lamps)) + 1,
    volts: [6, 9, 12][Math.floor(random() * 3)]!,
  };
}

/**
 * The voltmeter across lamps `from` to `to` (inclusive). The dead lamp is a gap in the
 * string, so the whole battery voltage drops across it, and across any span that holds it.
 * Everywhere else there is no current, so no voltage.
 */
export function probeReading(r: ProbeRound, from: number, to: number): number {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return r.dead >= lo && r.dead <= hi ? r.volts : 0;
}

export function probePoints(r: ProbeRound, probesUsed: number): number {
  return 10 + Math.max(0, r.probes - probesUsed) * 3;
}

// ── Dockyard Wiring ──────────────────────────────────────────────────────────

/** Sides of a tile as bits. */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
export const SIDES = [N, E, S, W] as const;

export type PipeKind = 'wire' | 'battery' | 'lamp' | 'diode';

export interface Pipe {
  kind: PipeKind;
  /** Which sides are open. */
  mask: number;
  /** A diode only passes power out of this side. It can't be turned. */
  flow?: number;
}

export interface PipeBoard {
  w: number;
  h: number;
  tiles: Pipe[];
  /** Turns needed to fix it, if you turn every wrong tile the short way. */
  par: number;
  /** The mask every tile has when solved (for tests and hints). */
  solution?: number[];
}

const opposite = (side: number) => ((side << 2) | (side >> 2)) & 15;
export const turnMask = (mask: number) => ((mask << 1) | (mask >> 3)) & 15;
const DX: Record<number, number> = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 };
const DY: Record<number, number> = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 };

export function canTurn(p: Pipe): boolean {
  return p.kind !== 'diode';
}

/** Which tiles have power: flood out of the battery through open, matching sides. */
export function powered(b: PipeBoard): boolean[] {
  const on = new Array<boolean>(b.tiles.length).fill(false);
  const start = b.tiles.findIndex((t) => t.kind === 'battery');
  if (start < 0) return on;
  on[start] = true;
  const queue = [start];
  while (queue.length) {
    const i = queue.pop()!;
    const t = b.tiles[i]!;
    const x = i % b.w;
    const y = Math.floor(i / b.w);
    for (const side of SIDES) {
      if (!(t.mask & side)) continue;
      if (t.kind === 'diode' && t.flow !== side) continue;
      const nx = x + DX[side]!;
      const ny = y + DY[side]!;
      if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
      const j = ny * b.w + nx;
      const n = b.tiles[j]!;
      if (!(n.mask & opposite(side)) || on[j]) continue;
      if (n.kind === 'diode' && n.flow !== side) continue;
      on[j] = true;
      queue.push(j);
    }
  }
  return on;
}

export function pipesSolved(b: PipeBoard): boolean {
  const on = powered(b);
  return b.tiles.every((t, i) => t.kind !== 'lamp' || on[i]);
}

const PIPE_SIZES: [number, number][] = [[3, 3], [4, 3], [4, 4], [5, 4], [5, 5], [6, 5]];

/** A random tree of wire grown from the battery, then every tile turned out of place. */
export function pipeBoard(round: number, random: Random): PipeBoard {
  const [w, h] = PIPE_SIZES[Math.min(round, PIPE_SIZES.length - 1)]!;
  const n = w * h;
  const masks = new Array<number>(n).fill(0);
  const parent = new Array<number>(n).fill(-1);
  const via = new Array<number>(n).fill(0); // the side of the parent that leads here
  const seen = new Array<boolean>(n).fill(false);
  const root = Math.floor(random() * n);
  seen[root] = true;
  // Randomised depth-first growth, which makes long winding wires with a few branches.
  const stack = [root];
  while (stack.length) {
    const i = stack[stack.length - 1]!;
    const x = i % w;
    const y = Math.floor(i / w);
    const open = SIDES.filter((s) => {
      const nx = x + DX[s]!;
      const ny = y + DY[s]!;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny * w + nx];
    });
    if (!open.length) {
      stack.pop();
      continue;
    }
    const side = open[Math.floor(random() * open.length)]!;
    const j = (y + DY[side]!) * w + (x + DX[side]!);
    seen[j] = true;
    parent[j] = i;
    via[j] = side;
    masks[i]! |= side;
    masks[j]! |= opposite(side);
    stack.push(j);
  }

  const solved: Pipe[] = masks.map((mask, i) => {
    const degree = SIDES.filter((s) => mask & s).length;
    if (i === root) return { kind: 'battery', mask };
    return { kind: degree === 1 ? 'lamp' : 'wire', mask };
  });

  // From the third board on, some straight stretches become diodes pointing away from the battery.
  if (round >= 2) {
    const wanted = Math.min(4, round - 1);
    const straights = solved
      .map((t, i) => ({ t, i }))
      .filter(({ t, i }) => t.kind === 'wire' && (t.mask === (N | S) || t.mask === (E | W)) && parent[i]! >= 0);
    for (let k = 0; k < wanted && straights.length; k++) {
      const at = Math.floor(random() * straights.length);
      const { t, i } = straights.splice(at, 1)[0]!;
      t.kind = 'diode';
      t.flow = via[i]!; // a straight tile carries power on in the direction it was entered
    }
  }

  // Turn every tile out of place. Diodes are bolted down.
  let par = 0;
  const tiles = solved.map((t) => {
    if (!canTurn(t)) return t;
    const turns = Math.floor(random() * 4);
    let mask = t.mask;
    for (let k = 0; k < turns; k++) mask = turnMask(mask);
    return { ...t, mask };
  });
  const board: PipeBoard = { w, h, tiles, par: 0, solution: solved.map((t) => t.mask) };
  // A board that came out already solved gets tiles nudged until it isn't.
  for (let i = 0; i < tiles.length && pipesSolved(board); i++) {
    const t = tiles[i]!;
    if (canTurn(t) && turnMask(t.mask) !== t.mask) tiles[i] = { ...t, mask: turnMask(t.mask) };
  }
  tiles.forEach((t, i) => {
    if (!canTurn(t)) return;
    let mask = t.mask;
    let taps = 0;
    while (mask !== solved[i]!.mask && taps < 4) {
      mask = turnMask(mask);
      taps++;
    }
    par += taps;
  });
  board.par = par;
  return board;
}

/** Turn one tile a quarter turn clockwise (a diode stays put). */
export function turnPipe(b: PipeBoard, i: number): PipeBoard {
  const t = b.tiles[i];
  if (!t || !canTurn(t)) return b;
  const tiles = b.tiles.slice();
  tiles[i] = { ...t, mask: turnMask(t.mask) };
  return { ...b, tiles };
}

export function pipePoints(taps: number, par: number): number {
  return 10 + (taps <= par ? 5 : 0);
}

// ── Clock Panel ──────────────────────────────────────────────────────────────

export interface PanelBoard {
  n: number;
  /** true = the clock is ticking. */
  on: boolean[];
  /** Presses that were used to scramble it: always enough to fix it. */
  par: number;
}

const PANEL_SIZES = [3, 3, 4, 4, 5, 5];

/** Press cell i: it and its four neighbours flip. */
export function pressPanel(n: number, on: boolean[], i: number): boolean[] {
  const x = i % n;
  const y = Math.floor(i / n);
  const next = on.slice();
  const flip = (cx: number, cy: number) => {
    if (cx < 0 || cy < 0 || cx >= n || cy >= n) return;
    next[cy * n + cx] = !next[cy * n + cx];
  };
  flip(x, y);
  flip(x + 1, y);
  flip(x - 1, y);
  flip(x, y + 1);
  flip(x, y - 1);
  return next;
}

export function panelSolved(p: PanelBoard): boolean {
  return p.on.every(Boolean);
}

/** Scramble a finished panel with a few distinct presses, so it can always be undone. */
export function panelBoard(round: number, random: Random): PanelBoard {
  const n = PANEL_SIZES[Math.min(round, PANEL_SIZES.length - 1)]!;
  const cells = n * n;
  for (let tries = 0; tries < 50; tries++) {
    const k = Math.min(cells - 1, 3 + Math.floor(round / 1.5));
    const chosen = new Set<number>();
    while (chosen.size < k) chosen.add(Math.floor(random() * cells));
    let on = new Array<boolean>(cells).fill(true);
    for (const i of chosen) on = pressPanel(n, on, i);
    if (!on.every(Boolean)) return { n, on, par: k };
  }
  // Practically unreachable; a single press always breaks the panel.
  return { n, on: pressPanel(n, new Array<boolean>(cells).fill(true), 0), par: 1 };
}

export function panelPoints(presses: number, par: number): number {
  return 10 + (presses <= par ? 5 : 0);
}

// ── Lantern Budget ───────────────────────────────────────────────────────────

export type RigKind = 'series' | 'twin' | 'parallel' | 'diode';

export interface Rig {
  kind: RigKind;
  volts: number;
  /** The extra resistor, where there is one. */
  ohms: number;
}

/** Every lamp in this game is 100 Ω. */
export const LAMP_OHMS = 100;
const DIODE_DROP = 0.7;

/** Current through the (first) lamp, in mA. */
export function lampMilliamps(r: Rig): number {
  switch (r.kind) {
    case 'series':
      return (r.volts / (LAMP_OHMS + r.ohms)) * 1000;
    case 'twin':
      return (r.volts / (2 * LAMP_OHMS)) * 1000;
    case 'parallel':
      // A second path across the battery doesn't change what the lamp gets.
      return (r.volts / LAMP_OHMS) * 1000;
    case 'diode':
      return (Math.max(0, r.volts - DIODE_DROP) / LAMP_OHMS) * 1000;
  }
}

export function rigText(r: Rig): string {
  switch (r.kind) {
    case 'series':
      return `${r.volts} V, then ${r.ohms} Ω, then the lamp`;
    case 'twin':
      return `${r.volts} V, then two lamps in a row`;
    case 'parallel':
      return `${r.volts} V, the lamp, and a ${r.ohms} Ω resistor beside it`;
    case 'diode':
      return `${r.volts} V, then a diode, then the lamp`;
  }
}

export interface LanternRound {
  rigs: Rig[];
  /** Index of the brightest. */
  best: number;
}

function kindsFor(round: number): RigKind[] {
  if (round < 3) return ['series', 'twin'];
  if (round < 6) return ['series', 'twin', 'parallel'];
  return ['series', 'twin', 'parallel', 'diode'];
}

/** Three rigs where one is clearly brightest (at least 15% over the next). */
export function lanternRound(round: number, random: Random): LanternRound {
  const kinds = kindsFor(round);
  const volts = [3, 5, 6, 9, 12];
  const ohms = [47, 100, 220, 470];
  for (let tries = 0; tries < 200; tries++) {
    const rigs: Rig[] = [0, 1, 2].map(() => ({
      kind: kinds[Math.floor(random() * kinds.length)]!,
      volts: volts[Math.floor(random() * volts.length)]!,
      ohms: ohms[Math.floor(random() * ohms.length)]!,
    }));
    const ma = rigs.map(lampMilliamps).sort((a, b) => b - a);
    if (ma[0]! >= ma[1]! * 1.15) {
      const best = rigs.reduce((bi, r, i) => (lampMilliamps(r) > lampMilliamps(rigs[bi]!) ? i : bi), 0);
      return { rigs, best };
    }
  }
  // Fallback that always satisfies the rule.
  return {
    rigs: [
      { kind: 'series', volts: 3, ohms: 470 },
      { kind: 'twin', volts: 6, ohms: 0 },
      { kind: 'parallel', volts: 12, ohms: 100 },
    ],
    best: 2,
  };
}

export const LANTERN_START = 100;
export const LANTERN_RIGHT = 15;
export const LANTERN_WRONG = 30;
/** How fast the lantern burns down, per second, at this round. */
export const lanternDrain = (round: number) => 3 + round * 0.35;

// ── Brain jobs: solvers and stars ────────────────────────────────────────────

/** A set of presses that solves a panel (Gaussian elimination over GF(2)), or null. */
export function solvePanel(p: PanelBoard): number[] | null {
  const cells = p.n * p.n;
  // Column j of the matrix is the set of cells flipped by pressing j; we need sum = (not on).
  const rows: number[][] = [];
  for (let c = 0; c < cells; c++) {
    const row = new Array<number>(cells + 1).fill(0);
    for (let j = 0; j < cells; j++) {
      const flipped = pressPanel(p.n, new Array<boolean>(cells).fill(false), j);
      if (flipped[c]) row[j] = 1;
    }
    row[cells] = p.on[c] ? 0 : 1;
    rows.push(row);
  }
  const pivotOf = new Array<number>(cells).fill(-1);
  let r = 0;
  for (let col = 0; col < cells && r < cells; col++) {
    const at = rows.findIndex((row, i) => i >= r && row[col] === 1);
    if (at < 0) continue;
    [rows[r], rows[at]] = [rows[at]!, rows[r]!];
    for (let i = 0; i < cells; i++) {
      if (i !== r && rows[i]![col] === 1) rows[i] = rows[i]!.map((v, k) => v ^ rows[r]![k]!);
    }
    pivotOf[col] = r;
    r++;
  }
  for (let i = r; i < cells; i++) if (rows[i]![cells] === 1) return null;
  const base = new Array<number>(cells).fill(0);
  for (let col = 0; col < cells; col++) if (pivotOf[col]! >= 0) base[col] = rows[pivotOf[col]!]![cells]!;
  // Free columns give null-space vectors; try every combination for the fewest presses.
  const frees = [...Array(cells).keys()].filter((c) => pivotOf[c]! < 0);
  const nulls = frees.map((f) => {
    const v = new Array<number>(cells).fill(0);
    v[f] = 1;
    for (let col = 0; col < cells; col++) if (pivotOf[col]! >= 0) v[col] = rows[pivotOf[col]!]![f]!;
    return v;
  });
  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << nulls.length; mask++) {
    const x = base.slice();
    nulls.forEach((v, k) => {
      if (mask & (1 << k)) v.forEach((bit, i) => (x[i]! ^= bit));
    });
    const presses = x.flatMap((bit, i) => (bit ? [i] : []));
    if (!best || presses.length < best.length) best = presses;
  }
  return best;
}

/** The lamps to probe to find the dead one by halving the string: a list of [from, to] spans. */
export function probeSearch(r: ProbeRound): { found: number; probes: number } {
  let lo = 0;
  let hi = r.lamps - 1;
  let probes = 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    probes++;
    if (probeReading(r, lo, mid) > 0) hi = mid;
    else lo = mid + 1;
  }
  return { found: lo, probes };
}

/** Stars (0 to 3) for a finished brain job, from the game's score. 0 means try again. */
export function brainStars(game: 'probe' | 'pipes' | 'panel' | 'lantern', score: number): number {
  const bands: Record<string, [number, number, number]> = {
    probe: [10, 45, 70],
    pipes: [50, 60, 70],
    panel: [50, 60, 70],
    lantern: [3, 7, 12],
  };
  const [one, two, three] = bands[game]!;
  return score >= three ? 3 : score >= two ? 2 : score >= one ? 1 : 0;
}
