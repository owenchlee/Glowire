// World 4: Brightwater Deep. A town at the bottom of the sea, where the first lights were
// kept in jars of caught lightning. Glimmer's bubble carries you down the bottomless well
// from Mossbell. Down here it's darker than any night: your lantern is a little jar too,
// and it runs down unless you keep to the light.
//
//   x:  0       16           44              72               104           136
//       Well's  │ Jar Street  │ Coral Nursery │ The Wreck of    │ The Heart
//       Bottom  │ 47, 48      │ 49, 50        │ the Marigold    │ Hall 53 (B)
//                                             │ 51, 52          │

import { MapBuilder, hash } from './builder';
import { ledgeTerrace, rockPlug } from './puzzlekit';
import { lump } from './scenery';
import type { WorldMap } from './types';

const W = 136;
const H = 40;
/** The old street's top row and height. */
const STREET = 20;
const STREET_H = 6;

export function buildDeep(): WorldMap {
  const b = new MapBuilder(W, H, 'sand');
  b.seabed(0, 0, W, H);

  wellBottom(b);
  jarStreet(b);
  nursery(b);
  theWreck(b);
  heartHall(b);

  puzzles(b);
  seabedLife(b);
  return b.finish({
    id: 'deep',
    name: 'Brightwater Deep',
    spawn: { x: 7, y: 23, facing: 'right' },
    night: '#2f4a72',
    underwater: true,
  });
}

// ── D0: the bottom of the well ───────────────────────────────────────────────
function wellBottom(b: MapBuilder) {
  b.area({ id: 'well', name: 'The Well’s Bottom', jobs: [], intro: 'deep-intro', entry: { x: 7, y: 23, facing: 'right' } }, [
    { x: 0, y: 0, w: 16, h: H },
  ]);
  b.group('home', []);
  // Where Glimmer's bubble comes down: the bottom of Mossbell's bottomless well.
  b.prop(4, 21, 'well');
  b.spots.push({ kind: 'exit', x: 4, y: 21, to: 'mossbell', via: 'bubble' });
  b.jarLamp(8, 21, 'home');
  b.resident('pip', 9, 25, 'left');
  b.spots.push({ kind: 'daily', x: 9, y: 25 });
  b.resident('gran', 11, 22, 'down', { chat: 'gran-deep' });
  b.resident('glimmer', 6, 26, 'right', { chat: 'glimmer-deep' });
  b.resident('wren', 12, 26, 'up', { chat: 'wren-deep', until: 'area:jars' });
  b.spots.push({ kind: 'sign', x: 14, y: 21, text: 'BRIGHTWATER. Keep to the light. Do not feed the dark.' });
  b.deepTall(14, 21, 'signpost');
  b.deepTall(2, 27, 'vent');
  for (const [x, y] of [[3, 18], [12, 29], [1, 24]] as const) b.deepProp(x, y, 'coral');
  b.deepProp(13, 18, 'bones');
  b.secret({ id: 'well-rope', x: 5, y: 20 });
  reef(b, 0, 16, 'top', 14);
  reef(b, 0, 16, 'bottom', 32);
  wellExtras(b);
}

