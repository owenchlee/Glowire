import { describe, expect, it } from 'vitest';

import { N, S, armBit, block, led, resistor, wire, wireArms } from '../engine';
import {
  autoOrient,
  canDropOn,
  canTurn,
  createBoard,
  inBounds,
  isEmpty,
  isLocked,
  setCell,
} from './board';

describe('cell queries', () => {
  const board = createBoard(3, 3, [
    [0, block()],
    [1, wire('straight')],
    [2, wire('corner')],
    [3, { ...resistor(100), locked: true, spin: true }],
    [4, resistor(100)],
  ]);

  it('inBounds rejects negatives, overflow and non-integers', () => {
    expect(inBounds(board, 0)).toBe(true);
    expect(inBounds(board, 8)).toBe(true);
    expect(inBounds(board, 9)).toBe(false);
    expect(inBounds(board, -1)).toBe(false);
    expect(inBounds(board, 1.5)).toBe(false);
  });

  it('isLocked and isEmpty read the cell', () => {
    expect(isLocked(board, 0)).toBe(true);
    expect(isLocked(board, 4)).toBe(false);
    expect(isLocked(board, 8)).toBe(false);
    expect(isEmpty(board, 8)).toBe(true);
    expect(isEmpty(board, 4)).toBe(false);
    expect(isEmpty(board, 99)).toBe(false);
  });

  it('canDropOn allows empty cells and straight wires only', () => {
    expect(canDropOn(board, 8)).toBe(true);
    expect(canDropOn(board, 1)).toBe(true);
    expect(canDropOn(board, 2)).toBe(false); // corner
    expect(canDropOn(board, 4)).toBe(false); // part
    expect(canDropOn(board, 0)).toBe(false); // block
  });

  it('canTurn allows free parts and locked spinners', () => {
    expect(canTurn(board, 4)).toBe(true);
    expect(canTurn(board, 3)).toBe(true);
    expect(canTurn(board, 0)).toBe(false);
    expect(canTurn(board, 8)).toBe(false);
  });
});

describe('autoOrient', () => {
  it('stands a part up between wires above and below', () => {
    const board = createBoard(3, 3, [
      [1, wireArms(armBit(S))],
      [7, wireArms(armBit(N))],
    ]);
    expect(autoOrient(board, 4, resistor(100, 0)).rotation % 2).toBe(1);
    const standing = resistor(100, 1);
    expect(autoOrient(board, 4, standing)).toBe(standing);
  });

  it('keeps the part as is when nothing points at it', () => {
    const lamp = led(0);
    expect(autoOrient(createBoard(3, 3), 4, lamp)).toBe(lamp);
  });
});

describe('setCell', () => {
  const board = createBoard(2, 2, [[0, resistor(100)]]);

  it('clears a cell with null', () => {
    expect(setCell(board, 0, null).cells[0]).toBeNull();
  });

  it('keeps the id when the same kind stays put', () => {
    const next = setCell(board, 0, resistor(220));
    expect(next.cells[0]?.id).toBe(board.cells[0]?.id);
    expect(next.cells[0]?.tile).toMatchObject({ ohms: 220 });
  });

  it('gives a new id when the kind changes', () => {
    const next = setCell(board, 0, led());
    expect(next.cells[0]?.id).toBe(board.nextId);
    expect(next.nextId).toBe(board.nextId + 1);
  });
});
