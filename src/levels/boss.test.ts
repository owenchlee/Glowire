import { describe, expect, it } from 'vitest';

import { type BoardState, fromEngineBoard } from '../board/board';
import { parseBoard } from '../engine';
import { phaseCount, phaseLevel, sabotage } from './boss';
import { createLevelBoard, evaluateLevel, remainingParts } from './evaluate';
import { LEVELS, getLevel, levelNumber } from './levels';
import { dig, sameJob, solutionPicture } from './solution';

const BOSSES = LEVELS.filter((l) => l.boss);

/**
 * The picture laid over the board in play. Locked pieces must be exactly where they are now
 * (twist pieces may be turned), so a phase can't be solved by moving what Grumble left.
 */
function lay(board: BoardState, picture: string[], where: string): BoardState {
  const drawn = fromEngineBoard(parseBoard(picture));
  expect(drawn.width, where).toBe(board.width);
  expect(drawn.height, where).toBe(board.height);
  return {
    ...board,
    cells: board.cells.map((placed, i) => {
      const want = drawn.cells[i];
      if (placed?.tile.spin) {
        expect(want?.tile.kind, `${where} cell ${i}`).toBe(placed.tile.kind);
        return { ...placed, tile: { ...want!.tile, locked: true, spin: true } };
      }
      if (placed?.tile.locked) {
        expect(sameJob(want?.tile, placed.tile), `${where} cell ${i} (locked)`).toBe(true);
        return placed;
      }
      return want ? { ...want, id: 1000 + i } : null;
    }),
  };
}

describe('boss fights', () => {
  it('every district ends with a boss', () => {
    expect(BOSSES.map((b) => levelNumber(b.id))).toEqual(['1-Boss', '2-Boss', '3-Boss', '4-Boss']);
  });

  for (const boss of BOSSES) {
    it(`${boss.title}: every phase can be won after Grumble strikes`, () => {
      let board = createLevelBoard(boss);
      for (let i = 0; i < phaseCount(boss); i++) {
        const phase = phaseLevel(boss, i);
        const where = `${boss.title} phase ${i + 1}`;
        if (i > 0) {
          board = sabotage(boss, i, board);
          // Grumble's move must actually undo the win.
          expect(evaluateLevel(phase, board).complete, `${where} starts unsolved`).toBe(false);
        }
        board = lay(board, solutionPicture(phase)!, where);
        const result = evaluateLevel(phase, board);
        expect(
          result.goals.filter((g) => !g.met).map((g) => g.goal),
          where,
        ).toEqual([]);
        expect(result.problem, where).toBeNull();
        expect(
          Object.values(remainingParts(phase, board)).every((n) => (n ?? 0) >= 0),
          `${where} parts`,
        ).toBe(true);
        expect(result.complete, where).toBe(true);
      }
    });

    it(`${boss.title}: Scout can dig through every phase`, () => {
      let board = createLevelBoard(boss);
      for (let i = 0; i < phaseCount(boss); i++) {
        const phase = phaseLevel(boss, i);
        if (i > 0) board = sabotage(boss, i, board);
        for (let n = 0, next = dig(phase, board); next && n < 100; n++, next = dig(phase, board)) {
          board = next.board;
        }
        expect(evaluateLevel(phase, board).complete, `${boss.title} phase ${i + 1}`).toBe(true);
      }
    });
  }

  it('Grumble’s sabotage does what it says', () => {
    const tangle = getLevel(32)!;
    let board = lay(createLevelBoard(tangle), tangle.solution!, 'tangle');
    board = sabotage(tangle, 1, board);
    expect(board.cells.filter((p) => p?.tile.kind === 'resistor')).toHaveLength(1);
    expect(phaseLevel(tangle, 1).inventory.r220).toBe(1);
    board = sabotage(tangle, 2, board);
    expect(board.cells[1 * 6 + 2]?.tile.kind).toBe('block');
    expect(phaseLevel(tangle, 2).inventory).toEqual({ led: 2, r220: 1, r100: 2 });

    const surge = getLevel(34)!;
    const zapped = sabotage(surge, 1, createLevelBoard(surge));
    expect(zapped.cells.find((p) => p?.tile.kind === 'battery')?.tile).toMatchObject({ volts: 6 });
  });
});