// ── D1: Jar Street ───────────────────────────────────────────────────────────
function jarStreet(b: MapBuilder) {
  b.area(
    {
      id: 'jars',
      name: 'Jar Street',
      jobs: [47, 48],
      intro: 'jars-intro',
      outro: 'jars-outro',
      entry: { x: 18, y: 23, facing: 'right' },
      gate: 'The kelp past here is thick and black, and something in it is breathing. Light up Jar Street first.',
    },
    [{ x: 16, y: 0, w: 28, h: H }],
  );
  b.reefWall(16, STREET, STREET + STREET_H - 1);
  // The old high street: cobbles, sunk under the sea.
  b.plaza(17, STREET, 27, STREET_H, true);
  // Pearl's dome, with her jar lamp out front (job 47).
  b.group('job:47', [47]);
  const pearl = b.deepBig(19, 13, 'dome', 'job:47');
  b.plaza(pearl.x - 1, pearl.y, 3, STREET - pearl.y, true);
  b.jarLamp(pearl.x + 2, pearl.y + 1, 'job:47');
  b.spots.push({ kind: 'job', x: pearl.x + 2, y: pearl.y + 1, job: 47 });
  b.resident('pearl', pearl.x + 1, pearl.y, 'down', { job: 47 });
  // Marlo's tall dome (job 48).
  b.group('job:48', [48]);
  const marlo = b.deepBig(33, 13, 'domeTall', 'job:48');
  b.plaza(marlo.x - 1, marlo.y, 3, STREET - marlo.y, true);
  b.spots.push({ kind: 'job', x: marlo.x, y: marlo.y - 1, job: 48 });
  b.resident('marlo', marlo.x + 1, marlo.y, 'down', { job: 48 });
  // Pearl's game: catching sparks in jars.
  b.deepProp(28, 27, 'chest');
  b.spots.push({ kind: 'game', x: 28, y: 27, game: 'jars' });
  // Pearl's lantern rack, where the Hush feeds: Lantern Budget.
  b.deepProp(31, 27, 'chest');
  b.spots.push({ kind: 'game', x: 31, y: 27, game: 'lantern' });
  // Jar lamps down the street: two to start with, the rest once the street is lit.
  b.jarLamp(41, STREET + STREET_H, 'home');
  b.jarLamp(30, STREET - 1, 'area:jars');
  b.jarLamp(19, STREET + STREET_H, 'area:jars');
  b.jarLamp(35, STREET + STREET_H, 'area:jars');
  b.deepTall(42, 18, 'anchor');
  b.deepTall(25, 30, 'pillar');
  for (const [x, y] of [[23, 28], [39, 29], [41, 16]] as const) b.deepProp(x, y, 'coral');
  b.deepProp(31, 29, 'crab');
  b.secret({ id: 'jar-labels', x: 41, y: 26 });
  b.spots.push({ kind: 'note', x: 43, y: 28, note: 'jars' });
  b.deepTall(43, 28, 'signpost');
  b.sighting({ id: 'street-shadow', who: 'hush', x: 38, y: 31 });
  reef(b, 16, 44, 'top', 9);
  reef(b, 16, 44, 'bottom', 34);
  jarsExtras(b);
}

// ── D2: the Coral Nursery ────────────────────────────────────────────────────
function nursery(b: MapBuilder) {
  b.area(
    {
      id: 'nursery',
      name: 'The Coral Nursery',
      jobs: [49, 50],
      intro: 'nursery-intro',
      outro: 'nursery-outro',
      entry: { x: 46, y: 23, facing: 'right' },
      gate: 'Past the coral gate it’s all wreckage and dark water. Tess’s lamps first.',
    },
    [{ x: 44, y: 0, w: 28, h: H }],
  );
  b.reefWall(44, STREET, STREET + STREET_H - 1);
  b.gate(1, gateCells(44), 'kelp');
  // A winding sandy way through gardens of coral.
  b.plaza(45, 21, 6, 4, true);
  // Tess's dome and the nursery lamp (job 49).
  b.group('job:49', [49]);
  const tess = b.deepBig(52, 12, 'dome', 'job:49');
  b.spots.push({ kind: 'job', x: tess.x, y: tess.y - 1, job: 49 });
  b.resident('tess', tess.x + 1, tess.y, 'down', { job: 49 });
  b.glow(tess.x + 0.5, tess.y - 2, 'job:49', 3.2, '#ffd6a0');
  // The coral gate: two lamps either side of a gap in the reef (job 50).
  b.group('job:50', [50]);
  b.jarLamp(64, 20, 'job:50');
  b.jarLamp(67, 20, 'job:50');
  b.spots.push({ kind: 'job', x: 65, y: 20, job: 50 });
  b.resident('tess', 66, 21, 'left', { job: 50 });
  b.deepTall(62, 19, 'coralTree');
  b.deepTall(68, 19, 'coralTreeOrange');
  // The great clam, and a garden of coral trees.
  b.deepBig(56, 27, 'clam');
  b.secret({ id: 'clam-pearl', x: 58, y: 30 });
  for (const [x, y, k] of [[47, 17, 'coralTree'], [60, 18, 'coralTreeOrange'], [48, 30, 'coralTreeOrange'], [65, 31, 'coralTree']] as const)
    b.deepTall(x, y, k);
  for (const [x, y] of [[50, 26], [62, 26], [70, 27], [53, 31]] as const) b.deepProp(x, y, 'anemone', 'area:nursery');
  for (const [x, y] of [[46, 27], [69, 24], [58, 24]] as const) b.deepProp(x, y, 'brainCoral');
  b.jarLamp(50, 20, 'home');
  b.jarLamp(60, 27, 'home');
  b.jarLamp(70, 21, 'area:nursery');
  b.sighting({ id: 'nursery-eyes', who: 'hush', x: 54, y: 34, after: 'job:49' });
  // Before you've met Echo: a brass diver, glimpsed walking the sea floor.
  b.sighting({ id: 'wreck-diver', who: 'echo', x: 69, y: 32 });
  reef(b, 44, 72, 'top', 9);
  reef(b, 44, 72, 'bottom', 35);
  nurseryExtras(b);
}

