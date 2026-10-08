import { describe, expect, it } from 'vitest';

import {
  type Rotation,
  type WireShape,
  E,
  S,
  getPorts,
  isConnected,
  simulate,
  wire,
} from '../engine';
import {
  canEdit,
  createBoard,
  moveTile,
  placeTile,
  removeAt,
  rotateAt,
  toEngineBoard,
} from './board';
import { createTutorialBoard } from './tutorial';

describe('board state', () => {
  it('places tiles only on empty, in-bounds cells', () => {
    let s = createBoard(3, 3);
    s = placeTile(s, 4, wire('straight'));
    expect(s.cells[4]?.tile.kind).toBe('wire');
    expect(placeTile(s, 4, wire('corner'))).toBe(s); // occupied
    expect(placeTile(s, 9, wire('corner'))).toBe(s); // off board
    expect(placeTile(s, -1, wire('corner'))).toBe(s);
  });

  it('gives every placed tile a unique id that survives rotate and move', () => {
    let s = createBoard(3, 3);
    s = placeTile(placeTile(s, 0, wire('straight')), 1, wire('corner'));
    const id = s.cells[0]?.id;
    expect(id).not.toBe(s.cells[1]?.id);
    s = moveTile(rotateAt(s, 0), 0, 5);
    expect(s.cells[5]?.id).toBe(id);
  });

  it('rotates clockwise and comes back after four taps', () => {
    let s = placeTile(createBoard(2, 2), 0, wire('corner'));
    s = rotateAt(s, 0);
    expect(getPorts(s.cells[0]!.tile)).toEqual([E, S]);
    s = rotateAt(rotateAt(rotateAt(s, 0), 0), 0);
    expect(s.cells[0]?.tile).toEqual(wire('corner'));
  });

  it('moves and removes unlocked tiles', () => {
    let s = placeTile(createBoard(3, 1), 0, wire('straight', 1));
    s = moveTile(s, 0, 2);
    expect(s.cells[0]).toBeNull();
    expect(s.cells[2]).not.toBeNull();
    expect(moveTile(s, 2, 2)).toBe(s);
    s = removeAt(s, 2);
    expect(s.cells.every((c) => c === null)).toBe(true);
  });

  it('locked tiles cannot be rotated, moved or removed', () => {
    const s = createTutorialBoard();
    const batteryCell = s.cells.findIndex((c) => c?.tile.kind === 'battery');
    expect(canEdit(s, batteryCell)).toBe(false);
    expect(rotateAt(s, batteryCell)).toBe(s);
    expect(removeAt(s, batteryCell)).toBe(s);
    expect(moveTile(s, batteryCell, 0)).toBe(s);
  });

  it('neighbours connect only once their ports face each other', () => {
    let s = placeTile(createBoard(2, 1), 0, wire('straight', 1));
    s = placeTile(s, 1, wire('straight', 0)); // vertical: no W port
    expect(isConnected(toEngineBoard(s), 0, E)).toBe(false);
    s = rotateAt(s, 1);
    expect(isConnected(toEngineBoard(s), 0, E)).toBe(true);
  });
});

describe('tutorial board', () => {
  const at = (x: number, y: number) => y * 5 + x;
  type Placement = [number, number, WireShape | 'R', Rotation];
  const ledAfter = (placements: Placement[]) => {
    let s = createTutorialBoard();
    for (const [x, y, shape, rot] of placements) {
      const tile =
        shape === 'R'
          ? ({ kind: 'resistor', ohms: 220, rotation: rot } as const)
          : wire(shape, rot);
      s = placeTile(s, at(x, y), tile);
    }
    return simulate(toEngineBoard(s)).tiles.find((t) => t?.kind === 'led')!;
  };
  const loop = (top: 'straight' | 'R'): Placement[] => [
    [1, 1, 'corner', 1],
    [2, 1, top, top === 'R' ? 0 : 1],
    [3, 1, 'corner', 2],
    [1, 3, 'corner', 0],
    [2, 3, 'straight', 1],
    [3, 3, 'corner', 3],
  ];

  it('starts dark', () => {
    expect(ledAfter([]).status).toBe('OFF');
  });

  it('wires alone burn the LED out, as in real life', () => {
    expect(ledAfter(loop('straight')).status).toBe('BURNED_OUT');
  });

  it('a 220 Ω resistor in the loop lights it safely (~5.5 mA)', () => {
    const l = ledAfter(loop('R'));
    expect(l.status).toBe('OK');
    expect(l.current).toBeCloseTo(5.5e-3, 4);
  });
});
