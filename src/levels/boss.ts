// Boss fights: phases, and Grumble's sabotage between them. Pure TypeScript.

import { type BoardState, setCell } from '../board/board';
import { block, rotateTile } from '../engine';
import { partKey, scrambleState } from './evaluate';
import type { LevelDef, PartKey, Sabotage } from './types';

export function phaseCount(level: LevelDef): number {
  return 1 + (level.phases?.length ?? 0);
}

/**
 * The level as it stands in phase `i` (0 = the level's own goals): that phase's goals,
 * intro and solution, and the tray after every zap and gift so far.
 */
export function phaseLevel(level: LevelDef, i: number): LevelDef {
  if (i === 0 || !level.phases) return level;
  const phase = level.phases[i - 1]!;
  const inventory: Partial<Record<PartKey, number>> = { ...level.inventory };
  for (const p of level.phases.slice(0, i)) {
    for (const s of p.sabotage) {
      if (s.op === 'zap') inventory[s.part] = Math.max(0, (inventory[s.part] ?? 0) - 1);
      if (s.op === 'give') inventory[s.part] = (inventory[s.part] ?? 0) + s.count;
    }
  }
  return {
    ...level,
    intro: phase.intro,
    goals: phase.goals,
    solution: phase.solution,
    inventory,
  };
}

/** Grumble strikes before phase `i` (1-based into level.phases). */
export function sabotage(level: LevelDef, i: number, board: BoardState): BoardState {
  const phase = level.phases?.[i - 1];
  if (!phase) return board;
  return phase.sabotage.reduce(strike, board);
}

function strike(board: BoardState, s: Sabotage): BoardState {
  switch (s.op) {
    case 'battery':
      return board.cells.reduce((b, placed, cell) => {
        if (placed?.tile.kind !== 'battery') return b;
        let tile = { ...placed.tile, volts: s.volts ?? placed.tile.volts };
        if (s.flip) tile = rotateTile(rotateTile(tile));
        return setCell(b, cell, tile);
      }, board);
    case 'zap': {
      const cell = board.cells.findIndex((p) => p && !p.tile.locked && partKey(p.tile) === s.part);
      return cell < 0 ? board : setCell(board, cell, null);
    }
    case 'give':
      return board;
    case 'drop':
      return setCell(board, s.at[1] * board.width + s.at[0], block());
    case 'scramble':
      return scrambleState(board, s.seed);
  }
}