// ── D3: the Wreck of the Marigold ────────────────────────────────────────────
function theWreck(b: MapBuilder) {
  b.area(
    {
      id: 'wreck',
      name: 'The Wreck of the Marigold',
      jobs: [51, 52],
      intro: 'wreck-intro',
      outro: 'wreck-outro',
      entry: { x: 74, y: 23, facing: 'right' },
      gate: 'The Heart Hall is beyond the wreck, and the dark is thickest there. Help Echo first.',
    },
    [{ x: 72, y: 0, w: 32, h: H }],
  );
  b.reefWall(72, STREET, STREET + STREET_H - 1);
  b.gate(2, gateCells(72), 'kelp');
  // The wreck, settled in the sand with her stern lamp hanging off the back (job 51).
  b.group('job:51', [51]);
  const wreck = b.deepBig(78, 13, 'wreck', 'job:51');
  b.spots.push({ kind: 'job', x: wreck.x, y: wreck.y - 1, job: 51 });
  b.resident('echo', wreck.x + 1, wreck.y, 'down', { job: 51 });
  b.glow(80, 15, 'job:51', 4, '#ffd27a');
  // Echo's camera, on a tripod by the anchor (job 52).
  b.group('job:52', [52]);
  b.jarLamp(93, 21, 'job:52');
  b.spots.push({ kind: 'job', x: 93, y: 21, job: 52 });
  b.resident('echo', 94, 22, 'left', { job: 52 });
  b.deepTall(91, 19, 'anchor');
  // The drowned bell, half sunk in the sand.
  b.deepBig(85, 27, 'bell');
  b.secret({ id: 'drowned-bell', x: 89, y: 29 });
  b.deepProp(98, 28, 'bones');
  b.deepProp(76, 28, 'bones');
  b.secret({ id: 'wreck-log', x: 83, y: 18 });
  for (const [x, y] of [[100, 18], [79, 31], [96, 33]] as const) b.deepTall(x, y, 'pillar');
  for (const [x, y] of [[74, 18], [102, 26], [88, 33]] as const) b.deepProp(x, y, 'urchin');
  b.jarLamp(76, 21, 'home');
  b.jarLamp(88, 25, 'home');
  b.jarLamp(101, 23, 'area:wreck');
  b.sighting({ id: 'wreck-shadow', who: 'hush', x: 84, y: 34, after: 'job:51' });
  reef(b, 72, 104, 'top', 9);
  reef(b, 72, 104, 'bottom', 36);
  wreckExtras(b);
}

