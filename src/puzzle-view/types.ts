import type { Tile } from '../engine';

/** Lets the 2D UI ask the board "which cell is under this point?" and the reverse. */
export interface ScenePicker {
  cellAt(x: number, y: number): number | null;
  /** Screen position (canvas pixels) just above a cell's centre, for value tags. */
  project(cell: number, height?: number): { x: number; y: number };
}

/** A part being dragged, previewed where it would land. */
export interface GhostPreview {
  cell: number;
  tile: Tile;
}
