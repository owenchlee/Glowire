import { describe, expect, it } from 'vitest';

import { type BoardState, fromEngineBoard, rotateAt } from '../board/board';
import { parseBoard } from '../engine';
import { createLevelBoard, evaluateLevel, partKey } from './evaluate';
import { LEVELS, getLevel } from './levels';
import { dig, parTurns, sameJob, solutionPicture, solutionTiles, unneededParts } from './solution';
import { type PlayRecord, countStars, describeStar, starGoalsFor } from './stars';

/** Dig until Scout has nothing left to fix. */
function digAll(id: number): BoardState {
  const level = getLevel(id)!;
  let board = createLevelBoard(level);
  for (let i = 0; i < 200; i++) {
    const next = dig(level, board);
    if (!next) return board;
    board = next.board;
  }
  throw new Error(`level ${id}: dig never finished`);
}

describe('stars', () => {
  it('every level has a solution, a job, a tip and two star goals', () => {
    for (const level of LEVELS) {
      expect(solutionPicture(level), `level ${level.id}`).not.toBeNull();
      expect(level.job, `level ${level.id}`).toBeDefined();
      expect(level.tip, `level ${level.id}`).toBeTruthy();
      expect(starGoalsFor(level)).toHaveLength(2);
    }
  });

  for (const level of LEVELS) {
    it(`level ${level.id}: Scout's digging leads to a three-star solve`, () => {
      const board = digAll(level.id);
      const evaluation = evaluateLevel(level, board);
      expect(evaluation.complete).toBe(true);
      const record: PlayRecord = { burned: false, helped: false, turns: parTurns(level) };
      expect(countStars(level, board, evaluation, record)).toBe(3);
    });
  }

  it('a sloppy solve earns fewer stars', () => {
    const level = getLevel(1)!;
    const board = digAll(1);
    const evaluation = evaluateLevel(level, board);
    expect(countStars(level, board, evaluation, { burned: true, helped: false, turns: 0 })).toBe(2);
    expect(
      countStars(level, createLevelBoard(level), evaluateLevel(level, createLevelBoard(level)), {
        burned: false,
        helped: false,
        turns: 0,
      }),
    ).toBe(0);
  });

  it('twist par is the exact number of taps back to the picture', () => {
    const level = getLevel(26)!;
    const want = solutionTiles(level)!;
    let board = createLevelBoard(level);
    let taps = 0;
    for (let cell = 0; cell < board.cells.length; cell++) {
      if (!board.cells[cell]?.tile.spin) continue;
      for (let n = 0; n < 4 && !sameJob(board.cells[cell]!.tile, want[cell]); n++) {
        board = rotateAt(board, cell);
        taps++;
      }
    }
    expect(evaluateLevel(level, board).complete).toBe(true);
    expect(taps).toBe(parTurns(level));
  });

  it('describes star goals in plain words', () => {
    const names = { A: 'the LED' };
    expect(describeStar({ kind: 'wire', max: 5 }, names, 0)).toBe('Use 5 wire or less');
    expect(describeStar({ kind: 'turns', max: 11 }, names, 0)).toBe(
      'Solve it in 11 turns or fewer',
    );
    expect(
      describeStar(
        { kind: 'goal', goal: { kind: 'lit', led: 'A', brightness: 'bright' } },
        names,
        0,
      ),
    ).toBe('Also: light the LED brightly');
  });
});

describe('pets', () => {
  it('Hoot crosses out exactly the parts the solution leaves in the tray', () => {
    expect(unneededParts(getLevel(4)!)).toEqual({ r100: 1, r220: 1 }); // Night Light: 1 kΩ
    expect(unneededParts(getLevel(11)!)).toEqual({ r100: 1, r470: 1 }); // Go Green: 220 Ω
    expect(unneededParts(getLevel(12)!)).toEqual({ r100: 1 }); // Feeling Blue: none at all
    expect(unneededParts(getLevel(1)!)).toEqual({});
  });

  it('Scout fixes one piece at a time, starting at the battery', () => {
    const level = getLevel(1)!;
    const first = dig(level, createLevelBoard(level))!;
    const battery = parseBoard(level.board).cells.findIndex((t) => t?.kind === 'battery');
    // The first fix sits right next to the battery.
    expect([battery - 5, battery + 5]).toContain(first.cell);
    expect(partKey(first.board.cells[first.cell]!.tile)).toBeNull(); // a wire, not a part
  });

  it('Scout takes back a misplaced part when the tray is empty', () => {
    const level = getLevel(1)!;
    // The only resistor is on the wrong side of the loop.
    const wrong = fromEngineBoard(
      parseBoard([
        '. .  .    .  .',
        '. ┌  ─    ┐  .',
        '. B^ .    Lv .',
        '. └  R220 ┘  .',
        '. .  .    .  .',
      ]),
    );
    const start = createLevelBoard(level);
    const board = {
      ...wrong,
      cells: wrong.cells.map((p, i) => (start.cells[i]?.tile.locked ? start.cells[i]! : p)),
    };
    let b: BoardState = board;
    for (let i = 0; i < 20; i++) {
      const next = dig(level, b);
      if (!next) break;
      b = next.board;
    }
    expect(evaluateLevel(level, b).complete).toBe(true);
    expect(b.cells.filter((p) => p?.tile.kind === 'resistor')).toHaveLength(1);
  });
});
