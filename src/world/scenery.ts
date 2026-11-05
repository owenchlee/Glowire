// Organic scenery for the world maps: groves with clearings, ragged forest edges, bushes and
// flowers on the fringe. Replaces the regular tree rows of MapBuilder.treeLine/forest.
// Pure map-building helpers (no React); everything is deterministic noise.

import { hash, type MapBuilder, type TreeStyle } from './builder';

const BIG = new Set<TreeStyle>(['bigPink', 'bigGreen', 'bigAutumn']);
const SIZE: Record<string, number> = { bigPink: 3, bigGreen: 3, bigAutumn: 3, teal: 1, autumn: 1 };
const widthOf = (s: TreeStyle) => SIZE[s] ?? 2;
const heightOf = (s: TreeStyle) => (BIG.has(s) ? 3 : 2);

/** Smooth value noise in 0..1; `cell` is the size of one lump in tiles. */
export function lump(x: number, y: number, cell: number, seed: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash(x0 + seed, y0 + seed * 0.7);
  const b = hash(x0 + 1 + seed, y0 + seed * 0.7);
  const c = hash(x0 + seed, y0 + 1 + seed * 0.7);
  const d = hash(x0 + 1 + seed, y0 + 1 + seed * 0.7);
  return (a + (b - a) * s(tx)) * (1 - s(ty)) + (c + (d - c) * s(tx)) * s(ty);
}

/** Leave room round spots, doors and the water's edge, so nothing is ever walled in. */
function crowded(b: MapBuilder, x: number, y: number, w: number, h: number): boolean {
  for (const s of b.spots) if (s.x >= x - 1 && s.x < x + w + 1 && s.y >= y - 1 && s.y < y + h + 1) return true;
  for (let j = -1; j < h + 1; j++)
    for (let i = -1; i < w + 1; i++) {
      const g = b.groundAt(x + i, y + j);
      if (g === 'pond' || g === 'sea') return true;
    }
  return false;
}

function claim(b: MapBuilder, x: number, y: number, w: number, h: number) {
  const taken = (b as unknown as { taken: Set<number> }).taken;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) taken.add((y + j) * b.width + x + i);
}

/** Try to plant one tree whose trunk (left cell for 1-2 wide, middle for 3 wide) is at x, y. */
function plant(b: MapBuilder, x: number, y: number, style: TreeStyle, x0: number, x1: number): boolean {
  const w = widthOf(style);
  const h = heightOf(style);
  const tx = w === 3 ? x - 1 : x;
  if (tx < x0 - 1 || tx + w > x1 + 1) return false;
  if (y > b.height - 1 || y - h + 1 < -1) return false;
  if (!b.free(tx, y - h + 1, w, h, true) || crowded(b, tx, y, w, 1)) return false;
  b.tree(tx, y, style);
  claim(b, tx, y - h + 1, w, h);
  return true;
}

const BIG_OF: Partial<Record<TreeStyle, TreeStyle>> = { round: 'bigGreen', oak: 'bigGreen', lime: 'bigGreen', cherry: 'bigPink' };

function pick(styles: TreeStyle[], deep: boolean, n: number): TreeStyle {
  const big = styles.filter((s) => BIG.has(s));
  const small = styles.filter((s) => !BIG.has(s));
  if (deep && big.length && n < 0.4) return big[Math.floor(n * 100) % big.length]!;
  const pool = small.length ? small : styles;
  const s = pool[Math.floor(n * 977) % pool.length]!;
  // A few big trees among the small ones, deeper in.
  return deep && !big.length && (n * 31) % 1 < 0.22 ? (BIG_OF[s] ?? s) : s;
}

/** Bushes and flowers where the wood thins out, so the edge looks lived in. */
function fringe(b: MapBuilder, x: number, y: number, n: number) {
  if (!b.free(x, y, 1, 1) || crowded(b, x, y, 1, 1)) return;
  if (n < 0.1) b.bush(x, y);
  else if (n < 0.3) b.flowers(x, y);
}

/**
 * A forest edge over columns x0..x1: the top of the map down to about row `edge` ('top'), or
 * about row `edge` to the bottom ('bottom'). The edge wanders a lot, trees clump into groves
 * with clearings between them, big trees stand deeper in, and the fringe gets bushes and
 * flowers. Drop-in replacement for MapBuilder.treeLine.
 */
