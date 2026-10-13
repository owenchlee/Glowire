// Town pieces no art pack has, drawn here pixel by pixel in the village pack's palette:
// cobbled squares, their kerbs, a mosaic for the middle of a square, and clocktowers.
// One sheet (16px tiles, 16 across), stacked into assets/art/world.png by art.mjs.
//
// Layout (keep in sync with TOWN in src/world/builder.ts):
//   rows 0–3, cols 0–3:   grey cobbles, a seamless 4×4 patch (tile = x % 4, y % 4)
//   rows 0–3, cols 4–7:   warm cobbles, the same
//   rows 0–2, cols 8–10:  grey kerb (3×3, middle empty), drawn over the cobbles
//   rows 0–2, cols 11–13: warm kerb
//   rows 4–7, cols 0–3:   mosaic star (4×4), drawn over grey cobbles
//   rows 4–7, cols 4–7:   mosaic sun (4×4), drawn over warm cobbles
//   rows 4–7, cols 8–11:  a round fountain (4×4)
//   row 3, cols 8–13:     small things on the cobbles: drain, cracks, moss, leaves, puddle
//   rows 8–17, cols 0–4:  the town clocktower (5×10), face glowing once fixed
//   rows 8–17, cols 5–9:  the Mossbell tower (5×10): mossy stone, ivy, a mossy spire
//
// Pixels that light up at night once fixed (clock faces, windows) get alpha 254.

import { PNG } from 'pngjs';

export const TOWN_COLS = 16;
const ROWS = 18;

const C = {
  ink: '141b1b',
  shadow: '2e2b30',
  greyHi: 'd2c9c9',
  grey: 'b6beb0',
  greyMid: '9ba7aa',
  greyDark: '7b7b7b',
  greyMortar: '5f7160',
  warmHi: 'fce2ca',
  warm: 'eecf9b',
  warmMid: 'd2b37d',
  warmDark: 'c8966b',
  warmMortar: '965340',
  cream: 'f2eaf1',
  white: 'ffffff',
  gold: 'ffe166',
  goldDark: 'd2b37d',
  brass: 'f1ae41',
  red: 'd14b34',
  teal: '2d697b',
  tealLight: '3da6bd',
  slate: '4a5270',
  slateLight: '79b8ce',
  slateDark: '2e2b30',
  moss: '74a334',
  mossLight: 'adbc3a',
  mossDark: '4a7f4b',
  wood: 'a3754e',
  woodDark: '61372e',
  water: '5fcde4',
  waterDark: '2d697b',
  leaf: 'e66a3a',
  glass: 'ffe18d',
  glassDark: 'd2b37d',
};

const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

/** Deterministic noise. */
function noise(x, y, seed = 0) {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

class Canvas {
  /** `top`: extra rows above y = 0, for drawing up past the usual top edge. */
  constructor(w, h, top = 0) {
    this.w = w;
    this.h = h + top;
    this.top = top;
    this.px = new Array(w * this.h).fill(null);
  }
  set(x, y, color, glow = false) {
    y += this.top;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = { color, glow };
  }
  get(x, y) {
    y += this.top;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }
  rect(x, y, w, h, color, glow = false) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color, glow);
  }
  /** A 1px outline round everything drawn so far. */
  outline(color = C.ink) {
    const add = [];
    for (let y = -this.top; y < this.h - this.top; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => this.get(x + a, y + b))) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, color);
  }
  stampInto(png, ox, oy) {
    this.px.forEach((p, i) => {
      if (!p) return;
      const x = ox + (i % this.w);
      const y = oy + Math.floor(i / this.w);
      const o = (y * png.width + x) * 4;
      png.data.set(hex(p.color), o);
      png.data[o + 3] = p.glow ? 254 : 255;
    });
  }
}

// ── Cobbles ──────────────────────────────────────────────────────────────────

/**
 * A 64×64 patch of cobblestones that wraps at its edges, so 4×4 tiles cut from it fit each
 * other in any repeat. Stones are jittered cells (nearest of a grid of points, measured
 * round the wrap); the gaps between them are mortar, and each stone is lit from the top
 * left.
 */
