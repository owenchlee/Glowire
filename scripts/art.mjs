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

import { circuitSheet } from './circuit-art.mjs';

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
 * Village-pack sheets added under the city tiles, so a city map can use them too (grass,
 * trees, flowers). Keep in sync with ATLAS in src/world/builder.ts.
 */
const EXTRA_SHEETS = [
  { file: 'TilesetFloor.png', row: 18 },
  { file: 'TilesetNature.png', row: 44 },
];
const ATLAS_ROWS = 65;

function city(palette) {
  const src = read(join(SRC, 'kenney-urban', 'tilemap_packed.png'));
  const out = new PNG({ width: src.width, height: ATLAS_ROWS * 16 });
  for (const { file, row } of EXTRA_SHEETS) {
    const sheet = read(join(NINJA, 'tilesets', file));
    for (let y = 0; y < sheet.height; y++)
      for (let x = 0; x < sheet.width; x++) {
        const i = (y * sheet.width + x) * 4;
        if (sheet.data[i + 3] < 128) continue;
        const o = ((row * 16 + y) * out.width + x) * 4;
        out.data.set(sheet.data.subarray(i, i + 3), o);
        out.data[o + 3] = 255;
      }
  }
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
  write(join(OUT, 'city.png'), out);
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

/** Pip, the robot sidekick: the village pack's robot in sky blue, with friendly yellow eyes. */
const PIP_RECOLOUR = {
  '56864c': '3da6bd', // body
  a8a129: '79b8ce', // body light
  '345a52': '2d697b', // body shade
  e0394c: 'ffe166', // eyes
  '8f3e56': 'd2b37d', // eye shade (portrait)
};

function recolour(png, map) {
  for (let i = 0; i < png.data.length; i += 4) {
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
  const ids = ['hero', ...Object.keys(CAST_SPRITES)];
  const sheets = ids.map((id) => {
    const dir = join(NINJA, 'characters', id === 'hero' ? 'Boy' : CAST_SPRITES[id]);
    const sheet = read(join(dir, 'SpriteSheet.png'));
    const face = read(join(dir, 'Faceset.png'));
    const map = id === 'hero' ? HERO_RECOLOUR : id === 'pip' ? PIP_RECOLOUR : null;
    return map ? { id, sheet: recolour(sheet, map), face: recolour(face, map) } : { id, sheet, face };
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
  extras.forEach((img, i) => blit(atlas, img, i * 16 + Math.floor((16 - img.width) / 2), 112 + 16 - img.height));
  write(join(OUT, 'people.png'), atlas);

  rmSync(join(OUT, 'faces'), { recursive: true, force: true });
  mkdirSync(join(OUT, 'faces'), { recursive: true });
  for (const s of sheets) write(join(OUT, 'faces', `${s.id}.png`), upscale(s.face, 4));

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
city(palette);
characters();
circuit();
copyFileSync(join(NINJA, 'ui', 'Font', 'NormalFont.ttf'), 'assets/fonts/PixelNormal.ttf');
console.log('art built into', OUT);
