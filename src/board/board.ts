// Board state and the edits a player can make. Pure TypeScript; the React screen and
// the 3D scene sit on top of this.

import {
  type Board,
  type Direction,
  type Rotation,
  type Tile,
  type TwoTerminalTile,
  DIRECTIONS,
  armBit,
  getPorts,
  isTwoTerminal,
  neighbourIndex,
  opposite,
  rotateTile,
  wireArms,
} from '../engine';

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
  for (const [cell, tile] of preset) state = put(state, cell, tile);
  return state;
}

/** Board from an engine board (e.g. parsed from a level picture). */
export function fromEngineBoard(board: Board): BoardState {
  return createBoard(
    board.width,
    board.height,
    board.cells.flatMap((t, i) => (t ? [[i, t] as [number, Tile]] : [])),
  );
}

export function inBounds(state: BoardState, cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < state.cells.length;
}

export function isLocked(state: BoardState, cell: number): boolean {
  return !!state.cells[cell]?.tile.locked;
}

/** Can the player pick up, turn or remove whatever is in this cell? */
export function canEdit(state: BoardState, cell: number): boolean {
  return !!state.cells[cell] && !isLocked(state, cell);
}

export function isEmpty(state: BoardState, cell: number): boolean {
  return inBounds(state, cell) && !state.cells[cell];
}

export function wireCount(state: BoardState): number {
  return state.cells.filter((c) => c?.tile.kind === 'wire').length;
}

function withCells(state: BoardState, edit: (cells: (PlacedTile | null)[]) => void): BoardState {
  const cells = [...state.cells];
  edit(cells);
  return { ...state, cells };
}

/** Put a brand-new tile in a cell (overwriting), giving it a fresh id. */
function put(state: BoardState, cell: number, tile: Tile): BoardState {
  const id = state.nextId;
  return { ...withCells(state, (c) => (c[cell] = { id, tile })), nextId: id + 1 };
}

/** A wire whose arms all lie on one axis (a straight or a stub) can be swapped for a part. */
function isReplaceableWire(tile: Tile | undefined): boolean {
  if (tile?.kind !== 'wire' || tile.locked) return false;
  const ports = getPorts(tile);
  return ports.every((d) => d % 2 === ports[0]! % 2);
}

/** Can a part be dropped here? Empty cells, or a straight piece of wire. */
export function canDropOn(state: BoardState, cell: number): boolean {
  return isEmpty(state, cell) || isReplaceableWire(state.cells[cell]?.tile);
}

/**
 * Turn a two-terminal part to line up with the wires around `cell`: if the wires
 * point in from N/S, stand it up; from W/E, lay it down. Polarity is kept as is.
 */
export function autoOrient<T extends TwoTerminalTile>(state: BoardState, cell: number, tile: T): T {
  let horizontal = 0;
  let vertical = 0;
  const here = state.cells[cell]?.tile;
  const herePorts = here?.kind === 'wire' ? getPorts(here) : [];
  for (const d of DIRECTIONS) {
    const n = neighbourIndex(state, cell, d);
    const neighbour = n >= 0 ? state.cells[n]?.tile : undefined;
    const facing =
      (neighbour && getPorts(neighbour).includes(opposite(d))) || herePorts.includes(d);
    if (!facing) continue;
    if (d % 2 === 1) horizontal++;
    else vertical++;
  }
  const isHorizontal = tile.rotation % 2 === 0;
  const wantHorizontal = horizontal === vertical ? isHorizontal : horizontal > vertical;
  if (wantHorizontal === isHorizontal) return tile;
  return { ...tile, rotation: ((tile.rotation + 1) % 4) as Rotation };
}

/** Drop a new part from the tray. Returns the same state if not allowed. */
export function placeTile(state: BoardState, cell: number, tile: Tile): BoardState {
  if (!isTwoTerminal(tile)) return isEmpty(state, cell) ? put(state, cell, tile) : state;
  if (!canDropOn(state, cell)) return state;
  return put(state, cell, autoOrient(state, cell, tile));
}

/** Can the player turn whatever is in this cell? Free parts, and locked ones marked spin. */
export function canTurn(state: BoardState, cell: number): boolean {
  return canEdit(state, cell) || !!state.cells[cell]?.tile.spin;
}

/** Turn a part 90° clockwise. Locked tiles don't turn (unless they spin). */
export function rotateAt(state: BoardState, cell: number): BoardState {
  const placed = state.cells[cell];
  if (!placed || !canTurn(state, cell)) return state;
  return withCells(state, (c) => (c[cell] = { ...placed, tile: rotateTile(placed.tile) }));
}

/** Overwrite a cell outright (used by helpers like Scout's dig, not by player gestures). */
export function setCell(state: BoardState, cell: number, tile: Tile | null): BoardState {
  if (!tile) return withCells(state, (c) => (c[cell] = null));
  const placed = state.cells[cell];
  // Keep the id when the same kind of thing stays put, so it animates instead of popping.
  if (placed && placed.tile.kind === tile.kind) {
    return withCells(state, (c) => (c[cell] = { ...placed, tile }));
  }
  return put(state, cell, tile);
}

