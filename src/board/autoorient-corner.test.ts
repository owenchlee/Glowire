import { describe, expect, it } from 'vitest';

import { E, armBit, resistor, wireArms } from '../engine';
import { autoOrient, createBoard } from './board';

describe('autoOrient next to cell 0', () => {
  it('lays a part flat when the wire in the top-left cell points at it', () => {
    const board = createBoard(3, 3, [[0, wireArms(armBit(E))]]);
    expect(autoOrient(board, 1, resistor(100, 1)).rotation % 2).toBe(0);
  });
});