// ── D4: the Heart Hall ───────────────────────────────────────────────────────
function heartHall(b: MapBuilder) {
  b.area(
    {
      id: 'heart',
      name: 'The Heart Hall',
      jobs: [53],
      intro: 'heart-intro',
      outro: 'heart-outro',
      entry: { x: 106, y: 23, facing: 'right' },
    },
    [{ x: 104, y: 0, w: W - 104, h: H }],
  );
  b.reefWall(104, STREET, STREET + STREET_H - 1);
  b.gate(3, gateCells(104), 'kelp');
  // A great paved hall, open to the sea, with the Heart Jar at its far end.
  b.plaza(105, 11, 28, 18, true);
  b.mosaic(117, 19, 'star');
  b.group('job:53', [53]);
  const jar = b.deepBig(117, 6, 'heartJar', 'job:53');
  b.spots.push({ kind: 'job', x: jar.x, y: jar.y - 1, job: 53 });
  b.glow(119, 8.5, 'job:53', 8, '#fff1b0');
  b.resident('marlo', jar.x + 1, jar.y, 'down', { job: 53 });
  b.resident('hush', jar.x + 4, jar.y + 1, 'left', { until: 'job:53', chat: 'hush-before' });
  // Afterwards: the twins, and the little one, together.
  b.resident('grumble', jar.x - 3, jar.y + 2, 'right', { after: 'job:53', chat: 'grumble-deep' });
  b.resident('glimmer', jar.x - 2, jar.y + 3, 'right', { after: 'job:53', chat: 'glimmer-after' });
  b.resident('hush', jar.x + 3, jar.y + 2, 'left', { after: 'job:53', chat: 'hush-after' });
  for (const x of [108, 113, 126, 131]) {
    b.deepTall(x, 13, 'pillar');
    b.deepTall(x, 27, 'pillar');
  }
  b.jarLamp(110, 21, 'home');
  b.jarLamp(129, 21, 'home');
  b.jarLamp(110, 15, 'area:heart');
  b.jarLamp(129, 15, 'area:heart');
  b.spots.push({ kind: 'note', x: 132, y: 25, note: 'heart' });
  b.deepTall(132, 26, 'signpost');
  b.secret({ id: 'hall-names', x: 115, y: 12 });
  reef(b, 104, W, 'top', 3);
  reef(b, 104, W, 'bottom', 33);
  heartExtras(b);
}

/** The cells of the gap in a reef wall at column `x`, where the street goes through. */
function gateCells(x: number) {
  return Array.from({ length: STREET_H }, (_, k) => ({ x, y: STREET + k }));
}

/**
 * Drifts of sea grass and pebbles, a few coral heads and anemones in the thicker lumps, so
 * the open seabed is never a flat sheet. Leaves spots, people and anything already there alone.
 */
function seabedLife(b: MapBuilder) {
  const used = new Set<number>();
  for (const o of b.objects)
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) used.add((o.y + j) * b.width + o.x + i);
  const near = (x: number, y: number) =>
    b.spots.some((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1) ||
    b.residents.some((r) => Math.abs(r.x - x) <= 1 && Math.abs(r.y - y) <= 1);
  for (let y = 2; y < b.height - 2; y++)
    for (let x = 0; x < b.width; x++) {
      const i = y * b.width + x;
      if (b.solid[i] || used.has(i) || near(x, y)) continue;
      const c = lump(x, y, 3.4, 5);
      const n = hash(x * 0.71 + 2, y * 1.31);
      if (c > 0.66 && n < 0.5) b.deepProp(x, y, n < 0.3 ? 'seagrass' : 'pebbles');
      else if (c > 0.84 && n < 0.6) b.deepProp(x, y, n < 0.3 ? 'coral' : n < 0.45 ? 'anemone' : 'brainCoral');
      else if (c < 0.09 && n < 0.3) b.deepProp(x, y, 'rock');
    }
}

// ── Geography: helpers ───────────────────────────────────────────────────────

/**
 * The reef along the top or bottom of the map over columns x0..x1: a ragged mass of kelp,
 * coral trees, rocks and clumps that reaches in about `edge` rows. It has inlets and alcoves
 * (bare seabed you can swim into), loose fingers at its fringe, and no two columns alike.
 * Replaces MapBuilder.reef, whose every-cell kelp made a row of identical columns.
 */
function reef(b: MapBuilder, x0: number, x1: number, side: 'top' | 'bottom', edge: number) {
  const seed = x0 * 0.31 + edge * 1.7 + (side === 'top' ? 0 : 40);
  const lim = (x: number) => edge + Math.round((lump(x, 5, 6, seed) - 0.5) * 7 + (lump(x, 11, 2.2, seed + 4) - 0.5) * 2);
  const small = ['rock', 'brainCoral', 'coral', 'anemone', 'rock'] as const;
  const tall = ['kelp', 'kelpDark', 'kelp', 'kelpGold'] as const;
  const free = (x: number, y: number) => b.inside(x, y) && !b.solid[y * b.width + x] && !occupied(b, x, y);
  for (let y = 0; y < b.height; y++)
    for (let x = x0; x < x1; x++) {
      const l = lim(x);
      const d = side === 'top' ? l - y : y - l;
      if (d < -1 || !free(x, y)) continue;
      const rim = y < 2 || y >= b.height - 2; // the very edge of the map is always solid reef
      const cluster = lump(x, y, 4, seed + 9);
      const n = hash(x * 1.3 + seed, y * 0.7);
      if (!rim) {
        if (d <= 0 && n > 0.5) continue; // loose fingers at the fringe
        if (cluster < (d < 4 ? 0.22 : 0.3) && d < 7) continue; // an alcove of open seabed
      }
      const m = hash(x * 0.77 + seed, y * 1.9);
      if (m < 0.14 && free(x + 1, y) && x + 1 < x1 && y > 0) b.deepTall(x, y, m < 0.07 ? 'coralTree' : 'coralTreeOrange');
      else if (m < 0.62 || y === 0) b.deepProp(x, y, small[Math.floor(m * 100) % small.length]!);
      else b.deepTall(x, y, tall[Math.floor(m * 1000) % tall.length]!);
    }
}

