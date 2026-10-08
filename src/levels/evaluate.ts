// Checks a board against a level's goals. Pure TypeScript.

import { type BoardState, fromEngineBoard, toEngineBoard, wireCount } from '../board/board';
import { type SimulationResult, type Tile, parseBoard, simulate } from '../engine';
import { BRIGHTNESS, type Goal, type LevelDef, type PartKey, type SwitchStates } from './types';

export function partKey(tile: Tile): PartKey | null {
  if (tile.kind === 'led') return 'led';
  if (tile.kind === 'resistor') return `r${tile.ohms}` as PartKey;
  return null;
}

/** The level's starting board: pre-placed parts locked (batteries always). */
export function createLevelBoard(level: LevelDef): BoardState {
  const board = parseBoard(level.board);
  return fromEngineBoard({
    ...board,
    cells: board.cells.map((t) =>
      t ? { ...t, locked: !level.loose || t.kind === 'battery' || t.kind === 'block' } : null,
    ),
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

export function evaluateLevel(level: LevelDef, state: BoardState): Evaluation {
  const labels = levelLabels(level);
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
    const led = solve(goal.when).tiles[labels[goal.led] ?? -1];
    if (!led || led.kind !== 'led') return { goal, met: false };
    if (goal.kind === 'dark')
      return { goal, met: led.status !== 'OK' && led.status !== 'BURNED_OUT' };
    const band = BRIGHTNESS[goal.brightness ?? 'any'];
    return {
      goal,
      met: led.status === 'OK' && led.brightness >= band.min && led.brightness <= band.max,
    };
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

/** Plain-English goal, e.g. "Light A brightly when S1 and S2 are ON". */
export function describeGoal(goal: Goal, ledCount: number, switchCount: number): string {
  const name = ledCount === 1 ? 'the LED' : goal.led;
  const verb =
    goal.kind === 'lit'
      ? `Light ${name}${goal.brightness && goal.brightness !== 'any' ? ` ${BRIGHTNESS[goal.brightness].word}` : ''}`
      : `Keep ${name} dark`;
  if (!goal.when) return verb;
  const on = Object.entries(goal.when)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (switchCount === 1) return `${verb} when the switch is ${on.length ? 'ON' : 'OFF'}`;
  if (on.length === 0) return `${verb} when all switches are OFF`;
  const list = on.length === 1 ? on[0] : `${on.slice(0, -1).join(', ')} and ${on.at(-1)}`;
  return `${verb} when ${on.length === 1 ? 'only ' : ''}${list} ${on.length === 1 ? 'is' : 'are'} ON`;
}
