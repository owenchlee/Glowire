// World 1: Glowtown. One road, the Glowire, runs from Gran's workshop in the west to the
// Market Clock in the east, and every stretch of it is a different part of town. Each
// stretch stays dark until the one before it is fixed.
//
//   x:  0      18          45         67          91          115        139        161    180
//       Workshop │ Maple Lane │ Willow    │ Schoolhouse│ Whisper    │ Market   │ Cross-   │ Clock
//       yard     │ (1–3)      │ Brook 4–6 │ Hill (7–9) │ Woods 10,B │ Sq 11–15 │ roads    │ Plaza B
//                                                                               16–18

import { MapBuilder, type BuildingSpec, type HouseStyle } from './builder';
import type { Point, WorldMap } from './types';

const W = 180;
const H = 40;

export function buildGlowtown(): WorldMap {
  const b = new MapBuilder(W, H, 'grass');

  workshop(b);
  mapleLane(b);
  willowBrook(b);
  schoolhouseHill(b);
  whisperWoods(b);
  marketSquare(b);
  crossroads(b);
  clockPlaza(b);

  return b.finish({ id: 'glowtown', name: 'Glowtown', spawn: { x: 9, y: 25, facing: 'right' } });
}

// ── A0: Gran's workshop ──────────────────────────────────────────────────────
function workshop(b: MapBuilder) {
  b.area(
    { id: 'workshop', name: 'Gran’s Workshop', jobs: [], intro: 'prologue', entry: { x: 9, y: 25, facing: 'right' } },
    [{ x: 0, y: 0, w: 18, h: H }],
  );
  b.group('home', []);
  // A dirt yard in front of the workshop, worn into a path out of the gate.
  b.blob('dirt', 9.5, 24.5, 7.5, 4, 0.12);
  b.path('dirt', [{ x: 12, y: 25 }, { x: 19, y: 25 }], 3);

  const door = b.building({ x: 3, y: 15, w: 7, roofStyle: 'tan', wall: 'orange', door: 'double', group: 'home' });
  b.doorLight(door, 'home');
  const shop = b.house('shop', 12, 17, 'home');
  b.spots.push({ kind: 'shop', x: shop.x, y: shop.y - 1 });
  b.doorLight(shop, 'home');

  b.resident('gran', door.x + 1, door.y, 'down', { chat: 'gran-home', until: 'area:maple' });
  b.resident('pip', 10, 24, 'down');
  b.spots.push({ kind: 'daily', x: 10, y: 24 });
  b.spots.push({ kind: 'note', x: 2, y: 22, note: 'glowire' });
  b.prop(2, 22, 'sign');

  b.lamp(2, 28, 'home', 'hook');
  b.lamp(16, 21, 'home', 'hook');
  b.prop(5, 22, 'barrel');
  b.prop(6, 22, 'crate');
  b.prop(11, 21, 'bench');
  b.fence(2, 29, 15);
  for (const x of [11, 15]) b.flowers(x, 20);
  b.tree(1, 19, 'oak');
  b.treeLine(0, 18, 'top', 13, ['oak', 'round', 'pine']);
  b.treeLine(0, 18, 'bottom', 31, ['oak', 'round', 'pine']);
}

