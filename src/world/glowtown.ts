// World 1: Glowtown. One road, the Glowire, runs from Gran's workshop in the west to the
// Market Clock in the east, and every stretch of it is a different part of town. Each
// stretch stays dark until the one before it is fixed. Off the road: ridges with ladders,
// grottos, the Willow Brook with three crossings, ponds, and a lot of things to find.
//
//   x:  0      18          45         67          91          115        139        161    180
//       Workshop │ Maple Lane │ Willow    │ Schoolhouse│ Whisper    │ Market   │ Cross-   │ Clock
//       yard     │ (1–3)      │ Brook 4–6 │ Hill (7–9) │ Woods 10,B │ Sq 11–15 │ roads    │ Plaza B
//                                                                               16–18

import { MapBuilder, hash, type BuildingSpec, type HouseStyle } from './builder';
import { ledgeTerrace, rockFill, rockPlug } from './puzzlekit';
import { flushScenery, grove, meadow, woods } from './scenery';
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
  releaseClearings(b);

  puzzles(b);
  meadow(b, 0, 0, W, H, 1);
  flushScenery(b);
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
  // The fence has a gap at x=8..9: the way down to Gran's orchard.
  b.fence(2, 29, 6);
  b.fence(10, 29, 7);
  for (const x of [11, 15]) b.flowers(x, 20);
  b.tree(1, 19, 'oak');
  workshopExtras(b);
  woods(b, 0, 18, 'top', 8, ['oak', 'round', 'pine']);
  woods(b, 0, 18, 'bottom', 33, ['oak', 'round', 'pine']);
  grove(b, 0, 10, 18, 7, ['oak', 'round', 'pine'], 0.3);
  scatter(b, 0, 9, 18, 31, 40, ['bush', 'flowers', 'rock', 'daisy'], 3);
}

/**
 * Marigold's Rise: a ridge behind the workshop with a ladder up, Gran's root cellar cut into
 * its face and the first Glowire's bench on top; and her orchard behind the fence.
 */
function workshopExtras(b: MapBuilder) {
  b.plateau(1, 2, 12, 8);
  b.ladder(7, 9);
  const cellar = b.cave(2, 7);
  b.path('dirt', [{ x: 11, y: 21 }, { x: 11, y: 11 }, { x: 3, y: 11 }], 2);
  sign(b, 5, 12, 'GRAN’S CELLAR. Spare bulbs inside. (A bulb glows because its thin wire is hard to squeeze current through. That’s resistance!)');
  sign(b, 8, 12, 'MARIGOLD’S RISE. Ladder up. A circuit is a circle: the battery pushes, the current goes round, and it has to come home again.');
  b.secret({ id: 'gran-cellar', x: cellar.x, y: cellar.y });
  // On top: the old oak, a bench with letters cut into it, a lamp and a chest in the corner.
  b.tree(7, 6, 'bigPink');
  b.prop(10, 5, 'bench');
  b.secret({ id: 'marigold-bench', x: 10, y: 5 });
  b.lamp(11, 4, 'home', 'park');
  for (const x of [4, 5, 9]) b.flowers(x, 3);
  b.chest('glowtown-gran-hill', 2, 3, 20);

  // The orchard.
  clearing(b, 9, 35.5, 7, 3.6);
  b.path('dirt', [{ x: 9, y: 29 }, { x: 9, y: 34 }], 2);
  sign(b, 7, 31, 'Gran’s orchard. If a tree looks like it’s hiding something, it probably is.');
  b.tree(4, 36, 'cherry');
  b.tree(14, 35, 'cherry');
  b.tree(12, 37, 'oak');
  b.fence(3, 33, 4);
  for (const x of [3, 4, 6]) b.flowers(x, 34);
  b.prop(10, 36, 'bench');
  b.bush(15, 38);
  b.bush(13, 39);
  b.chest('glowtown-gran-orchard', 14, 38, 25);
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
  b.prop(44, 16, 'pot');
  b.prop(38, 17, 'barrel');

  b.lamp(20, 23, 'area:maple');
  b.lamp(30, 19, 'area:maple');
  b.lamp(37, 25, 'area:maple');
  b.tree(25, 24, 'cherry');
  b.tree(43, 27, 'cherry');
  b.prop(34, 19, 'mailbox');
  for (const [x, y] of [[24, 25], [26, 25], [41, 25], [35, 18], [36, 18]] as const) b.flowers(x, y);
  mapleExtras(b);
  woods(b, 18, 45, 'top', 7, ['round', 'oak', 'cherry', 'lime']);
  woods(b, 18, 45, 'bottom', 36, ['round', 'oak', 'lime', 'bigGreen']);
  grove(b, 18, 11, 27, 4, ['round', 'oak', 'cherry', 'lime'], 0.55);
  grove(b, 18, 28, 27, 8, ['round', 'oak', 'lime', 'bigGreen'], 0.4);
  scatter(b, 18, 8, 27, 31, 90, ['bush', 'flowers', 'rock', 'daisy', 'clover'], 7);
  for (const [x, y] of [[20, 28], [29, 13], [42, 13], [24, 29], [39, 29]] as const) b.bush(x, y);
  for (const [x, y] of [[21, 14], [33, 14], [34, 14], [19, 29], [41, 30]] as const) b.flowers(x, y);
  b.spots.push({ kind: 'note', x: 44, y: 20, note: 'circle' });
  b.prop(44, 20, 'sign');
}

