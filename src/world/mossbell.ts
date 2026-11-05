// World 3: Mossbell Hollow. An old mill village up the valley, half empty for fifty years.
// After Star Night one light stayed on up here, and people say a lady with a lantern walks
// the lanes at night. The road runs from the bus stop past the mill and the Mere, through
// the empty houses of Bellfield, and up to the old bell tower.
//
//   x:  0     16          44          72            104          136
//       Hollow │ Mill Lane │ The Mere  │ Bellfield    │ The Bell
//       Stop   │ 38, 39    │ 40, 41    │ 42, 43, 44   │ Tower 45, B

import { MapBuilder } from './builder';
import { ledgeTerrace, rockFill, rockPlug } from './puzzlekit';
import type { WorldMap } from './types';

const W = 136;
const H = 40;

export function buildMossbell(): WorldMap {
  const b = new MapBuilder(W, H, 'meadow');

  hollowStop(b);
  millLane(b);
  theMere(b);
  bellfield(b);
  bellTower(b);

  puzzles(b);
  return b.finish({ id: 'mossbell', name: 'Mossbell Hollow', spawn: { x: 6, y: 24, facing: 'right' }, night: '#56628f' });
}

// ── M0: the bus stop ─────────────────────────────────────────────────────────
function hollowStop(b: MapBuilder) {
  b.area({ id: 'stop', name: 'Hollow Stop', jobs: [], intro: 'hollow-intro', entry: { x: 6, y: 24, facing: 'right' } }, [
    { x: 0, y: 0, w: 16, h: H },
  ]);
  b.group('home', []);
  b.path('dirt', [{ x: 0, y: 24 }, { x: 8, y: 24 }, { x: 17, y: 23 }], 3);
  b.object(4, 21, 1, 2, [b.cityTile(167), b.cityTile(194)]);
  b.block(4, 22, 1, 1);
  b.spots.push({ kind: 'exit', x: 4, y: 22, to: 'harbour' });
  b.prop(3, 22, 'bench');
  b.lamp(8, 22, 'home', 'hook');
  b.resident('pip', 9, 25, 'left');
  b.spots.push({ kind: 'daily', x: 9, y: 25 });
  b.resident('gran', 11, 22, 'down', { chat: 'gran-hollow-b' });
  b.resident('wren', 12, 26, 'up', { chat: 'wren-hollow-b', until: 'area:mill' });
  b.ruin('kiln', 1, 17);
  b.spots.push({ kind: 'sign', x: 13, y: 21, text: 'MOSSBELL HOLLOW. Population: 3. Somebody has scratched out the 3 and written 4.' });
  b.prop(13, 21, 'sign');
  stopExtras(b);
  b.treeLine(0, 16, 'top', 4, ['dead', 'pine', 'dead']);
  b.treeLine(0, 16, 'bottom', 33, ['pine', 'dead', 'round']);
  for (const [x, y] of [[6, 28], [14, 18], [2, 27]] as const) b.prop(x, y, 'mushroom');
  b.secret({ id: 'scratched-sign', x: 1, y: 25 });
  b.prop(1, 25, 'stump');
}