// ── A1: Maple Lane ───────────────────────────────────────────────────────────
function mapleLane(b: MapBuilder) {
  b.area(
    {
      id: 'maple',
      name: 'Maple Lane',
      jobs: [1, 2, 3],
      intro: 'maple-intro',
      outro: 'maple-outro',
      entry: { x: 19, y: 25, facing: 'right' },
      gate: 'The bridge over Willow Brook is pitch black. We can’t cross until Maple Lane’s lights are back on.',
    },
    [{ x: 18, y: 0, w: 27, h: H }],
  );
  const lane = [
    { x: 18, y: 25 },
    { x: 22, y: 21 },
    { x: 28, y: 20 },
    { x: 33, y: 23 },
    { x: 39, y: 22 },
    { x: 46, y: 24 },
  ];
  b.path('dirt', lane, 3);
  // Little paths up to each front door.
  b.path('dirt', [{ x: 23, y: 18 }, { x: 23, y: 21 }], 2);
  b.path('dirt', [{ x: 32, y: 28 }, { x: 32, y: 24 }], 2);
  b.path('dirt', [{ x: 40, y: 18 }, { x: 40, y: 22 }], 2);

  houseJob(b, 1, 'pell', 'orange', 22, 15);
  b.bed(27, 15, 4, 3, 'soil'); // her tomatoes
  b.fence(26, 19, 6);
  for (const x of [20, 21]) b.flowers(x, 19);

  houseJob(b, 2, 'okoro', 'tan', 31, 25);
  // Mr. Okoro's famous stone wall.
  for (const x of [27, 28, 29, 35, 36]) b.prop(x, 27, 'rock');
  b.prop(36, 26, 'rock');
  b.bed(26, 29, 3, 2, 'grass');

  houseJob(b, 3, 'rafi', 'red', 39, 15);
  b.prop(43, 17, 'pot');
  b.prop(38, 17, 'barrel');

  b.lamp(20, 23, 'area:maple');
  b.lamp(30, 19, 'area:maple');
  b.lamp(37, 25, 'area:maple');
  b.tree(25, 24, 'cherry');
  b.tree(43, 27, 'cherry');
  b.tree(19, 17, 'round');
  b.prop(34, 19, 'mailbox');
  for (const [x, y] of [[24, 25], [26, 25], [41, 25], [35, 18], [36, 18]] as const) b.flowers(x, y);
  mapleExtras(b);
  b.treeLine(18, 45, 'top', 12, ['round', 'oak', 'cherry', 'lime']);
  b.treeLine(18, 45, 'bottom', 31, ['round', 'oak', 'lime', 'bigGreen']);
  for (const [x, y] of [[20, 28], [29, 13], [42, 13], [24, 29], [39, 29]] as const) b.bush(x, y);
  for (const [x, y] of [[21, 14], [33, 14], [34, 14], [19, 29], [41, 30]] as const) b.flowers(x, y);
  b.spots.push({ kind: 'note', x: 44, y: 20, note: 'circle' });
  b.prop(44, 20, 'sign');
}

/**
 * Maple Lane's two side trips, which have to be painted before the tree lines so the trees
 * leave room: a grassy hill with a lookout (path north from the lane, ladder up the cliff),
 * and a pond with a little island you can reach on stepping stones.
 */
function mapleExtras(b: MapBuilder) {
  // The hill. Its cliff face is row 10; the ladder is at x=35.
  b.plateau(28, 3, 15, 8, 'green');
  b.ladder(35, 10, 'green');
  b.path('dirt', [{ x: 35, y: 22 }, { x: 35, y: 11 }], 2);
  // On top: a bench with a view, a lamp, a tree, and a chest tucked in the back corner.
  b.prop(33, 6, 'bench');
  b.prop(34, 6, 'bench');
  b.lamp(38, 5, 'area:maple', 'park');
  b.tree(30, 6, 'cherry');
  b.tree(41, 5, 'bigPink');
  for (const x of [32, 36, 37, 39]) b.flowers(x, 8);
  b.chest('maple-hill', 40, 8, 25);
  b.spots.push({ kind: 'sign', x: 35, y: 12, text: 'A hill to the north, with a ladder up the rock. You can see the whole lane from the top, I bet!' });
  b.prop(35, 12, 'sign');

  // The pond, with an island and stones to it.
  b.blob('pond', 40, 34.5, 5.5, 3.2, 0.12);
  b.path('dirt', [{ x: 39, y: 26 }, { x: 39, y: 30 }], 2);
  b.stones([[39, 31], [39, 32], [39, 33], [39, 34]]);
  b.chest('maple-pond', 39, 34, 20);
  for (const [x, y] of [[35, 33], [44, 31], [45, 36]] as const) b.prop(x, y, 'reeds');
  b.prop(37, 30, 'lily');
}

