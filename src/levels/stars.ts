// Stars: ★ for solving a job, plus one for each star goal met. Pure TypeScript.

import { type BoardState, wireCount } from '../board/board';
import { type Evaluation, evaluateLevel, describeGoal } from './evaluate';
import type { LevelDef, StarGoal } from './types';

/** What happened while the player worked on the job (things the board alone can't show). */
export interface PlayRecord {
  /** An LED burned out on some board the player made. */
  burned: boolean;
  /** Pip's tip or a pet ability was used. */
  helped: boolean;
  /** Taps that turned a piece (twist jobs). */
  turns: number;
}

export const FRESH_RECORD: PlayRecord = { burned: false, helped: false, turns: 0 };

/** Star goals when a level doesn't list its own. */
const DEFAULT_STARS: [StarGoal, StarGoal] = [{ kind: 'safe' }, { kind: 'solo' }];

export function starGoalsFor(level: LevelDef): [StarGoal, StarGoal] {
  return level.stars ?? DEFAULT_STARS;
}

/** Parts the player put on the board (pre-placed locked parts and wires don't count). */
export function placedParts(state: BoardState): number {
  return state.cells.filter(
    (p) => p && !p.tile.locked && p.tile.kind !== 'wire' && p.tile.kind !== 'block',
  ).length;
}

export function starGoalMet(
  goal: StarGoal,
  level: LevelDef,
  state: BoardState,
  record: PlayRecord,
): boolean {
  switch (goal.kind) {
    case 'wire':
      return wireCount(state) <= goal.max;
    case 'parts':
      return placedParts(state) <= goal.max;
    case 'turns':
      return record.turns <= goal.max;
    case 'safe':
      return !record.burned;
    case 'solo':
      return !record.helped;
    case 'goal':
      return evaluateLevel({ ...level, goals: [goal.goal] }, state).goals[0]!.met;
  }
}

/** 0 if the job isn't solved, else 1 + the number of star goals met. */
export function countStars(
  level: LevelDef,
  state: BoardState,
  evaluation: Evaluation,
  record: PlayRecord,
): number {
  if (!evaluation.complete) return 0;
  return 1 + starGoalsFor(level).filter((g) => starGoalMet(g, level, state, record)).length;
}

export function describeStar(
  goal: StarGoal,
  names: Record<string, string>,
  switchCount: number,
): string {
  switch (goal.kind) {
    case 'wire':
      return `Use ${goal.max} wire or less`;
    case 'parts':
      return `Place ${goal.max} ${goal.max === 1 ? 'part' : 'parts'} or fewer`;
    case 'turns':
      return `Solve it in ${goal.max} turns or fewer`;
    case 'safe':
      return 'Don’t burn out a single LED';
    case 'solo':
      return 'Solve it without help from Pip or a pet';
    case 'goal':
      return `Also: ${describeGoal(goal.goal, names, switchCount).replace(/^./, (c) => c.toLowerCase())}`;
  }
}