/**
 * Maple Lane's side trips, painted before the tree lines so the trees leave room: a grassy
 * hill with a lookout, a rocky outcrop with a grotto, a pond with a little island on
 * stepping stones, and a hidden nook in the south-west woods.
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
  // A hedgerow along the foot of the hill, with a gap for the path.
  b.fence(28, 13, 6, 'hedge');
  b.fence(37, 13, 6, 'hedge');
  b.resident('wren', 37, 14, 'left', { chat: 'glowtown-wren-maple' });

  // The rocky outcrop to the west, with a grotto in its face and a ladder up its side.
  b.plateau(19, 3, 8, 7, 'green');
  b.ladder(25, 9, 'green');
  const grotto = b.cave(20, 7, 'green');
  b.path('dirt', [{ x: 21, y: 22 }, { x: 21, y: 11 }, { x: 26, y: 11 }], 2);
  b.secret({ id: 'maple-grotto', x: grotto.x, y: grotto.y });
  sign(b, 24, 12, 'Mind the rocks! Dry stone doesn’t carry a current at all. That’s why wires wear plastic coats.');
  b.lamp(19, 12, 'area:maple', 'post');
  b.tree(23, 5, 'oak');
  b.prop(25, 5, 'bench');
  for (const x of [24, 25]) b.flowers(x, 7);

  // The pond, with an island and stones to it.
  b.blob('pond', 40, 34.5, 5.5, 3.2, 0.12);
  b.path('dirt', [{ x: 39, y: 26 }, { x: 39, y: 30 }], 2);
  b.stones([[39, 31], [39, 32], [39, 33], [39, 34]]);
  b.chest('maple-pond', 39, 34, 20);
  for (const [x, y] of [[35, 33], [44, 31], [45, 36]] as const) b.prop(x, y, 'reeds');
  b.prop(37, 30, 'lily');

  // A nook in the south-west woods: a path that just stops, and a big pink tree with a chest beside it.
  clearing(b, 23, 35.5, 4.6, 3);
  b.path('dirt', [{ x: 32, y: 28 }, { x: 32, y: 32 }, { x: 26, y: 33 }, { x: 24, y: 34 }], 2);
  b.tree(20, 36, 'bigPink');
  b.chest('glowtown-maple-nook', 23, 36, 25);
  for (const [x, y] of [[26, 35], [25, 37], [22, 34]] as const) b.flowers(x, y);
  b.prop(27, 36, 'rock');
  sign(b, 31, 31, 'The path goes on a bit further than you’d think. Mr. Okoro says he doesn’t know where it ends. (He knows.)');
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
  // The brook winds down from the hills.
  const brook = [
    { x: 50, y: -1 },
    { x: 48, y: 8 },
    { x: 49, y: 16 },
    { x: 48, y: 24 },
    { x: 50, y: 32 },
    { x: 48, y: 41 },
  ];
  // The little stream from the spring runs into it, with the spring pond up in the north meadow.
  clearing(b, 61, 4.5, 6, 4.2);
  b.path('pond', brook, 4);
  b.path('pond', [{ x: 51, y: 11.5 }, { x: 58, y: 12 }, { x: 66, y: 11 }], 3);
  ring(b, 'dirt', 61, 4.5, 4.8, 3.3, 2);
  b.blob('pond', 61, 4.5, 2.8, 1.5, 0.1);

  // Bridge 1: the main one, with rails.
  b.boards(45, 23, 8, 3, 'h', true);
  b.gate(1, [{ x: 45, y: 23 }, { x: 45, y: 24 }, { x: 45, y: 25 }]);
  // Bridge 2: a footbridge with rails, far up the brook. Shut (like the first) until Maple Lane is lit.
  b.boards(45, 8, 7, 2, 'h', true);
  b.gate(1, [{ x: 45, y: 8 }, { x: 45, y: 9 }]);
  b.path('dirt', [{ x: 43, y: 9 }, { x: 43, y: 21 }], 2);
  b.path('dirt', [{ x: 44, y: 9 }, { x: 50, y: 9 }], 2);
  sign(b, 44, 11, 'Footbridge. Closed until Maple Lane’s lights are on. Every lamp needs its own way back to the battery, and a bridge is a way back.');
  // Bridge 3: a plain boardwalk with no rails over the little stream.
  deck(b, 59, 9, 2, 5, 'v');
  b.path('dirt', [{ x: 60, y: 22 }, { x: 60, y: 14 }], 2);
  b.path('dirt', [{ x: 51, y: 9 }, { x: 55, y: 8 }, { x: 58, y: 8 }], 2);

  b.path('dirt', [{ x: 52, y: 24 }, { x: 56, y: 21 }, { x: 61, y: 22 }, { x: 68, y: 24 }], 3);
  b.path('dirt', [{ x: 55, y: 18 }, { x: 55, y: 21 }], 2);
  b.path('dirt', [{ x: 61, y: 26 }, { x: 61, y: 23 }], 2);
  b.path('dirt', [{ x: 63, y: 17 }, { x: 63, y: 21 }], 2);

  houseJob(b, 4, 'theo', 'round', 54, 15);
  b.sighting({ id: 'window-lantern', who: 'glimmer', x: 57, y: 16, after: 'job:4' });
  houseJob(b, 5, 'twins', 'green', 59, 26);
  houseJob(b, 6, 'arjun', 'shop', 62, 14);
  b.prop(65, 17, 'crate');
  b.prop(66, 17, 'barrel');

  // A fishing jetty, a dead end out over the brook with a chest on its last plank.
  b.path('dirt', [{ x: 55, y: 24 }, { x: 55, y: 29 }, { x: 52, y: 29 }], 2);
  deck(b, 48, 29, 5, 1, 'h');
  b.chest('glowtown-brook-jetty', 48, 29, 30);
  sign(b, 53, 31, 'Fishing dock. Pure water hardly carries a current, but brook water does. Dry hands, dry plugs, and never fish for lightning.');
  b.prop(54, 30, 'log');

  // The spring meadow: a loop round the pond, a willow with something behind it.
  b.tree(52, 4, 'bigGreen');
  b.chest('glowtown-willow', 53, 2, 20);
  b.prop(58, 8, 'bench');
  for (const [x, y] of [[57, 1], [65, 6], [56, 6], [64, 8]] as const) b.flowers(x, y);
  for (const [x, y] of [[57, 7], [64, 2]] as const) b.prop(x, y, 'reeds');
  b.lamp(63, 8, 'area:brook', 'park');
  sign(b, 56, 9, 'Spring Meadow. The little brook starts in that pond. Go round it once, then go round again, and notice a loop never ends.');

  // The rocky ridge in the south-east: a grotto with Grumble’s scorch marks inside.
  b.plateau(56, 31, 9, 7, 'green');
  b.ladder(62, 37, 'green');
  const scorch = b.cave(58, 35, 'green');
  b.path('dirt', [{ x: 66, y: 24 }, { x: 66, y: 38 }, { x: 58, y: 38 }], 2);
  b.secret({ id: 'grumble-scorch', x: scorch.x, y: scorch.y });
  b.tree(60, 33, 'bigGreen');
  b.prop(63, 33, 'bench');
  for (const x of [58, 59, 62]) b.flowers(x, 32);
  sign(b, 64, 29, 'Scorch marks on the rocks to the south. Lightning takes the shortest road to the ground. Don’t be that road.');

  for (const [x, y] of [[47, 12], [51, 19], [51, 28], [47, 33]] as const) b.prop(x, y, 'reeds');
  for (const [x, y] of [[49, 6], [48, 36]] as const) b.prop(x, y, 'lily');
  b.tree(44, 31, 'bigGreen');
  b.lamp(53, 22, 'area:brook', 'park');
  b.lamp(59, 20, 'area:brook', 'park');
  b.lamp(65, 26, 'area:brook', 'park');
  b.prop(57, 24, 'bench');
  for (const [x, y] of [[57, 19], [58, 19], [64, 27], [55, 27]] as const) b.flowers(x, y);
  woods(b, 45, 67, 'top', 9, ['bigGreen', 'lime', 'round']);
  woods(b, 45, 67, 'bottom', 33, ['bigGreen', 'lime', 'round']);
  grove(b, 52, 12, 14, 3, ['lime', 'round'], 0.3);
  scatter(b, 45, 0, 22, 40, 70, ['bush', 'flowers', 'reeds' as never, 'rock', 'daisy'].filter((k) => k !== 'reeds') as Bit[], 13);
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
  schoolExtras(b);
  woods(b, 67, 91, 'top', 7, ['cherry', 'bigPink', 'round']);
  woods(b, 67, 91, 'bottom', 35, ['cherry', 'round', 'bigPink']);
  grove(b, 67, 10, 24, 3, ['cherry', 'round', 'bigPink'], 0.35);
  grove(b, 67, 29, 24, 5, ['cherry', 'round', 'bigPink'], 0.3);
  scatter(b, 67, 10, 24, 28, 60, ['bush', 'flowers', 'daisy', 'tulip', 'rock'], 19);
  b.spots.push({ kind: 'note', x: 86, y: 19, note: 'hides' });
  b.prop(86, 19, 'sign');
}

/** The ridge behind the school with the old power station on it, and a reading dock on a pond. */
function schoolExtras(b: MapBuilder) {
  b.plateau(69, 1, 20, 9, 'green');
  b.ladder(78, 9, 'green');
  // Up the gap between the two school buildings, then along the foot of the ridge.
  b.path('dirt', [{ x: 79, y: 18 }, { x: 79, y: 11 }, { x: 72, y: 11 }], 2);
  b.path('dirt', [{ x: 79, y: 11 }, { x: 87, y: 11 }], 2);
  b.resident('wren', 76, 12, 'right', { chat: 'glowtown-wren-school' });
  sign(b, 82, 12, 'The old power station is on top of the ridge. A fuse is a thin wire made to break first, so your lamps don’t have to.');
  // The old power station: a kiln with a lightning rod standing next to it.
  const station = b.ruin('kiln', 82, 3);
  b.secret({ id: 'power-station', x: station.x, y: station.y });
  b.mossy('pillar', 86, 2);
  b.lamp(75, 5, 'area:school', 'park');
  b.tree(72, 6, 'cherry');
  b.prop(79, 6, 'bench');
  for (const x of [76, 77, 84]) b.flowers(x, 7);
  b.chest('glowtown-school-roof', 71, 3, 30);

  // The reading dock: a boardwalk straight out over the pond, with a chest on the last plank.
  b.blob('pond', 74, 36, 6, 3.4, 0.1);
  b.path('dirt', [{ x: 74, y: 26 }, { x: 74, y: 32 }], 2);
  deck(b, 73, 32, 2, 5, 'v');
  b.chest('glowtown-school-dock', 73, 37, 25);
  sign(b, 72, 31, 'Ms. Ito’s reading dock. In a chain of bulbs wired one after another, if one goes out they ALL go out. Try it in Dead Lamp Hunt.');
  for (const [x, y] of [[68, 35], [79, 33], [80, 38]] as const) b.prop(x, y, 'reeds');
  b.prop(77, 36, 'lily');
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

  woodsExtras(b);
  woods(b, 91, 115, 'top', 9, ['pine', 'pine', 'dead', 'round']);
  woods(b, 91, 115, 'bottom', 35, ['pine', 'dead', 'pine']);
  for (const [x, y] of [[95, 22], [101, 23], [107, 25], [113, 26], [97, 30]] as const) b.prop(x, y, 'mushroom');
  for (const [x, y] of [[94, 21], [103, 24], [108, 24], [112, 19]] as const) b.prop(x, y, 'fern');
  b.prop(105, 23, 'stump');
  b.secret({ id: 'hollow-stump', x: 105, y: 23 });
  // Someone with a lantern, in the middle of the mushroom ring.
  b.sighting({ id: 'woods-lantern', who: 'glimmer', x: 104, y: 30 });
  b.prop(93, 28, 'log');
  b.lamp(96, 24, 'area:woods', 'park');
  b.lamp(107, 24, 'area:woods', 'park');
  grove(b, 91, 11, 24, 8, ['pine', 'dead', 'pine', 'round'], 0.6);
  grove(b, 91, 27, 24, 8, ['pine', 'dead', 'pine'], 0.55);
  scatter(b, 91, 10, 24, 26, 70, ['mushroom', 'fern', 'stump', 'rock', 'bush'], 23);
  b.spots.push({ kind: 'note', x: 113, y: 20, note: 'sea' });
  b.prop(113, 20, 'sign');
}

