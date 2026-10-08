// Board state and the edits a player can make. Pure TypeScript; the React hook and
// the 3D scene sit on top of this.

import { type Board, type Tile, rotateTile } from '../engine';

export interface PlacedTile {
  /** Stable id so the renderer can animate a tile across moves and rotations. */
  id: number;
  tile: Tile;
}

export interface BoardState {
  width: number;
  height: number;
  cells: readonly (PlacedTile | null)[];
  nextId: number;
}

export function createBoard(
  width: number,
  height: number,
  preset: [number, Tile][] = [],
): BoardState {
  let state: BoardState = { width, height, cells: Array(width * height).fill(null), nextId: 1 };
  for (const [cell, tile] of preset) state = placeTile(state, cell, tile);
  return state;
}

export function inBounds(state: BoardState, cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < state.cells.length;
}

export function isLocked(state: BoardState, cell: number): boolean {
  return !!state.cells[cell]?.tile.locked;
}

/** Can the player pick up, rotate or remove whatever is in this cell? */
export function canEdit(state: BoardState, cell: number): boolean {
  return !!state.cells[cell] && !isLocked(state, cell);
}

export function isEmpty(state: BoardState, cell: number): boolean {
  return inBounds(state, cell) && !state.cells[cell];
}

function withCells(state: BoardState, edit: (cells: (PlacedTile | null)[]) => void): BoardState {
  const cells = [...state.cells];
  edit(cells);
  return { ...state, cells };
}

/** Place a new tile on an empty cell. Returns the same state if not allowed. */
export function placeTile(state: BoardState, cell: number, tile: Tile): BoardState {
  if (!isEmpty(state, cell)) return state;
  const id = state.nextId;
  return { ...withCells(state, (c) => (c[cell] = { id, tile })), nextId: id + 1 };
}

/** Rotate 90° clockwise. Locked tiles don't turn. */
export function rotateAt(state: BoardState, cell: number): BoardState {
  const placed = state.cells[cell];
  if (!placed || !canEdit(state, cell)) return state;
  return withCells(state, (c) => (c[cell] = { ...placed, tile: rotateTile(placed.tile) }));
}

export function removeAt(state: BoardState, cell: number): BoardState {
  if (!canEdit(state, cell)) return state;
  return withCells(state, (c) => (c[cell] = null));
}

export function moveTile(state: BoardState, from: number, to: number): BoardState {
  const placed = state.cells[from];
  if (!placed || !canEdit(state, from) || !isEmpty(state, to)) return state;
  return withCells(state, (c) => {
    c[to] = placed;
    c[from] = null;
  });
}

/** The engine's view of the board. */
export function toEngineBoard(state: BoardState): Board {
  return {
    width: state.width,
    height: state.height,
    cells: state.cells.map((p) => p?.tile ?? null),
  };
}