function cobbles(pal, seed) {
  const S = 64;
  const cell = 8;
  const n = S / cell;
  const pts = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      // Rows of stones offset like brickwork, with a little wobble.
      const ox = (j % 2) * cell * 0.5;
      pts.push({
        x: (i * cell + ox + 1.5 + noise(i, j, seed) * (cell - 3)) % S,
        y: j * cell + 1.5 + noise(i, j, seed + 1) * (cell - 3),
        tone: noise(i, j, seed + 2),
      });
    }
  const wrap = (d) => {
    d = Math.abs(d) % S;
    return Math.min(d, S - d);
  };
  const c = new Canvas(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let best = Infinity;
      let second = Infinity;
      let bp = null;
      for (const p of pts) {
        // Stones are a touch wider than tall, like real setts.
        const d = Math.hypot(wrap(x + 0.5 - p.x) * 0.85, wrap(y + 0.5 - p.y));
        if (d < best) {
          second = best;
          best = d;
          bp = p;
        } else if (d < second) second = d;
      }
      const edge = second - best;
      if (edge < 1.1) {
        c.set(x, y, pal.mortar);
        continue;
      }
      // Light from the top left: which side of its centre is this pixel on?
      const dx = ((x + 0.5 - bp.x + S * 1.5) % S) - S / 2;
      const dy = ((y + 0.5 - bp.y + S * 1.5) % S) - S / 2;
      const lightness = -(dx + dy) / 6;
      let col = bp.tone < 0.3 ? pal.mid : pal.base;
      if (edge < 2.1 && lightness < 0) col = pal.dark;
      else if (edge < 2.4 && lightness > 0.2) col = pal.hi;
      else if (lightness > 0.75) col = pal.hi;
      // A few specks so big squares don't look flat.
      if (noise(x, y, seed + 9) > 0.985) col = pal.dark;
      c.set(x, y, col);
    }
  return c;
}

const GREY = { base: C.grey, mid: C.greyMid, hi: C.greyHi, dark: C.greyDark, mortar: C.greyMortar };
const WARM = { base: C.warm, mid: C.warmMid, hi: C.warmHi, dark: C.warmDark, mortar: 'bd7959' };

/**
 * Kerbstones round the edge of a square: a 48×48 frame of long slabs, with the middle left
 * empty (cobbles show through).
 */
function kerb(pal) {
  const c = new Canvas(48, 48);
  const slabs = (horizontal, at) => {
    for (let k = 0; k < 48; k++) {
      const joint = k % 12 === 0;
      for (let t = 0; t < 5; t++) {
        const [x, y] = horizontal ? [k, at + t] : [at + t, k];
        let col = t === 0 ? pal.hi : t === 4 ? pal.dark : pal.base;
        if (joint) col = pal.mortar;
        c.set(x, y, col);
      }
    }
  };
  slabs(true, 0);
  slabs(true, 43);
  slabs(false, 0);
  slabs(false, 43);
  // Corner blocks.
  for (const [x, y] of [[0, 0], [43, 0], [0, 43], [43, 43]]) {
    c.rect(x, y, 5, 5, pal.base);
    c.rect(x, y, 5, 1, pal.hi);
    c.rect(x, y + 4, 5, 1, pal.dark);
  }
  // A thin mortar line between kerb and cobbles.
  for (let k = 5; k < 43; k++) {
    c.set(k, 5, pal.mortar);
    c.set(k, 42, pal.mortar);
    c.set(5, k, pal.mortar);
    c.set(42, k, pal.mortar);
  }
  return c;
}

/** A round mosaic for the middle of a square: a ring and an eight-pointed star (or a sun). */
function mosaic(kind) {
  const c = new Canvas(64, 64);
  const cx = 32;
  const cy = 32;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      if (r > 29.5) continue;
      if (r > 27.5) {
        c.set(x, y, C.greyMortar);
        continue;
      }
      if (r > 24.5) {
        // A ring of small tiles.
        const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 32);
        c.set(x, y, seg % 2 ? (kind === 'star' ? C.teal : C.warmMortar) : C.cream);
        continue;
      }
      if (r > 23) {
        c.set(x, y, C.greyMortar);
        continue;
      }
      let col;
      if (kind === 'star') {
        // Eight points: the star's edge moves in and out with the angle.
        const k = Math.abs(((((a / (Math.PI / 4)) % 1) + 1) % 1) - 0.5) * 2;
        const edge = 8 + 13 * (1 - k);
        col = r < edge ? (r < 4 ? C.gold : (Math.floor(a / (Math.PI / 8)) & 1 ? C.gold : C.brass)) : C.slate;
        if (r < edge && r > edge - 1.2) col = C.goldDark;
      } else {
        const rays = Math.abs(Math.sin(a * 6));
        col = r < 9 ? C.gold : r < 9 + rays * 12 ? C.leaf : C.warm;
        if (r < 9 && r > 7.8) col = C.brass;
        if (r < 4) col = C.white;
      }
      c.set(x, y, col);
    }
  return c;
}

