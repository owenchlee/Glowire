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
export type LedColor = 'red' | 'green' | 'blue';

interface TileBase {
  rotation: Rotation;
  /** Pre-placed by the level: cannot be moved, rotated or removed. */
  locked?: boolean;
  /** Twist levels: a locked tile the player may still turn. */
  spin?: boolean;
}

/**
 * A wire is any set of arms (bit per direction: N=1, E=2, S=4, W=8), all joined in the
 * middle. Straights, corners, tees and crosses are just particular arm sets, so the
 * player can draw paths and junctions form on their own.
 */
export interface WireTile extends TileBase {
  kind: 'wire';
  arms: number;
}

/** A blocked cell: no ports, nothing can be placed or drawn through it. */
export interface BlockTile extends TileBase {
  kind: 'block';
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

/** On/off switch. Closed it behaves like a wire; open it is (practically) an open circuit. */
export interface SwitchTile extends TileBase {
  kind: 'switch';
  closed: boolean;
}

/** A diode: current flows anode (+, W at rotation 0) → cathode only. Like an LED that doesn't glow. */
export interface DiodeTile extends TileBase {
  kind: 'diode';
}

/**
 * A changeover (two-way) switch: three terminals. At rotation 0 the common terminal is on
 * the W side; flipped up it joins the N terminal, flipped down the S terminal. Two of them
 * wired together make a staircase light, switchable from either end.
 */
export interface ChangeoverTile extends TileBase {
  kind: 'changeover';
  up: boolean;
}

/**
 * A meter, wired in like any two-terminal part (+ on W at rotation 0). An ammeter ('A') is
 * practically a wire and reads the current through it; a voltmeter ('V') is practically a
 * gap and reads the voltage between its two ends.
 */
export interface MeterTile extends TileBase {
  kind: 'meter';
  mode: 'A' | 'V';
}

/**
 * A capacitor: a little tank that fills up with charge. It blocks steady current like a gap,
 * but while it fills or empties current flows, so it can keep a lamp glowing after the
 * battery is switched off. `uf` is its size in microfarads.
 */
export interface CapacitorTile extends TileBase {
  kind: 'capacitor';
  uf: number;
}

export type Tile =
  | WireTile
  | BlockTile
  | ResistorTile
  | LedTile
  | BatteryTile
  | SwitchTile
  | DiodeTile
  | ChangeoverTile
  | MeterTile
  | CapacitorTile;
/** Parts with a + and a − terminal on opposite sides. */
export type TwoTerminalTile =
  ResistorTile | LedTile | BatteryTile | SwitchTile | DiodeTile | MeterTile | CapacitorTile;
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
