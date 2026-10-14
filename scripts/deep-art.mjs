// Brightwater Deep: the sunken town at the bottom of the sea, drawn here pixel by pixel in
// the village pack's palette (no pack has an undersea town). One sheet of 16px tiles, 16
// across, stacked into assets/art/world.png by art.mjs.
//
// Layout (keep in sync with DEEP in src/world/builder.ts):
//   rows 0–3, cols 0–3:    seabed, a seamless 4×4 patch of rippled sand (tile = x % 4, y % 4)
//   row 0, cols 4–15:      small things: shell, starfish, pebbles, pink coral, orange coral,
//                          barnacled rock, urchin, crab, glowing anemone, sea grass, bones, chest
//   rows 1–2, cols 4–15:   two-tall things: kelp ×3, jar lamp, anchor, coral tree (2 wide) ×2,
//                          sunken signpost, broken pillar, bubble vent
//   rows 3–6, cols 4–7:    an air-dome house (4×4); cols 8–11 a second, taller one
//   rows 3–7, cols 12–15:  the Heart Jar (4×5), cracked, glowing inside once fixed
//   rows 7–10, cols 0–5:   the wreck of the Marigold (6×4)
//   rows 4–6, cols 0–3:    a great clam (4×3)
//   rows 8–10, cols 6–9:   the drowned bell (4×3)
//
// Pixels that light up once fixed (jar glass, dome windows, portholes) get alpha 254.

import { PNG } from 'pngjs';

import { C, Canvas, noise } from './town-art.mjs';

export const DEEP_COLS = 16;
const ROWS = 11;

const D = {
  ...C,
  sand: 'd2b37d',
  sandLight: 'eecf9b',
  sandDark: 'c8966b',
  sandDeep: 'a3754e',
  pink: 'ef9597',
  pinkDark: 'e0394c',
  plum: 'a5608b',
  orange: 'ef914f',
  orangeDark: 'e66a3a',
  kelp: '74a334',
  kelpLight: 'adbc3a',
  kelpDark: '4a7f4b',
  kelpDeep: '345a52',
  rock: '9ba7aa',
  rockDark: '7b7b7b',
  rockDeep: '5f7160',
  glassEdge: '79b8ce',
  glassPale: 'e3f1f5',
  copper: 'd78b4a',
  copperDark: '965340',
  copperDeep: '5c2d25',
  bone: 'f2eaf1',
};

// ── Seabed ───────────────────────────────────────────────────────────────────

/** Rippled sand that wraps at its edges: wavy bands, a few pebbles and dark specks. */
function seabed() {
  const S = 64;
  const c = new Canvas(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      // Ripples: bands bent by a slow wave, both periodic in 64 so the patch tiles.
      const bend = Math.sin((x / S) * Math.PI * 4) * 2.2 + Math.sin((x / S) * Math.PI * 2 + 1) * 1.5;
      const band = (((y + bend) / 8) % 1 + 1) % 1;
      let col = D.sand;
      if (band < 0.14) col = D.sandLight;
      else if (band > 0.8) col = D.sandDark;
      const n = noise(x, y, 41);
      if (n > 0.985) col = D.sandDeep;
      else if (n < 0.01) col = D.sandLight;
      c.set(x, y, col);
    }
  // Pebbles.
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(noise(i, 1, 42) * 60) + 1;
    const y = Math.floor(noise(i, 2, 42) * 60) + 1;
    c.set(x, y, D.rock);
    c.set(x + 1, y, D.rockDark);
    c.set(x, y + 1, D.rockDeep);
  }
  return c;
}

// ── Small things ─────────────────────────────────────────────────────────────

function tile(draw) {
  const c = new Canvas(16, 16);
  draw(c);
  return c;
}

