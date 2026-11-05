// Builds the game's art from the packs in art/source into assets/art.
//
//   node scripts/art.mjs
//
// Two packs, one look: every pixel of the city pack (Kenney, RPG Urban) is moved to the
// nearest colour of the village pack's palette (Pixel-boy, Ninja Adventure), so both
// worlds and every character share one set of colours. Pixels that can glow (window
// glass, lamp bulbs) are marked with alpha 254 instead of 255; the world shader lights
// them up once that building or lamp is fixed.

import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

import { blobTable } from './autotile.mjs';
import { circuitSheet } from './circuit-art.mjs';
import { deepExtras, deepSheet } from './deep-art.mjs';
import { SHORE_LOCAL, reefRelief, shoreSheet } from './shore-art.mjs';
import { townSheet } from './town-art.mjs';

const SRC = 'art/source';
const OUT = 'assets/art';
const NINJA = join(SRC, 'ninja-adventure');

const read = (p) => PNG.sync.read(readFileSync(p));
const write = (p, png) => writeFileSync(p, PNG.sync.write(png));

// --- colour maths (OKLab: nearest colour that looks nearest) -------------------------
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklab(r, g, b) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Every opaque colour used by the village pack's tiles and characters. */
function ninjaPalette() {
  const files = [
    ...readdirSync(join(NINJA, 'tilesets')).map((f) => join(NINJA, 'tilesets', f)),
    ...readdirSync(join(NINJA, 'characters'))
      .filter((d) => !d.endsWith('.png'))
      .map((d) => join(NINJA, 'characters', d, 'SpriteSheet.png')),
  ];
  const seen = new Map();
  for (const f of files) {
    const p = read(f);
    for (let i = 0; i < p.data.length; i += 4) {
      if (p.data[i + 3] < 128) continue;
      const key = (p.data[i] << 16) | (p.data[i + 1] << 8) | p.data[i + 2];
      if (!seen.has(key)) seen.set(key, oklab(p.data[i], p.data[i + 1], p.data[i + 2]));
    }
  }
  return [...seen.entries()].map(([key, lab]) => ({
    rgb: [(key >> 16) & 255, (key >> 8) & 255, key & 255],
    lab,
  }));
}

function nearest(palette, r, g, b) {
  const [L, A, B] = oklab(r, g, b);
  let best = palette[0];
  let bestD = Infinity;
  for (const p of palette) {
    // Lightness counts a little less than hue, so mid-greys don't all collapse together.
    const d = 0.7 * (p.lab[0] - L) ** 2 + (p.lab[1] - A) ** 2 + (p.lab[2] - B) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.rgb;
}

// --- the city: Kenney RPG Urban, 27×18 tiles of 16px ----------------------------------
const CITY_COLS = 27;
/** Windows and doors: their glass glows when the building's lights are back. */
const GLASS_TILES = [
  256, 257, 258, 283, 284, 285, 310, 311, 312, 335, 336, 337, 362, 363, 364, 389, 390, 391,
  416, 417, 418, 443, 444, 445, 470, 471, 472, 359, 360, 361, 386, 387, 388, 412, 413, 414,
  415, 339, 366, 446, 473, 365, 392, 419,
];
/** Street-lamp heads: their bulbs glow when the lamp is on. */
const BULB_TILES = [162, 163, 164, 165, 168, 169];

/**
 * Every tile sheet a world can use, stacked into one texture (assets/art/world.png) so a
 * whole map draws in one go. Rows are worked out here and written to
 * src/world/atlas.generated.ts.
 */
const ATLAS_COLS = 33;
const SHEETS = [
  { id: 'city', file: null },
  { id: 'floor', file: 'TilesetFloor.png' },
  { id: 'nature', file: 'TilesetNature.png' },
  { id: 'water', file: 'TilesetWater.png' },
  { id: 'house', file: 'TilesetHouse.png' },
  { id: 'element', file: 'TilesetElement.png' },
  { id: 'detail', file: 'TilesetFloorDetail.png' },
  { id: 'field', file: 'TilesetField.png' },
  { id: 'abandoned', file: 'TilesetVillageAbandoned.png' },
  { id: 'towers', file: 'TilesetTowers.png' },
  { id: 'town', file: null, make: townSheet },
  { id: 'deep', file: null, make: deepSheet },
  { id: 'relief', file: 'TilesetRelief.png' },
  { id: 'reliefDetail', file: 'TilesetReliefDetail.png' },
  { id: 'shore', file: null, make: () => shoreSheet().png },
  { id: 'reef', file: 'TilesetRelief.png', recolour: reefRelief },
];

/** Doorways in the village houses: their dark openings glow warm once the house is lit. */
const HOUSE_DOORS = [67, 71, 75, 79, 83, 87, 90, 93, 129, 108, 132, 133, 262, 298, 301, 456, 620, 713];

/**
 * Terrain blob sets (see autotile.mjs): a material drawn over a plain ground. `block` is the
 * set's area in its sheet, in tiles.
 */
const TERRAINS = {
  dirt: { sheet: 'floor', block: [0, 7, 11, 7], inside: 177, outside: 264, skip: [242, 243] },
  darkDirt: { sheet: 'floor', block: [11, 7, 11, 7], inside: 188, outside: 275, skip: [253, 254] },
  stone: { sheet: 'floor', block: [11, 14, 11, 7], inside: 342, outside: 429, skip: [407, 408] },
  pond: { sheet: 'water', block: [0, 6, 10, 5], inside: 197, outside: 308, skip: [255] },
  sea: { sheet: 'water', block: [0, 0, 10, 5], inside: 29, outside: 140, skip: [] },
};

function cityTiles(palette) {
  const src = read(join(SRC, 'kenney-urban', 'tilemap_packed.png'));
  const out = new PNG({ width: src.width, height: src.height });
  const cache = new Map();
  const tileOf = (x, y) => Math.floor(y / 16) * CITY_COLS + Math.floor(x / 16);
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      const [r, g, b, a] = src.data.subarray(i, i + 4);
      if (a < 128) continue; // stays fully transparent
      const key = (r << 16) | (g << 8) | b;
      let rgb = cache.get(key);
      if (!rgb) cache.set(key, (rgb = nearest(palette, r, g, b)));
      out.data[i] = rgb[0];
      out.data[i + 1] = rgb[1];
      out.data[i + 2] = rgb[2];
      const t = tileOf(x, y);
      const [L, A, B] = oklab(r, g, b);
      const glass = GLASS_TILES.includes(t) && L > 0.8 && B < 0.02 - A * 0.3;
      const bulb = BULB_TILES.includes(t) && L > 0.78;
      out.data[i + 3] = glass || bulb ? 254 : 255;
    }
  return out;
}