/** Little things to scatter on a square, one per 16px tile. */
function details() {
  const out = [];
  // Drain grate.
  let c = new Canvas(16, 16);
  c.rect(4, 5, 8, 6, C.greyDark);
  for (let x = 5; x < 11; x += 2) c.rect(x, 6, 1, 4, C.shadow);
  c.rect(4, 5, 8, 1, C.greyHi);
  out.push(c);
  // Crack.
  c = new Canvas(16, 16);
  for (const [x, y] of [[3, 4], [4, 5], [5, 5], [6, 6], [7, 7], [7, 8], [8, 9], [9, 9], [10, 10], [6, 7], [5, 8]]) c.set(x, y, C.greyMortar);
  out.push(c);
  // Moss in the gaps.
  c = new Canvas(16, 16);
  for (let i = 0; i < 18; i++) {
    const x = 3 + Math.floor(noise(i, 1, 3) * 10);
    const y = 3 + Math.floor(noise(i, 2, 3) * 10);
    c.set(x, y, noise(i, 3, 3) > 0.5 ? C.moss : C.mossDark);
  }
  out.push(c);
  // Fallen leaves.
  c = new Canvas(16, 16);
  for (const [x, y, col] of [[4, 5, C.leaf], [5, 5, C.leaf], [5, 6, C.red], [10, 9, C.brass], [11, 9, C.leaf], [11, 10, C.leaf], [7, 12, C.red], [8, 12, C.leaf]]) c.set(x, y, col);
  out.push(c);
  // A puddle catching the light.
  c = new Canvas(16, 16);
  for (let y = 5; y < 11; y++)
    for (let x = 3; x < 13; x++) if (((x - 7.5) / 5) ** 2 + ((y - 7.5) / 3) ** 2 < 1) c.set(x, y, C.waterDark);
  c.rect(5, 6, 3, 1, C.water);
  c.set(9, 8, C.water);
  out.push(c);
  // Worn slab.
  c = new Canvas(16, 16);
  c.rect(3, 3, 10, 10, C.greyMid);
  c.rect(3, 3, 10, 1, C.greyHi);
  c.rect(3, 12, 10, 1, C.greyDark);
  c.rect(12, 3, 1, 10, C.greyDark);
  out.push(c);
  return out;
}

// ── Fountain ─────────────────────────────────────────────────────────────────

/**
 * A round stone fountain (64×64): a rim of stone blocks, rippling water, and a pillar in the
 * middle with water spilling from a bowl. (The water isn't a glowing pixel: the shader tints
 * those warm. A blue pool of light on the map lights it instead.)
 */
