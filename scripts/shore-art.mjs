// Hand-composited terrain pieces, built pixel by pixel from the colours of the village
// pack's own tiles (nothing is a vector or a basic shape: every colour below is one the
// tileset already uses).
//
//   - Sand shores: rounded, autotiled sand against water, with a wet-sand rim and a foam line.
//     A sand cell and the water cell beside it both get a tile, so the coast is one curve.
//   - Stepping stones: a flat pale mossy slab with a ripple ring around it.
//   - Hop-down ledges: a grassy (or sandy) lip with a shadow and tufts, unlike a tall cliff.
//   - A teal "reef" recolour of the sand mesas, for Brightwater Deep.

import { PNG } from 'pngjs';

const hex = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
const C = {
  water: hex('71ddee'),
  shallow: hex('79b8ce'),
  foam: hex('ffffff'),
  sand: hex('ffcb8d'),
  sandMid: hex('ffad5d'),
  sandWet: hex('d78b4a'),
  outline: hex('965340'),
};

// Neighbour bits, as in autotile.mjs: N E S W NE SE SW NW = 1, 2, 4, 8, 16, 32, 64, 128.
const N = 1, E = 2, S = 4, W = 8, NE = 16, SE = 32, SW = 64, NW = 128;
const OFFS = [
  [N, 0, -1], [E, 1, 0], [S, 0, 1], [W, -1, 0], [NE, 1, -1], [SE, 1, 1], [SW, -1, 1], [NW, -1, -1],
];

/** A mask (bit set = that neighbour is land) with the corners that can't matter fixed. */
export function canonical(mask) {
  let m = mask;
  const corner = (diag, a, b) => {
    const A = (m & a) !== 0;
    const B = (m & b) !== 0;
    if (A !== B) m |= diag; // an edge there already: the corner can't show
  };
  corner(NE, N, E);
  corner(SE, S, E);
  corner(SW, S, W);
  corner(NW, N, W);
  return m;
}

const SIZE = 48;
const SIGMA = 5;
const KERNEL = (() => {
  const r = Math.ceil(SIGMA * 3);
  const k = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * SIGMA * SIGMA));
    k.push(v);
    sum += v;
  }
  return k.map((v) => v / sum);
})();

/** The land/water shape of a 3×3 patch of cells, rounded: 48×48 booleans (true = land). */
function shape(cells) {
  const raw = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) raw[y * SIZE + x] = cells[Math.floor(y / 16)][Math.floor(x / 16)] ? 1 : 0;
  const r = (KERNEL.length - 1) / 2;
  const tmp = new Float32Array(SIZE * SIZE);
  const out = new Float32Array(SIZE * SIZE);
  const clamp = (v) => Math.max(0, Math.min(SIZE - 1, v));
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += raw[y * SIZE + clamp(x + i)] * KERNEL[i + r];
      tmp[y * SIZE + x] = a;
    }
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += tmp[clamp(y + i) * SIZE + x] * KERNEL[i + r];
      out[y * SIZE + x] = a;
    }
  return Array.from(out, (v) => v > 0.5);
}

/** Distance from (x, y) to the nearest pixel of the other kind, up to `max`. */
function distToOther(land, x, y, max) {
  const me = land[y * SIZE + x];
  let best = max + 1;
  for (let dy = -max; dy <= max; dy++)
    for (let dx = -max; dx <= max; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) continue;
      if (land[py * SIZE + px] === me) continue;
      best = Math.min(best, Math.hypot(dx, dy));
    }
  return best;
}

/** One shore tile: the centre cell of a 3×3 patch where `mask` says which neighbours are land. */
function shoreTile(centreLand, mask) {
  const cells = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  cells[1][1] = centreLand ? 1 : 0;
  for (const [bit, dx, dy] of OFFS) cells[1 + dy][1 + dx] = mask & bit ? 1 : 0;
  const land = shape(cells);
  const tile = new PNG({ width: 16, height: 16 });
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const gx = 16 + x;
      const gy = 16 + y;
      const isLand = land[gy * SIZE + gx];
      const d = distToOther(land, gx, gy, 4);
      let c;
      if (isLand) c = d <= 1.05 ? C.outline : d <= 2.05 ? C.sandWet : d <= 3.1 ? C.sandMid : C.sand;
      else if (d <= 1.05) c = C.foam;
      else if (d <= 2.05) c = C.shallow;
      else if (d <= 4 && (gx + gy * 2) % 8 === 0) c = C.shallow; // a few ripples further out
      else c = C.water;
      const o = (y * 16 + x) * 4;
      tile.data[o] = c[0];
      tile.data[o + 1] = c[1];
      tile.data[o + 2] = c[2];
      tile.data[o + 3] = 255;
    }
  return tile;
}

