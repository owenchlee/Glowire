import { describe, expect, it } from 'vitest';

import { wire } from '../engine';
import { placeTile, removeAt, rotateAt } from './board';
import { historyReducer } from './history';
import { createTutorialBoard } from './tutorial';

describe('undo history', () => {
  const start = { board: createTutorialBoard(), past: [] };

  it('undoes edits in reverse order', () => {
    let h = historyReducer(start, { type: 'edit', edit: (b) => placeTile(b, 0, wire('corner')) });
    h = historyReducer(h, { type: 'edit', edit: (b) => rotateAt(b, 0) });
    expect(h.past).toHaveLength(2);
    h = historyReducer(h, { type: 'undo' });
    expect(h.board.cells[0]?.tile.rotation).toBe(0);
    h = historyReducer(h, { type: 'undo' });
    expect(h.board).toBe(start.board);
    expect(historyReducer(h, { type: 'undo' })).toBe(h); // nothing left to undo
  });

  it('ignores edits that change nothing', () => {
    const lockedBattery = start.board.cells.findIndex((c) => c?.tile.locked);
    expect(historyReducer(start, { type: 'edit', edit: (b) => removeAt(b, lockedBattery) })).toBe(
      start,
    );
  });

  it('reset clears the board but can itself be undone', () => {
    let h = historyReducer(start, { type: 'edit', edit: (b) => placeTile(b, 0, wire('cross')) });
    h = historyReducer(h, { type: 'reset', board: createTutorialBoard() });
    expect(h.board.cells[0]).toBeNull();
    h = historyReducer(h, { type: 'undo' });
    expect(h.board.cells[0]?.tile).toEqual(wire('cross'));
  });
});