const smalls = [
  // Shell: a fan with ridges.
  tile((c) => {
    for (let y = 6; y < 13; y++)
      for (let x = 3; x < 13; x++) {
        const dx = x + 0.5 - 8;
        const dy = y + 0.5 - 12;
        if (Math.hypot(dx, dy * 1.2) > 6 || dy > 0) continue;
        c.set(x, y, Math.floor(Math.atan2(dy, dx) * 3) % 2 ? D.pink : D.bone);
      }
    c.rect(7, 12, 2, 1, D.pinkDark);
    c.outline(D.plum);
  }),
  // Starfish.
  tile((c) => {
    for (let y = 2; y < 14; y++)
      for (let x = 2; x < 14; x++) {
        const dx = x + 0.5 - 8;
        const dy = y + 0.5 - 8;
        const a = Math.atan2(dy, dx) + Math.PI / 2;
        const arm = Math.abs(Math.cos((a * 5) / 2));
        if (Math.hypot(dx, dy) < 1.6 + arm * 4.6) c.set(x, y, (x + y) % 3 ? D.orange : D.orangeDark);
      }
    c.outline(D.copperDeep);
  }),
  // Pebbles (flat, to walk over).
  tile((c) => {
    for (const [x, y, w] of [[3, 4, 2], [9, 3, 3], [6, 9, 2], [11, 10, 2], [2, 12, 1]]) {
      c.rect(x, y, w, 2, D.rock);
      c.rect(x, y + 1, w, 1, D.rockDark);
    }
  }),
  // Pink coral.
  tile((c) => {
    const branch = (x, y, len, dir) => {
      for (let i = 0; i < len; i++) c.set(x + Math.round(dir * i * 0.5), y - i, i === len - 1 ? D.pink : D.pinkDark);
    };
    branch(8, 14, 10, 0);
    branch(7, 12, 7, -1);
    branch(9, 11, 7, 1);
    branch(6, 9, 4, -1);
    branch(10, 8, 4, 1);
    for (const [x, y] of [[8, 4], [4, 6], [12, 5], [3, 8], [13, 7]]) c.set(x, y, D.pink);
    c.outline(D.plum);
  }),
  // Orange brain coral.
  tile((c) => {
    for (let y = 4; y < 14; y++)
      for (let x = 2; x < 14; x++) {
        const d = Math.hypot(x + 0.5 - 8, (y + 0.5 - 10) * 1.3);
        if (d > 6) continue;
        c.set(x, y, Math.sin((x + y) * 1.3) > 0.2 ? D.orange : y < 9 ? D.sandLight : D.orangeDark);
      }
    c.outline(D.copperDeep);
  }),
  // A rock crusted with barnacles.
  tile((c) => {
    for (let y = 4; y < 14; y++)
      for (let x = 2; x < 14; x++) {
        const d = Math.hypot(x + 0.5 - 8, (y + 0.5 - 9.5) * 1.15);
        if (d > 5.8) continue;
        c.set(x, y, y < 8 ? D.rock : y < 11 ? D.rockDark : D.rockDeep);
      }
    for (const [x, y] of [[5, 7], [9, 6], [11, 9], [6, 10]]) {
      c.set(x, y, D.bone);
      c.set(x + 1, y, D.rockDeep);
    }
    c.outline();
  }),
  // Urchin.
  tile((c) => {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      for (let r = 0; r < 6; r++) c.set(Math.round(8 + Math.cos(ang) * r), Math.round(9 + Math.sin(ang) * r * 0.85), r < 3 ? D.plum : '3b3643');
    }
    c.set(7, 7, D.pink);
    c.outline();
  }),
  // Crab.
  tile((c) => {
    c.rect(5, 8, 6, 4, D.pinkDark);
    c.rect(5, 8, 6, 1, D.pink);
    for (const x of [3, 12]) {
      c.rect(x, 6, 2, 2, D.pinkDark);
      c.set(x, 6, D.pink);
    }
    c.set(4, 8, D.pinkDark);
    c.set(11, 8, D.pinkDark);
    for (const x of [4, 6, 9, 11]) c.set(x, 12, D.plum);
    c.set(6, 7, D.ink);
    c.set(9, 7, D.ink);
    c.outline();
  }),
  // A glowing anemone (lights up with its group).
  tile((c) => {
    for (let i = 0; i < 9; i++) {
      const x = 3 + i * 1.2;
      const h = 4 + Math.round(noise(i, 3, 43) * 3);
      for (let y = 0; y < h; y++) c.set(Math.round(x + Math.sin(y * 0.8 + i) * 0.6), 12 - y, D.glassEdge, y > h - 2);
    }
    c.rect(4, 12, 9, 2, D.plum);
    c.outline(D.kelpDeep);
  }),
  // Sea grass (flat-ish tufts).
  tile((c) => {
    for (const [x0, h] of [[3, 7], [5, 9], [7, 6], [10, 8], [12, 5]])
      for (let y = 0; y < h; y++) c.set(x0 + Math.round(Math.sin(y * 0.6) * 0.8), 14 - y, y > h - 3 ? D.kelpLight : D.kelp);
  }),
  // Old bones of a big fish (spooky, but just bones).
  tile((c) => {
    c.rect(2, 8, 12, 1, D.bone);
    for (let x = 4; x < 12; x += 2) {
      c.set(x, 6, D.bone);
      c.set(x, 7, D.bone);
      c.set(x, 9, D.bone);
      c.set(x, 10, D.bone);
    }
    c.rect(12, 6, 3, 5, D.bone);
    c.set(13, 7, D.ink);
    c.outline(D.rockDark);
  }),
  // A small treasure chest, its lock glinting.
  tile((c) => {
    c.rect(3, 6, 10, 7, D.copperDark);
    c.rect(3, 6, 10, 2, D.copper);
    c.rect(3, 9, 10, 1, D.copperDeep);
    c.rect(7, 8, 2, 3, D.gold, true);
    c.outline();
  }),
];