/** Remove whatever is in the cell (wires are tidied like an erase). */
export function removeAt(state: BoardState, cell: number): BoardState {
  if (!canEdit(state, cell)) return state;
  if (state.cells[cell]?.tile.kind === 'wire') return eraseWire(state, cell);
  return withCells(state, (c) => (c[cell] = null));
}

/** Move a part to an empty cell or onto a straight wire, lining it up with its new wires. */
export function moveTile(state: BoardState, from: number, to: number): BoardState {
  const placed = state.cells[from];
  if (!placed || from === to || !canEdit(state, from) || !canDropOn(state, to)) return state;
  const lifted = withCells(state, (c) => (c[from] = null));
  const tile = isTwoTerminal(placed.tile) ? autoOrient(lifted, to, placed.tile) : placed.tile;
  return withCells(lifted, (c) => (c[to] = { ...placed, tile }));
}

/**
 * Flip a switch on or off (or a changeover switch up or down). Works on locked (level)
 * switches too: that's how you play.
 */
export function toggleSwitch(state: BoardState, cell: number): BoardState {
  const placed = state.cells[cell];
  const t = placed?.tile;
  if (t?.kind === 'switch') return withCells(state, (c) => (c[cell] = { ...placed!, tile: { ...t, closed: !t.closed } }));
  if (t?.kind === 'changeover') return withCells(state, (c) => (c[cell] = { ...placed!, tile: { ...t, up: !t.up } }));
  return state;
}

function directionBetween(state: BoardState, a: number, b: number): Direction | null {
  return DIRECTIONS.find((d) => neighbourIndex(state, a, d) === b) ?? null;
}

/** The wire in `cell` with an extra arm towards `dir` (or a new one-armed wire). */
function withArm(tile: Tile | undefined, dir: Direction): Tile {
  const arms =
    tile?.kind === 'wire' ? getPorts(tile).reduce<number>((m, d) => m | armBit(d), 0) : 0;
  return { ...wireArms(arms | armBit(dir)), locked: tile?.locked };
}

export interface DrawResult {
  state: BoardState;
  /** True if the segment needed a new wire tile beyond the level's budget. */
  outOfWire: boolean;
}

/**
 * Draw one step of wire between neighbouring cells a → b. Empty cells get a new wire,
 * existing wires gain an arm (so paths crossing a wire make tees and crosses), and parts
 * are left as they are: the wire just runs up to them. Blocked cells stop the wire.
 */
export function drawSegment(
  state: BoardState,
  a: number,
  b: number,
  budget: number | null = null,
): DrawResult {
  const dir = directionBetween(state, a, b);
  const unchanged = { state, outOfWire: false };
  if (dir === null) return unchanged;
  const ends = [
    [a, dir],
    [b, opposite(dir)],
  ] as const;
  if (ends.some(([cell]) => state.cells[cell]?.tile.kind === 'block')) return unchanged;

  const newWires = ends.filter(([cell]) => !state.cells[cell]).length;
  if (budget !== null && wireCount(state) + newWires > budget) return { state, outOfWire: true };

  let next = state;
  for (const [cell, d] of ends) {
    const placed = next.cells[cell];
    if (placed && placed.tile.kind !== 'wire') continue; // parts stay as they are
    const tile = withArm(placed?.tile, d);
    next = placed ? withCells(next, (c) => (c[cell] = { ...placed, tile })) : put(next, cell, tile);
  }
  return { state: next, outOfWire: false };
}

/** Cells visited going from a to b one step at a time (horizontal first, then vertical). */
export function stepsBetween(state: BoardState, a: number, b: number): number[] {
  const path: number[] = [];
  let x = a % state.width;
  let y = Math.floor(a / state.width);
  const tx = b % state.width;
  const ty = Math.floor(b / state.width);
  while (x !== tx) {
    x += Math.sign(tx - x);
    path.push(y * state.width + x);
  }
  while (y !== ty) {
    y += Math.sign(ty - y);
    path.push(y * state.width + x);
  }
  return path;
}

/** Erase a wire tile and the neighbouring arms that pointed into it. */
export function eraseWire(state: BoardState, cell: number): BoardState {
  const placed = state.cells[cell];
  if (placed?.tile.kind !== 'wire' || placed.tile.locked) return state;
  return withCells(state, (c) => {
    c[cell] = null;
    for (const d of getPorts(placed.tile)) {
      const n = neighbourIndex(state, cell, d);
      const neighbour = n >= 0 ? c[n] : null;
      if (neighbour?.tile.kind !== 'wire' || neighbour.tile.locked) continue;
      const arms = getPorts(neighbour.tile)
        .filter((nd) => nd !== opposite(d))
        .reduce<number>((m, nd) => m | armBit(nd), 0);
      c[n] = arms ? { ...neighbour, tile: wireArms(arms) } : null;
    }
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