/** Mark the dark doorway pixels of the village houses as glowing. */
function markDoors(house) {
  const cols = house.width / 16;
  for (const t of HOUSE_DOORS) {
    const ox = (t % cols) * 16;
    const oy = Math.floor(t / cols) * 16;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const i = ((oy + y) * house.width + ox + x) * 4;
        if (house.data[i + 3] < 128) continue;
        const [L] = oklab(house.data[i], house.data[i + 1], house.data[i + 2]);
        if (L < 0.25) house.data[i + 3] = 254;
      }
  }
  return house;
}

/**
 * The cliff sheet's plateau tops are pale lavender (it was drawn for snow). Paint them the
 * grass colour so a plateau looks like a grassy hill; the orange set stays as sandstone.
 */
function grassTops(png) {
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] === 242 && png.data[i + 1] === 234 && png.data[i + 2] === 241 && png.data[i + 3] > 128) {
      png.data[i] = 173;
      png.data[i + 1] = 188;
      png.data[i + 2] = 58;
    }
  }
  return png;
}

function world(palette) {
  const pngs = SHEETS.map((s) => {
    if (s.make) return s.make();
    if (!s.file) return cityTiles(palette);
    const png = read(join(NINJA, 'tilesets', s.file));
    if (s.recolour) return s.recolour(png);
    if (s.id === 'relief') return grassTops(png);
    return s.id === 'house' ? markDoors(png) : png;
  });
  const origins = {};
  let row = 0;
  SHEETS.forEach((s, k) => {
    origins[s.id] = { row, cols: Math.floor(pngs[k].width / 16) };
    row += Math.ceil(pngs[k].height / 16);
  });
  const out = new PNG({ width: ATLAS_COLS * 16, height: row * 16 });
  SHEETS.forEach((s, k) => {
    const src = pngs[k];
    const oy = origins[s.id].row * 16;
    for (let y = 0; y < src.height; y++)
      for (let x = 0; x < src.width; x++) {
        const i = (y * src.width + x) * 4;
        if (src.data[i + 3] < 128) continue;
        out.data.set(src.data.subarray(i, i + 4), ((oy + y) * out.width + x) * 4);
      }
  });
  write(join(OUT, 'world.png'), out);

  // Terrain tables, already turned into atlas tile numbers.
  const at = (sheet, i) => {
    const o = origins[sheet];
    return (o.row + Math.floor(i / o.cols)) * ATLAS_COLS + (i % o.cols);
  };
  const terrains = {};
  for (const [id, t] of Object.entries(TERRAINS)) {
    const k = SHEETS.findIndex((s) => s.id === t.sheet);
    const table = blobTable(pngs[k], { ...t, cols: origins[t.sheet].cols });
    terrains[id] = table.map((tiles) => tiles.map((i) => at(t.sheet, i)));
  }
  // Sand shores: neighbour mask → atlas tile (-1: plain), and where the stones and ledges are.
  const shore = shoreSheet().tables;
  const atShore = (i) => (i < 0 ? -1 : at('shore', i));
  const shoreTiles = { sand: shore.sand.map(atShore), water: shore.water.map(atShore) };
  const pieces = Object.fromEntries(Object.entries(SHORE_LOCAL).map(([k, v]) => [k, v.map(atShore)]));
  writeFileSync(
    'src/world/atlas.generated.ts',
    `// Generated by scripts/art.mjs. Do not edit.

/** Tiles across assets/art/world.png. */
export const ATLAS_COLS = ${ATLAS_COLS};

/** Where each source sheet sits in the atlas: its first row, and its width in tiles. */
export const SHEETS = ${JSON.stringify(origins)} as const;

export type SheetId = keyof typeof SHEETS;

/**
 * Terrain edges: for each neighbour mask (bits N, E, S, W, NE, SE, SW, NW = 1…128), the
 * atlas tiles that fit.
 */
export const TERRAIN_TILES = ${JSON.stringify(terrains)} as const;

export type TerrainId = keyof typeof TERRAIN_TILES;

/**
 * Rounded sand shores (scripts/shore-art.mjs): for a sand cell and for a water cell, indexed
 * by which neighbours are land (same bits as above), the tile to draw; -1 means plain.
 */
export const SHORE_TILES = ${JSON.stringify(shoreTiles)} as const;

/** Stepping stones, and the left / middle / right tiles of a hop-down ledge in each style. */
export const SHORE_PIECES = ${JSON.stringify(pieces)} as const;
`,
  );
}