// ── M1: Mill Lane ────────────────────────────────────────────────────────────
function millLane(b: MapBuilder) {
  b.area(
    {
      id: 'mill',
      name: 'Mill Lane',
      jobs: [38, 39],
      intro: 'mill-intro',
      outro: 'mill-outro',
      entry: { x: 18, y: 23, facing: 'right' },
      gate: 'The path to the Mere goes into the fog. Pip won’t go in there. Not yet.',
    },
    [{ x: 16, y: 0, w: 28, h: H }],
  );
  b.wall(16, 21, 25);
  b.path('dirt', [{ x: 16, y: 23 }, { x: 24, y: 22 }, { x: 33, y: 24 }, { x: 45, y: 23 }], 3);
  // The mill stream runs down from the hills; a little bridge crosses it.
  b.path('pond', [{ x: 38, y: -1 }, { x: 37, y: 10 }, { x: 39, y: 20 }, { x: 37, y: 30 }, { x: 38, y: 41 }], 3);
  b.boards(36, 22, 4, 3, 'h', true);

  // The mill: a tall old A-frame on the stream bank, and Hazel's yard lamp outside it.
  b.group('job:39', [39]);
  const mill = b.ruin('aFrame', 29, 13, 'job:39');
  b.spots.push({ kind: 'job', x: mill.x, y: mill.y - 1, job: 39 });
  b.doorLight(mill, 'job:39');
  b.path('dirt', [{ x: 30, y: 18 }, { x: 30, y: 22 }], 2);
  b.group('job:38', [38]);
  b.lamp(26, 20, 'job:38', 'hook');
  b.spots.push({ kind: 'job', x: 26, y: 20, job: 38 });
  b.resident('hazel', 27, 20, 'left', { job: 38 });
  b.resident('hazel', 31, 18, 'down', { job: 39 });
  b.resident('hazel', 21, 20, 'left', { chat: 'hazel-mill' });
  // Hazel's cottage, with a vegetable bed run wild.
  b.ruin('paleHouse', 20, 15, 'area:mill');
  b.bed(24, 16, 3, 2, 'meadow');
  b.prop(23, 26, 'well');
  b.secret({ id: 'mill-well', x: 23, y: 26 });

  for (const [x, y] of [[21, 28], [41, 27]] as const) b.prop(x, y, 'barrel');
  b.lamp(19, 25, 'area:mill', 'hook');
  b.lamp(35, 26, 'area:mill', 'hook');
  b.mossy('bigTree', 17, 27);
  b.mossy('tree', 42, 12);
  millExtras(b);
  b.treeLine(16, 44, 'top', 5, ['dead', 'pine', 'round']);
  b.treeLine(16, 44, 'bottom', 33, ['pine', 'dead', 'round']);
  for (const [x, y] of [[25, 25], [33, 20], [28, 27], [42, 21]] as const) b.prop(x, y, 'fern');
  b.spots.push({ kind: 'note', x: 42, y: 25, note: 'valley' });
  b.sighting({ id: 'mill-lantern', who: 'glimmer', x: 42, y: 29 });
  b.prop(42, 25, 'sign');
}

// ── M2: the Mere ─────────────────────────────────────────────────────────────
function theMere(b: MapBuilder) {
  b.area(
    {
      id: 'mere',
      name: 'The Mere',
      jobs: [40, 41],
      intro: 'mere-intro',
      outro: 'mere-outro',
      entry: { x: 46, y: 23, facing: 'right' },
      gate: 'Bellfield’s houses are dark, and something’s moving between them. Help Bram first.',
    },
    [{ x: 44, y: 0, w: 28, h: H }],
  );
  b.wall(44, 21, 25);
  b.gate(1, [{ x: 44, y: 21 }, { x: 44, y: 22 }, { x: 44, y: 23 }, { x: 44, y: 24 }, { x: 44, y: 25 }]);
  // A still, dark lake below the road; a jetty runs out to Bram's ferry.
  b.blob('pond', 58, 32, 11, 6.5, 0.2);
  b.path('dirt', [{ x: 44, y: 23 }, { x: 52, y: 22 }, { x: 62, y: 23 }, { x: 73, y: 22 }], 3);
  b.boards(56, 25, 2, 7, 'v', true);
  b.boards(52, 32, 8, 2, 'h');

  // Job 40: the ferry lantern, on Bram's boat at the end of the jetty.
  b.group('job:40', [40]);
  const t = (i: number) => b.waterTile(i);
  b.object(54, 34, 2, 1, [t(26), t(27)], 'job:40');
  b.object(56, 34, 2, 1, [t(26), t(27)], 'job:40');
  b.glow(56, 34.5, 'job:40', 3.5, '#ffd27a');
  b.spots.push({ kind: 'job', x: 55, y: 34, job: 40 });
  b.resident('bram', 53, 33, 'right', { job: 40 });
  // Job 41: the landing beacon at the top of the jetty.
  b.group('job:41', [41]);
  b.lamp(58, 25, 'job:41', 'post');
  b.spots.push({ kind: 'job', x: 58, y: 25, job: 41 });
  b.resident('bram', 59, 25, 'left', { job: 41 });
  b.resident('wren', 47, 26, 'right', { chat: 'wren-mere', after: 'area:mill', until: 'area:mere' });

  b.ruin('mossHouse', 48, 15, 'area:mere');
  b.ruin('stiltHut', 64, 13);
  for (const [x, y] of [[49, 28], [66, 29], [47, 34], [69, 33], [62, 27]] as const) b.prop(x, y, 'reeds');
  for (const [x, y] of [[60, 30], [52, 36], [63, 35]] as const) b.prop(x, y, 'lily');
  b.mossy('boulder', 68, 25);
  b.lamp(51, 21, 'area:mere', 'park');
  b.lamp(66, 21, 'area:mere', 'park');
  // Will-o'-the-wisps over the water once the Mere is safe.
  for (const [x, y] of [[50, 31], [61, 37], [66, 32]] as const) b.glow(x, y, 'area:mere', 1.5, '#c6ff7a');
  mereExtras(b);
  b.treeLine(44, 72, 'top', 0, ['dead', 'pine', 'dead']);
  b.treeLine(44, 72, 'bottom', 39, ['pine']);
  b.secret({ id: 'mere-reflection', x: 60, y: 33 });
}