// --- stepping stones ---------------------------------------------------------------------
const put = (png, x, y, c, a = 255) => {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const o = (y * png.width + x) * 4;
  png.data[o] = c[0];
  png.data[o + 1] = c[1];
  png.data[o + 2] = c[2];
  png.data[o + 3] = a;
};

/** A flat stone in a ripple ring: pale limestone, moss on top, drawn over a water tile. */
function steppingStone(variant) {
  const t = new PNG({ width: 16, height: 16 });
  const cx = 7.5;
  const cy = 8.5;
  const light = hex('d5eef4');
  const top = hex('b6beb0');
  const shade = hex('8d977f');
  const dark = hex('5f7160');
  const moss = hex('adbc3a');
  const mossDark = hex('74a334');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const dx = (x - cx) / 7.9;
      const dy = (y - cy) / 6.4;
      const ring = Math.hypot(dx, dy);
      // The ripple: a foam ring with a shadow-blue ring outside it.
      if (ring <= 1.0 && ring > 0.82 && (x + y + variant) % 5 !== 0) put(t, x, y, C.foam);
      else if (ring <= 1.12 && ring > 1.0 && y > cy) put(t, x, y, C.shallow);
      const sx = (x - cx) / 6.6;
      const sy = (y - (cy - 0.5)) / 4.6;
      const s = Math.hypot(sx, sy);
      if (s <= 1) {
        // Stone: lit from the top left; a darker lower rim reads as thickness.
        const lower = y > cy + 1.2;
        let c = lower ? shade : top;
        if (s > 0.78) c = lower ? dark : shade;
        if (!lower && sx + sy < -0.9) c = light;
        put(t, x, y, c);
      } else if (s <= 1.35 && y > cy) {
        put(t, x, y, C.shallow); // stone's shadow in the water
      }
    }
  // Moss patches and a crack, different on each stone.
  const patches =
    variant === 0
      ? [[5, 7], [6, 7], [6, 8], [9, 6], [10, 7], [10, 8]]
      : [[4, 8], [5, 8], [5, 9], [8, 6], [9, 6], [11, 8]];
  for (const [x, y] of patches) put(t, x, y, moss);
  put(t, patches[1][0], patches[1][1] - 1, mossDark);
  put(t, patches[4][0] + 1, patches[4][1] + 1, mossDark);
  const crack = variant === 0 ? [[8, 9], [9, 9]] : [[7, 10], [8, 10]];
  for (const [x, y] of crack) put(t, x, y, shade);
  return t;
}

// --- hop-down ledges ---------------------------------------------------------------------
const LEDGE_STYLES = {
  green: { top: hex('adbc3a'), tuft: hex('a8a129'), lip: hex('56634d'), under: hex('46402e'), slope: hex('74a334'), fade: hex('a8a129'), blade: hex('56634d') },
  sand: { top: hex('ffcb8d'), tuft: hex('ffad5d'), lip: hex('bd7959'), under: hex('965340'), slope: hex('d78b4a'), fade: hex('ffad5d'), blade: hex('bd7959') },
};

/** A ledge tile; `end`: 'L' | 'M' | 'R' (the lip curls down at the ends). */
function ledgeTile(style, end, seed) {
  const s = LEDGE_STYLES[style];
  const t = new PNG({ width: 16, height: 16 });
  const lipY = (x) => {
    // The lip dips and rises a little, and curls up at the ends.
    let y = 8 + (Math.floor((x + seed * 3) / 3) % 2);
    if (end === 'L' && x < 3) y += 3 - x;
    if (end === 'R' && x > 12) y += x - 12;
    return y;
  };
  for (let x = 0; x < 16; x++) {
    const ly = lipY(x);
    for (let y = 0; y < 16; y++) {
      let c;
      if (y < ly) c = s.top;
      else if (y === ly) c = s.lip;
      else if (y === ly + 1) c = s.under;
      else if (y <= ly + 4) c = s.slope;
      else c = (x + y) % 2 === 0 ? s.slope : s.fade;
      // The two ends' rounded corners fade to the plain top colour.
      if ((end === 'L' && x === 0 && y > ly) || (end === 'R' && x === 15 && y > ly)) c = s.top;
      put(t, x, y, c);
    }
  }
  // Tufts of blades above the lip, and flecks on the grass.
  const blades = [[3 + seed, 1], [9 - seed, 0], [13, 2]];
  for (const [bx, off] of blades) {
    if (bx < 0 || bx > 15) continue;
    const by = lipY(bx) - 1 - off;
    put(t, bx, by, s.blade);
    put(t, bx - 1, by + 1, s.blade);
    put(t, bx + 1, by + 1, s.blade);
  }
  for (const [fx, fy] of [[1 + seed, 3], [7, 5], [12 - seed, 2], [4, 6]]) put(t, fx, fy, s.tuft);
  return t;
}

