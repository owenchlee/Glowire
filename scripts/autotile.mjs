// Works out which tile to draw for each shape of terrain edge, by looking at the art.
//
// The village pack draws terrain (a dirt path, a pond) as a "blob" set: tiles for every
// mix of edges and corners. Rather than hand-number them, this measures each tile: how
// much of its top edge, top-right corner, and so on is the inside material. A map cell
// then gets the tile whose edges match its neighbours best.

/** The 8 neighbours, as mask bits. */
export const N = 1, E = 2, S = 4, W = 8, NE = 16, SE = 32, SW = 64, NW = 128;

// Where each neighbour shows up inside a 16px tile (x0, y0, x1, y1 inclusive).
const REGIONS = [
  [N, 6, 0, 9, 3],
  [E, 12, 6, 15, 9],
  [S, 6, 12, 9, 15],
  [W, 0, 6, 3, 9],
  [NE, 12, 0, 15, 3],
  [SE, 12, 12, 15, 15],
  [SW, 0, 12, 3, 15],
  [NW, 0, 0, 3, 3],
];
const CENTRE = [5, 5, 10, 10];

const colourAt = (png, x, y) => {
  const i = (y * png.width + x) * 4;
  return png.data[i + 3] < 128 ? -1 : (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2];
};

function coloursOf(png, tile, cols) {
  const set = new Set();
  const ox = (tile % cols) * 16;
  const oy = Math.floor(tile / cols) * 16;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set.add(colourAt(png, ox + x, oy + y));
  return set;
}

function fraction(png, tile, cols, inside, [x0, y0, x1, y1]) {
  const ox = (tile % cols) * 16;
  const oy = Math.floor(tile / cols) * 16;
  let hit = 0;
  let all = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      all++;
      if (inside.has(colourAt(png, ox + x, oy + y))) hit++;
    }
  return hit / all;
}

/** The wanted look of each region for a cell with these inside neighbours. */
export function wanted(mask) {
  const has = (b) => (mask & b) !== 0;
  return {
    [N]: has(N),
    [E]: has(E),
    [S]: has(S),
    [W]: has(W),
    [NE]: has(N) && has(E) && has(NE),
    [SE]: has(S) && has(E) && has(SE),
    [SW]: has(S) && has(W) && has(SW),
    [NW]: has(N) && has(W) && has(NW),
  };
}

/**
 * For one blob set in a sheet: for every neighbour mask (0–255), the tiles that fit best
 * (several when they fit equally well, for variety).
 *
 * `block` is the set's area in tiles; `inside` / `outside` are a plain middle tile of each
 * material; `skip` lists tiles in the block that aren't edge pieces (props, plain ground).
 */
export function blobTable(png, { cols, block: [bx, by, bw, bh], inside, outside, skip = [] }) {
  const outsideColours = coloursOf(png, outside, cols);
  const insideColours = new Set([...coloursOf(png, inside, cols)].filter((c) => !outsideColours.has(c) && c !== -1));
  const base = fraction(png, inside, cols, insideColours, CENTRE) || 1;

  const tiles = [];
  for (let y = by; y < by + bh; y++)
    for (let x = bx; x < bx + bw; x++) {
      const t = y * cols + x;
      if (skip.includes(t)) continue;
      const centre = fraction(png, t, cols, insideColours, CENTRE) / base;
      
      const regions = {};
      for (const [bit, ...r] of REGIONS) regions[bit] = Math.min(1, fraction(png, t, cols, insideColours, r) / base);
      if (centre + Object.values(regions).reduce((a, b) => a + b, 0) < 0.5) continue; // no inside at all
      tiles.push({ t, regions, centre: Math.min(1, centre) });
    }

  const table = [];
  for (let mask = 0; mask < 256; mask++) {
    const want = wanted(mask);
    let best = Infinity;
    const scored = tiles.map(({ t, regions, centre }) => {
      let s = (1 - centre) * 0.5;
      for (const [bit] of REGIONS) s += Math.abs(regions[bit] - (want[bit] ? 1 : 0));
      best = Math.min(best, s);
      return { t, s };
    });
    table.push(scored.filter((x) => x.s <= best + 0.08).map((x) => x.t));
  }
  return table;
}
