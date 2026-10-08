import { describe, expect, it } from 'vitest';

import { E, N, S, W, getPorts, isConnected, led, resistor, wire } from '../engine';
import { createLevelBoard } from '../levels/evaluate';
import { getLevel } from '../levels/levels';
import {
  canEdit,
  createBoard,
  drawSegment,
  eraseWire,
  moveTile,
  placeTile,
  removeAt,
  rotateAt,
  stepsBetween,
  toEngineBoard,
  toggleSwitch,
  wireCount,
} from './board';

/** Draw a path through the given cells, step by step. */
function draw(
  state: ReturnType<typeof createBoard>,
  cells: number[],
  budget: number | null = null,
) {
  let s = state;
  for (let i = 1; i < cells.length; i++) s = drawSegment(s, cells[i - 1]!, cells[i]!, budget).state;
  return s;
}

describe('placing parts', () => {
  it('places only on empty, in-bounds cells', () => {
    let s = createBoard(3, 3);
    s = placeTile(s, 4, resistor(220));
    expect(s.cells[4]?.tile.kind).toBe('resistor');
    expect(placeTile(s, 4, led())).toBe(s); // occupied by a part
    expect(placeTile(s, 9, led())).toBe(s); // off board
    expect(placeTile(s, -1, led())).toBe(s);
  });

  it('a part dropped on a straight wire replaces it and lines up with it', () => {
    let s = draw(createBoard(3, 3), [1, 4, 7]); // vertical wire down the middle
    s = placeTile(s, 4, resistor(220, 0)); // tray resistor is horizontal
    expect(s.cells[4]?.tile.kind).toBe('resistor');
    expect(getPorts(s.cells[4]!.tile)).toEqual([N, S]);
    expect(isConnected(toEngineBoard(s), 4, N)).toBe(true);
    expect(isConnected(toEngineBoard(s), 4, S)).toBe(true);
  });

  it('parts cannot replace corners or junctions', () => {
    const s = draw(createBoard(3, 3), [1, 4, 5]); // corner at 4
    expect(placeTile(s, 4, resistor(220))).toBe(s);
  });

  it('gives every placed tile a unique id that survives rotate and move', () => {
    let s = createBoard(3, 3);
    s = placeTile(placeTile(s, 0, resistor(100)), 1, led());
    const id = s.cells[0]?.id;
    expect(id).not.toBe(s.cells[1]?.id);
    s = moveTile(rotateAt(s, 0), 0, 5);
    expect(s.cells[5]?.id).toBe(id);
  });

  it('rotates parts clockwise and back after four taps', () => {
    let s = placeTile(createBoard(2, 2), 0, led(0));
    s = rotateAt(s, 0);
    expect(getPorts(s.cells[0]!.tile)).toEqual([N, S]);
    s = rotateAt(rotateAt(rotateAt(s, 0), 0), 0);
    expect(s.cells[0]?.tile).toEqual(led(0));
  });

  it('moves and removes unlocked parts', () => {
    let s = placeTile(createBoard(3, 1), 0, resistor(220));
    s = moveTile(s, 0, 2);
    expect(s.cells[0]).toBeNull();
    expect(s.cells[2]).not.toBeNull();
    expect(moveTile(s, 2, 2)).toBe(s);
    s = removeAt(s, 2);
    expect(s.cells.every((c) => c === null)).toBe(true);
  });

  it('locked tiles cannot be rotated, moved or removed', () => {
    const s = createLevelBoard(getLevel(1)!);
    const batteryCell = s.cells.findIndex((c) => c?.tile.kind === 'battery');
    expect(canEdit(s, batteryCell)).toBe(false);
    expect(rotateAt(s, batteryCell)).toBe(s);
    expect(removeAt(s, batteryCell)).toBe(s);
    expect(moveTile(s, batteryCell, 0)).toBe(s);
  });
});

describe('drawing wires', () => {
  it('a path makes straights and corners on its own', () => {
    const s = draw(createBoard(3, 3), [0, 1, 2, 5]);
    expect(getPorts(s.cells[0]!.tile)).toEqual([E]); // the start is a stub
    expect(getPorts(s.cells[1]!.tile)).toEqual([E, W]);
    expect(getPorts(s.cells[2]!.tile)).toEqual([S, W]); // corner
    expect(getPorts(s.cells[5]!.tile)).toEqual([N]);
  });

  it('crossing an existing wire turns it into a tee, then a cross', () => {
    let s = draw(createBoard(3, 3), [3, 4, 5]); // horizontal through the middle
    s = draw(s, [1, 4]); // from above
    expect(getPorts(s.cells[4]!.tile)).toEqual([N, E, W]);
    s = draw(s, [7, 4]); // from below
    expect(getPorts(s.cells[4]!.tile)).toEqual([N, E, S, W]);
  });

  it('wires run up to parts without changing them, and blocks stop them', () => {
    let s = createLevelBoard(getLevel(2)!); // has a wall at x = 2
    const battery = 2 * 5;
    s = draw(s, [battery, battery - 5]);
    expect(s.cells[battery]?.tile.kind).toBe('battery');
    expect(isConnected(toEngineBoard(s), battery, N)).toBe(true);
    const before = s;
    s = drawSegment(s, 1 * 5 + 1, 1 * 5 + 2).state; // into the wall
    expect(s).toBe(before);
  });

  it('respects the wire budget', () => {
    const s = draw(createBoard(5, 1), [0, 1, 2], 3);
    expect(wireCount(s)).toBe(3);
    const result = drawSegment(s, 2, 3, 3);
    expect(result.outOfWire).toBe(true);
    expect(result.state).toBe(s);
    // Adding an arm to an existing wire is free.
    expect(drawSegment(s, 1, 2, 3).outOfWire).toBe(false);
  });

  it('fills in skipped cells when the finger moves fast', () => {
    const s = createBoard(4, 4);
    expect(stepsBetween(s, 0, 10)).toEqual([1, 2, 6, 10]);
  });

  it('erasing a wire also trims the arms that pointed into it', () => {
    let s = draw(createBoard(3, 1), [0, 1, 2]);
    s = eraseWire(s, 1);
    expect(s.cells[1]).toBeNull();
    expect(s.cells[0]).toBeNull(); // its only arm pointed at the erased cell
    expect(s.cells[2]).toBeNull();
  });
});

describe('switches', () => {
  it('can be toggled even when locked', () => {
    const s = createLevelBoard(getLevel(8)!);
    const cell = s.cells.findIndex((c) => c?.tile.kind === 'switch');
    const on = toggleSwitch(s, cell);
    expect(on.cells[cell]?.tile).toMatchObject({ kind: 'switch', closed: true, locked: true });
    expect(toggleSwitch(on, cell).cells[cell]?.tile).toMatchObject({ closed: false });
  });
});
