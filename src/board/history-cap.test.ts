import { describe, expect, it } from 'vitest';

import { wire } from '../engine';
import { placeTile, rotateAt } from './board';
import { historyReducer } from './history';
import { createLevelBoard } from '../levels/evaluate';
import { getLevel } from '../levels/levels';

describe('undo cap', () => {
  const start = { board: createLevelBoard(getLevel(1)!), past: [] };
  let h = historyReducer(start, { type: 'edit', edit: (b) => placeTile(b, 0, wire('corner')) });
  const boards = [h.board];
  for (let i = 0; i < 104; i++) {
    h = historyReducer(h, { type: 'edit', edit: (b) => rotateAt(b, 0) });
    boards.push(h.board);
  }

  it('keeps exactly the last 100 steps on edit', () => {
    expect(h.past).toHaveLength(100);
    expect(h.past[0]).toBe(boards[4]); // oldest kept: board after the 5th edit
    expect(h.past[99]).toBe(boards[103]);
  });

  it('keeps exactly the last 100 steps on reset', () => {
    const r = historyReducer(h, { type: 'reset', board: start.board });
    expect(r.past).toHaveLength(100);
    expect(r.past[0]).toBe(h.past[1]);
    expect(r.past[99]).toBe(h.board);
  });
});