// ── A2: Willow Brook ─────────────────────────────────────────────────────────
function willowBrook(b: MapBuilder) {
  b.area(
    {
      id: 'brook',
      name: 'Willow Brook',
      jobs: [4, 5, 6],
      intro: 'brook-intro',
      outro: 'brook-outro',
      entry: { x: 53, y: 24, facing: 'right' },
      gate: 'The steps up Schoolhouse Hill are too dark to climb. Let’s finish the jobs by the brook first.',
    },
    [{ x: 45, y: 0, w: 22, h: H }],
  );
  // The brook winds down from the hills; one bridge crosses it.
  const brook = [
    { x: 50, y: -1 },
    { x: 48, y: 8 },
    { x: 49, y: 16 },
    { x: 48, y: 24 },
    { x: 50, y: 32 },
    { x: 48, y: 41 },
  ];
  b.path('pond', brook, 4);
  b.boards(45, 23, 8, 3, 'h', true);
  b.gate(1, [{ x: 45, y: 23 }, { x: 45, y: 24 }, { x: 45, y: 25 }]);
  b.path('dirt', [{ x: 52, y: 24 }, { x: 56, y: 21 }, { x: 61, y: 22 }, { x: 68, y: 24 }], 3);
  b.path('dirt', [{ x: 55, y: 18 }, { x: 55, y: 21 }], 2);
  b.path('dirt', [{ x: 61, y: 26 }, { x: 61, y: 23 }], 2);
  b.path('dirt', [{ x: 63, y: 17 }, { x: 63, y: 21 }], 2);

  houseJob(b, 4, 'theo', 'round', 54, 15);
  b.sighting({ id: 'window-lantern', who: 'glimmer', x: 57, y: 16, after: 'job:4' });
  houseJob(b, 5, 'twins', 'green', 59, 26);
  houseJob(b, 6, 'arjun', 'shop', 62, 14);
  b.prop(65, 17, 'crate');

  for (const [x, y] of [[47, 12], [51, 19], [47, 30], [51, 28]] as const) b.prop(x, y, 'reeds');
  for (const [x, y] of [[49, 6], [48, 34]] as const) b.prop(x, y, 'lily');
  b.tree(52, 11, 'bigGreen');
  b.tree(52, 31, 'bigGreen');
  b.tree(44, 31, 'bigGreen');
  b.lamp(53, 22, 'area:brook', 'park');
  b.lamp(59, 20, 'area:brook', 'park');
  b.lamp(65, 26, 'area:brook', 'park');
  b.prop(57, 24, 'bench');
  for (const [x, y] of [[57, 19], [58, 19], [64, 27], [55, 27]] as const) b.flowers(x, y);
  b.treeLine(45, 67, 'top', 11, ['bigGreen', 'lime', 'round']);
  b.treeLine(45, 67, 'bottom', 32, ['bigGreen', 'lime', 'round']);
  b.spots.push({ kind: 'note', x: 52, y: 27, note: 'storm' });
  b.prop(52, 27, 'sign');
}

// ── A3: Schoolhouse Hill ─────────────────────────────────────────────────────
function schoolhouseHill(b: MapBuilder) {
  b.area(
    {
      id: 'school',
      name: 'Schoolhouse Hill',
      jobs: [7, 8, 9],
      intro: 'school-intro',
      outro: 'school-outro',
      entry: { x: 69, y: 24, facing: 'right' },
      gate: 'Whisper Woods is completely dark in there. Nobody goes in without the hill lit up behind them.',
    },
    [{ x: 67, y: 0, w: 24, h: H }],
  );
  b.wall(67, 23, 25);
  b.gate(2, [{ x: 67, y: 23 }, { x: 67, y: 24 }, { x: 67, y: 25 }]);
  b.blob('dirt', 79, 23.5, 12, 5.2, 0.1);
  b.path('dirt', [{ x: 66, y: 24 }, { x: 92, y: 24 }], 3);
  b.plaza(69, 19, 18, 3, true);

  cityJob(b, 8, 'ito', { x: 70, y: 13, w: 8, doorAt: 4, roofStyle: 'slate', wall: 'orange', door: 'double', window: 'tall' });
  cityJob(b, 9, 'finch', { x: 80, y: 13, w: 6, doorAt: 2, roofStyle: 'slate', wall: 'red', door: 'glass', window: 'tall' });
  houseJob(b, 7, 'nadia', 'orangeB', 82, 29);
  b.path('dirt', [{ x: 83, y: 27 }, { x: 83, y: 31 }], 2);

  // The schoolyard: flower beds and a bench under the cherry trees.
  b.bed(70, 26, 3, 2, 'grass');
  b.bed(75, 26, 3, 2, 'grass');
  b.tree(79, 30, 'bigPink');
  b.tree(69, 31, 'bigPink');
  b.tree(87, 19, 'cherry');
  b.prop(74, 19, 'bench');
  // Ms. Ito's blackboard in the schoolyard: the Colour Code game.
  b.prop(81, 22, 'sign');
  b.spots.push({ kind: 'game', x: 81, y: 22, game: 'colours' });
  // Gran's string of street lamps, one of them dead since Grumble's zap: Dead Lamp Hunt.
  b.prop(84, 22, 'sign');
  b.spots.push({ kind: 'game', x: 84, y: 22, game: 'probe' });
  b.prop(78, 19, 'bin');
  for (const x of [71, 72, 76, 77]) b.flowers(x, 28);
  b.lamp(69, 19, 'area:school', 'twin');
  b.lamp(79, 22, 'area:school', 'twin');
  b.lamp(89, 27, 'area:school', 'twin');
  b.treeLine(67, 91, 'top', 11, ['cherry', 'bigPink', 'round']);
  b.treeLine(67, 91, 'bottom', 33, ['cherry', 'round', 'bigPink']);
  b.spots.push({ kind: 'note', x: 86, y: 19, note: 'hides' });
  b.prop(86, 19, 'sign');
}

