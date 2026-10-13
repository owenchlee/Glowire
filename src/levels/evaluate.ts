// Checks a board against a level's goals. Pure TypeScript.

import { type BoardState, fromEngineBoard, toEngineBoard, wireCount } from '../board/board';
import {
  type Board,
  type LedColor,
  type SimulationResult,
  type Tile,
  type TileResult,
  getPorts,
  parseBoard,
  rotateTile,
  simulate,
} from '../engine';
import { BRIGHTNESS, type Goal, type LevelDef, type PartKey, type SwitchStates } from './types';

const LED_PART: Record<LedColor, PartKey> = { red: 'led', green: 'ledGreen', blue: 'ledBlue' };

export function partKey(tile: Tile): PartKey | null {
  if (tile.kind === 'led') return LED_PART[tile.color];
  if (tile.kind === 'resistor') return `r${tile.ohms}` as PartKey;
  if (tile.kind === 'battery' && tile.volts === 3) return 'battery';
  if (tile.kind === 'diode') return 'diode';
  return null;
}

/** Deterministic PRNG (mulberry32), so a twist level always starts the same way. */
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

/** Pieces a twist level shuffles: everything but batteries, switches and blocks. */
export const spins = (t: Tile) => t.kind === 'wire' || t.kind === 'led' || t.kind === 'resistor';

/** Quarter turns that visibly change a tile: a straight piece turned twice looks the same. */
function scrambleTurns(t: Tile, random: () => number): number {
  const ports = getPorts(t);
  if (ports.length === 4) return 0;
  const halfSymmetric =
    t.kind === 'resistor' || (t.kind === 'wire' && ports.every((d) => d % 2 === ports[0]! % 2));
  return halfSymmetric ? (random() < 0.5 ? 1 : 3) : 1 + Math.floor(random() * 3);
}

function twistBoard(board: Board, seed: number): Board {
  const random = rng(seed);
  return {
    ...board,
    cells: board.cells.map((t) => {
      if (!t) return null;
      if (!spins(t)) return { ...t, locked: true };
      let turned: Tile = { ...t, locked: true, spin: true };
      for (let n = scrambleTurns(t, random); n > 0; n--) turned = rotateTile(turned);
      return turned;
    }),
  };
}

/** Spin every turnable piece of a board in play (twist bosses re-scramble mid-fight). */
export function scrambleState(state: BoardState, seed: number): BoardState {
  const random = rng(seed);
  return {
    ...state,
    cells: state.cells.map((placed) => {
      if (!placed?.tile.spin) return placed;
      let tile = placed.tile;
      for (let n = scrambleTurns(tile, random); n > 0; n--) tile = rotateTile(tile);
      return { ...placed, tile };
    }),
  };
}

/**
 * The level's starting board. Pre-placed parts are locked, except in repair levels, where
 * wires and any part the inventory lists can be reworked, and twist levels, where pieces
 * start shuffled and can be turned.
 */
export function createLevelBoard(level: LevelDef): BoardState {
  const board = parseBoard(level.board);
  if (level.twist) return fromEngineBoard(twistBoard(board, level.twist.seed));
  const loose = (t: Tile) => {
    if (!level.loose || t.kind === 'block') return false;
    if (t.kind === 'wire') return true;
    const key = partKey(t);
    return !!key && (level.inventory[key] ?? 0) > 0;
  };
  return fromEngineBoard({
    ...board,
    cells: board.cells.map((t) => (t ? { ...t, locked: !loose(t) } : null)),
  });
}

/** Labels → cell: explicit ones, else LEDs A, B, … and switches S1, S2, … in reading order. */
export function levelLabels(level: LevelDef): Record<string, number> {
  const board = parseBoard(level.board);
  const labels: Record<string, number> = {};
  let led = 0;
  let sw = 0;
  board.cells.forEach((t, cell) => {
    if (t?.kind === 'led') labels[String.fromCharCode(65 + led++)] = cell;
    if (t?.kind === 'switch') labels[`S${++sw}`] = cell;
  });
  if (level.labels) {
    for (const key of Object.keys(labels)) if (!key.startsWith('S')) delete labels[key];
    for (const [name, [x, y]] of Object.entries(level.labels)) labels[name] = y * board.width + x;
  }
  return labels;
}

/** How many of each part the player has left to place. */
export function remainingParts(
  level: LevelDef,
  state: BoardState,
): Partial<Record<PartKey, number>> {
  const left: Partial<Record<PartKey, number>> = { ...level.inventory };
  for (const placed of state.cells) {
    if (!placed || placed.tile.locked) continue;
    const key = partKey(placed.tile);
    if (key) left[key] = (left[key] ?? 0) - 1;
  }
  return left;
}

export interface GoalStatus {
  goal: Goal;
  met: boolean;
}

export interface Evaluation {
  goals: GoalStatus[];
  /** Something shorts or burns out in one of the checked switch positions. */
  problem: 'short' | 'burn' | null;
  wires: number;
  overBudget: boolean;
  complete: boolean;
}

/** Set every switch to the given states (unlisted switches OFF). */
function withSwitches(
  state: BoardState,
  labels: Record<string, number>,
  when: SwitchStates,
): BoardState {
  const cells = state.cells.map((placed, cell) => {
    if (placed?.tile.kind !== 'switch') return placed;
    const name = Object.keys(labels).find((k) => labels[k] === cell);
    const closed = name ? (when[name] ?? false) : placed.tile.closed;
    return { ...placed, tile: { ...placed.tile, closed } };
  });
  return { ...state, cells };
}

const isLit = (led: TileResult | null | undefined): led is TileResult =>
  led?.kind === 'led' && led.status === 'OK';