// ── Two-tall things ──────────────────────────────────────────────────────────

function tall(draw, w = 1) {
  const c = new Canvas(16 * w, 32);
  draw(c);
  return c;
}

/** Kelp: a stalk that sways, with leaves off both sides. */
function kelp(seed, tone) {
  return tall((c) => {
    const leaf = tone === 'gold' ? D.kelpLight : D.kelp;
    const stalk = tone === 'dark' ? D.kelpDeep : D.kelpDark;
    for (let y = 31; y >= 2; y--) {
      const x = Math.round(8 + Math.sin(y * 0.22 + seed) * 2.4);
      c.set(x, y, stalk);
      c.set(x + 1, y, stalk);
      if (y % 5 === seed % 5 && y < 28) {
        const side = (Math.floor(y / 5) + seed) % 2 ? 1 : -1;
        for (let k = 1; k < 5; k++) c.set(x + side * k + (side > 0 ? 1 : 0), y - Math.floor(k / 2), k > 2 ? leaf : D.kelp);
      }
    }
    c.rect(7, 1, 3, 2, leaf);
    c.outline(D.kelpDeep);
  });
}

/** A jar lamp on a post: a glass jar with a copper lid, its light (and glass) glowing once lit. */
function jarLamp() {
  return tall((c) => {
    // The post.
    c.rect(7, 18, 2, 14, D.copperDark);
    c.rect(7, 18, 1, 14, D.copper);
    c.rect(5, 30, 6, 2, D.rockDark);
    // The jar.
    for (let y = 4; y < 18; y++)
      for (let x = 3; x < 13; x++) {
        const edge = x === 3 || x === 12 || y === 17;
        const shoulder = y === 4 && (x < 5 || x > 10);
        if (shoulder) continue;
        c.set(x, y, edge ? D.glassEdge : y < 8 ? D.glassPale : D.glass, !edge);
      }
    // A spark of lightning inside.
    for (const [x, y] of [[8, 7], [7, 8], [8, 9], [7, 10], [8, 11], [9, 12], [8, 13]]) c.set(x, y, D.white, true);
    // Lid and handle.
    c.rect(4, 2, 8, 2, D.copper);
    c.rect(4, 3, 8, 1, D.copperDark);
    c.rect(7, 0, 2, 2, D.copperDark);
    c.outline();
  });
}