// ── A4: Whisper Woods ────────────────────────────────────────────────────────
function whisperWoods(b: MapBuilder) {
  b.area(
    {
      id: 'woods',
      name: 'Whisper Woods',
      jobs: [10, 32],
      intro: 'woods-intro',
      outro: 'woods-outro',
      entry: { x: 93, y: 24, facing: 'right' },
      gate: 'The Market Gate is shut tight, and Grumble’s still loose in the woods. Not yet!',
    },
    [{ x: 91, y: 0, w: 24, h: H }],
  );
  b.wall(91, 23, 25);
  b.gate(3, [{ x: 91, y: 23 }, { x: 91, y: 24 }, { x: 91, y: 25 }]);
  b.rect('meadow', 91, 0, 24, H);
  b.path('darkDirt', [{ x: 90, y: 24 }, { x: 96, y: 27 }, { x: 102, y: 26 }, { x: 106, y: 21 }, { x: 116, y: 22 }], 3);
  b.path('darkDirt', [{ x: 99, y: 26 }, { x: 99, y: 18 }], 2);
  // A ring of mushrooms in a clearing, and fireflies once the woods are safe again.
  for (const [x, y] of [[102, 29], [103, 28], [105, 28], [106, 29], [105, 31], [103, 31], [101, 30], [107, 30]] as const)
    b.prop(x, y, 'mushroom');
  for (const [x, y] of [[95, 19], [103, 18], [109, 27], [97, 29], [112, 16], [100, 22]] as const)
    b.glow(x, y, 'area:woods', 1.6, '#c6ff7a');

  // The twins' secret treehouse, deep in the trees.
  b.group('job:10', [10]);
  b.tree(98, 16, 'bigGreen');
  b.glow(99.5, 14.5, 'job:10', 3.6);
  b.spots.push({ kind: 'job', x: 99, y: 16, job: 10 });
  b.resident('twins', 101, 17, 'left', { job: 10 });

  // The old Glowire junction box, where Grumble has made his nest.
  b.group('job:32', [32]);
  b.object(110, 19, 2, 2, [-1, -1, -1, -1]);
  b.lamp(110, 20, 'job:32', 'hook');
  b.spots.push({ kind: 'job', x: 110, y: 20, job: 32 });
  b.resident('gran', 111, 21, 'left', { job: 32, after: 'area:maple' });
  b.resident('grumble', 110, 18, 'down', { until: 'job:32', after: 'job:10' });

  b.treeLine(91, 115, 'top', 14, ['pine', 'pine', 'dead', 'round']);
  b.treeLine(91, 115, 'bottom', 33, ['pine', 'dead', 'pine']);
  for (const [x, y] of [[95, 22], [101, 23], [107, 25], [113, 26], [97, 30]] as const) b.prop(x, y, 'mushroom');
  for (const [x, y] of [[94, 21], [103, 24], [108, 24], [112, 19]] as const) b.prop(x, y, 'fern');
  b.prop(105, 23, 'stump');
  b.secret({ id: 'hollow-stump', x: 105, y: 23 });
  // Someone with a lantern, in the middle of the mushroom ring.
  b.sighting({ id: 'woods-lantern', who: 'glimmer', x: 104, y: 30 });
  b.prop(93, 28, 'log');
  b.lamp(96, 24, 'area:woods', 'park');
  b.lamp(107, 24, 'area:woods', 'park');
  b.spots.push({ kind: 'note', x: 113, y: 20, note: 'sea' });
  b.prop(113, 20, 'sign');
}