type Cell = readonly [number, number];

/** A horizontal wall; with `dy` it is two rows thick (this row and the one `dy` away), so it reads as solid. */
const row = (y: number, x0: number, x1: number, skip: number[] = [], dy = 0): Cell[] =>
  Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i)
    .filter((x) => !skip.includes(x))
    .flatMap((x) => (dy ? [[x, y] as Cell, [x, y + dy] as Cell] : [[x, y] as Cell]));
const col = (x: number, y0: number, y1: number, skip: number[] = []): Cell[] =>
  Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i] as Cell).filter(([, y]) => !skip.includes(y));

/** Is something (a spot or a resident) standing on this cell? Walls must leave those alone. */
function occupied(b: MapBuilder, x: number, y: number) {
  return b.spots.some((s) => s.x === x && s.y === y) || b.residents.some((r) => r.x === x && r.y === y);
}

/** A thicket of kelp, rocks and coral over these cells (skipping cells already in use). */
function thicket(b: MapBuilder, cells: readonly Cell[]) {
  const kinds = ['kelp', 'kelpDark', 'kelp', 'kelpGold'] as const;
  for (const [x, y] of cells) {
    if (!b.inside(x, y) || b.solid[y * b.width + x] || occupied(b, x, y)) continue;
    const n = hash(x * 1.7, y * 2.3);
    b.deepTall(x, y, kinds[Math.floor(n * 100) % kinds.length]!);
    // A clump at the kelp's foot, so a wall reads as solid as the reef.
    const m = hash(x * 0.9, y * 3.1);
    if (m < 0.25) b.deepProp(x, y, 'rock');
    else if (m < 0.5) b.deepProp(x, y, 'brainCoral');
    else if (m < 0.7) b.deepProp(x, y, 'coral');
    else if (m < 0.85) b.deepProp(x, y, 'anemone');
  }
}

/** A sparse forest: kelp on about `density` of the cells in a rectangle, with a clearing left bare. */
function forest(b: MapBuilder, x: number, y: number, w: number, h: number, density: number, clear?: { x: number; y: number; w: number; h: number }) {
  const cells: Cell[] = [];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const cx = x + i;
      const cy = y + j;
      if (clear && cx >= clear.x && cx < clear.x + clear.w && cy >= clear.y && cy < clear.y + clear.h) continue;
      if (hash(cx * 0.37, cy * 0.83) < density) cells.push([cx, cy]);
    }
  thicket(b, cells);
}

/** A chest of sparks, drawn as the little sea chest. */
function seaChest(b: MapBuilder, id: string, x: number, y: number, sparks: number) {
  b.deepProp(x, y, 'chest');
  b.spots.push({ kind: 'chest', x, y, id, sparks });
}

function sign(b: MapBuilder, x: number, y: number, text: string) {
  b.spots.push({ kind: 'sign', x, y, text });
  b.deepTall(x, y, 'signpost');
}