function woodsNow(b: MapBuilder, x0: number, x1: number, side: 'top' | 'bottom', edge: number, styles: TreeStyle[]) {
  const seed = x0 * 0.37 + edge * 1.3 + (side === 'top' ? 0 : 50);
  const lim = (x: number) =>
    edge + (side === 'top' ? 1 : -1) + Math.round((lump(x, 3, 7, seed) - 0.5) * 6 + (lump(x, 9, 2.5, seed + 4) - 0.5) * 2.4);
  const ys: number[] = [];
  if (side === 'top') for (let y = edge + 4; y >= -1; y--) ys.push(y);
  else for (let y = edge - 4; y <= b.height; y++) ys.push(y);
  for (const y of ys)
    for (let x = x0; x < x1; x++) {
      const l = lim(x);
      const d = side === 'top' ? l - y : y - l; // how far into the wood
      if (d < -1) continue;
      const cluster = lump(x, y, 4.5, seed + 11);
      const n = hash(x * 1.31 + seed, y * 0.77);
      if (d < 0 || d === 0 && n > 0.5) {
        fringe(b, x, y, hash(x + 0.5, y + 0.25));
        continue;
      }
      // Dense in the back, a few lone trees at the front, and the odd clearing.
      let p = Math.min(0.8, 0.5 + d * 0.2) * (0.85 + cluster * 0.4);
      const hole = d < 5 ? 0.16 : 0.34;
      if (cluster < hole) p = 0.02; // a clearing, bigger the deeper you go
      if (n > p) {
        if (cluster < hole && n < 0.35) fringe(b, x, y, hash(x + 0.5, y + 0.25));
        continue;
      }
      plant(b, x, y + (hash(x + 9.1, y + 4.7) < 0.3 ? 1 : 0) * (side === 'top' ? -1 : 1), pick(styles, d >= 2, hash(x + 3.3, y + 1.9)), x0, x1);
    }
}

/**
 * Trees scattered over a rectangle as groves and clearings, with a mix of sizes. Drop-in
 * replacement for MapBuilder.forest (`density` reads the same: about how full it is).
 */
function groveNow(b: MapBuilder, x: number, y: number, w: number, h: number, styles: TreeStyle[], density = 0.5) {
  const seed = x * 0.41 + y * 0.93;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const cx = x + i;
      const cy = y + j;
      const cluster = lump(cx, cy, 6, seed);
      const n = hash(cx * 1.17 + seed, cy * 0.83);
      const f = Math.min(1.3, Math.max(0, (cluster - 0.3) / 0.28));
      if (f === 0) {
        // clearing: now and then a bush or a few flowers
        if (n > 0.9) fringe(b, cx, cy, hash(cx + 0.5, cy + 0.25) * 0.3);
        continue;
      }
      if (n > density * 0.55 * f) continue;
      const style = pick(styles, f > 0.8, hash(cx + 3.3, cy + 1.9));
      const drop = hash(cx + 9.1, cy + 4.7) < 0.4 ? 1 : 0; // stagger the rows
      if (!plant(b, cx, cy + 1 + drop, style, x, x + w)) plant(b, cx, cy + 1, style, x, x + w);
    }
}

/**
 * Breaks up a flat stretch of grass with clumps: drifts of flowers, a few bushes in the
 * thicker lumps, the odd stone. Only touches free grass/meadow cells, never near spots.
 */
function meadowNow(b: MapBuilder, x: number, y: number, w: number, h: number, amount = 1) {
  const seed = x * 0.29 + y * 0.61 + 7;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const cx = x + i;
      const cy = y + j;
      const c = lump(cx, cy, 3.2, seed);
      const n = hash(cx * 0.93 + seed, cy * 1.07);
      if (c > 0.68 && n < 0.5 * amount) fringe2(b, cx, cy, 'flower');
      else if (c > 0.82 && n < 0.58 * amount) fringe2(b, cx, cy, 'bush');
      else if (c < 0.12 && n < 0.12 * amount) fringe2(b, cx, cy, 'rock');
    }
}

function fringe2(b: MapBuilder, x: number, y: number, kind: 'flower' | 'bush' | 'rock') {
  if (!b.free(x, y, 1, 1) || crowded(b, x, y, 1, 1)) return;
  if (kind === 'flower') b.flowers(x, y);
  else if (kind === 'bush') b.bush(x, y);
  else b.prop(x, y, 'rock');
}

/**
 * Driftwood, pebbles and the odd rock in drifts along a beach, so sand never reads as a flat
 * sheet. Only sand cells with nothing on them (boards, props, boats) and no spot nearby.
 */
