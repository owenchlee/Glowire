// Pixel art for the puzzle board, drawn here pixel by pixel in the village pack's palette
// (no art pack has electronics). 16×16 sprites, one sheet: assets/art/circuit.png.
//
// Layout (keep in sync with src/puzzle-view/sprites.ts):
//   row 0: wires, column = arm mask (N=1, E=2, S=4, W=8)
//   row 1: battery, LED red/green/blue/burned, resistors 100/220/470/1000 Ω,
//          switch open/closed, rivets, spark, hover frame, bench A, bench B
//   row 2: bushes (from the village pack), then the diode at column 4
//
// Pixels that light up (copper cores, LED domes, sparks) get alpha 254; the shader makes
// them glow when current flows.

import { PNG } from 'pngjs';

const C = {
  ink: '141b1b',
  shadow: '2e2b30',
  copperOut: '5c2d25',
  copperDark: '965340',
  copper: 'd78b4a',
  copperLight: 'f1c471',
  solder: 'b6beb0',
  solderDark: '8d977f',
  solderLight: 'ffffff',
  cream: 'f2eaf1',
  gold: 'ffe166',
  goldDark: 'd2b37d',
  battery: '2d697b',
  batteryLight: '3da6bd',
  batteryShine: '79b8ce',
  rim: 'b6beb0',
  rimDark: '56544d',
  burned: '46402e',
  burnedDark: '242118',
  resistor: 'eecf9b',
  resistorLight: 'fce2ca',
  resistorOut: '7b4930',
  grey: '8d977f',
  greyLight: 'd2c9c9',
  red: 'd14b34',
  green: '74a334',
  spark: 'ffe18d',
  wood: 'c69469',
  woodAlt: 'bd8c6b',
  woodGrain: 'a3754e',
  woodLight: 'd2b37d',
  woodEdge: '7b4930',
};

const LED = {
  red: { body: 'e0394c', light: 'ef9597', dark: '8f3e56' },
  green: { body: '74a334', light: 'adbc3a', dark: '4a7f4b' },
  blue: { body: '3da6bd', light: '71ddee', dark: '2d697b' },
};

/** Resistor colour code, mapped onto the palette. */
const BANDS = ['242118', '7b4930', 'd14b34', 'e67c44', 'ffe166', '74a334', '3da6bd', 'a5608b', '8d977f', 'f2eaf1'];

function bandDigits(ohms) {
  const exponent = Math.max(0, Math.floor(Math.log10(ohms)) - 1);
  const digits = Math.round(ohms / 10 ** exponent);
  return [Math.floor(digits / 10) % 10, digits % 10, Math.min(9, exponent)];
}

class Sprite {
  constructor() {
    this.px = new Array(256).fill(null);
  }
  set(x, y, color, glow = false) {
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    this.px[y * 16 + x] = { color, glow };
  }
  rect(x, y, w, h, color, glow = false) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color, glow);
  }
  get(x, y) {
    return this.px[y * 16 + x];
  }
  /** A 1px ink outline around everything drawn so far. */
  outline(color = C.ink) {
    const add = [];
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (this.get(x, y)) continue;
        const n = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(([a, b]) => a >= 0 && b >= 0 && a < 16 && b < 16 && this.get(a, b));
        if (n) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, color);
  }
}

/** Copper leads from the edges in to the part, on the middle two rows. */
function leads(s, left, right) {
  for (const [from, to] of [
    [0, left],
    [right, 15],
  ])
    for (let x = from; x <= to; x++) {
      s.set(x, 7, C.copperLight, true);
      s.set(x, 8, C.copper, true);
    }
}