const isDark = (led: TileResult | null | undefined) =>
  led?.kind === 'led' && led.status !== 'OK' && led.status !== 'BURNED_OUT';
const inBand = (led: TileResult, brightness: keyof typeof BRIGHTNESS = 'any') =>
  led.brightness >= BRIGHTNESS[brightness].min && led.brightness <= BRIGHTNESS[brightness].max;

export function evaluateLevel(level: LevelDef, state: BoardState): Evaluation {
  const labels = levelLabels(level);
  const ledLabels = Object.keys(labels).filter((k) => !k.startsWith('S'));
  const cache = new Map<string, SimulationResult>();
  const solve = (when?: SwitchStates): SimulationResult => {
    const key = when ? JSON.stringify(Object.entries(when).sort()) : 'current';
    let result = cache.get(key);
    if (!result) {
      const board = when ? withSwitches(state, labels, when) : state;
      result = simulate(toEngineBoard(board));
      cache.set(key, result);
    }
    return result;
  };

  const goals = level.goals.map((goal): GoalStatus => {
    const tiles = solve(goal.when).tiles;
    const at = (name: string) => tiles[labels[name] ?? -1];
    if (goal.kind === 'dark') return { goal, met: isDark(at(goal.led)) };
    if (goal.kind === 'lit') {
      const led = at(goal.led);
      return { goal, met: isLit(led) && inBand(led, goal.brightness) };
    }
    if (goal.kind === 'all') {
      const leds = tiles.filter((t) => t?.kind === 'led');
      const met =
        leds.length >= goal.count && leds.every((t) => isLit(t) && inBand(t, goal.brightness));
      return { goal, met };
    }
    const met = ledLabels.every((name) => {
      const led = at(name);
      return goal.leds.includes(name) ? isLit(led) && inBand(led, goal.brightness) : isDark(led);
    });
    return { goal, met };
  });

  solve(); // the board as the player currently has it
  let problem: Evaluation['problem'] = null;
  for (const result of cache.values()) {
    if (result.shortCircuit) problem = 'short';
    else if (!problem && result.tiles.some((t) => t?.status === 'BURNED_OUT')) problem = 'burn';
  }

  const wires = wireCount(state);
  const overBudget = level.wireBudget !== null && wires > level.wireBudget;
  const overParts = Object.values(remainingParts(level, state)).some((n) => (n ?? 0) < 0);
  return {
    goals,
    problem,
    wires,
    overBudget,
    complete: goals.every((g) => g.met) && !problem && !overBudget && !overParts,
  };
}

/**
 * How goals refer to each LED: "the LED" when there is only one, "the red LED" when its
 * colour is unique on the board, otherwise its letter.
 */
export function ledNamesFor(level: LevelDef): Record<string, string> {
  const board = parseBoard(level.board);
  const leds = Object.entries(levelLabels(level)).filter(([k]) => !k.startsWith('S'));
  const colorOf = (cell: number) => {
    const t = board.cells[cell];
    return t?.kind === 'led' ? t.color : null;
  };
  const names: Record<string, string> = {};
  for (const [name, cell] of leds) {
    const color = colorOf(cell);
    const unique = leds.filter(([, c]) => colorOf(c) === color).length === 1;
    const colorful = new Set(leds.map(([, c]) => colorOf(c))).size > 1;
    if (leds.length === 1) names[name] = 'the LED';
    else if (unique && colorful) names[name] = `the ${color} LED`;
    else names[name] = name;
  }
  return names;
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** Plain-English goal, e.g. "Light A brightly when S1 and S2 are ON". */
export function describeGoal(
  goal: Goal,
  names: Record<string, string>,
  switchCount: number,
): string {
  const name = (led: string) => names[led] ?? led;
  const how =
    goal.kind !== 'dark' && goal.brightness && goal.brightness !== 'any'
      ? ` ${BRIGHTNESS[goal.brightness].word}`
      : '';
  const ledCount = Object.keys(names).length;
  let verb: string;
  if (goal.kind === 'lit') verb = `Light ${name(goal.led)}${how}`;
  else if (goal.kind === 'dark') verb = `Keep ${name(goal.led)} dark`;
  else if (goal.kind === 'all')
    verb = goal.count === 2 ? `Light both LEDs${how}` : `Light all ${goal.count} LEDs${how}`;
  else if (goal.leds.length === 0) verb = 'Keep every LED dark';
  else if (goal.leds.length === ledCount)
    verb = `Light ${ledCount === 1 ? 'the LED' : ledCount === 2 ? 'both LEDs' : 'every LED'}${how}`;
  else verb = `Light only ${list(goal.leds.map(name))}${how}`;
  if (!goal.when) return verb;
  const on = Object.entries(goal.when)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (switchCount === 1) return `${verb} when the switch is ${on.length ? 'ON' : 'OFF'}`;
  if (on.length === 0) return `${verb} when all switches are OFF`;
  return `${verb} when ${on.length === 1 ? 'only ' : ''}${list(on)} ${on.length === 1 ? 'is' : 'are'} ON`;
}

/** Cells of LEDs that some goal wants dark (in some switch position). */
export function cellsMeantDark(level: LevelDef): Set<number> {
  const labels = levelLabels(level);
  const leds = Object.keys(labels).filter((k) => !k.startsWith('S'));
  const dark = new Set<number>();
  for (const goal of level.goals) {
    if (goal.kind === 'dark') dark.add(labels[goal.led]!);
    if (goal.kind === 'only')
      for (const led of leds) if (!goal.leds.includes(led)) dark.add(labels[led]!);
  }
  return dark;
}
