import {
  type BatteryTile,
  type Board,
  type Direction,
  type LedColor,
  type LedTile,
  type ResistorTile,
  type Rotation,
  type Tile,
  type WireShape,
  type WireTile,
  E,
  N,
  S,
  W,
} from './types';

/** Ports of each wire shape at rotation 0. */
const WIRE_PORTS: Record<WireShape, readonly Direction[]> = {
  straight: [N, S],
  corner: [N, E],
  tee: [E, S, W],
  cross: [N, E, S, W],
};

/** Two-terminal parts at rotation 0: [+ terminal, − terminal]. */
const TWO_TERMINAL_PORTS: readonly [Direction, Direction] = [W, E];

export function rotateDirection(dir: Direction, rotation: Rotation): Direction {
  return ((dir + rotation) % 4) as Direction;
}

export function opposite(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

/** The tile turned 90° clockwise. Four turns give back the original tile. */
export function rotateTile<T extends Tile>(tile: T): T {
  return { ...tile, rotation: ((tile.rotation + 1) % 4) as Rotation };
}

/** Ports the tile exposes, after rotation. Two-terminal parts list [+, −]. */
export function getPorts(tile: Tile): Direction[] {
  const base = tile.kind === 'wire' ? WIRE_PORTS[tile.shape] : TWO_TERMINAL_PORTS;
  return base.map((d) => rotateDirection(d, tile.rotation));
}

/** For two-terminal parts: [+ terminal port, − terminal port] after rotation. */
export function getTerminals(tile: Exclude<Tile, WireTile>): [Direction, Direction] {
  return [
    rotateDirection(TWO_TERMINAL_PORTS[0], tile.rotation),
    rotateDirection(TWO_TERMINAL_PORTS[1], tile.rotation),
  ];
}

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;

/** Index of the neighbouring cell in `dir`, or -1 at the board edge. */
export function neighbourIndex(board: Board, cell: number, dir: Direction): number {
  const x = (cell % board.width) + DX[dir];
  const y = Math.floor(cell / board.width) + DY[dir];
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return -1;
  return y * board.width + x;
}

/** True if the tile at `cell` and its neighbour in `dir` both have a port on the shared edge. */
export function isConnected(board: Board, cell: number, dir: Direction): boolean {
  const tile = board.cells[cell];
  if (!tile || !getPorts(tile).includes(dir)) return false;
  const other = neighbourIndex(board, cell, dir);
  if (other < 0) return false;
  const neighbour = board.cells[other];
  return !!neighbour && getPorts(neighbour).includes(opposite(dir));
}

export const wire = (shape: WireShape, rotation: Rotation = 0): WireTile => ({
  kind: 'wire',
  shape,
  rotation,
});
export const resistor = (ohms: number, rotation: Rotation = 0): ResistorTile => ({
  kind: 'resistor',
  ohms,
  rotation,
});
export const led = (rotation: Rotation = 0, color: LedColor = 'red'): LedTile => ({
  kind: 'led',
  color,
  rotation,
});
export const battery = (rotation: Rotation = 0, volts = 3): BatteryTile => ({
  kind: 'battery',
  volts,
  rotation,
});