// ── M3: Bellfield ────────────────────────────────────────────────────────────
function bellfield(b: MapBuilder) {
  b.area(
    {
      id: 'bellfield',
      name: 'Bellfield',
      jobs: [42, 43, 44],
      intro: 'bellfield-intro',
      outro: 'bellfield-outro',
      entry: { x: 74, y: 22, facing: 'right' },
      gate: 'The way up to the bell tower is pitch black, and the bell keeps ringing. Bellfield first.',
    },
    [{ x: 72, y: 0, w: 32, h: H }],
  );
  b.wall(72, 20, 24, 'fence');
  b.gate(2, [{ x: 72, y: 20 }, { x: 72, y: 21 }, { x: 72, y: 22 }, { x: 72, y: 23 }, { x: 72, y: 24 }]);
  b.rect('meadow', 72, 0, 32, H);
  b.path('darkDirt', [{ x: 71, y: 22 }, { x: 80, y: 23 }, { x: 88, y: 21 }, { x: 96, y: 23 }, { x: 105, y: 21 }], 3);
  // The empty village: the old schoolroom, the chapel, Tom's workshop on its stilts.
  const school = jobRuin(b, 42, 'moth', 'mossHouse', 76, 14);
  b.path('darkDirt', [{ x: school.x, y: school.y }, { x: school.x, y: 21 }], 2);
  const chapel = jobRuin(b, 43, 'moth', 'stoneHut', 86, 26);
  b.path('darkDirt', [{ x: chapel.x, y: 23 }, { x: chapel.x, y: chapel.y + 1 }], 2);
  const workshop = jobRuin(b, 44, 'hazel', 'stiltHut', 95, 12);
  b.path('darkDirt', [{ x: workshop.x, y: workshop.y }, { x: workshop.x, y: 21 }], 2);

  // The chapel yard: old stones, leaning.
  for (const [x, y] of [[82, 30], [84, 31], [91, 30], [93, 31], [82, 33]] as const) b.prop(x, y, 'grave');
  b.prop(92, 33, 'cross');
  b.secret({ id: 'chapel-stone', x: 84, y: 31 });
  b.mossy('frog', 80, 18);
  b.secret({ id: 'frog-statue', x: 80, y: 19 });
  b.mossy('pillar', 99, 25);
  b.mossy('boulder', 89, 15);
  b.ruin('kiln', 101, 15);
  b.mossy('tree2', 74, 28);
  b.lamp(78, 25, 'area:bellfield', 'post');
  b.resident('moth', 82, 24, 'left', { chat: 'moth-bellfield' });
  b.lamp(93, 20, 'area:bellfield', 'post');
  b.lamp(100, 23, 'area:bellfield', 'post');
  for (const [x, y] of [[79, 21], [85, 19], [98, 20], [90, 25], [83, 24]] as const) b.prop(x, y, 'mushroom');
  bellfieldExtras(b);
  b.treeLine(72, 104, 'top', 1, ['dead', 'dead', 'pine']);
  b.treeLine(72, 104, 'bottom', 32, ['dead', 'pine']);
  // Moth's game: her grandpa's old meter, nailed to a post by the schoolroom path.
  b.prop(84, 19, 'sign');
  b.spots.push({ kind: 'game', x: 84, y: 19, game: 'needle' });
  // Hazel's mill-room panel of stopped clocks: Clock Panel.
  b.prop(87, 19, 'sign');
  b.spots.push({ kind: 'game', x: 87, y: 19, game: 'panel' });
  b.spots.push({ kind: 'note', x: 102, y: 25, note: 'two' });
  b.sighting({ id: 'bellfield-lantern', who: 'glimmer', x: 97, y: 28 });
  b.prop(102, 25, 'sign');
}