// ── The Well's Bottom: a chimney landmark, a kelp patch and a nook ───────────
function wellExtras(b: MapBuilder) {
  // Two vent chimneys smoking in the north: you can see them from the spawn.
  b.deepTall(6, 19, 'vent');
  b.deepTall(8, 18, 'vent');
  b.deepProp(7, 19, 'rock');
  b.deepProp(9, 19, 'brainCoral');
  thicket(b, [[5, 18], [4, 19], [10, 18], [11, 19], [10, 20], [4, 17], [11, 17]]);
  // A kelp patch south of the well, with the little clearing Glimmer sits in.
  forest(b, 3, 28, 9, 3, 0.55, { x: 5, y: 26, w: 4, h: 4 });
  sign(b, 10, 21, 'A jar keeps lightning the way a capacitor keeps charge: fill it, and it glows on after the battery stops.');
  // The nook: a wall of kelp with one gap at (14,28), and a lone jar glowing outside it.
  thicket(b, [...row(28, 12, 15, [14], -1), ...col(12, 29, 30), ...row(31, 12, 15, [], 1)]);
  b.jarLamp(15, 27, 'home');
  seaChest(b, 'deep-well-nook', 14, 30, 15);
}

// ── Jar Street: a lookout mesa, a kelp ring, a hidden nook, the lamp graveyard
function jarsExtras(b: MapBuilder) {
  // The lamplighters' lookout: a sand mesa north of the street, a ladder up its face.
  b.plateau(24, 13, 6, 6, 'sand');
  b.ladder(25, 18, 'sand');
  sign(b, 27, 19, 'A sandy mesa with a ladder. The old lamplighters sat up there to watch the whole street.');
  b.jarLamp(25, 14, 'home');
  seaChest(b, 'deep-jars-mesa', 28, 14, 25);
  b.secret({ id: 'deep-lookout', x: 27, y: 16 });
  // A finger of reef hanging down between the mesa and Marlo's dome.
  thicket(b, [[31, 12], [31, 13], [31, 14], [31, 15], [31, 16], [32, 12], [32, 13], [30, 12], [31, 17]]);
  // A ring of kelp east of Marlo's dome, open at the bottom, with a jar glowing inside.
  thicket(b, [...row(13, 38, 42, [], -1), ...col(38, 14, 16), ...col(42, 14, 16), ...row(16, 38, 41, [40], 1)]);
  b.jarLamp(39, 15, 'home');
  seaChest(b, 'deep-jars-ring', 41, 14, 20);
  // A hidden nook at the street's west end: the only way in is a gap in the kelp, marked by a lone jar.
  thicket(b, [...row(28, 17, 22, [20], -1), ...col(17, 29, 30), ...col(22, 29, 30), ...row(31, 17, 22, [], 1)]);
  b.jarLamp(22, 27, 'home');
  seaChest(b, 'deep-jars-nook', 19, 30, 30);
  b.deepProp(21, 30, 'bones');
  // The lamp graveyard: jars that went out, in the sand south of the street.
  for (const [x, y] of [[36, 29], [38, 30], [41, 29], [37, 28]] as const) b.deepTall(x, y, 'jar');
  b.deepTall(40, 31, 'anchor');
  b.deepProp(39, 28, 'bones');
  b.deepProp(38, 28, 'bones');
  b.secret({ id: 'lamp-graveyard', x: 40, y: 30 });
  sign(b, 34, 28, 'A capacitor is a jar for electricity. It fills up, it holds on, and then it can pour out again.');
  forest(b, 18, 12, 5, 4, 0.35);
  b.resident('pearl', 27, 22, 'down', { chat: 'pearl-rumour' });
}

// ── The Coral Nursery: a hidden dome, a mesa, a vent garden ──────────────────
function nurseryExtras(b: MapBuilder) {
  // The hidden dome: walled in with kelp, one gap in the south wall, a lone jar beside it.
  b.deepBig(46, 12, 'dome');
  thicket(b, [...row(18, 45, 51, [49], 1), ...col(51, 12, 17)]);
  b.jarLamp(51, 19, 'home');
  sign(b, 47, 19, 'Tess says coral grows toward the light. Follow the lamp.');
  seaChest(b, 'deep-nursery-dome', 50, 16, 30);
  b.secret({ id: 'first-lamplighters', x: 48, y: 16 });
  b.deepProp(45, 16, 'coral');
  // The nursery mesa, north-east.
  b.plateau(64, 12, 7, 6, 'sand');
  b.ladder(66, 17, 'sand');
  b.jarLamp(65, 14, 'home');
  seaChest(b, 'deep-nursery-mesa', 69, 13, 25);
  // A vent garden: chimneys, rocks and kelp between the dome and the mesa.
  b.deepTall(58, 14, 'vent');
  b.deepTall(60, 15, 'vent');
  b.deepTall(59, 13, 'vent');
  b.deepProp(58, 16, 'rock');
  b.deepProp(61, 16, 'brainCoral');
  thicket(b, [[57, 13], [57, 14], [61, 13], [62, 14], [56, 15], [62, 16]]);
  sign(b, 63, 23, 'Lights on one loop share the current. Break the loop anywhere and they all go dark.');
  // A canyon of reef in the south, and a kelp wood with a clearing.
  thicket(b, [...col(62, 28, 32), ...col(63, 29, 32)]);
  forest(b, 66, 27, 6, 5, 0.5, { x: 68, y: 28, w: 3, h: 3 });
  b.resident('wren', 59, 22, 'left', { chat: 'wren-nursery' });
  b.resident('tess', 56, 24, 'right', { chat: 'tess-rumour' });
}