/** A ridge in the north with Grumble's old den and a lookout, and a dark pool with an island. */
function woodsExtras(b: MapBuilder) {
  // Clearings so the woods have rooms in them.
  clearing(b, 104.5, 30, 6, 3.6);
  clearing(b, 97, 19, 3.5, 3);
  clearing(b, 110.5, 19.5, 4, 3.5); // Grumble's nest and Gran: people who come and go need room
  b.plateau(100, 1, 14, 8, 'green');
  b.ladder(111, 8, 'green');
  const den = b.cave(105, 6, 'green');
  b.path('darkDirt', [{ x: 107, y: 21 }, { x: 107, y: 10 }, { x: 111, y: 10 }], 2);
  b.secret({ id: 'woods-den', x: den.x, y: den.y });
  sign(b, 104, 12, 'Something grumbles in the north ridge on stormy nights. If it’s dark and you’re scared: a closed switch is a bridge, an open switch is a gap. Light needs the bridge.');
  b.resident('moth', 94, 23, 'right', { chat: 'glowtown-moth-woods' });
  // On top: a lookout log, a dead tree, glowing mushrooms and a chest.
  b.prop(103, 4, 'log');
  b.tree(108, 5, 'dead');
  for (const x of [102, 104, 110, 112]) b.prop(x, 6, 'mushroom');
  b.glow(111, 4, 'area:woods', 2.4, '#c6ff7a');
  b.chest('glowtown-woods-ridge', 112, 3, 30);

  // The dark pool: stepping stones out to an island, with fireflies over it.
  b.blob('pond', 97, 34.5, 4.6, 2.4, 0.1);
  b.path('darkDirt', [{ x: 98, y: 27 }, { x: 98, y: 31 }], 2);
  b.stones([[98, 32], [98, 33], [98, 34]]);
  b.chest('glowtown-woods-pool', 98, 35, 25);
  b.glow(97.5, 33.5, 'area:woods', 2.4, '#c6ff7a');
  for (const [x, y] of [[93, 33], [101, 33], [95, 37]] as const) b.prop(x, y, 'reeds');
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
  marketExtras(b);
  woods(b, 115, 139, 'bottom', 35, ['round', 'cherry', 'oak']);
  woods(b, 115, 139, 'top', 2, ['round', 'cherry', 'oak']);
  scatter(b, 115, 32, 24, 8, 26, ['bush', 'flowers', 'daisy', 'tulip'], 31);
  b.spots.push({ kind: 'note', x: 138, y: 26, note: 'colours' });
  b.prop(138, 26, 'sign');
}

