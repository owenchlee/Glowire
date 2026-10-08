// Core data types for the Glowire circuit engine. Pure TypeScript.

/** Port directions, numbered clockwise so rotation is just modular addition. */
export const N = 0;
export const E = 1;
export const S = 2;
export const W = 3;
export type Direction = typeof N | typeof E | typeof S | typeof W;
export const DIRECTIONS: readonly Direction[] = [N, E, S, W];
export const DIRECTION_NAMES = ['N', 'E', 'S', 'W'] as const;

/** Number of 90° clockwise turns. */
export type Rotation = 0 | 1 | 2 | 3;

export type WireShape = 'straight' | 'corner' | 'tee' | 'cross';
export type LedColor = 'red';

interface TileBase {
  rotation: Rotation;
  /** Pre-placed by the level: cannot be moved, rotated or removed. */
  locked?: boolean;
}

export interface WireTile extends TileBase {
  kind: 'wire';
  shape: WireShape;
}

/**
 * Two-terminal parts. At rotation 0 the positive terminal (battery +, LED anode,
 * resistor end "a") is on the W side and the negative terminal on the E side.
 */
export interface ResistorTile extends TileBase {
  kind: 'resistor';
  ohms: number;
}

export interface LedTile extends TileBase {
  kind: 'led';
  color: LedColor;
}

export interface BatteryTile extends TileBase {
  kind: 'battery';
  volts: number;
}

export type Tile = WireTile | ResistorTile | LedTile | BatteryTile;
export type TileKind = Tile['kind'];

/** A rectangular grid. Cell (x, y) lives at index y * width + x; y grows towards S. */
export interface Board {
  width: number;
  height: number;
  cells: readonly (Tile | null)[];
}

export type ComponentStatus =
  'OK' | 'OFF' | 'REVERSED' | 'BURNED_OUT' | 'BYPASSED' | 'SHORT_CIRCUIT';

export interface TileResult {
  cell: number;
  kind: TileKind;
  /**
   * Volts. Two-terminal parts: V(+ terminal) − V(− terminal).
   * Wires: the largest potential difference between any two of its ports.
   */
  voltage: number;
  /**
   * Amps through the part. Two-terminal parts: positive when current flows
   * + → − through it (LED forward). Battery: positive when discharging (current
   * leaves the + terminal). Wires: total current passing through (≥ 0).
   */
  current: number;
  /** Amps flowing INTO the tile through each connected port (negative = out). */
  portCurrents: Partial<Record<Direction, number>>;
  /** LEDs only: 0 (off) … 1 (full brightness at the rated current). */
  brightness: number;
  status: ComponentStatus;
}

export interface SimulationResult {
  /** Indexed by cell; null for empty cells. */
  tiles: (TileResult | null)[];
  shortCircuit: boolean;
  /** Total discharge current from all batteries, amps. */
  batteryCurrent: number;
  converged: boolean;
  iterations: number;
}
