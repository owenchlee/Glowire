import { describe, expect, it } from 'vitest';

import { changeover } from '../engine';
import { createBoard, toggleSwitch } from './board';

describe('toggleSwitch on a changeover', () => {
  it('flips up and down and leaves other cells alone', () => {
    const s = createBoard(2, 1, [[0, changeover(true)]]);
    const down = toggleSwitch(s, 0);
    expect(down.cells[0]?.tile).toMatchObject({ kind: 'changeover', up: false });
    expect(toggleSwitch(down, 0).cells[0]?.tile).toMatchObject({ up: true });
    expect(toggleSwitch(s, 1)).toBe(s);
  });
});
