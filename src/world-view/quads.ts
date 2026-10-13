// Turns tiles into one big mesh: a quad per tile, cut from a tile sheet. World units are
// tiles; a map cell (x, y) covers x..x+1 and, because three.js points y up, -y-1..-y.

import { BufferAttribute, BufferGeometry } from 'three';

export interface Quad {
  /** Left and top edge in tiles (map coordinates, y down). */
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Source rectangle in the sheet, in pixels. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  z: number;
  /** 0 → 1: how strongly its glowing pixels are lit. */
  lit?: number;
  /** Glow colour (r, g, b 0–1); none for the usual warm glow. */
  tint?: readonly [number, number, number];
  /** Quarter turns clockwise. */
  rot?: number;
}

export interface Sheet {
  width: number;
  height: number;
}

export function quadGeometry(quads: Quad[], sheet: Sheet): BufferGeometry {
  const n = quads.length;
  const position = new Float32Array(n * 4 * 3);
  const uv = new Float32Array(n * 4 * 2);
  const lit = new Float32Array(n * 4);
  const tint = new Float32Array(n * 4 * 3);
  const index = new Uint32Array(n * 6);
  // Pull UVs in by a hair so neighbouring tiles in the sheet never bleed in.
  const ex = 0.01 / sheet.width;
  const ey = 0.01 / sheet.height;
  quads.forEach((q, i) => {
    const w = q.w ?? 1;
    const h = q.h ?? 1;
    const x0 = q.x;
    const x1 = q.x + w;
    const y0 = -q.y;
    const y1 = -q.y - h;
    position.set([x0, y0, q.z, x1, y0, q.z, x1, y1, q.z, x0, y1, q.z], i * 12);
    // Textures load with flipY, so v runs bottom-up.
    const u0 = q.sx / sheet.width + ex;
    const u1 = (q.sx + q.sw) / sheet.width - ex;
    const v0 = 1 - q.sy / sheet.height - ey;
    const v1 = 1 - (q.sy + q.sh) / sheet.height + ey;
    // Corners go TL, TR, BR, BL; turning the picture clockwise moves each corner's UV on one.
    const corners = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    const r = ((q.rot ?? 0) % 4 + 4) % 4;
    for (let k = 0; k < 4; k++) uv.set(corners[(k - r + 4) % 4]!, i * 8 + k * 2);
    lit.fill(q.lit ?? 0, i * 4, i * 4 + 4);
    if (q.tint) for (let k = 0; k < 4; k++) tint.set(q.tint, (i * 4 + k) * 3);
    const v = i * 4;
    index.set([v, v + 2, v + 1, v, v + 3, v + 2], i * 6);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(position, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('aLit', new BufferAttribute(lit, 1));
  g.setAttribute('aTint', new BufferAttribute(tint, 3));
  g.setIndex(new BufferAttribute(index, 1));
  return g;
}

/** Point a single-quad geometry at another part of its sheet (animation frames). */
export function setQuadSource(
  g: BufferGeometry,
  sheet: Sheet,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  /** Mirror left–right (a side-on sprite walking the other way). */
  flip = false,
) {
  const ex = 0.01 / sheet.width;
  const ey = 0.01 / sheet.height;
  const u0 = sx / sheet.width + ex;
  const u1 = (sx + sw) / sheet.width - ex;
  const v0 = 1 - sy / sheet.height - ey;
  const v1 = 1 - (sy + sh) / sheet.height + ey;
  const uv = g.getAttribute('uv') as BufferAttribute;
  const [a, b] = flip ? [u1, u0] : [u0, u1];
  uv.array.set([a, v0, b, v0, b, v1, a, v1]);
  uv.needsUpdate = true;
}