function fountain() {
  const c = new Canvas(64, 64);
  const cx = 32;
  const cy = 34;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const dx = (x + 0.5 - cx) / 30;
      const dy = (y + 0.5 - cy) / 26;
      const r = Math.hypot(dx, dy);
      if (r > 1) continue;
      if (r > 0.82) {
        // The rim: blocks, lit on the far (top) side, shaded on the near side.
        const a = Math.atan2(dy, dx);
        const joint = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 20 + 0.5) !== Math.floor(((a + Math.PI) / (Math.PI * 2)) * 20 + 0.45);
        let col = dy < 0 ? C.greyHi : C.grey;
        if (r > 0.95 && dy > 0) col = C.greyDark;
        if (joint) col = C.greyMid;
        c.set(x, y, col);
        continue;
      }
      // Water: rings of ripples, darker at the edge.
      const ring = Math.sin(r * 26) > 0.75;
      let col = r > 0.72 ? C.waterDark : ring ? C.slateLight : C.water;
      if (noise(x, y, 31) > 0.97) col = C.white;
      c.set(x, y, col);
    }
  // The pillar and the bowl on top, spilling water.
  c.rect(29, 22, 6, 14, C.grey);
  c.rect(29, 22, 2, 14, C.greyHi);
  c.rect(33, 22, 2, 14, C.greyMid);
  for (let x = 22; x < 42; x++) {
    const t = Math.abs(x + 0.5 - 32) / 10;
    c.rect(x, 17, 1, 3, t > 0.85 ? C.greyMid : C.greyHi);
  }
  c.rect(22, 20, 20, 1, C.greyDark);
  for (const [x, y0] of [[22, 21], [41, 21], [26, 21], [37, 21]])
    for (let y = y0; y < y0 + 10; y++) c.set(x + (y % 3 === 0 ? 1 : 0), y, y % 2 ? C.white : C.slateLight);
  // The spout's spray above the bowl.
  for (const [x, y] of [[31, 10], [32, 10], [30, 12], [33, 12], [31, 13], [32, 14], [29, 14], [34, 14], [32, 8], [31, 16], [32, 16]])
    c.set(x, y, y < 12 ? C.white : C.slateLight);
  c.outline();
  return c;
}

// ── Clocktowers ──────────────────────────────────────────────────────────────

/** Stone blocks in rows, lit on top: fills a rectangle. */
function masonry(c, x0, y0, w, h, pal, mossy = false) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / 4);
      const off = row % 2 ? 4 : 0;
      const inRow = (y - y0) % 4;
      const joint = (x - x0 + off) % 8 === 0;
      let col = inRow === 3 || joint ? pal.mortar : inRow === 0 ? pal.hi : noise(Math.floor((x - x0 + off) / 8), row, 5) < 0.35 ? pal.mid : pal.base;
      if (mossy && noise(x >> 1, y >> 1, 11) > (y - y0) / h + 0.55) col = noise(x, y, 12) > 0.5 ? C.moss : C.mossLight;
      c.set(x, y, col);
    }
}

const STONE = { base: C.greyHi, mid: C.grey, hi: C.white, mortar: C.greyMid, dark: C.greyDark };
const OLD_STONE = { base: C.grey, mid: C.greyMid, hi: C.greyHi, mortar: C.greyDark, dark: C.greyMortar };

/** An arched window or door (dark until lit). */
function arch(c, x, y, w, h, glow = true) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const top = j < w / 2 && Math.hypot(i + 0.5 - w / 2, j + 0.5 - w / 2) > w / 2;
      if (top) continue;
      c.set(x + i, y + j, j < h - 1 && i > 0 ? C.glass : C.glassDark, glow);
    }
  // Dark frame.
  for (let j = 0; j < h; j++)
    for (let i = -1; i <= w; i++) {
      const p = c.get(x + i, y + j);
      if (p && (p.color === C.glass || p.color === C.glassDark)) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
        const q = c.get(x + i + a, y + j + b);
        return q && (q.color === C.glass || q.color === C.glassDark) && q.glow;
      });
      if (near) c.set(x + i, y + j, C.woodDark);
    }
}

/**
 * A clock face: cream dial with hour marks and hands at `time` (hours, minutes). The dial
 * glows once the tower is fixed.
 */
function clockFace(c, cx, cy, r, time, rim = C.gold) {
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++)
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r - 1) c.set(x, y, C.cream, true);
      else if (d <= r + 0.6) c.set(x, y, rim);
      else if (d <= r + 1.6) c.set(x, y, C.woodDark);
    }
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    const len = h % 3 === 0 ? 3 : 1.5;
    for (let t = 0; t < len; t += 0.5) {
      const rr = r - 2 - t;
      c.set(Math.floor(cx + Math.sin(a) * rr), Math.floor(cy - Math.cos(a) * rr), C.shadow, true);
    }
  }
  const hand = (frac, len, color) => {
    const a = frac * Math.PI * 2;
    for (let t = 0; t <= len; t += 0.4) c.set(Math.floor(cx + Math.sin(a) * t), Math.floor(cy - Math.cos(a) * t), color, true);
  };
  const [hh, mm] = time;
  hand(((hh % 12) + mm / 60) / 12, r * 0.5, C.shadow);
  hand(mm / 60, r * 0.8, C.shadow);
  c.set(Math.floor(cx), Math.floor(cy), C.red, true);
}

