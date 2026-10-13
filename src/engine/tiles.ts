import {
  type BatteryTile,
  type BlockTile,
  type ChangeoverTile,
  type DiodeTile,
  type MeterTile,
  type Board,
  type Direction,
  type LedColor,
  type LedTile,
  type ResistorTile,
  type Rotation,
  type SwitchTile,
  type Tile,
  type TwoTerminalTile,
  type WireShape,
  type WireTile,
  E,
  N,
  S,
  W,
} from './types';

/** Arm bit for each direction. */
export const armBit = (d: Direction) => 1 << d;

/** Arms of the classic wire shapes at rotation 0. */
const SHAPE_ARMS: Record<WireShape, number> = {
  straight: armBit(N) | armBit(S),
  corner: armBit(N) | armBit(E),
  tee: armBit(E) | armBit(S) | armBit(W),
  cross: 15,
};

/** Directions whose bit is set in an arm mask, in N, E, S, W order. */
export function armDirections(arms: number): Direction[] {
  return ([N, E, S, W] as const).filter((d) => arms & armBit(d));
}

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

/** Changeover switch at rotation 0: [common, up throw, down throw]. */
const CHANGEOVER_PORTS: readonly [Direction, Direction, Direction] = [W, N, S];

/** A changeover switch's [common, up, down] ports after rotation. */
export function getChangeoverPorts(tile: ChangeoverTile): [Direction, Direction, Direction] {
  const [c, u, d] = CHANGEOVER_PORTS.map((p) => rotateDirection(p, tile.rotation));
  return [c!, u!, d!];
}

/** Ports the tile exposes, after rotation. Two-terminal parts list [+, −]. */
export function getPorts(tile: Tile): Direction[] {
  if (tile.kind === 'block') return [];
  if (tile.kind === 'changeover') return getChangeoverPorts(tile);
  if (tile.kind === 'wire') {
    const rotated = armDirections(tile.arms).reduce<number>(
      (mask, d) => mask | armBit(rotateDirection(d, tile.rotation)),
      0,
    );
    return armDirections(rotated);
  }
  return TWO_TERMINAL_PORTS.map((d) => rotateDirection(d, tile.rotation));
}

/** For two-terminal parts: [+ terminal port, − terminal port] after rotation. */
export function getTerminals(tile: TwoTerminalTile): [Direction, Direction] {
  return [
    rotateDirection(TWO_TERMINAL_PORTS[0], tile.rotation),
    rotateDirection(TWO_TERMINAL_PORTS[1], tile.rotation),
  ];
}

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;

/** Index of the neighbouring cell in `dir`, or -1 at the board edge. */
export function neighbourIndex(
  board: Pick<Board, 'width' | 'height'>,
  cell: number,
  dir: Direction,
): number {
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

/** A wire with the given arm mask. */
export const wireArms = (arms: number): WireTile => ({ kind: 'wire', arms, rotation: 0 });

/** A classic wire shape, turned `rotation` quarter turns clockwise. */
export const wire = (shape: WireShape, rotation: Rotation = 0): WireTile =>
  wireArms(
    armDirections(SHAPE_ARMS[shape]).reduce<number>(
      (m, d) => m | armBit(rotateDirection(d, rotation)),
      0,
    ),
  );

export const block = (): BlockTile => ({ kind: 'block', rotation: 0, locked: true });

export const diode = (rotation: Rotation = 0): DiodeTile => ({ kind: 'diode', rotation });

export const switchTile = (closed = false, rotation: Rotation = 0): SwitchTile => ({
  kind: 'switch',
  closed,
  rotation,
});

export const isTwoTerminal = (tile: Tile): tile is TwoTerminalTile =>
  tile.kind !== 'wire' && tile.kind !== 'block' && tile.kind !== 'changeover';

export const changeover = (up = true, rotation: Rotation = 0): ChangeoverTile => ({
  kind: 'changeover',
  up,
  rotation,
});

export const meter = (mode: 'A' | 'V' = 'A', rotation: Rotation = 0): MeterTile => ({
  kind: 'meter',
  mode,
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