/** Two back alleys between the shops, and a boardwalk loop round the market pond. */
function marketExtras(b: MapBuilder) {
  // Alley 1 (between Benny's and Coral's): an old ledger. Alley 2 (Coral's and Luca's): a chest.
  b.secret({ id: 'market-ledger', x: 122, y: 8 });
  b.chest('glowtown-market-alley', 130, 8, 30);
  sign(b, 123, 12, 'Deliveries round the back. Benny’s great-grandad kept every receipt. Every. Single. One.');
  sign(b, 129, 13, 'Luca: DON’T go behind the pizzeria. The cat lives there. The cat is in charge.');
  b.flowers(130, 12);
  b.flowers(122, 12);
  for (const [x, y] of [[116, 24], [117, 24], [137, 24], [136, 25]] as const) b.prop(x, y, 'crate');
  b.prop(116, 25, 'barrel');
  b.prop(137, 25, 'barrel');
  for (const x of [118, 132]) b.prop(x, 13, 'planter');
  b.fence(121, 14, 3);
  b.fence(133, 14, 3);

  // The hedge along the south of the square, with a gap on the fountain’s line.
  b.fence(115, 31, 11, 'hedge');
  b.fence(128, 31, 11, 'hedge');
  // The market pond: a boardwalk all the way round, and stones to a chest in the middle.
  b.rect('pond', 120, 34, 15, 4);
  b.path('dirt', [{ x: 127, y: 31 }, { x: 127, y: 33 }], 2);
  deck(b, 119, 33, 17, 1, 'h');
  deck(b, 119, 38, 17, 1, 'h');
  deck(b, 119, 34, 1, 4, 'v');
  deck(b, 135, 34, 1, 4, 'v');
  b.stones([[127, 34], [127, 35]]);
  b.chest('glowtown-market-pond', 127, 36, 30);
  sign(b, 125, 32, 'The market pond. The fountain’s pump is wired with two wires: one to go and one to come back. Always two.');
  b.lamp(118, 34, 'area:market', 'post');
  b.lamp(137, 34, 'area:market', 'post');
  b.prop(117, 36, 'bench');
  for (const [x, y] of [[121, 39], [133, 39], [116, 33], [137, 38]] as const) b.flowers(x, y);
  b.tree(116, 38, 'bigPink');
  b.tree(137, 37, 'bigPink');
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
  b.lamp(145, 27, 'area:crossroads', 'post');
  b.lamp(156, 27, 'area:crossroads', 'post');
  crossroadsExtras(b);
  woods(b, 139, 161, 'bottom', 36, ['round', 'oak']);
  woods(b, 139, 161, 'top', 3, ['round', 'oak', 'lime']);
  scatter(b, 139, 33, 22, 7, 30, ['bush', 'flowers', 'rock', 'daisy'], 37);
}

