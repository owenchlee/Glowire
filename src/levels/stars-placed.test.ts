import { describe, expect, it } from 'vitest';

import { createBoard } from '../board/board';
import { block, led, resistor, wireArms } from '../engine';
import { placedParts } from './stars';

describe('placedParts', () => {
  it('counts loose parts only, not wires, blocks or locked parts', () => {
    const board = createBoard(4, 1, [
      [0, resistor(100)],
      [1, led()],
      [2, block()],
      [3, { ...resistor(100), locked: true }],
    ]);
    expect(placedParts(board)).toBe(2);
    expect(placedParts(createBoard(2, 1, [[0, wireArms(5)]]))).toBe(0);
  });
});