function anchor() {
  return tall((c) => {
    c.rect(7, 4, 2, 22, D.rockDark);
    c.rect(7, 4, 1, 22, D.rock);
    c.rect(4, 8, 8, 2, D.rockDark);
    for (let x = 2; x < 14; x++) {
      const y = 26 - Math.round(Math.sqrt(Math.max(0, 36 - (x + 0.5 - 8) ** 2)) * 0.7);
      c.set(x, y, D.rockDark);
      c.set(x, y + 1, D.rockDeep);
    }
    c.rect(1, 21, 2, 3, D.rockDark);
    c.rect(13, 21, 2, 3, D.rockDark);
    // The ring at the top.
    for (let a = 0; a < 12; a++) c.set(Math.round(8 + Math.cos(a / 2) * 2.2), Math.round(2.5 + Math.sin(a / 2) * 2), D.rockDark);
    // Rust and weed.
    for (const [x, y] of [[7, 14], [8, 19], [5, 24], [11, 23]]) c.set(x, y, D.copperDark);
    for (const [x, y] of [[8, 9], [4, 9], [9, 10]]) c.set(x, y, D.kelp);
    c.outline();
  });
}

function coralTree(main, dark, tip) {
  return tall((c) => {
    const grow = (x, y, ang, len, depth) => {
      for (let i = 0; i < len; i++) {
        const px = Math.round(x + Math.sin(ang) * i);
        const py = Math.round(y - Math.cos(ang) * i);
        c.set(px, py, i % 3 === 0 ? dark : main);
        c.set(px + 1, py, main);
      }
      const ex = x + Math.sin(ang) * len;
      const ey = y - Math.cos(ang) * len;
      if (depth > 0) {
        grow(ex, ey, ang - 0.5, len * 0.7, depth - 1);
        grow(ex, ey, ang + 0.55, len * 0.65, depth - 1);
      } else {
        c.set(Math.round(ex), Math.round(ey), tip);
        c.set(Math.round(ex) + 1, Math.round(ey), tip);
      }
    };
    grow(15, 31, 0, 9, 3);
    c.outline(D.ink);
  }, 2);
}

function signpost() {
  return tall((c) => {
    c.rect(7, 10, 2, 22, D.copperDark);
    c.rect(7, 10, 1, 22, D.copper);
    c.rect(2, 6, 12, 6, '965340');
    c.rect(2, 6, 12, 1, D.copper);
    for (const x of [4, 6, 9, 11]) c.set(x, 9, D.copperDeep);
    c.rect(3, 12, 3, 2, D.kelp);
    c.set(11, 6, D.kelpLight);
    c.outline();
  });
}

function pillar() {
  return tall((c) => {
    for (let y = 8; y < 31; y++)
      for (let x = 4; x < 12; x++) c.set(x, y, x < 6 ? D.greyHi : x > 9 ? D.greyMid : (y % 6 === 0 ? D.greyMid : D.grey));
    // Broken top.
    for (let x = 4; x < 12; x++) for (let y = 8; y < 8 + Math.round(noise(x, 0, 44) * 4); y++) c.set(x, y, null);
    c.rect(3, 29, 10, 3, D.greyMid);
    for (let i = 0; i < 14; i++) {
      const x = 4 + Math.floor(noise(i, 1, 45) * 8);
      const y = 14 + Math.floor(noise(i, 2, 45) * 16);
      c.set(x, y, noise(i, 3, 45) > 0.5 ? D.kelp : D.kelpDark);
    }
    // Clean up the nulls the broken top left as "set" pixels.
    c.px = c.px.map((p) => (p && p.color === null ? null : p));
    c.outline();
  });
}