// ── M4: the bell tower ───────────────────────────────────────────────────────
function bellTower(b: MapBuilder) {
  b.area(
    {
      id: 'tower',
      name: 'The Bell Tower',
      jobs: [45, 46],
      intro: 'tower-intro',
      outro: 'tower-outro',
      entry: { x: 106, y: 21, facing: 'right' },
    },
    [{ x: 104, y: 0, w: W - 104, h: H }],
  );
  b.wall(104, 19, 23, 'fence');
  b.gate(3, [{ x: 104, y: 19 }, { x: 104, y: 20 }, { x: 104, y: 21 }, { x: 104, y: 22 }, { x: 104, y: 23 }]);
  b.rect('meadow', 104, 0, W - 104, H);
  b.path('darkDirt', [{ x: 103, y: 21 }, { x: 112, y: 22 }, { x: 118, y: 25 }, { x: 124, y: 24 }], 3);
  // A worn square of old cobbles in front of the tower.
  b.plaza(115, 17, 13, 10, true);
  b.mosaic(119, 20, 'star');

  // The Mossbell tower: mossy stone, its clock stopped at 8 minutes to midnight.
  b.group('job:46', [46]);
  const tower = b.clocktower(119, 7, 'moss', 'job:46');
  b.spots.push({ kind: 'job', x: tower.x, y: tower.y - 1, job: 46 });
  b.glow(121.5, 10.2, 'job:46', 5.5, '#fff1b0');
  b.doorLight(tower, 'job:46');
  b.resident('glimmer', tower.x + 1, tower.y, 'down', { job: 46, after: 'job:45' });
  // Job 45: Professor Lumen's stair lamp, at the foot of the tower steps.
  b.group('job:45', [45]);
  b.lamp(117, 18, 'job:45', 'twin');
  b.spots.push({ kind: 'job', x: 117, y: 18, job: 45 });
  b.resident('lumen', 116, 19, 'right', { job: 45 });
  b.resident('grumble', 125, 18, 'left', { after: 'job:45', until: 'job:46' });

  b.lamp(115, 26, 'area:tower', 'twin');
  b.lamp(127, 26, 'area:tower', 'twin');
  for (const [x, y] of [[110, 27], [130, 16], [112, 14], [131, 28]] as const) b.prop(x, y, 'grave');
  b.mossy('bigTree2', 128, 29);
  b.mossy('tree', 109, 15);
  towerExtras(b);
  b.treeLine(104, W, 'top', 3, ['dead', 'pine']);
  b.treeLine(104, W, 'bottom', 36, ['dead', 'pine']);
  b.secret({ id: 'tower-clock', x: 124, y: 16 });
  // The old well behind the tower: Glimmer's bubble goes down it, all the way to the sea.
  b.prop(131, 22, 'well');
  b.spots.push({ kind: 'exit', x: 131, y: 22, to: 'deep', via: 'bubble' });
}

// ── Extras: bog, ridges, caves and hidden things ─────────────────────────────

/** A signpost with a line of text. */
function sign(b: MapBuilder, x: number, y: number, text: string) {
  b.prop(x, y, 'sign');
  b.spots.push({ kind: 'sign', x, y, text });
}
/** Text on a thing that's already there (a gravestone). */
function say(b: MapBuilder, x: number, y: number, text: string) {
  b.spots.push({ kind: 'sign', x, y, text });
}
/** Keep trees off these cells (the builder keeps the set private, so reach in). */
function reserve(b: MapBuilder, x: number, y: number, w: number, h: number) {
  const taken = (b as unknown as { taken: Set<number> }).taken;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) taken.add((y + j) * b.width + x + i);
}
function walk(b: MapBuilder, x: number, y: number, w: number, h: number, along: 'h' | 'v' = 'h', rails = false) {
  b.boards(x, y, w, h, along, rails);
  reserve(b, x, y, w, h);
}
function steps(b: MapBuilder, cells: (readonly [number, number])[]) {
  b.stones(cells);
  for (const [x, y] of cells) reserve(b, x, y, 1, 1);
}
function put(b: MapBuilder, name: Parameters<MapBuilder['prop']>[2], cells: (readonly [number, number])[]) {
  for (const [x, y] of cells) b.prop(x, y, name);
}