/** A grassy mound with a storm drain in it, and a park behind the hedge with a hidden hedge nook. */
function crossroadsExtras(b: MapBuilder) {
  // The mound in the corner of the square, with a culvert in its face.
  b.plateau(140, 13, 7, 6, 'green');
  b.ladder(145, 18, 'green');
  const drain = b.cave(141, 16, 'green');
  b.secret({ id: 'storm-drain', x: drain.x, y: drain.y });
  b.chest('glowtown-cross-mound', 144, 14, 20);
  b.flowers(143, 15);
  b.flowers(145, 15);
  sign(b, 143, 20, 'The old storm drain. The Glowire runs underneath the road here, in a copper pipe older than anyone.');
  // Flower beds and a notice board for the street corner.
  b.bed(141, 24, 3, 2, 'grass');
  b.bed(154, 23, 3, 2, 'grass');
  b.prop(158, 25, 'planter');
  b.prop(159, 25, 'planter');
  b.prop(158, 14, 'crate');
  b.prop(159, 14, 'crate');
  b.prop(159, 15, 'barrel');
  sign(b, 150, 16, 'The Moonbeam’s lights are LEDs. An LED only works one way round: the long leg goes to the plus side.');

  // The park behind the hedge: pond and benches on the left, the hedge nook on the right.
  b.fence(139, 33, 9, 'hedge');
  b.fence(151, 33, 10, 'hedge');
  b.blob('pond', 143.5, 36.5, 3.6, 2.2, 0.1);
  b.path('dirt', [{ x: 149.5, y: 33 }, { x: 149.5, y: 38 }, { x: 156, y: 38 }], 3);
  for (const [x, y] of [[140, 36], [146, 38], [141, 34]] as const) b.prop(x, y, 'reeds');
  b.prop(146, 35, 'bench');
  b.prop(144, 39, 'lily');
  // The hedge nook: a U of hedges, open at the bottom, with a chest in it.
  b.fence(152, 35, 7, 'hedge');
  for (const y of [36, 37]) {
    b.fence(152, y, 1, 'hedge');
    b.fence(158, y, 1, 'hedge');
  }
  b.chest('glowtown-cross-hedge', 155, 36, 30);
  b.tree(159, 38, 'autumn');
  sign(b, 147, 37, 'Park hours: always. Hedge hours: ask the hedge.');
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
  clockExtras(b);
  woods(b, 161, W, 'bottom', 36, ['round', 'oak']);
  woods(b, 161, 166, 'top', 3, ['round', 'oak']);
  woods(b, 173, W, 'top', 3, ['round', 'oak']);
  scatter(b, 161, 32, 19, 7, 26, ['bush', 'flowers', 'rock', 'daisy'], 41);
}

