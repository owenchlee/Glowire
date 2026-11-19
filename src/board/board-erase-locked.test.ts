import { describe, expect, it } from 'vitest';

import { E, W, getPorts, wireArms } from '../engine';
import { createBoard, eraseWire } from './board';

describe('erasing a wire', () => {
  it('leaves a locked neighbouring wire untouched', () => {
    const locked = { ...wireArms(E | W), locked: true };
    const s = createBoard(3, 1, [
      [0, locked],
      [1, wireArms(E | W)],
    ]);
    const after = eraseWire(s, 1);
    expect(after.cells[1]).toBeNull();
    expect(getPorts(after.cells[0]!.tile)).toEqual(getPorts(locked));
  });

  it('copes with arms pointing at empty cells or off the board', () => {
    const s = createBoard(2, 1, [[0, wireArms(E | W)]]);
    expect(eraseWire(s, 0).cells[0]).toBeNull();
  });
});