/** The Glowtown clocktower: pale stone, a slate spire, an open belfry and a big clock face. */
function clocktower({ mossy = false, roof = C.slate, roofLight = C.slateLight, time = [11, 52] } = {}) {
  const c = new Canvas(80, 144, 16);
  const pal = mossy ? OLD_STONE : STONE;
  // Body, then a wider clock storey, then a plinth.
  masonry(c, 16, 60, 48, 70, pal, mossy);
  masonry(c, 10, 34, 60, 34, pal, mossy);
  masonry(c, 8, 126, 64, 18, pal, mossy);
  // Ledges between storeys.
  for (const [y, x, w] of [[33, 8, 64], [67, 10, 60], [125, 6, 68]]) {
    c.rect(x, y, w, 2, pal.hi);
    c.rect(x, y + 2, w, 1, pal.dark);
  }
  // The clock.
  clockFace(c, 40, 50, 14, time, mossy ? C.goldDark : C.gold);
  // Tall windows and the door.
  arch(c, 26, 76, 8, 16);
  arch(c, 46, 76, 8, 16);
  arch(c, 36, 98, 8, 14);
  arch(c, 34, 128, 12, 16);
  c.rect(33, 143, 14, 1, pal.dark);
  // Belfry: posts and an open arch with the bell inside, on top of the clock storey.
  masonry(c, 14, 14, 52, 19, pal, mossy);
  for (let y = 17; y < 31; y++)
    for (let x = 22; x < 58; x++) {
      const top = y < 22 && Math.hypot(x + 0.5 - 40, (y + 0.5 - 22) * 2.4) > 18;
      if (!top) c.set(x, y, C.shadow);
    }
  // The bell.
  for (let y = 19; y < 30; y++) {
    const half = 2 + (y - 19) * 0.55;
    for (let x = Math.ceil(40 - half); x <= Math.floor(40 + half); x++) c.set(x, y, x < 39 ? C.brass : C.gold);
  }
  c.rect(37, 30, 7, 1, C.goldDark);
  c.set(40, 31, C.goldDark);
  // The spire on top of the belfry, shingled, lit on its left side, with eaves and a finial.
  for (let y = -12; y <= 12; y++) {
    const half = 1 + ((y + 12) / 24) * 29;
    for (let x = Math.ceil(40 - half); x < Math.floor(40 + half); x++) {
      const shingle = (y + (Math.floor(x / 3) % 2)) % 3 === 0;
      c.set(x, y, x < 40 ? (shingle ? roof : roofLight) : shingle ? C.slateDark : roof);
    }
  }
  c.rect(10, 12, 60, 2, C.woodDark);
  c.rect(10, 12, 60, 1, C.wood);
  c.rect(39, -16, 2, 4, C.gold);
  c.rect(37, -14, 6, 1, C.gold);
  // A dormer window on the spire.
  arch(c, 37, 0, 6, 8);
  c.outline();
  // Ivy for the old tower.
  if (mossy)
    for (let i = 0; i < 160; i++) {
      const x = 16 + Math.floor(noise(i, 0, 21) * 48);
      const y = 70 + Math.floor(noise(i, 1, 21) * 56);
      if (c.get(x, y)?.glow) continue;
      if (noise(x, y, 22) > 0.45) c.set(x, y, noise(i, 2, 21) > 0.5 ? C.moss : C.mossDark);
    }
  return c;
}

/** Builds the sheet. */
export function townSheet() {
  const png = new PNG({ width: TOWN_COLS * 16, height: ROWS * 16 });
  cobbles(GREY, 1).stampInto(png, 0, 0);
  cobbles(WARM, 2).stampInto(png, 64, 0);
  kerb(GREY).stampInto(png, 128, 0);
  kerb(WARM).stampInto(png, 176, 0);
  details().forEach((d, i) => d.stampInto(png, 128 + i * 16, 48));
  mosaic('star').stampInto(png, 0, 64);
  mosaic('sun').stampInto(png, 64, 64);
  fountain().stampInto(png, 128, 64);
  clocktower().stampInto(png, 0, 128);
  clocktower({ mossy: true, roof: C.mossDark, roofLight: C.moss, time: [11, 52] }).stampInto(png, 80, 128);
  return png;
}