/** The clock gardens behind the hedge: a wishing dock on a pond, and a ridge with Marigold's cellar. */
function clockExtras(b: MapBuilder) {
  // Planters and crates by the bus stop, and a notice about the clock.
  b.prop(163, 14, 'planter');
  b.prop(164, 14, 'planter');
  b.prop(176, 14, 'crate');
  b.prop(177, 14, 'barrel');
  b.bed(175, 22, 3, 2, 'grass');
  b.bed(163, 24, 3, 2, 'grass');
  sign(b, 165, 20, 'The Market Clock stopped at 11:52 and nobody can say why. A clock’s motor needs a push from a battery or a wire. No push, no tick.');

  b.fence(161, 31, 7, 'hedge');
  b.fence(170, 31, 10, 'hedge');
  // The gardens.
  b.blob('pond', 164.5, 35.5, 3.2, 2.4, 0.1);
  b.path('dirt', [{ x: 169, y: 31 }, { x: 169, y: 38 }, { x: 178, y: 38 }], 2);
  deck(b, 165, 35, 3, 1, 'h');
  b.secret({ id: 'clock-reflection', x: 164, y: 35 });
  sign(b, 167, 33, 'The wishing dock. Look into the water at the clock’s reflection. Go on.');
  b.lamp(167, 38, 'area:clock', 'post');
  for (const [x, y] of [[161, 33], [166, 38], [162, 38]] as const) b.prop(x, y, 'reeds');
  b.prop(166, 33, 'bench');

  b.plateau(172, 32, 8, 6, 'green');
  b.ladder(178, 37, 'green');
  const cellar = b.cave(174, 35, 'green');
  b.secret({ id: 'clock-cellar', x: cellar.x, y: cellar.y });
  b.chest('glowtown-clock-ridge', 177, 33, 40);
  b.tree(174, 34, 'oak');
  b.flowers(176, 33);
  sign(b, 172, 39, 'The cellar door under the ridge has been locked since 11:52. The key hangs on the clock. (It’s a very tall key.)');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A sign you can read, with a one-liner from Pip. */
function sign(b: MapBuilder, x: number, y: number, text: string) {
  b.prop(x, y, 'sign');
  b.spots.push({ kind: 'sign', x, y, text });
}

/**
 * Keep an oval of ground free of trees: it is painted as sand (which nothing grows on) until
 * the end of the build, when it goes back to meadow. Paint paths over it afterwards.
 */
function clearing(b: MapBuilder, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      const g = b.groundAt(x, y);
      if (d <= 1 + (hash(x, y) - 0.5) * 0.3 && (g === 'grass' || g === 'meadow')) b.paint('sand', x, y);
    }
}