function vent() {
  return tall((c) => {
    for (let y = 22; y < 32; y++) {
      const half = 2 + (y - 22) * 0.45;
      for (let x = Math.ceil(8 - half); x <= Math.floor(8 + half); x++) c.set(x, y, x < 7 ? D.rock : D.rockDark);
    }
    c.rect(7, 21, 3, 2, D.rockDeep);
    // Bubbles rising out of it.
    for (const [x, y, r] of [[8, 16, 2], [6, 10, 1], [9, 5, 1.5], [7, 1, 1]])
      for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++) {
          const d = Math.hypot(i, j);
          if (d <= r && d > r - 0.9) c.set(x + i, y + j, D.glassPale);
        }
    c.outline(D.rockDeep);
  });
}

// ── Buildings ────────────────────────────────────────────────────────────────

/**
 * An air-dome house: a glass bubble over a little round stone house, its windows glowing
 * warm once lit, held down by a copper ring. `tallHouse` gives it a chimney and two floors.
 */
function domeHouse(tallHouse) {
  const c = new Canvas(64, 64);
  const cx = 32;
  const cy = 34;
  // The house inside, drawn first.
  const top = tallHouse ? 22 : 30;
  for (let y = top; y < 56; y++)
    for (let x = 18; x < 46; x++) c.set(x, y, (y - top) % 5 === 4 || (x + Math.floor((y - top) / 5) * 4) % 9 === 0 ? D.greyMid : D.grey);
  // A roof.
  for (let y = top - 7; y < top; y++) {
    const half = 15 - (top - 1 - y) * 2;
    for (let x = cx - half; x < cx + half; x++) c.set(x, y, (x + y) % 3 ? D.copperDark : D.copper);
  }
  if (tallHouse) {
    c.rect(38, top - 12, 4, 7, D.greyMid);
    c.rect(38, top - 12, 4, 1, D.greyHi);
  }
  // Windows and a door: glowing once lit.
  const window = (x, y) => {
    c.rect(x, y, 6, 6, D.glass, true);
    c.rect(x + 2, y, 1, 6, D.glassDark, true);
    c.rect(x, y + 2, 6, 1, D.glassDark, true);
  };
  window(21, top + 6);
  window(37, top + 6);
  if (tallHouse) {
    window(21, top + 18);
    window(37, top + 18);
  }
  c.rect(29, 46, 7, 10, D.glass, true);
  c.rect(29, 46, 7, 1, D.glassDark, true);
  c.rect(32, 46, 1, 10, D.glassDark, true);
  // The glass dome over it all: only its rim and a few shines are drawn, so the house shows.
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const d = Math.hypot((x + 0.5 - cx) / 30, (y + 0.5 - cy) / 32);
      if (y > 56) continue;
      if (d <= 1 && d > 0.95) c.set(x, y, D.glassEdge);
      if (d <= 0.92 && d > 0.84 && x < cx - 8 && y < cy - 4) c.set(x, y, D.glassPale);
    }
  // The copper ring at the base, and bolts.
  c.rect(2, 56, 60, 5, D.copper);
  c.rect(2, 56, 60, 1, D.gold);
  c.rect(2, 60, 60, 1, D.copperDeep);
  for (let x = 6; x < 60; x += 8) c.set(x, 58, D.copperDeep);
  c.outline();
  // Weed growing up the ring.
  for (const x of [5, 6, 20, 47, 58]) for (let y = 52; y < 57; y++) if (noise(x, y, 46) > 0.35) c.set(x, y, D.kelp);
  return c;
}

/**
 * The Heart Jar (64×80): a huge glass jar in a copper cage, a jagged crack down its side,
 * and inside a coil of lightning that glows once it's full again.
 */