// --- the sheet ----------------------------------------------------------------------------
/** Tiles per row of the generated sheet. */
export const SHORE_COLS = 16;
/** Local tile numbers of the non-shore pieces. */
export const SHORE_LOCAL = {
  stone: [0, 1],
  ledgeGreen: [2, 3, 4], // left, middle, right
  ledgeSand: [5, 6, 7],
};
const FIRST_SHORE = 16;

/** The shore tiles every canonical mask needs, in sheet order. */
function shoreList() {
  const masks = [];
  for (let m = 0; m < 256; m++) if (canonical(m) === m) masks.push(m);
  return masks;
}

/**
 * The sheet (16 tiles across) and, for sand cells and for water cells, a 256-entry table:
 * neighbour mask (bit set = land) → tile number in this sheet (-1: nothing special needed).
 */
export function shoreSheet() {
  const masks = shoreList();
  const tiles = [];
  const tables = { sand: new Array(256).fill(-1), water: new Array(256).fill(-1) };
  const localOf = { sand: new Map(), water: new Map() };
  for (const kind of ['sand', 'water']) {
    for (const m of masks) {
      // A sand cell with every neighbour land is plain sand; a water cell with none is plain water.
      if (kind === 'sand' && m === 255) continue;
      if (kind === 'water' && m === 0) continue;
      localOf[kind].set(m, FIRST_SHORE + tiles.length);
      tiles.push(shoreTile(kind === 'sand', m));
    }
  }
  for (const kind of ['sand', 'water'])
    for (let m = 0; m < 256; m++) tables[kind][m] = localOf[kind].get(canonical(m)) ?? -1;

  const total = FIRST_SHORE + tiles.length;
  const rows = Math.ceil(total / SHORE_COLS);
  const png = new PNG({ width: SHORE_COLS * 16, height: rows * 16 });
  const blit = (tile, n) => {
    const ox = (n % SHORE_COLS) * 16;
    const oy = Math.floor(n / SHORE_COLS) * 16;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const si = (y * 16 + x) * 4;
        if (tile.data[si + 3] < 128) continue;
        png.data.set(tile.data.subarray(si, si + 4), ((oy + y) * png.width + ox + x) * 4);
      }
  };
  steppingStoneTiles().forEach((t, i) => blit(t, SHORE_LOCAL.stone[i]));
  ['L', 'M', 'R'].forEach((e, i) => {
    blit(ledgeTile('green', e, i === 1 ? 0 : 1), SHORE_LOCAL.ledgeGreen[i]);
    blit(ledgeTile('sand', e, i === 1 ? 0 : 1), SHORE_LOCAL.ledgeSand[i]);
  });
  tiles.forEach((t, i) => blit(t, FIRST_SHORE + i));
  return { png, tables };
}

const steppingStoneTiles = () => [steppingStone(0), steppingStone(1)];

// --- the reef recolour --------------------------------------------------------------------
/**
 * Brightwater Deep's mesas: the sand-coloured relief set turned teal and coral (every
 * target colour already exists in the village palette), so they stand out from the sea floor.
 */
export function reefRelief(relief) {
  const map = {
    ffcb8d: '5fa8a0', // mesa top
    f2ad7d: '4a8f97', // top edge
    bd7959: '2d697b', // cliff face
    '965340': '1f4a5a', // outline
    '543c52': '1a2f3f', // cliff foot shadow
    ffad5d: 'e66a3a', // (coral accents)
  };
  const out = new PNG({ width: relief.width, height: relief.height });
  out.data.set(relief.data);
  for (let i = 0; i < out.data.length; i += 4) {
    const key = ((out.data[i] << 16) | (out.data[i + 1] << 8) | out.data[i + 2]).toString(16).padStart(6, '0');
    const to = map[key];
    if (!to || out.data[i + 3] < 128) continue;
    const c = hex(to);
    out.data[i] = c[0];
    out.data[i + 1] = c[1];
    out.data[i + 2] = c[2];
  }
  return out;
}