// --- characters -------------------------------------------------------------------------
/** Townspeople: cast id → village-pack character. */
const CAST_SPRITES = {
  gran: 'OldWoman',
  pell: 'Woman',
  okoro: 'OldMan3',
  rafi: 'OldMan2',
  theo: 'Villager',
  twins: 'EggBoy',
  arjun: 'Monk2',
  nadia: 'Villager4',
  ito: 'Princess',
  finch: 'Inspector',
  benny: 'Villager2',
  coral: 'Villager3',
  luca: 'Monk',
  sunny: 'Village6',
  iris: 'Cavegirl',
  dot: 'Noble',
  mei: 'Villager6',
  rosa: 'Hunter',
  sal: 'Sultan',
  gus: 'OldMan',
  lumen: 'Master',
  pip: 'RobotGreen',
  grumble: 'Spirit',
  wren: 'Villager5',
  bolt: 'RobotGrey',
  hazel: 'OldWoman',
  bram: 'Hunter',
  moth: 'Villager',
  glimmer: 'Spirit',
  marigold: 'EggGirl',
  pearl: 'Cavegirl',
  marlo: 'Monk',
  tess: 'Woman',
  echo: 'RobotGrey',
  hush: 'Spirit',
};

/**
 * The hero is the same kid in every world: Pixel-boy's red-haired "Boy", in a Glowire
 * uniform (sunny yellow shirt, navy trousers) so nobody else in town looks like them.
 */
const HERO_RECOLOUR = {
  e3f1f5: 'f4c542', // shirt
  f2eaf1: 'f4c542', // shirt (portrait)
  d3a2c0: 'd99a2b', // shirt shade (portrait)
  548789: '34406e', // trousers
  '51614e': '262d52', // trouser shade
};

/**
 * Outfits from the shop: the same hero in other colours (shirt, shirt shade, trousers,
 * trouser shade). "uniform" is the default one above. Keep ids in sync with OUTFITS in
 * src/game/shop.ts.
 */
const OUTFITS = {
  ember: ['e0564a', 'a83a3a', '3a2f45', '27202f'],
  tide: ['3fb7c9', '2b8496', '2f3c5a', '1f283f'],
  moss: ['6fae4a', '4c7f33', '5a4632', '3f3022'],
  plum: ['9a6ad6', '6e48a8', '2c2a48', '1c1b30'],
  snow: ['f2eee6', 'c9c2b4', '4a5a8a', '34406e'],
};
const outfitRecolour = ([shirt, shade, trousers, trouserShade]) => ({
  e3f1f5: shirt,
  f2eaf1: shirt,
  d3a2c0: shade,
  548789: trousers,
  '51614e': trouserShade,
});