function wire(mask) {
  const s = new Sprite();
  const N = mask & 1;
  const E = mask & 2;
  const S = mask & 4;
  const W = mask & 8;
  // Copper core, two pixels wide, light on top/left.
  if (N) for (let y = 0; y <= 8; y++) (s.set(7, y, C.copperLight, true), s.set(8, y, C.copper, true));
  if (S) for (let y = 7; y <= 15; y++) (s.set(7, y, C.copperLight, true), s.set(8, y, C.copper, true));
  if (E) for (let x = 7; x <= 15; x++) (s.set(x, 7, C.copperLight, true), s.set(x, 8, C.copper, true));
  if (W) for (let x = 0; x <= 8; x++) (s.set(x, 7, C.copperLight, true), s.set(x, 8, C.copper, true));
  const arms = [N, E, S, W].filter(Boolean).length;
  if (arms === 0 || arms >= 3) {
    // A solder blob where wires join (or a lone dot).
    s.rect(6, 6, 4, 4, C.solder);
    s.set(6, 6, C.solderLight);
    s.set(9, 9, C.solderDark);
    s.set(9, 6, C.solderDark);
  }
  s.outline(C.copperOut);
  return s;
}

function battery() {
  const s = new Sprite();
  leads(s, 1, 14);
  s.rect(2, 4, 12, 8, C.battery);
  s.rect(2, 5, 12, 1, C.batteryLight);
  s.rect(3, 5, 4, 1, C.batteryShine);
  s.rect(2, 10, 12, 1, C.shadow);
  // Gold cap on the + end (west).
  s.rect(2, 4, 3, 8, C.gold);
  s.rect(2, 10, 3, 1, C.goldDark);
  // + and −
  s.rect(6, 7, 3, 1, C.cream);
  s.rect(7, 6, 1, 3, C.cream);
  s.rect(10, 7, 3, 1, C.cream);
  s.outline();
  return s;
}

function led(color) {
  const s = new Sprite();
  leads(s, 3, 12);
  const burned = color === 'burned';
  const p = burned ? { body: C.burned, light: C.rimDark, dark: C.burnedDark } : LED[color];
  // Metal rim, then the dome.
  for (let y = 2; y <= 13; y++)
    for (let x = 2; x <= 13; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d <= 5.6) s.set(x, y, d > 4.6 ? (y > 8 ? C.rimDark : C.rim) : p.body, !burned && d <= 4.6);
    }
  for (let y = 4; y <= 11; y++)
    for (let x = 4; x <= 11; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d <= 4.6 && x + y > 17) s.set(x, y, p.dark, !burned);
    }
  s.rect(5, 5, 2, 1, p.light, !burned);
  s.set(5, 6, p.light, !burned);
  if (burned) {
    s.set(6, 6, C.burnedDark);
    s.set(7, 7, C.burnedDark);
    s.set(8, 7, C.burnedDark);
    s.set(9, 8, C.burnedDark);
    s.set(8, 9, C.burnedDark);
  } else {
    s.set(5, 5, C.solderLight, true);
  }
  s.outline();
  return s;
}

function resistor(ohms) {
  const s = new Sprite();
  leads(s, 2, 13);
  s.rect(3, 5, 10, 6, C.resistor);
  s.rect(4, 4, 8, 8, C.resistor);
  s.rect(4, 5, 8, 1, C.resistorLight);
  s.rect(4, 10, 8, 1, C.goldDark);
  bandDigits(ohms).forEach((d, i) => s.rect(5 + i * 2, 4, 1, 8, BANDS[d]));
  s.rect(11, 4, 1, 8, C.goldDark);
  s.outline(C.resistorOut);
  return s;
}

/** A diode: a little black body, silver stripe at the cathode (− end, on the right). */
function diode() {
  const s = new Sprite();
  leads(s, 3, 12);
  s.rect(4, 5, 8, 6, C.burnedDark);
  s.rect(4, 5, 8, 1, C.rimDark);
  s.rect(9, 5, 2, 6, C.greyLight);
  s.rect(9, 10, 2, 1, C.grey);
  // A small arrow on the body, pointing the way current may go.
  s.set(5, 7, C.grey);
  s.set(6, 7, C.grey);
  s.set(7, 7, C.greyLight);
  s.set(6, 6, C.grey);
  s.set(6, 8, C.grey);
  s.outline();
  return s;
}