function heartJar() {
  const c = new Canvas(64, 80);
  // Glass body.
  for (let y = 14; y < 72; y++)
    for (let x = 6; x < 58; x++) {
      const shoulder = y < 22 ? Math.hypot((x + 0.5 - 32) / 26, (y - 22) / 8) > 1 : false;
      if (shoulder) continue;
      const edge = x === 6 || x === 57 || y === 71;
      c.set(x, y, edge ? D.glassEdge : x < 14 ? D.glassPale : D.glass, !edge);
    }
  // The neck and a great copper lid with terminals.
  c.rect(20, 8, 24, 7, D.glassEdge);
  c.rect(16, 4, 32, 5, D.copper);
  c.rect(16, 4, 32, 1, D.gold);
  c.rect(16, 8, 32, 1, D.copperDeep);
  c.rect(22, 0, 4, 4, D.copperDark);
  c.rect(38, 0, 4, 4, D.copperDark);
  c.rect(22, 0, 4, 1, D.gold);
  c.rect(38, 0, 4, 1, D.gold);
  // A bolt of lightning caught inside: zig-zags, gold with a white-hot core.
  const zig = [[30, 20], [24, 32], [36, 36], [26, 50], [38, 54], [30, 66]];
  for (let k = 0; k < zig.length - 1; k++) {
    const [ax, ay] = zig[k];
    const [bx, by] = zig[k + 1];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(ax + ((bx - ax) * s) / steps);
      const y = Math.round(ay + ((by - ay) * s) / steps);
      for (let i = -2; i <= 2; i++) c.set(x + i, y, Math.abs(i) < 1 ? D.white : D.brass, true);
    }
  }
  // The copper cage: straps round and down.
  for (const y of [24, 46, 66]) {
    c.rect(5, y, 54, 2, D.copper);
    c.rect(5, y + 1, 54, 1, D.copperDark);
  }
  for (const x of [12, 51]) {
    c.rect(x, 14, 2, 58, D.copper);
    c.rect(x + 1, 14, 1, 58, D.copperDark);
  }
  // The crack: a jagged dark line from the top right down the side.
  let x = 46;
  for (let y = 16; y < 60; y++) {
    x += Math.round((noise(y, 0, 47) - 0.5) * 3);
    x = Math.max(40, Math.min(54, x));
    c.set(x, y, D.shadow);
    if (y % 6 === 0) c.set(x + 1, y + 1, D.shadow);
  }
  // A stone plinth.
  c.rect(2, 72, 60, 8, D.grey);
  c.rect(2, 72, 60, 2, D.greyHi);
  c.rect(2, 78, 60, 2, D.greyMid);
  c.outline();
  return c;
}

/**
 * The wreck of the Marigold (96×64): a little steamboat seen from the side, settled in the
 * sand with a list to the left. A pointed bow on the right, a cabin with glowing windows, a
 * funnel and a broken mast. Portholes glow once lit.
 */