/** Hollow Stop: a mossy ridge behind the bus stop, and a boardwalk out into a still pond. */
function stopExtras(b: MapBuilder) {
  // Terrain first: the pond with its muddy margin, and the trail to the ridge.
  b.blob('darkDirt', 9, 34.5, 6.2, 4.3, 0.2);
  b.blob('pond', 9, 34.5, 4.6, 3.3, 0.08);
  b.blob('darkDirt', 9.5, 34, 1.7, 1.2, 0.1);
  b.path('dirt', [{ x: 7, y: 23 }, { x: 7, y: 13 }], 2);

  // The ridge: a green hill with a ladder, and a chest left up there.
  b.plateau(4, 5, 9, 8, 'green');
  b.ladder(7, 12, 'green');
  b.tree(6, 8, 'dead');
  b.prop(10, 7, 'bench');
  b.prop(11, 7, 'bench');
  b.chest('mossbell-hollow-ridge', 11, 10, 20);
  put(b, 'mushroom', [[9, 9], [6, 10], [10, 10]]);
  b.lamp(8, 7, 'area:stop', 'park');
  sign(b, 9, 18, 'A ladder up the ridge behind the kiln. Somebody leaves things up there for the next person to find.');
  sign(b, 8, 9, 'On a clear night you can see the bell tower from here. Its clock says 11:52. Mine says that too, and I am not wearing one.');

  // The pond: a boardwalk straight out into it, to a patch of dry mud.
  walk(b, 9, 26, 1, 7, 'v');
  b.secret({ id: 'mossbell-footprints', x: 9, y: 33 });
  put(b, 'reeds', [[5, 31], [13, 32], [4, 35], [14, 35], [7, 37]]);
  put(b, 'lily', [[6, 33], [12, 35]]);
  b.forest(0, 0, 16, 21, ['dead', 'pine', 'dead'], 0.45);
  b.forest(0, 26, 16, 14, ['dead', 'pine', 'round'], 0.55);
  sign(b, 10, 27, 'Wet footprints on the planks. They come out of the pond and go up toward the bus stop. Small ones. Bare.');
}

/** Mill Lane: a bog to the north (mill pond, stone circle, a footbridge) and a ridge to the south. */
function millExtras(b: MapBuilder) {
  // The mill pond, with a muddy margin, and the mill race running down to Hazel's wheel.
  b.blob('darkDirt', 22, 9, 6.4, 4.2, 0.2);
  b.blob('pond', 22, 9, 4.8, 3.1, 0.08);
  b.blob('darkDirt', 22, 8, 1.4, 1.0, 0.1);
  b.blob('pond', 37, 16, 2.8, 1.5, 0.05);
  // The stone circle on a bed of old flagstones.
  b.blob('stone', 30, 8, 2.6, 2.0, 0.15);
  // Trails: west of the house up to the pond, east of the mill up to the circle and the footbridge.
  b.path('dirt', [{ x: 19, y: 22 }, { x: 19, y: 13 }, { x: 22, y: 13 }, { x: 22, y: 12 }], 2);
  b.path('dirt', [{ x: 33, y: 22 }, { x: 33, y: 13 }, { x: 30, y: 12 }, { x: 30, y: 11 }], 2);
  b.path('dirt', [{ x: 33, y: 13 }, { x: 34, y: 9 }], 2);
  b.path('dirt', [{ x: 41, y: 9 }, { x: 41, y: 22 }], 2);
  // The south ridge and the bog with its self-lit lamp.
  b.blob('darkDirt', 21.5, 34, 5.3, 4.2, 0.2);
  b.blob('pond', 21.5, 34, 4.2, 3.4, 0.08);
  b.blob('darkDirt', 21.5, 34.5, 1.8, 1.4, 0.1);
  b.path('dirt', [{ x: 26, y: 25 }, { x: 26, y: 37 }, { x: 30, y: 37 }], 2);

  // Mill pond: stones to the island, and a chest on it.
  steps(b, [[22, 11], [22, 10], [22, 9]]);
  b.chest('mossbell-millpond', 22, 7, 25);
  put(b, 'reeds', [[18, 12], [25, 12], [17, 8], [26, 7], [20, 5]]);
  put(b, 'lily', [[19, 9], [24, 10], [20, 7]]);
  sign(b, 18, 19, 'MILL POND. Mind the stones. Old Hazel’s husband hid the lamp-oil money out on the island. Nobody has been brave enough to look.');

  // The stone circle: a ring of standing stones, a gap to the south, and a hum at the middle.
  put(b, 'rock', [[30, 5], [32, 6], [33, 8], [32, 10], [28, 10], [28, 6], [27, 8]]);
  b.glow(30, 8, 'area:mill', 3, '#a9c8ff');
  // The race and a footbridge over the stream, so the trail loops back down the east bank.
  walk(b, 35, 9, 6, 1, 'h', true);
  put(b, 'reeds', [[34, 14], [36, 18], [40, 14], [35, 11]]);
  b.lamp(34, 11, 'area:mill', 'hook');
  sign(b, 34, 19, 'HAZEL’S MILL. The race turns the wheel, the wheel turns the stone. Break the chain anywhere and everything stops. That is a series circuit.');
  sign(b, 40, 11, 'A little bridge on the quiet side. The planks hum when it is going to rain, or when somebody is about to walk by.');

  // The south ridge, with a ladder, a view and a chest.
  b.plateau(27, 29, 8, 7, 'green');
  b.ladder(30, 35, 'green');
  b.chest('mossbell-mill-ridge', 33, 30, 30);
  b.lamp(31, 31, 'area:mill', 'park');
  b.prop(29, 32, 'bench');
  b.tree(32, 33, 'dead');
  put(b, 'mushroom', [[28, 31], [33, 32]]);
  sign(b, 27, 26, 'A ridge to the south, and a ladder up the cliff. The wire to Hazel’s lamp comes down off the hills there. A loop is only complete if it comes back.');

  // The bog: a boardwalk to an island whose lamp is lit though nobody lit it.
  walk(b, 22, 25, 1, 8, 'v');
  b.group('glade', []);
  b.lamp(21, 35, 'glade', 'hook');
  b.secret({ id: 'mossbell-selflit', x: 22, y: 34 });
  put(b, 'reeds', [[17, 32], [26, 31], [18, 37], [25, 37]]);
  put(b, 'lily', [[19, 32], [24, 36], [20, 37]]);
  sign(b, 21, 26, 'There is a lamp burning out on the bog island, and no wire runs to it. A lamp is just a loop with a light in it. Where is this one’s loop?');
  b.mossy('boulder', 40, 34);
  b.forest(16, 0, 28, 21, ['dead', 'pine', 'round'], 0.4);
  b.forest(16, 26, 28, 14, ['dead', 'pine', 'round'], 0.5);
  for (const [x, y] of [[40, 24], [42, 20], [41, 32]] as const) b.prop(x, y, 'fern');
}