// ── A5: Market Square ────────────────────────────────────────────────────────
function marketSquare(b: MapBuilder) {
  b.area(
    {
      id: 'market',
      name: 'Market Square',
      jobs: [11, 12, 13, 14, 15],
      intro: 'market-intro',
      outro: 'market-outro',
      entry: { x: 117, y: 22, facing: 'right' },
      gate: 'The crossroads are a mess: no lights, no signals. Finish the market first.',
    },
    [{ x: 115, y: 0, w: 24, h: H }],
  );
  b.wall(115, 21, 23, 'fence');
  b.gate(4, [{ x: 115, y: 21 }, { x: 115, y: 22 }, { x: 115, y: 23 }]);
  b.path('darkDirt', [{ x: 112, y: 22 }, { x: 116, y: 22 }], 3);
  b.plaza(115, 12, 24, 19);
  b.skyline(115, 139, 7, 'area:market');

  cityJob(b, 11, 'benny', { x: 116, y: 8, w: 6, doorAt: 4, roofStyle: 'slate', wall: 'red', door: 'shop', storefront: true });
  cityJob(b, 12, 'coral', { x: 123, y: 8, w: 7, doorAt: 3, roofStyle: 'tan', wall: 'orange', door: 'glass', window: 'wide' });
  cityJob(b, 13, 'luca', { x: 131, y: 8, w: 7, doorAt: 3, roofStyle: 'slate', wall: 'red', door: 'double' });
  houseJob(b, 14, 'sunny', 'shop', 119, 26);
  houseJob(b, 15, 'iris', 'red', 131, 26);

  // The fountain in the middle, ringed by benches and planters.
  b.fountain(125, 18, 'area:market');
  b.secret({ id: 'fountain-coin', x: 127, y: 21 });
  b.glow(127, 20, 'area:market', 3.2, '#8fd8ff');
  for (const [x, y] of [[124, 17], [129, 17], [124, 22], [129, 22]] as const) b.prop(x, y, 'planter');
  b.prop(126, 23, 'bench');
  // Market stalls: fruit and crates on both sides.
  for (const x of [117, 118, 119]) b.prop(x, 15, 'fruit');
  for (const x of [134, 135, 136]) b.prop(x, 15, 'fruit');
  b.prop(120, 15, 'crate');
  b.prop(133, 15, 'crate');
  b.prop(117, 19, 'barrel');
  b.prop(136, 19, 'barrel');
  // Iris's flowers spill out of her shop.
  for (const x of [135, 136, 137]) for (const y of [28, 29]) b.flowers(x, y);
  for (const x of [116, 117]) b.prop(x, 28, 'planter');
  b.tree(123, 29, 'cherry');
  b.tree(128, 29, 'cherry');
  b.lamp(116, 17, 'area:market', 'twin');
  b.lamp(137, 17, 'area:market', 'twin');
  b.lamp(122, 25, 'area:market', 'twin');
  b.lamp(131, 24, 'area:market', 'twin');
  b.fence(115, 31, 24, 'hedge');
  b.treeLine(115, 139, 'bottom', 33, ['round', 'cherry', 'oak']);
  b.spots.push({ kind: 'note', x: 138, y: 26, note: 'colours' });
  b.prop(138, 26, 'sign');
}

// ── A6: The crossroads ───────────────────────────────────────────────────────
function crossroads(b: MapBuilder) {
  b.area(
    {
      id: 'crossroads',
      name: 'The Crossroads',
      jobs: [16, 17, 18],
      intro: 'crossroads-intro',
      outro: 'crossroads-outro',
      entry: { x: 141, y: 22, facing: 'right' },
      gate: 'Clock Plaza is dark, and the traffic’s all tangled. Let’s get it moving first.',
    },
    [{ x: 139, y: 0, w: 22, h: H }],
  );
  b.wall(139, 21, 23, 'fence');
  b.gate(5, [{ x: 139, y: 21 }, { x: 139, y: 22 }, { x: 139, y: 23 }]);
  b.plaza(139, 12, 22, 21, true);
  b.skyline(139, 161, 11, 'area:crossroads');
  b.road('h', 21, 139, 161);
  b.road('v', 148, 12, 33);
  b.junction(148, 21);
  b.zebra('h', 146, 21);
  b.zebra('h', 152, 21);
  b.zebra('v', 148, 19);
  b.zebra('v', 148, 25);

  signal(b, 16, 'dot', 146, 20, 'left');
  cityJob(b, 17, 'mei', { x: 152, y: 13, w: 6, doorAt: 2, roofStyle: 'tan', wall: 'red', door: 'glass', window: 'wide' });
  signal(b, 18, 'dot', 152, 25, 'down');
  b.prop(155, 18, 'planter');
  b.prop(156, 18, 'bench');
  b.prop(142, 27, 'hydrant');
  b.prop(157, 19, 'bin');
  b.prop(144, 19, 'mailbox');
  b.tree(141, 30, 'autumn');
  b.tree(144, 30, 'autumn');
  b.tree(153, 30, 'autumn');
  b.tree(157, 30, 'autumn');
  b.tree(141, 17, 'teal');
  b.lamp(145, 27, 'area:crossroads', 'post');
  b.lamp(156, 27, 'area:crossroads', 'post');
  b.fence(139, 33, 9, 'hedge');
  b.fence(151, 33, 10, 'hedge');
  b.treeLine(139, 161, 'bottom', 35, ['round', 'oak']);
}

