import { describe, expect, it } from 'vitest';

import { historyReducer } from './history';
import { createLevelBoard } from '../levels/evaluate';
import { getLevel } from '../levels/levels';

describe('edits that change nothing', () => {
  it('a copy of the board that looks the same adds no undo step', () => {
    const start = { board: createLevelBoard(getLevel(1)!), past: [] };
    const h = historyReducer(start, { type: 'edit', edit: (b) => ({ ...b, cells: [...b.cells] }) });
    expect(h).toBe(start);
  });
});