/** The Mere: a marsh to the north with a boardwalk loop, an island chest and a cave; a ridge in the corner. */
function mereExtras(b: MapBuilder) {
  b.blob('darkDirt', 56, 9, 8.5, 4.8, 0.2);
  b.blob('pond', 56, 9, 6.6, 3.4, 0.08);
  b.blob('darkDirt', 56, 9, 1.8, 1.5, 0.1);
  b.path('dirt', [{ x: 52, y: 22 }, { x: 52, y: 12 }], 2);
  b.path('dirt', [{ x: 60, y: 22 }, { x: 60, y: 12 }], 2);
  b.path('dirt', [{ x: 52, y: 5 }, { x: 60, y: 5 }], 2);
  b.path('dirt', [{ x: 68, y: 22 }, { x: 68, y: 10 }, { x: 67, y: 8 }], 2);

  // The loop: up one boardwalk, across the north shore, back down the other.
  walk(b, 52, 6, 1, 7, 'v');
  walk(b, 60, 6, 1, 7, 'v');
  // The island, with stones to it from the north shore.
  steps(b, [[56, 6], [56, 7], [56, 8]]);
  b.chest('mossbell-reedisland', 56, 9, 25);
  put(b, 'reeds', [[50, 12], [62, 11], [51, 7], [62, 7], [54, 11], [58, 11], [55, 5], [58, 5]]);
  put(b, 'lily', [[54, 7], [58, 8], [57, 11]]);
  sign(b, 53, 5, 'Something glints out on the reed island. Whatever it is, it was left for somebody who can count stones.');
  sign(b, 53, 14, 'A loop of planks. Walk it twice and you end up where you began. Current is like that: it has to come home.');

  // The grotto: a cave in the hillside on the north shore.
  const door = b.cave(56, 2, 'green');
  b.secret({ id: 'mossbell-grotto-bell', x: door.x, y: door.y });
  sign(b, 61, 4, 'A cold draft from the grotto, and it smells of the sea. We are nowhere near the sea.');

  // The ridge in the north-east corner.
  b.plateau(64, 1, 7, 7, 'green');
  b.ladder(67, 7, 'green');
  b.chest('mossbell-mere-ridge', 69, 3, 35);
  b.prop(65, 5, 'bench');
  b.prop(66, 5, 'bench');
  b.lamp(69, 5, 'area:mere', 'park');
  b.tree(65, 3, 'dead');
  sign(b, 68, 11, 'A ladder up to the ridge. From the top the Mere looks like a dropped mirror, and the beacon looks like a very small star.');
  sign(b, 50, 25, 'FERRY. When the beacon dims, do not board. Dim means not enough current is getting through. Ask the ferryman to check the wire.');
  put(b, 'reeds', [[46, 30], [48, 36], [70, 30]]);
  b.mossy('boulder', 46, 27);
  b.mossy('tree2', 69, 33);
  b.forest(44, 0, 28, 21, ['dead', 'dead', 'pine'], 0.45);
  b.forest(44, 26, 28, 14, ['dead', 'pine'], 0.5);
}

