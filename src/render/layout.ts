import type { Direction, Rotation } from '../engine';

/** Height of a tile's raised base; tile parts sit on top of it. */
export const BASE_HEIGHT = 0.2;
export const TOP = BASE_HEIGHT;

/** Unit vector (x, z) for each port direction. N is −z, E is +x. */
export const DIR_VECTORS: Record<Direction, readonly [number, number]> = {
  0: [0, -1],
  1: [1, 0],
  2: [0, 1],
  3: [-1, 0],
};

/** World (x, z) of a cell's centre, with the board centred on the origin. */
export function cellToWorld(cell: number, width: number, height: number): [number, number] {
  const x = cell % width;
  const y = Math.floor(cell / width);
  return [x - (width - 1) / 2, y - (height - 1) / 2];
}

export function worldToCell(wx: number, wz: number, width: number, height: number): number | null {
  const x = Math.round(wx + (width - 1) / 2);
  const y = Math.round(wz + (height - 1) / 2);
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  return y * width + x;
}

/** Clockwise (seen from above) rotation about +y. */
export const rotationAngle = (r: Rotation) => (-r * Math.PI) / 2;