/** Pip, the robot sidekick: the village pack's robot in sky blue, with friendly yellow eyes. */
const PIP_RECOLOUR = {
  '56864c': '3da6bd', // body
  a8a129: '79b8ce', // body light
  '345a52': '2d697b', // body shade
  e0394c: 'ffe166', // eyes
  '8f3e56': 'd2b37d', // eye shade (portrait)
};

/**
 * Mossbell Hollow's (and Brightwater Deep's) people are village-pack characters in new
 * colours, so nobody looks like someone from another world: Hazel grey-haired in moss green, Bram in a ferryman's teal coat,
 * Moth in a plum hoodie, and Glimmer, the lantern spirit, in gold (Grumble's sprite is the
 * same spirit in storm blue: they're twins).
 */
const CAST_RECOLOUR = {
  hazel: { a5608b: '9ba7aa', d3a2c0: 'd2c9c9', '548789': '4a7f4b', '2d697b': '345a52' },
  bram: { d14b34: '61372e', '8f3e56': '3b3643', '4a5270': '2d697b' },
  moth: { d14b34: 'a5608b', '548789': '3b3643', '4e484a': '61372e' },
  glimmer: { '79b8ce': 'ffe166', '9ba7aa': 'f1ae41' },
  // Brightwater Deep: Pearl with sea-foam hair in a teal diving suit, Old Marlo in the
  // Jar-Keeper's navy and gold, Tess in coral and kelp, Echo in brass, and the Hush: the same
  // spirit as Grumble and Glimmer, gone ink-dark with a violet glow.
  pearl: { '56864c': '3da6bd', '345a52': '2d697b', d14b34: 'e3f1f5' },
  marlo: { '3b3643': '34406e', '4e484a': '2d697b', d14b34: 'f1ae41' },
  tess: { '548789': '74a334', '79b8ce': 'adbc3a', f1c471: 'e66a3a', d78b4a: 'd14b34' },
  echo: { '8d977f': 'd2b37d', '5f7160': 'a3754e', f2eaf1: 'ffe166', e0394c: '71ddee' },
  hush: { '79b8ce': '3b3643', '9ba7aa': '2e2b30', ffffff: '9a6ad6' },
};

/** Swap colours. `fromRow`: leave rows above it alone (a portrait's face shares shirt colours). */
function recolour(png, map, fromRow = 0) {
  for (let i = fromRow * png.width * 4; i < png.data.length; i += 4) {
    const key = ((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2])
      .toString(16)
      .padStart(6, '0');
    const to = map[key];
    if (!to) continue;
    png.data[i] = parseInt(to.slice(0, 2), 16);
    png.data[i + 1] = parseInt(to.slice(2, 4), 16);
    png.data[i + 2] = parseInt(to.slice(4, 6), 16);
  }
  return png;
}

/** Nearest-neighbour upscale, so pixel art stays crisp wherever it's shown. */
function upscale(png, k) {
  const out = new PNG({ width: png.width * k, height: png.height * k });
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const si = (Math.floor(y / k) * png.width + Math.floor(x / k)) * 4;
      out.data.set(png.data.subarray(si, si + 4), (y * out.width + x) * 4);
    }
  return out;
}

function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      if (src.data[si + 3] < 128) continue;
      const di = ((dy + y) * dst.width + dx + x) * 4;
      dst.data.set(src.data.subarray(si, si + 3), di);
      dst.data[di + 3] = 255;
    }
}

/** Pets (shop id → village-pack animal). */
const PETS = { scout: 'dog', hoot: 'parrot', penny: 'racoon' };

/** Speech bubbles shown over people's heads: emote file → name. */
const EMOTES = { 22: 'job', 23: 'question', 27: 'heart', 20: 'chat', 29: 'star' };

/**
 * Everyone's walk sheet side by side in one texture (64×112 each: columns face down, up,
 * left, right; rows 0–3 are walk frames), then a 16px row of extras: the shadow and the
 * speech bubbles. Portraits are upscaled ×4 for the 2D UI.
 */