function wreck() {
  const c = new Canvas(96, 64);
  const list = (x) => Math.round((x - 48) * -0.08); // she leans: the stern sits lower
  // Hull: deck line on top, the bottom curving up to a sharp bow at the right.
  for (let x = 6; x < 92; x++) {
    const t = (x - 6) / 86;
    const deck = 34 + list(x) - (t > 0.8 ? Math.round((t - 0.8) * 25) : 0);
    const bottom = 58 + list(x) - Math.round(t > 0.6 ? ((t - 0.6) / 0.4) ** 2 * 22 : 0) - Math.round(t < 0.08 ? (0.08 - t) * 60 : 0);
    for (let y = deck; y <= bottom; y++) {
      const fromTop = y - deck;
      let col = fromTop < 2 ? D.copper : Math.floor(fromTop / 4) % 2 ? '965340' : D.copperDark;
      if (fromTop >= 5 && fromTop <= 7) col = D.bone; // a painted stripe
      if (y > bottom - 3) col = D.copperDeep;
      c.set(x, y, col);
    }
  }
  // A gash in the hull below the stripe.
  for (let y = 46; y < 56; y++) for (let x = 56 - Math.abs(y - 51); x < 62 + Math.abs(y - 51); x++) if (c.get(x, y)) c.set(x, y, D.shadow);
  // Portholes along the hull.
  for (const px of [16, 28, 40, 72])
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) {
        const d = Math.hypot(i, j);
        if (d <= 2.3) c.set(px + i, 46 + list(px) + j, d > 1.5 ? D.gold : D.glass, d <= 1.5);
      }
  // The cabin on deck, with two windows.
  for (let x = 22; x < 50; x++) for (let y = 22 + list(x); y < 34 + list(x); y++) c.set(x, y, y === 22 + list(x) ? D.bone : D.greyHi);
  for (const wx of [26, 38])
    for (let x = wx; x < wx + 7; x++) for (let y = 25 + list(x); y < 30 + list(x); y++) c.set(x, y, D.glass, true);
  // The funnel, red with a black top.
  for (let x = 30; x < 36; x++) for (let y = 8 + list(x); y < 22 + list(x); y++) c.set(x, y, y < 11 + list(x) ? D.shadow : D.red);
  // The broken mast at the bow, with a torn flag.
  for (let i = 0; i < 24; i++) {
    c.set(66 + Math.round(i * 0.3), 31 - i, D.copperDark);
    c.set(67 + Math.round(i * 0.3), 31 - i, D.copper);
  }
  c.rect(69, 7, 9, 5, D.bone);
  c.rect(69, 11, 5, 2, D.bone);
  // Her name, in faded gold letters near the bow (just marks).
  for (let x = 74; x < 86; x += 2) c.set(x, 40 + list(x), D.gold);
  // Weed and barnacles.
  for (let i = 0; i < 40; i++) {
    const x = 6 + Math.floor(noise(i, 1, 48) * 84);
    const y = 40 + Math.floor(noise(i, 2, 48) * 16);
    const p = c.get(x, y);
    if (p && !p.glow) c.set(x, y, noise(i, 3, 48) > 0.5 ? D.kelp : D.bone);
  }
  c.outline();
  return c;
}

/** A great clam (64×48), half open, with a pearl that glows once lit. */
function clam() {
  const c = new Canvas(64, 48);
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 64; x++) {
      const dx = (x + 0.5 - 32) / 30;
      const lower = Math.hypot(dx, (y + 0.5 - 30) / 16);
      const upper = Math.hypot(dx, (y + 0.5 - 22) / 20);
      if (lower <= 1 && y >= 30) c.set(x, y, Math.floor((Math.atan2(y - 30, x - 32) * 8) / Math.PI) % 2 ? D.plum : D.pink);
      else if (upper <= 1 && y < 22) c.set(x, y, Math.floor((Math.atan2(y - 22, x - 32) * 8) / Math.PI) % 2 ? D.plum : D.pink);
      else if (Math.abs(dx) < 0.9 && y >= 22 && y < 30) c.set(x, y, '3b3643');
    }
  // The pearl.
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (Math.hypot(i, j) <= 4) c.set(32 + i, 26 + j, i + j < -2 ? D.white : D.glassPale, true);
  c.outline();
  return c;
}