/** Bellfield: a churchyard hill, a boardwalk loop round a pond, and a hidden glade. */
function bellfieldExtras(b: MapBuilder) {
  // Terrain: the pond and its mud, the trails, the glade's dark ground.
  b.blob('darkDirt', 98, 33.5, 5.4, 4.8, 0.15);
  b.blob('pond', 98, 33.2, 3.7, 3.6, 0.06);
  b.blob('darkDirt', 98, 34, 1.4, 1.1, 0.1);
  b.blob('darkDirt', 78, 35, 4.4, 2.9, 0.2);
  b.path('darkDirt', [{ x: 77, y: 25 }, { x: 77, y: 33 }], 2);
  b.path('darkDirt', [{ x: 85, y: 22 }, { x: 85, y: 11 }], 2);

  // The churchyard hill, with the collapsed chapel and its ropes.
  b.plateau(79, 2, 14, 9, 'green');
  b.ladder(85, 10, 'green');
  const door = b.ruin('mound', 82, 3);
  b.secret({ id: 'mossbell-ropes', x: door.x, y: door.y });
  b.tree(80, 5, 'dead');
  for (const [x, y, t] of [
    [88, 4, 'HERE LIES THE VILLAGE CLOCK. IT STOPPED AT 11:52 AND NEVER TOLD US WHY.'],
    [90, 4, 'MARTHA OAK. SHE SAID THE BELL WAS HER FRIEND. SHE WAS RIGHT.'],
    [89, 7, 'NED. HE WOUND EVERY CLOCK IN THE HOLLOW. SOMEBODY STILL KEEPS HIS FLOWERS FRESH.'],
  ] as const) {
    b.prop(x, y, 'grave');
    say(b, x, y, t);
  }
  b.prop(91, 6, 'cross');
  b.chest('mossbell-chapel-hill', 91, 3, 35);
  b.prop(87, 8, 'well');
  say(b, 87, 8, 'The chapel’s well. Somebody has hung a lantern on the rope. It is the wrong way up, and still lit.');
  b.lamp(81, 8, 'area:bellfield', 'post');
  put(b, 'mushroom', [[83, 8], [90, 8], [81, 6]]);
  sign(b, 83, 12, 'CHAPEL HILL. The ladder is round the back of the hill, where the stairs fell in. Mind the loose rungs.');

  // The pond loop: down one side of the boards, along the bottom, up the other.
  walk(b, 95, 26, 1, 12, 'v');
  walk(b, 101, 26, 1, 12, 'v');
  walk(b, 95, 37, 7, 1, 'h');
  steps(b, [[96, 34], [97, 34], [98, 34]]);
  b.chest('mossbell-bellfield-pond', 99, 34, 30);
  put(b, 'reeds', [[94, 30], [102, 31], [94, 36], [102, 36], [98, 30]]);
  put(b, 'lily', [[97, 32], [100, 36]]);
  sign(b, 96, 25, 'A pond with a boardwalk all the way round. In the middle, a little island. Walk the loop and you will see why. (Hint: stones.)');

  // The glade: an odd tree by the lamp, a path no one swept, and a ring of mushrooms round a warm lantern.
  b.prop(78, 34, 'stump');
  b.secret({ id: 'mossbell-glade-oil', x: 78, y: 35 });
  put(b, 'mushroom', [[77, 35], [79, 35], [78, 36], [76, 34], [80, 34], [76, 37], [80, 37]]);
  b.chest('mossbell-glade', 81, 36, 40);
  sign(b, 76, 27, 'NOT THAT WAY. (Somebody has crossed this out. Somebody else has written: yes, that way.)');
  sign(b, 81, 24, 'A string of lamps on one wire is a series circuit: one burned-out bulb and the whole street goes dark. Bellfield’s lamps were wired like that.');
  put(b, 'rock', [[75, 34], [81, 33]]);
  b.forest(72, 0, 32, 20, ['dead', 'dead', 'pine'], 0.4);
  b.forest(72, 26, 32, 14, ['dead', 'dead', 'pine'], 0.55);
}