function characters() {
  const outfitIds = Object.keys(OUTFITS).map((o) => `hero-${o}`);
  const ids = ['hero', ...Object.keys(CAST_SPRITES), ...outfitIds];
  const sheets = ids.map((id) => {
    const isHero = id === 'hero' || id.startsWith('hero-');
    const dir = join(NINJA, 'characters', isHero ? 'Boy' : CAST_SPRITES[id]);
    const sheet = read(join(dir, 'SpriteSheet.png'));
    const face = read(join(dir, 'Faceset.png'));
    const map = id.startsWith('hero-')
      ? outfitRecolour(OUTFITS[id.slice(5)])
      : id === 'hero'
        ? HERO_RECOLOUR
        : id === 'pip'
          ? PIP_RECOLOUR
          : (CAST_RECOLOUR[id] ?? null);
    // In the portrait, only the shirt (bottom quarter) changes colour.
    const shirtRow = isHero ? Math.floor(face.height * 0.74) : 0;
    return map ? { id, sheet: recolour(sheet, map), face: recolour(face, map, shirtRow) } : { id, sheet, face };
  });
  // Pets: two side-on frames each (facing right), in their own 64px columns.
  for (const [id, file] of Object.entries(PETS)) {
    sheets.push({
      id,
      sheet: read(join(NINJA, 'animals', `${file}.png`)),
      face: read(join(NINJA, 'animals', `${file}-face.png`)),
    });
    ids.push(id);
  }
  const atlas = new PNG({ width: sheets.length * 64, height: 112 + 16 });
  sheets.forEach((s, i) => blit(atlas, s.sheet, i * 64, 0));
  const extras = [read(join(NINJA, 'characters', 'Shadow.png'))];
  const emoteNames = [];
  for (const [file, name] of Object.entries(EMOTES)) {
    extras.push(read(join(NINJA, 'ui', 'Emote', `emote${file}.png`)));
    emoteNames.push(name);
  }
  // Drawn ones (deep-art.mjs): eyes in the dark, and bubbles. Glowing pixels keep alpha 254.
  for (const [name, img] of Object.entries(deepExtras())) {
    extras.push(img);
    emoteNames.push(name);
  }
  extras.forEach((img, i) => {
    const dx = i * 16 + Math.floor((16 - img.width) / 2);
    const dy = 112 + 16 - img.height;
    blit(atlas, img, dx, dy);
    // blit makes every pixel solid; put the glow marks back.
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] === 254) atlas.data[((dy + y) * atlas.width + dx + x) * 4 + 3] = 254;
  });
  write(join(OUT, 'people.png'), atlas);

  // Overwrite portraits in place and only remove ones nobody uses any more: deleting the
  // whole folder makes a running Metro lose track of every file in it.
  const faces = join(OUT, 'faces');
  mkdirSync(faces, { recursive: true });
  for (const s of sheets) write(join(faces, `${s.id}.png`), upscale(s.face, 4));
  for (const f of readdirSync(faces)) if (!ids.includes(f.replace(/\.png$/, ''))) rmSync(join(faces, f));

  writeFileSync(
    'src/world/people.generated.ts',
    `// Generated by scripts/art.mjs. Do not edit.

/** Column of each person (and pet) in assets/art/people.png (64px each). */
export const PEOPLE = ${JSON.stringify(ids)} as const;

/** Extras along the bottom row (16px cells): the shadow, then speech bubbles. */
export const EXTRAS = ${JSON.stringify(['shadow', ...emoteNames])} as const;
`,
  );
  writeFileSync(
    'src/ui/faces.generated.ts',
    `// Generated by scripts/art.mjs. Do not edit.

/** Portraits (38px art, upscaled ×4). */
export const FACES: Record<string, number> = {
${ids.map((id) => `  ${JSON.stringify(id)}: require('../../assets/art/faces/${id}.png'),`).join('\n')}
};
`,
  );
}

/** The puzzle board's parts (drawn in circuit-art.mjs), plus bushes for blocked cells. */
function circuit() {
  const nature = read(join(NINJA, 'tilesets', 'TilesetNature.png'));
  const cut = (i) => {
    const tile = new PNG({ width: 16, height: 16 });
    const sx = (i % 24) * 16;
    const sy = Math.floor(i / 24) * 16;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const si = ((sy + y) * nature.width + sx + x) * 4;
        tile.data.set(nature.data.subarray(si, si + 4), (y * 16 + x) * 4);
      }
    return tile;
  };
  const sheet = circuitSheet([240, 241, 242, 246].map(cut));
  write(join(OUT, 'circuit.png'), sheet);
  write(join(OUT, 'circuit-ui.png'), upscale(sheet, 4));
}

mkdirSync(OUT, { recursive: true });
mkdirSync('assets/fonts', { recursive: true });
const palette = ninjaPalette();
console.log(`palette: ${palette.length} colours`);
world(palette);
characters();
circuit();
copyFileSync(join(NINJA, 'ui', 'Font', 'NormalFont.ttf'), 'assets/fonts/PixelNormal.ttf');
console.log('art built into', OUT);