/** The drowned bell (64×48): a big bronze bell on its side in the sand, weed on its lip. */
function bell() {
  const c = new Canvas(64, 48);
  // A bell's profile on its side: a round crown on the left, a waist, then the flare out to
  // a thick lip on the right.
  const half = (t) => (t < 0.15 ? 9 * Math.sqrt(1 - ((0.15 - t) / 0.15) ** 2) : 9 + 3 * (t - 0.15) + (t > 0.6 ? ((t - 0.6) / 0.4) ** 2 * 10 : 0));
  for (let x = 4; x < 58; x++) {
    const h = half((x - 4) / 54);
    for (let y = Math.ceil(24 - h); y <= Math.floor(24 + h); y++) {
      const shade = (y - (24 - h)) / (2 * h);
      c.set(x, y, shade < 0.25 ? D.gold : shade > 0.75 ? D.copperDark : D.brass);
    }
  }
  // The lip, and the dark mouth seen just inside it.
  for (let y = 2; y < 47; y++) {
    const d = Math.abs(y - 24.5) / 22.5;
    if (d > 1) continue;
    c.set(57, y, D.copperDark);
    c.set(58, y, D.gold);
    if (d < 0.85) c.set(59, y, D.shadow);
  }
  // The hanging loop on its crown (it lies on its side, so the loop points left).
  for (let a = 0; a < 24; a++) {
    const x = Math.round(3 + Math.cos((a / 24) * Math.PI * 2) * 3);
    const y = Math.round(24 + Math.sin((a / 24) * Math.PI * 2) * 4);
    if (x <= 4) c.set(x, y, D.copperDark);
  }
  // The clapper hanging out of the mouth.
  c.rect(58, 30, 5, 5, D.copperDeep);
  c.rect(58, 30, 5, 1, D.copperDark);
  // Words round its lip (marks): "Cast from the light under the sea".
  for (let y = 9; y < 40; y += 3) c.set(53, y, D.copperDeep);
  for (let i = 0; i < 20; i++) {
    const x = 10 + Math.floor(noise(i, 1, 49) * 44);
    const y = 30 + Math.floor(noise(i, 2, 49) * 12);
    if (c.get(x, y)) c.set(x, y, noise(i, 3, 49) > 0.5 ? D.kelp : D.kelpDark);
  }
  c.outline();
  return c;
}

/**
 * Little sprites for the people sheet's extras row: a pair of eyes in the dark (glowing,
 * so the shader lights them up) and a bubble. 16×16 PNGs, by name.
 */
export function deepExtras() {
  const eyes = new Canvas(16, 16);
  for (const x of [3, 10]) {
    eyes.rect(x, 7, 3, 2, D.gold, true);
    eyes.set(x + 1, 7, D.white, true);
    eyes.set(x + 2, 8, D.brass, true);
  }
  const bubble = new Canvas(16, 16);
  for (let j = 0; j < 16; j++)
    for (let i = 0; i < 16; i++) {
      const d = Math.hypot(i + 0.5 - 8, j + 0.5 - 8);
      if (d <= 4 && d > 3) bubble.set(i, j, D.glassPale);
    }
  bubble.set(6, 6, D.white);
  bubble.set(7, 5, D.white);
  const png = (c) => {
    const p = new PNG({ width: 16, height: 16 });
    c.stampInto(p, 0, 0);
    return p;
  };
  return { eyes: png(eyes), bubble: png(bubble) };
}

/** Builds the sheet. */
export function deepSheet() {
  const png = new PNG({ width: DEEP_COLS * 16, height: ROWS * 16 });
  seabed().stampInto(png, 0, 0);
  smalls.forEach((s, i) => s.stampInto(png, (4 + i) * 16, 0));
  const talls = [kelp(1, 'green'), kelp(3, 'gold'), kelp(6, 'dark'), jarLamp(), anchor(), coralTree(D.pink, D.pinkDark, D.white), coralTree(D.orange, D.orangeDark, D.sandLight), signpost(), pillar(), vent()];
  let col = 4;
  for (const t of talls) {
    t.stampInto(png, col * 16, 16);
    col += t.w / 16;
  }
  domeHouse(false).stampInto(png, 4 * 16, 3 * 16);
  domeHouse(true).stampInto(png, 8 * 16, 3 * 16);
  heartJar().stampInto(png, 12 * 16, 3 * 16);
  clam().stampInto(png, 0, 4 * 16);
  wreck().stampInto(png, 0, 7 * 16);
  bell().stampInto(png, 6 * 16, 8 * 16);
  return png;
}