/** The bell tower: a lookout ridge, a cave breathing fog, and a pool the bell was cast beside. */
function towerExtras(b: MapBuilder) {
  b.path('dirt', [{ x: 128, y: 21 }, { x: 129, y: 21 }, { x: 129, y: 12 }, { x: 130, y: 11 }], 2);
  b.path('dirt', [{ x: 113, y: 21 }, { x: 113, y: 8 }, { x: 112, y: 7 }], 2);
  b.path('dirt', [{ x: 112, y: 25 }, { x: 112, y: 29 }], 2);
  b.blob('darkDirt', 112, 33, 6, 4.2, 0.2);
  b.blob('pond', 112, 33, 4.4, 3.3, 0.08);
  b.blob('darkDirt', 112, 32.5, 1.6, 1.1, 0.1);

  // The east ridge, with the whole square below it.
  b.plateau(127, 3, 8, 8, 'green');
  b.ladder(130, 10, 'green');
  b.chest('mossbell-tower-ridge', 133, 4, 40);
  b.lamp(130, 5, 'area:tower', 'twin');
  b.prop(128, 7, 'bench');
  b.tree(128, 5, 'dead');
  put(b, 'mushroom', [[132, 7], [131, 8]]);
  sign(b, 131, 12, 'LOOKOUT. From up there you can see every lamp in the Hollow. Count the dark ones. Then count the ones that are not.');

  // The cave on the hill to the north-west, breathing fog.
  const door = b.cave(111, 4, 'green');
  b.secret({ id: 'mossbell-hush-cave', x: door.x, y: door.y });
  sign(b, 111, 9, 'COLD DRAFT. Smells like rain and wet pennies. If you hear something sigh, it is only the wind. Probably.');

  // The bell pool: stones out to an island.
  steps(b, [[112, 30], [112, 31]]);
  b.chest('mossbell-bellpool', 112, 33, 30);
  put(b, 'reeds', [[107, 31], [117, 31], [108, 36], [116, 36], [114, 29]]);
  put(b, 'lily', [[110, 34], [114, 35]]);
  sign(b, 114, 28, 'The bell was cast from the water in this pool, they say. Drop a pebble in and count: the ring comes back after thirteen.');
  b.mossy('boulder', 107, 21);
  b.forest(104, 0, 32, 17, ['dead', 'pine'], 0.4);
  b.forest(104, 27, 32, 13, ['dead', 'pine'], 0.5);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** An old building with a job: its doorway glows once solved; the client waits beside it. */
function jobRuin(b: MapBuilder, id: number, who: string, style: Parameters<MapBuilder['ruin']>[0], x: number, y: number) {
  const group = `job:${id}`;
  b.group(group, [id]);
  const door = b.ruin(style, x, y, group);
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: id });
  b.doorLight(door, group);
  b.resident(who, door.x + 1, door.y, 'down', { job: id });
  return door;
}

/** Tiny physical puzzles: boulders to push, ledges to hop, and fish in the mere. */
function puzzles(b: MapBuilder) {
  rockFill(b, 52, 15, 'mossbell-rock-bog', 25, 'A bog runs through this hedge room, with a chest beyond it. The boulder will slide if you lean on it. Bog is soft, but it isn’t bottomless.');
  rockPlug(b, 116, 22, 'mossbell-rock-plug', 30, 'A boulder plugs the gap. Nobody remembers who put it there. Push it in, and walk round it.');
  ledgeTerrace(b, 28, 22, 'mossbell-ledge-mill', 20, 'The miller built this terrace with a drop on its south side. In by the gap, out by the ledge. Never the other way.');
  ledgeTerrace(b, 94, 5, 'mossbell-ledge-bell', 25, 'Step off a ledge going down, and there’s no climbing back. Remember that on the way in.');
  b.fish('mossbell-mere', 36, 27);
  b.fish('mossbell-bog', 12, 33);
}
