import { describe, expect, it } from 'vitest';

import { type BoardState, eraseWire, fromEngineBoard, rotateAt, wireCount } from '../board/board';
import { type Tile, parseBoard } from '../engine';
import {
  createLevelBoard,
  describeGoal,
  evaluateLevel,
  levelLabels,
  remainingParts,
} from './evaluate';
import { LEVELS, getLevel } from './levels';

/** A tile's identity, ignoring lock flags and switch positions. */
const shape = (tile: Tile) => {
  const { locked: _locked, ...rest } = tile;
  return rest.kind === 'switch' ? { ...rest, closed: false } : rest;
};

/** A finished board drawn as a picture, with the level's locked parts kept locked. */
function solved(id: number, picture: string[]): BoardState {
  const level = getLevel(id)!;
  const start = createLevelBoard(level);
  const board = fromEngineBoard(parseBoard(picture));
  return {
    ...board,
    cells: board.cells.map((p, i) => {
      const fixed = start.cells[i];
      if (fixed?.tile.locked) {
        // The solution must leave every locked part exactly where it was.
        expect(p && shape(p.tile)).toEqual(shape(fixed.tile));
        return { ...p!, tile: fixed.tile };
      }
      return p;
    }),
  };
}

const SOLUTIONS: Record<number, string[]> = {
  1: ['. .  .    .  .', '. ┌  R220 ┐  .', '. B^ .    Lv .', '. └  ─    ┘  .', '. .  .    .  .'],
  2: ['┌  ─ R220 ─ ┐', '│  . #    . │', 'B^ . #    . Lv', '│  . #    . │', '└  ─ ─    ─ ┘'],
  4: [
    '. .  .     .  .',
    '. ┌  R1000 ┐  .',
    '. B^ .     Lv .',
    '. └  ─     ┘  .',
    '. .  .     .  .',
  ],
  5: [
    '.  .  .     .  .',
    '┌  ─  ┬     ─  ┐',
    'B^ .  R220v .  R220v',
    '│  .  Lv    .  Lv',
    '└  ─  ┴     ─  ┘',
  ],
  6: ['.  ┌ R220 ┐ .', '┌  ┴ R220 ┴ ┐', 'B^ . .    . Lv', '└  ─ ─    ─ ┘', '.  . .    . .'],
  7: ['┌  ─ ─    ─ ┐', '│  . L>   . │', 'B^ . .    . Lv', '└  ─ R220 ─ ┘', '.  . .    . .'],
  8: ['. .  .    .  .', '. ┌  R220 ┐  .', '. B^ .    Lv .', '. └  S0   ┘  .', '. .  .    .  .'],
  9: ['.  ┌ S0   ┐ .', '┌  ┴ S0   ┴ ┐', 'B^ . .    . Lv', '└  ─ R220 ─ ┘', '.  . .    . .'],
  10: [
    '┌  ─    S0 ─    ┐',
    '│  .    #  .    │',
    'B^ .    #  .    Lv',
    '│  .    #  .    │',
    '└  R100 S0 R100 ┘',
  ],
};

describe('levels', () => {
  it('has ten levels with unique ids and valid pictures', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const level of LEVELS) {
      const labels = levelLabels(level);
      for (const g of level.goals) expect(labels[g.led]).toBeDefined();
      for (const g of level.goals)
        for (const s of Object.keys(g.when ?? {})) expect(labels[s]).toBeDefined();
    }
  });

  it('no level starts out solved', () => {
    for (const level of LEVELS) {
      expect(evaluateLevel(level, createLevelBoard(level)).complete, `level ${level.id}`).toBe(
        false,
      );
    }
  });

  for (const [id, picture] of Object.entries(SOLUTIONS)) {
    it(`level ${id} is solvable within its wire budget and parts`, () => {
      const level = getLevel(Number(id))!;
      const board = solved(level.id, picture);
      const result = evaluateLevel(level, board);
      expect(result.goals.filter((g) => !g.met).map((g) => g.goal)).toEqual([]);
      expect(result.problem).toBeNull();
      expect(result.overBudget).toBe(false);
      if (level.wireBudget !== null) expect(wireCount(board)).toBeLessThanOrEqual(level.wireBudget);
      expect(Object.values(remainingParts(level, board)).every((n) => (n ?? 0) >= 0)).toBe(true);
      expect(result.complete).toBe(true);
    });
  }

  it('level 3 (repair) is solved by cutting the short and flipping the LED', () => {
    const level = getLevel(3)!;
    let board = createLevelBoard(level);
    expect(evaluateLevel(level, board).problem).toBe('short');
    board = eraseWire(board, 2 * 5 + 0); // the wire making the short
    const ledCell = 2 * 5 + 3;
    board = rotateAt(rotateAt(board, ledCell), ledCell);
    expect(evaluateLevel(level, board).complete).toBe(true);
  });

  it('the obvious wrong answers fail', () => {
    // Level 4: the 220 Ω resistor is too bright for "dim".
    const tooBright = solved(
      4,
      SOLUTIONS[4]!.map((r) => r.replace('R1000', 'R220 ')),
    );
    expect(evaluateLevel(getLevel(4)!, tooBright).complete).toBe(false);
    // Level 6: one 220 Ω resistor isn't bright enough.
    const single = solved(6, [
      '.  . .    . .',
      '┌  ─ R220 ─ ┐',
      'B^ . .    . Lv',
      '└  ─ ─    ─ ┘',
      '.  . .    . .',
    ]);
    expect(evaluateLevel(getLevel(6)!, single).complete).toBe(false);
    // Level 7: the short way puts B in series with A, so neither lights.
    const trap = solved(7, [
      '.  . .    . .',
      '┌  ─ L>   ─ ┐',
      'B^ . .    . Lv',
      '└  ─ R220 ─ ┘',
      '.  . .    . .',
    ]);
    expect(evaluateLevel(getLevel(7)!, trap).goals[0]!.met).toBe(false);
    // Level 10: switches in parallel (OR) instead of series (AND) fails.
    const level9Style = solved(9, SOLUTIONS[9]!);
    expect(evaluateLevel(getLevel(9)!, level9Style).complete).toBe(true);
  });

  it('describes goals in plain English', () => {
    const l10 = getLevel(10)!;
    expect(describeGoal(l10.goals[0]!, 1, 2)).toBe(
      'Light the LED at medium brightness when S1 and S2 are ON',
    );
    expect(describeGoal(l10.goals[1]!, 1, 2)).toBe('Keep the LED dark when only S1 is ON');
    expect(describeGoal(getLevel(8)!.goals[1]!, 1, 1)).toBe(
      'Keep the LED dark when the switch is OFF',
    );
    expect(describeGoal(getLevel(7)!.goals[1]!, 2, 0)).toBe('Keep B dark');
  });
});