function releaseClearings(b: MapBuilder) {
  for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) if (b.groundAt(x, y) === 'sand') b.paint(x >= 91 && x < 115 ? 'meadow' : 'grass', x, y);
}

/** A closed loop of path round an ellipse. */
function ring(b: MapBuilder, g: 'dirt' | 'darkDirt', cx: number, cy: number, rx: number, ry: number, width = 2) {
  const pts: Point[] = [];
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  b.path(g, pts, width);
}

/** Boards with dirt underneath (so no tree grows through them), except where there is water. */
function deck(b: MapBuilder, x: number, y: number, w: number, h: number, along: 'h' | 'v', rails = false) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) if (b.groundAt(x + i, y + j) !== 'pond') b.paint('dirt', x + i, y + j);
  b.boards(x, y, w, h, along, rails);
}

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

type Bit = 'bush' | 'flowers' | 'rock' | 'log' | 'stump' | 'mushroom' | 'fern' | 'daisy' | 'tulip' | 'clover' | 'pebbles' | 'sunflower';

/** Scatter small things over free grass, thickest where the hash says so: so the ground isn't bare. */
function scatter(b: MapBuilder, x: number, y: number, w: number, h: number, n: number, kinds: Bit[], seed = 1) {
  for (let k = 0; k < n; k++) {
    const px = x + Math.floor(hash(k * 3.7 + seed, seed * 1.3) * w);
    const py = y + Math.floor(hash(seed * 2.1, k * 5.3 + seed) * h);
    if (!b.free(px, py, 1, 1)) continue;
    const kind = kinds[Math.floor(hash(k + seed, py) * kinds.length)]!;
    if (kind === 'bush') b.bush(px, py);
    else if (kind === 'flowers') b.flowers(px, py);
    else b.prop(px, py, kind);
  }
}

/** Tiny physical puzzles: boulders to push, ledges to hop, and fish in the pond and brook. */
function puzzles(b: MapBuilder) {
  rockFill(b, 60, 18, 'glowtown-rock-brook', 25, 'A little hedge room with a stream through it, and a chest on the far bank. Boulders slide when you lean on them. What happens if one slides into water?');
  rockPlug(b, 18, 29, 'glowtown-rock-plug', 20, 'A boulder is stuck in the hedge doorway. You can only push, never pull. So which way does it have to go?');
  rockPlug(b, 106, 31, 'glowtown-rock-woods', 25, 'Something shiny behind that boulder. Lean on it: push it down and in, then squeeze round. (The little sign inside puts all boulders back.)');
  ledgeTerrace(b, 22, 20, 'glowtown-ledge-lane', 20, 'A hedge terrace with a drop on its south side. Hop down, and you’re out. There’s no way back up that way. A bit like regret.');
  ledgeTerrace(b, 122, 26, 'glowtown-ledge-market', 25, 'You can step off a ledge downward, but you can’t climb up it. Slip in through the gap at the top, and leave the quick way.');
  b.fish('glowtown-pond', 42, 36);
  b.fish('glowtown-brook', 50, 30);
}