// ── The Wreck of the Marigold: a lookout mesa, a hull, the Hush's clearing ───
function wreckExtras(b: MapBuilder) {
  // The mesa behind Echo's camera.
  b.plateau(92, 12, 8, 6, 'sand');
  b.ladder(95, 17, 'sand');
  b.jarLamp(93, 14, 'home');
  seaChest(b, 'deep-wreck-mesa', 98, 13, 30);
  b.secret({ id: 'marigold-marlo', x: 96, y: 15 });
  // A reef spur north of the street, beside the wreck.
  thicket(b, [...col(86, 12, 17), ...col(87, 12, 15), [88, 12], [85, 12]]);
  // A second hull on its side in the south-east: ribs, and a hold you get into by one gap.
  thicket(b, [...row(28, 93, 101, [], -1), ...row(32, 93, 101, [], 1), ...col(93, 29, 31, [30]), ...col(101, 29, 31)]);
  b.deepTall(96, 31, 'anchor');
  b.jarLamp(91, 30, 'home');
  seaChest(b, 'deep-wreck-hull', 99, 30, 35);
  // The Hush's clearing, west: a ring of kelp opening where the bones lie.
  thicket(b, [...row(28, 73, 78, [76], -1), ...col(73, 29, 32), ...col(78, 29, 32), ...row(32, 74, 77, [], 1)]);
  b.secret({ id: 'hush-cold', x: 75, y: 30 });
  sign(b, 90, 28, 'Two bells cast together ring the same note. Strike one and the other hums back: that is resonance.');
  sign(b, 85, 21, 'No loop, no light. Current has to be able to get home.');
  b.resident('glimmer', 82, 24, 'left', { chat: 'glimmer-wreck' });
  b.resident('echo', 96, 25, 'left', { chat: 'echo-rumour' });
}

// ── The Heart Hall: the second bell, the cracked jar, a mesa ─────────────────
function heartExtras(b: MapBuilder) {
  // The bell that answers: a bell by the north-west wall, with a chest behind it.
  b.deepBig(108, 6, 'bell');
  b.secret({ id: 'two-bells', x: 110, y: 9 });
  b.jarLamp(113, 9, 'home');
  // A hairline crack in the Heart Jar, up close.
  b.secret({ id: 'crack-hum', x: 116, y: 9 });
  // A mesa in the north-east corner.
  b.plateau(125, 6, 8, 5, 'sand');
  b.ladder(128, 10, 'sand');
  b.jarLamp(126, 7, 'home');
  seaChest(b, 'deep-heart-mesa', 131, 7, 40);
  seaChest(b, 'deep-heart-bell', 106, 8, 30);
  thicket(b, [[105, 7], [106, 7], [107, 7], [105, 9], [107, 9], [105, 8]]);
  b.resident('marlo', 124, 26, 'left', { chat: 'marlo-rumour' });
}

/** Tiny physical puzzles under the sea: boulders to push and ledges to drop off. */
function puzzles(b: MapBuilder) {
  rockPlug(b, 114, 20, 'deep-rock-vault', 30, 'Something glints behind that boulder. Lean on it twice, and go round. You can push, but you can never pull.', true);
  ledgeTerrace(b, 77, 19, 'deep-ledge-shelf', 25, 'A shelf of rock with a one-way drop on its south side. In through the gap, out over the edge.', true);
}