function toggle(closed) {
  const s = new Sprite();
  leads(s, 3, 12);
  s.rect(3, 6, 3, 4, C.grey);
  s.rect(10, 6, 3, 4, C.grey);
  s.rect(3, 6, 3, 1, C.greyLight);
  s.rect(10, 6, 3, 1, C.greyLight);
  if (closed) {
    s.rect(5, 7, 7, 1, C.solder);
    s.rect(5, 8, 7, 1, C.solderDark);
    s.rect(10, 6, 2, 4, C.green);
  } else {
    for (let i = 0; i <= 6; i++) {
      s.set(5 + i, 7 - i, C.solder);
      s.set(5 + i, 8 - i, C.solderDark);
    }
    s.rect(11, 1, 2, 2, C.red);
  }
  s.outline();
  return s;
}

function rivets() {
  const s = new Sprite();
  for (const [x, y] of [
    [1, 1],
    [13, 1],
    [1, 13],
    [13, 13],
  ]) {
    s.rect(x, y, 2, 2, C.grey);
    s.set(x, y, C.greyLight);
  }
  return s;
}

function spark() {
  const s = new Sprite();
  s.rect(6, 6, 4, 4, C.spark, true);
  s.rect(7, 7, 2, 2, C.solderLight, true);
  return s;
}

function hoverFrame() {
  const s = new Sprite();
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 3) continue;
    s.set(i, 0, C.gold, true);
    s.set(i, 15, C.gold, true);
    s.set(0, i, C.gold, true);
    s.set(15, i, C.gold, true);
  }
  return s;
}

/** A square of workbench: planks, a little grain, and a darker seam on two sides. */
function bench(alt) {
  const s = new Sprite();
  s.rect(0, 0, 16, 16, alt ? C.woodAlt : C.wood);
  s.rect(0, 5, 16, 1, C.woodGrain);
  s.rect(0, 10, 16, 1, C.woodGrain);
  s.rect(0, 0, 16, 1, C.woodLight);
  for (const [x, y] of alt
    ? [
        [3, 2],
        [11, 7],
        [6, 13],
      ]
    : [
        [9, 2],
        [4, 8],
        [12, 12],
      ])
    s.rect(x, y, 2, 1, C.woodGrain);
  s.rect(15, 0, 1, 16, C.woodEdge);
  s.rect(0, 15, 16, 1, C.woodEdge);
  return s;
}

const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

function stamp(png, sprite, col, row) {
  sprite.px.forEach((p, i) => {
    if (!p) return;
    const x = col * 16 + (i % 16);
    const y = row * 16 + Math.floor(i / 16);
    const o = (y * png.width + x) * 4;
    png.data.set(hex(p.color), o);
    png.data[o + 3] = p.glow ? 254 : 255;
  });
}

/** Builds the sheet. `bushes` are 16×16 PNG tiles cut from the village pack. */
export function circuitSheet(bushes) {
  const png = new PNG({ width: 256, height: 48 });
  for (let mask = 0; mask < 16; mask++) stamp(png, wire(mask), mask, 0);
  const row1 = [
    battery(),
    led('red'),
    led('green'),
    led('blue'),
    led('burned'),
    resistor(100),
    resistor(220),
    resistor(470),
    resistor(1000),
    toggle(false),
    toggle(true),
    rivets(),
    spark(),
    hoverFrame(),
    bench(false),
    bench(true),
  ];
  row1.forEach((s, i) => stamp(png, s, i, 1));
  stamp(png, diode(), 4, 2);
  bushes.forEach((tile, i) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const si = (y * 16 + x) * 4;
        if (tile.data[si + 3] < 128) continue;
        const o = ((32 + y) * png.width + i * 16 + x) * 4;
        png.data.set(tile.data.subarray(si, si + 3), o);
        png.data[o + 3] = 255;
      }
  });
  return png;
}