function beachNow(b: MapBuilder, x: number, y: number, w: number, h: number, amount = 1) {
  const used = new Set<number>();
  for (const o of b.objects)
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) used.add((o.y + j) * b.width + o.x + i);
  const seed = x * 0.23 + y * 0.77 + 3;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const cx = x + i;
      const cy = y + j;
      if (!b.inside(cx, cy) || b.groundAt(cx, cy) !== 'sand' || b.solid[cy * b.width + cx] || used.has(cy * b.width + cx)) continue;
      if (b.spots.some((s) => Math.abs(s.x - cx) <= 1 && Math.abs(s.y - cy) <= 1)) continue;
      if (b.residents.some((r) => Math.abs(r.x - cx) <= 1 && Math.abs(r.y - cy) <= 1)) continue;
      const c = lump(cx, cy, 3, seed);
      const n = hash(cx * 0.83 + seed, cy * 1.13);
      if (c > 0.66 && n < 0.45 * amount) b.prop(cx, cy, 'pebbles');
      else if (c > 0.8 && n < 0.55 * amount) b.prop(cx, cy, 'reeds');
      else if (c < 0.1 && n < 0.25 * amount) b.prop(cx, cy, n < 0.12 ? 'rock' : 'log');
    }
}

// ── Deferred scenery ─────────────────────────────────────────────────────────
// Scenery fills whatever is still free, so it runs last (flushScenery, before finish), after
// every hand-placed thing and every puzzle. Before it does, it keeps a footpath open from each
// spot and person to the nearest road, so no wood can ever wall something in.

type Job = () => void;
const queue = new WeakMap<MapBuilder, Job[]>();
function later(b: MapBuilder, job: Job) {
  const q = queue.get(b);
  if (q) q.push(job);
  else queue.set(b, [job]);
}

export function woods(b: MapBuilder, x0: number, x1: number, side: 'top' | 'bottom', edge: number, styles: TreeStyle[]) {
  later(b, () => woodsNow(b, x0, x1, side, edge, styles));
}
export function grove(b: MapBuilder, x: number, y: number, w: number, h: number, styles: TreeStyle[], density = 0.5) {
  later(b, () => groveNow(b, x, y, w, h, styles, density));
}
export function meadow(b: MapBuilder, x: number, y: number, w: number, h: number, amount = 1) {
  later(b, () => meadowNow(b, x, y, w, h, amount));
}
export function beach(b: MapBuilder, x: number, y: number, w: number, h: number, amount = 1) {
  later(b, () => beachNow(b, x, y, w, h, amount));
}

const isLawn = (g: string | null) => g === 'grass' || g === 'meadow';

/** Cells of a shortest footpath from (sx, sy) across open lawn to the nearest road, sand or paving. */
function footpath(b: MapBuilder, sx: number, sy: number): number[] {
  const W = b.width;
  const prev = new Map<number, number>();
  const start = sy * W + sx;
  prev.set(start, -1);
  const todo = [start];
  for (let k = 0; k < todo.length; k++) {
    const c = todo[k]!;
    const x = c % W;
    const y = (c - x) / W;
    const g = b.groundAt(x, y);
    if (!isLawn(g) && g !== 'pond' && g !== 'sea' && !b.solid[c]) {
      const out: number[] = [];
      for (let q = c; q !== -1 && q !== start; q = prev.get(q)!) out.push(q);
      return out;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!b.inside(nx, ny)) continue;
      const n = ny * W + nx;
      if (prev.has(n) || b.solid[n]) continue;
      const ng = b.groundAt(nx, ny);
      if (ng === 'pond' || ng === 'sea') continue;
      prev.set(n, c);
      todo.push(n);
    }
    if (todo.length > 4000) break;
  }
  return [];
}

/** Run every queued scenery pass. Call once, after the map is otherwise finished. */
export function flushScenery(b: MapBuilder) {
  const taken = (b as unknown as { taken: Set<number> }).taken;
  const targets = [...b.spots.map((s) => [s.x, s.y] as const), ...b.residents.map((r) => [r.x, r.y] as const)];
  for (const [x, y] of targets) {
    if (!b.inside(x, y)) continue;
    taken.add(y * b.width + x);
    for (const c of footpath(b, x, y)) taken.add(c);
  }
  for (const job of queue.get(b) ?? []) job();
  queue.delete(b);
}