// ── A7: Clock Plaza ──────────────────────────────────────────────────────────
function clockPlaza(b: MapBuilder) {
  b.area(
    {
      id: 'clock',
      name: 'Clock Plaza',
      jobs: [33],
      intro: 'clock-intro',
      outro: 'clock-outro',
      entry: { x: 163, y: 22, facing: 'right' },
    },
    [{ x: 161, y: 0, w: W - 161, h: H }],
  );
  b.wall(161, 21, 23, 'fence');
  b.gate(6, [{ x: 161, y: 21 }, { x: 161, y: 22 }, { x: 161, y: 23 }]);
  b.plaza(161, 12, 19, 20, true);
  b.skyline(161, 166, 11, 'area:clock');
  b.skyline(173, W, 11, 'area:clock');
  // The Market Clock: a real clocktower, stopped at 8 minutes to midnight until it's fixed.
  b.group('job:33', [33]);
  const clock = b.clocktower(167, 5, 'town', 'job:33');
  b.spots.push({ kind: 'job', x: clock.x, y: clock.y - 1, job: 33 });
  b.doorLight(clock, 'job:33');
  b.glow(169.5, 8.2, 'job:33', 4.5, '#fff1b0');
  b.resident('dot', clock.x + 1, clock.y, 'down', { job: 33 });
  b.secret({ id: 'clock-marks', x: 171, y: 14 });
  // A warm square in front of it, with a sun set into the cobbles.
  b.plaza(165, 16, 9, 6, false);
  b.mosaic(167, 17, 'sun');
  for (const x of [165, 173]) b.tree(x, 15, 'teal');

  // The night bus out of town, to the harbour.
  b.asphalt(161, 27, W - 161, 3);
  for (let x = 162; x < W; x += 2) b.setDecal(x, 28, b.cityTile(433));
  b.object(172, 25, 1, 2, [b.cityTile(167), b.cityTile(194)]);
  b.block(172, 26, 1, 1);
  b.spots.push({ kind: 'exit', x: 172, y: 26, to: 'harbour' });
  b.prop(171, 26, 'bench');
  b.prop(173, 26, 'bin');
  b.lamp(163, 20, 'area:clock', 'twin');
  b.lamp(177, 20, 'area:clock', 'twin');
  b.fence(161, 31, W - 161, 'hedge');
  b.treeLine(161, W, 'bottom', 33, ['round', 'oak']);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A village house with a job: its doorway glows once solved; the client waits by the door. */
function houseJob(b: MapBuilder, id: number, who: string, style: HouseStyle, x: number, y: number) {
  const group = `job:${id}`;
  b.group(group, [id]);
  const door = b.house(style, x, y, group);
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: id });
  b.doorLight(door, group);
  b.resident(who, door.x + 1, door.y, 'down', { job: id });
}

/** A city building with a job. */
function cityJob(b: MapBuilder, id: number, who: string, spec: BuildingSpec) {
  const group = `job:${id}`;
  b.group(group, [id]);
  const door = b.building({ ...spec, group });
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: id });
  b.doorLight(door, group);
  b.resident(who, door.x + 1, door.y, 'down', { job: id });
}

/** A traffic signal on a corner, with its client beside it. */
function signal(b: MapBuilder, id: number, who: string, x: number, y: number, side: 'left' | 'down') {
  const group = `job:${id}`;
  b.group(group, [id]);
  b.object(x, y - 1, 1, 2, [b.cityTile(166), b.cityTile(193)], group);
  b.block(x, y, 1, 1);
  b.spots.push({ kind: 'job', x, y, job: id });
  b.glow(x + 0.5, y - 0.5, group, 3, '#9dffb0');
  const p: Point = side === 'left' ? { x: x - 1, y } : { x, y: y + 1 };
  b.resident(who, p.x, p.y, side === 'left' ? 'right' : 'up', { job: id });
}
