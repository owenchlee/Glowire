// World 2: Driftwood Harbour. The night bus drops you at the west end; the road follows
// the shore past the docks, out to the lighthouse and along the piers, then climbs
// Clocktower Hill to the old clock where the Glowire begins.
//
//   x:  0     14          38           62          84           106          128      150
//       Bus   │ Fish Market │ Lighthouse │ Ferry Pier │ Warehouse  │ Clocktower │ Hilltop
//       stop  │ Docks 19,20 │ Pt 21, 23  │ 22, 24     │ Row 25, B  │ Hill 26–29 │ 30,31,B
//                                                  (sea along the bottom; the hill rises north)

import { MapBuilder, at, type HouseStyle, type PropName } from './builder';
import { ledgeTerrace, rockFill, rockPlug } from './puzzlekit';
import type { Point, WorldMap } from './types';

const W = 150;
const H = 40;
/** The beach's top edge and where the water starts, roughly (they wander). */
const SAND = 23;
const SEA = 30;

export function buildHarbour(): WorldMap {
  const b = new MapBuilder(W, H, 'grass');
  shore(b);

  busStop(b);
  fishDocks(b);
  lighthouse(b);
  ferryPier(b);
  warehouses(b);
  clockHill(b);
  hilltop(b);

  puzzles(b);
  return b.finish({ id: 'harbour', name: 'Driftwood Harbour', spawn: { x: 6, y: 26, facing: 'right' } });
}

/** Beach and sea all along the bottom, east as far as the foot of the hill. */
function shore(b: MapBuilder) {
  for (let x = 0; x < 112; x++) {
    const top = SAND + Math.round(Math.sin(x * 0.21) * 1.2 + Math.sin(x * 0.07 + 1) * 0.8);
    const sea = SEA + Math.round(Math.sin(x * 0.15 + 2) * 1.3 + Math.sin(x * 0.05) * 0.7);
    for (let y = top; y < H; y++) b.paint(y >= sea ? 'sea' : 'sand', x, y);
  }
  // The shore curves round the foot of the hill.
  b.blob('sand', 112, 34, 8, 6);
  b.blob('sea', 112, 39, 7, 4);
}

// ── H0: the bus stop ─────────────────────────────────────────────────────────
function busStop(b: MapBuilder) {
  b.area(
    { id: 'stop', name: 'Harbour Bus Stop', jobs: [], intro: 'harbour-intro', entry: { x: 6, y: 26, facing: 'right' } },
    [{ x: 0, y: 0, w: 14, h: H }],
  );
  b.group('home', []);
  b.asphalt(0, 24, 9, 3);
  b.object(7, 22, 1, 2, [b.cityTile(167), b.cityTile(194)]);
  b.block(7, 23, 1, 1);
  b.spots.push({ kind: 'exit', x: 7, y: 23, to: 'glowtown' });
  b.prop(6, 23, 'bench');
  b.lamp(9, 23, 'home', 'hook');
  b.resident('pip', 10, 26, 'left');
  b.resident('gran', 11, 24, 'down', { chat: 'gran-harbour' });
  b.spots.push({ kind: 'daily', x: 10, y: 26 });
  b.house('shop', 2, 18, 'home');
  b.spots.push({ kind: 'shop', x: 3, y: 20 });
  b.doorLight({ x: 3, y: 21 }, 'home');
  busExtras(b);
  b.treeLine(0, 14, 'top', 15, ['pine', 'round', 'pine']);
  for (const [x, y] of [[11, 22], [12, 29], [3, 29]] as const) b.prop(x, y, 'reeds');
}

/** A grassy lookout bluff behind the stop (ladder up the rock) and a sandbar with a bottle on it. */
function busExtras(b: MapBuilder) {
  // The bluff: a dirt path climbs from the road to the foot of the cliff, then a ladder.
  b.path('dirt', [{ x: 9, y: 22 }, { x: 9, y: 12 }], 2);
  b.plateau(5, 5, 8, 7, 'green');
  b.ladder(9, 11, 'green');
  b.prop(7, 7, 'bench');
  b.prop(8, 7, 'bench');
  b.lamp(6, 9, 'home', 'hook');
  b.bush(6, 6);
  b.bush(11, 9);
  for (const [x, y] of [[10, 8], [7, 9], [11, 7]] as const) b.flowers(x, y);
  b.chest('harbour-bus-bluff', 11, 6, 15);
  sign(b, 10, 7, 'The whole harbour, laid out like a model. The lighthouse is the dark stub far to the east. It will shine again, one lamp at a time.');
  sign(b, 11, 14, 'LOOKOUT BLUFF. Ladder in the rock. Gulls say the view is worth a spark or two.');

  // A sandbar past the shallows, with a glass jar washed up on it. Stones lead out.
  b.blob('sand', 6, 34, 3, 1.7, 0.1);
  b.stones([[6, 31], [6, 32]]);
  b.deepTall(5, 34, 'jar');
  b.secret({ id: 'harbour-bottle', x: 5, y: 34 });
  sign(b, 8, 29, 'Something glints on the sandbar. The stones are flat enough to walk on, if you do not mind wet boots.');
  rocks(b, [[2, 34], [10, 35], [8, 38], [3, 37]]);
}

// ── H1: Fish Market Docks ────────────────────────────────────────────────────
function fishDocks(b: MapBuilder) {
  b.area(
    {
      id: 'docks',
      name: 'Fish Market Docks',
      jobs: [19, 20],
      intro: 'docks-intro',
      outro: 'docks-outro',
      entry: { x: 16, y: 26, facing: 'right' },
      gate: 'The path to the lighthouse runs along the cliff, and it’s pitch dark. Let’s get the docks lit first.',
    },
    [{ x: 14, y: 0, w: 24, h: H }],
  );
  b.wall(14, 22, 30);
  houseJob(b, 19, 'rosa', 'barn', 17, 17);
  // The fish market: crates and barrels on the boards.
  b.boards(22, 25, 10, 3, 'h');
  for (const x of [23, 24, 26, 27]) b.prop(x, 25, x % 2 ? 'barrel' : 'crate');
  b.prop(29, 25, 'fruit');
  b.lamp(31, 25, 'area:docks', 'hook');
  // Sal's fishing boat, tied up at the end of a jetty.
  b.boards(28, 28, 2, 6, 'v', true);
  boat(b, 30, 33, 20, 'sal', 30, 32);
  b.house('orange', 26, 17);
  b.house('tan', 32, 18);
  docksExtras(b);
  b.treeLine(14, 38, 'top', 14, ['pine', 'round', 'bigGreen']);
  b.lamp(19, 23, 'area:docks', 'post');
  b.spots.push({ kind: 'note', x: 36, y: 24, note: 'volts' });
  b.prop(36, 24, 'sign');
}

/** The gull ridge north of the market, a driftwood isle on stepping stones, a cove and tide pools. */
function docksExtras(b: MapBuilder) {
  // The ridge: a path between the houses, then a ladder.
  b.path('dirt', [{ x: 24, y: 22 }, { x: 24, y: 12 }], 2);
  b.plateau(22, 4, 12, 8, 'sand');
  b.ladder(24, 11, 'sand');
  b.prop(25, 6, 'bench');
  b.prop(26, 6, 'bench');
  b.lamp(23, 9, 'area:docks', 'post');
  b.flowers(28, 8);
  b.flowers(29, 8);
  b.prop(31, 7, 'stump');
  b.secret({ id: 'harbour-gull-nest', x: 31, y: 7 });
  b.chest('harbour-docks-ridge', 32, 5, 20);
  b.prop(27, 5, 'rock');
  b.tree(28, 9, 'dead');
  b.tree(23, 6, 'dead');
  sign(b, 22, 13, 'Gull Ridge. Climb the ladder if you like. They nest up there, and they steal anything that shines.');
  b.resident('sal', 21, 24, 'right', { chat: 'harbour-sal-ridge' });

  // The shore: a cove, tide pools, a beached boat, nets and crates.
  b.blob('sea', 33, 30.5, 3, 2.4, 0.1);
  b.blob('sea', 19, 28.5, 1.8, 1, 0.1);
  b.blob('sea', 36, 27.5, 1.2, 0.8, 0.05);
  beached(b, 15, 28);
  scatter(b, [[33, 25], [34, 26], [33, 26], [17, 27], [21, 27]], 'crate');
  scatter(b, [[34, 25], [18, 25], [32, 24]], 'barrel');
  scatter(b, [[20, 27], [37, 27]], 'reeds');

  // A driftwood isle, over the stones.
  b.stones([[22, 30], [22, 31], [22, 32]]);
  b.blob('sand', 22, 34, 3, 1.7, 0.1);
  b.chest('harbour-docks-isle', 23, 35, 20);
  sign(b, 21, 28, 'Flat stones lead out to a bit of sand. Rosa says the best driftwood washes up there, and sometimes a little more.');
  rocks(b, [[18, 34], [27, 36], [35, 36], [24, 38], [31, 34], [36, 31]]);
}

// ── H2: Lighthouse Point ─────────────────────────────────────────────────────
function lighthouse(b: MapBuilder) {
  b.area(
    {
      id: 'point',
      name: 'Lighthouse Point',
      jobs: [21, 23],
      side: [54],
      intro: 'lighthouse-intro',
      outro: 'lighthouse-outro',
      entry: { x: 40, y: 25, facing: 'right' },
      gate: 'The ferry pier is dark and the boards are slippery. Help Old Gus with his lighthouse first.',
    },
    [{ x: 38, y: 0, w: 24, h: H }],
  );
  b.wall(38, 24, 26);
  b.gate(1, [{ x: 38, y: 24 }, { x: 38, y: 25 }, { x: 38, y: 26 }]);
  // A sandy point running out into the sea, with the lighthouse at its tip.
  b.blob('sand', 50, 31, 5, 5, 0.1);
  b.path('sand', [{ x: 44, y: 26 }, { x: 50, y: 32 }], 3);
  b.group('job:21', [21]);
  b.group('job:23', [23]);
  // The tower: a white tower with a red band (towers sheet), two storeys tall.
  const t = (i: number) => at('towers', i);
  b.object(49, 27, 2, 6, [t(108), t(109), t(132), t(133), t(108), t(109), t(132), t(133), t(132), t(133), t(132), t(133)], 'job:21');
  b.block(49, 31, 2, 2);
  b.spots.push({ kind: 'job', x: 49, y: 32, job: 21 });
  b.spots.push({ kind: 'job', x: 50, y: 32, job: 23 });
  b.glow(50, 27.5, 'job:21', 7, '#fff1b0');
  b.glow(50, 31, 'job:23', 3, '#ffcf7a');
  b.resident('gus', 51, 33, 'left', { job: 21 });
  b.resident('gus', 48, 33, 'right', { job: 23 });
  b.house('round', 42, 17);
  // Old Gus's signal lamp, on a post by the lighthouse path: the Signal Lamp game.
  b.lamp(46, 25, 'job:21', 'hook');
  b.spots.push({ kind: 'game', x: 46, y: 25, game: 'signal' });
  // Bolt's warehouse pipes: Dockyard Wiring.
  b.prop(48, 25, 'sign');
  b.spots.push({ kind: 'game', x: 48, y: 25, game: 'pipes' });
  b.prop(45, 20, 'well');
  pointExtras(b);
  b.treeLine(38, 62, 'top', 14, ['pine', 'bigGreen', 'round']);
  rocks(b, [[44, 34], [55, 37], [45, 38], [61, 36], [42, 36]]);
  b.lamp(42, 23, 'area:point', 'post');
  // Side job: Gus's control panel lamps, on a post by the path (job 54).
  b.lamp(54, 24, 'job:54', 'twin');
  b.spots.push({ kind: 'job', x: 54, y: 24, job: 54 });
  b.resident('gus', 53, 25, 'right', { job: 54 });
  b.secret({ id: 'sea-lamps', x: 50, y: 35 });
  b.sighting({ id: 'cliff-lantern', who: 'glimmer', x: 57, y: 9 });
  b.lamp(57, 25, 'area:point', 'post');
}

/**
 * The lighthouse climb: a switchback path to a ladder, a cliff terrace with an overlook,
 * a second ladder to the keeper's perch; a tide cave in a sea stack; and an isle on stones.
 */
function pointExtras(b: MapBuilder) {
  // Switchback path up from the beach to the foot of the cliff.
  b.path('dirt', [{ x: 48, y: 15 }, { x: 54, y: 17 }, { x: 47, y: 20 }, { x: 52, y: 23 }, { x: 51, y: 26 }], 2);
  b.plateau(44, 7, 16, 8, 'sand'); // the terrace: x44..59, y7..14, interior y8..12
  b.plateau(52, 1, 7, 7, 'sand'); // the keeper's perch on top: x52..58, y1..7
  b.ladder(48, 14, 'sand');
  b.ladder(55, 7, 'sand');
  // The terrace: benches at the overlook, lamps, a sign.
  b.prop(56, 10, 'bench');
  b.prop(57, 10, 'bench');
  b.lamp(46, 9, 'area:point', 'post');
  b.lamp(52, 11, 'area:point', 'post');
  for (const [x, y] of [[50, 9], [51, 9], [58, 12], [45, 12]] as const) b.flowers(x, y);
  b.prop(58, 8, 'rock');
  b.tree(46, 12, 'dead');
  b.tree(57, 12, 'dead');
  b.prop(45, 8, 'rock');
  sign(b, 49, 10, 'Old Gus’s grandad watched the sea from this ledge. He swore that on still nights the waves had lamps in them, in rows, like a street.');
  // The perch: the keeper's footlocker, a lamp, and a chest tucked in the corner.
  b.lamp(53, 3, 'area:point', 'twin');
  b.prop(56, 3, 'crate');
  b.secret({ id: 'harbour-keeper-log', x: 56, y: 3 });
  b.prop(54, 4, 'bench');
  b.chest('harbour-point-perch', 57, 5, 30);
  sign(b, 55, 12, 'KEEPER’S PERCH, up the ladder. Keep your hands off the lamp. Old Gus polishes it twice a day.');

  // A sea stack on the east beach with a cave in its foot.
  b.plateau(56, 19, 5, 6, 'sand');
  const door = b.cave(57, 22, 'sand');
  b.secret({ id: 'harbour-tide-cave', x: door.x, y: door.y });
  b.resident('gus', 45, 23, 'right', { chat: 'harbour-gus-cave' });
  b.blob('sea', 41.5, 28.5, 1.8, 1, 0.1);
  scatter(b, [[40, 28], [43, 28], [60, 26]], 'reeds');

  // An isle on stepping stones, with a chest in plain sight.
  b.stones([[58, 29], [58, 30], [58, 31]]);
  b.blob('sand', 58, 33.5, 2.6, 1.7, 0.1);
  b.chest('harbour-point-isle', 58, 34, 25);
  sign(b, 59, 27, 'The tide is out. Flat stones lead to the little isle. Gus says that is where the keys he lost in 1998 went. Maybe not just the keys.');
}

// ── H3: Ferry Pier ───────────────────────────────────────────────────────────
function ferryPier(b: MapBuilder) {
  b.area(
    {
      id: 'pier',
      name: 'Ferry Pier',
      jobs: [22, 24, 36],
      side: [55],
      intro: 'pier-intro',
      outro: 'pier-outro',
      entry: { x: 64, y: 25, facing: 'right' },
      gate: 'The warehouse lane is blacked out. The ferry and Sal’s party boat need us first.',
    },
    [{ x: 62, y: 0, w: 22, h: H }],
  );
  b.wall(62, 24, 26);
  b.gate(2, [{ x: 62, y: 24 }, { x: 62, y: 25 }, { x: 62, y: 26 }]);
  // A long pier out to the ferry, and a shorter one for Sal's party boat.
  b.boards(68, 27, 3, 9, 'v', true);
  b.boards(66, 36, 7, 2, 'h');
  boat(b, 66, 38, 22, 'rosa', 70, 35, true);
  b.boards(77, 27, 2, 6, 'v', true);
  boat(b, 79, 32, 24, 'sal', 79, 31);
  b.house('green', 64, 17);
  b.house('orange', 74, 18);
  for (const x of [72, 73]) b.prop(x, 25, 'barrel');
  pierExtras(b);
  b.treeLine(62, 84, 'top', 14, ['pine', 'round']);
  rocks(b, [[75, 37], [64, 32], [65, 35], [73, 38], [78, 36]]);
  b.lamp(67, 26, 'area:pier', 'hook');
  b.lamp(80, 26, 'area:pier', 'hook');
  // Sal's bilge lamp, on the little jetty.
  b.group('job:36', [36]);
  b.lamp(76, 26, 'job:36', 'post');
  b.spots.push({ kind: 'job', x: 76, y: 26, job: 36 });
  b.resident('sal', 75, 26, 'right', { job: 36 });
  // Side job: Sal's party lights that go with the music (job 55).
  b.lamp(71, 23, 'job:55', 'park');
  b.spots.push({ kind: 'job', x: 71, y: 23, job: 55 });
  b.resident('sal', 70, 24, 'right', { job: 55 });
}

/**
 * The ferry pier's extras: a canal the beach road crosses by a plank bridge, the harbourmaster's
 * bluff, and a hidden cove behind two whispering rocks with a row of jar lamps.
 */
function pierExtras(b: MapBuilder) {
  // The canal cuts the beach in two; the plank bridge is the only way over to the warehouses.
  b.rect('sea', 80, 14, 4, 17);
  b.blob('sea', 82, 14.5, 2, 1.6, 0.1);
  b.boards(80, 24, 4, 3, 'h', true);
  b.lamp(79, 23, 'area:pier', 'hook');
  sign(b, 78, 27, 'THE LIFT BRIDGE. It has not lifted since the ferry broke down. Planks only, and no running.');
  scatter(b, [[79, 28], [79, 21], [78, 22]], 'barrel');

  // Harbourmaster's bluff.
  b.path('dirt', [{ x: 70, y: 22 }, { x: 70, y: 12 }], 2);
  b.plateau(64, 5, 13, 7, 'sand');
  b.ladder(70, 11, 'sand');
  b.prop(68, 7, 'bench');
  b.prop(69, 7, 'bench');
  b.lamp(66, 9, 'area:pier', 'park');
  for (const [x, y] of [[72, 9], [73, 9], [66, 7]] as const) b.flowers(x, y);
  b.prop(74, 8, 'barrel');
  b.tree(67, 9, 'dead');
  sign(b, 72, 7, 'FERRY TIMES: on the hour, every hour. Unless the lamp is out. Then: never.');
  b.chest('harbour-pier-bluff', 75, 6, 25);
  sign(b, 72, 13, 'Harbourmaster’s Bluff. The best view of the ferry, and the only place on the pier with no seagull droppings.');

  // The hidden cove: a one-wide gap between rocks, and sand inside.
  b.rect('sand', 74, 30, 1, 2);
  b.blob('sand', 74, 33.5, 2.5, 2.2, 0.1);
  rocks(b, [[73, 30], [75, 30], [73, 31], [75, 31]]);
  b.jarLamp(72, 34, 'area:pier');
  b.jarLamp(75, 34, 'area:pier');
  b.secret({ id: 'harbour-jar-row', x: 72, y: 34 });
  b.chest('harbour-pier-cove', 74, 35, 30);
  b.resident('sal', 73, 26, 'down', { chat: 'harbour-sal-cove' });
  beached(b, 64, 27);
  scatter(b, [[65, 26], [64, 29], [82, 27]], 'crate');
}

// ── H4: Warehouse Row ────────────────────────────────────────────────────────
function warehouses(b: MapBuilder) {
  b.area(
    {
      id: 'warehouses',
      name: 'Warehouse Row',
      jobs: [25, 37, 34],
      intro: 'warehouse-intro',
      outro: 'warehouse-outro',
      entry: { x: 86, y: 25, facing: 'right' },
      gate: 'The hill path is dark, and the power station’s still humming wrong. Not yet!',
    },
    [{ x: 84, y: 0, w: 22, h: H }],
  );
  b.wall(84, 24, 26, 'fence');
  b.gate(3, [{ x: 84, y: 24 }, { x: 84, y: 25 }, { x: 84, y: 26 }]);
  b.plaza(85, 19, 20, 8, true);
  cityJob(b, 25, 'rosa', 85, 14, 6, 3);
  // Bolt's warehouse: the doors that need the diode trick.
  cityJob(b, 37, 'bolt', 92, 14, 5, 3);
  // The harbour power station: where Grumble has dug in.
  b.group('job:34', [34]);
  const door = b.building({ x: 98, y: 14, w: 7, roof: 3, roofStyle: 'slate', wall: 'red', door: 'double', window: 'wide', group: 'job:34' });
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: 34 });
  b.doorLight(door, 'job:34');
  b.resident('rosa', door.x + 1, door.y, 'down', { job: 34 });
  b.resident('grumble', door.x - 2, door.y, 'right', { until: 'job:34', after: 'job:25' });
  for (const x of [88, 89, 101, 102]) b.prop(x, 23, 'crate');
  b.secret({ id: 'mossbell-crate', x: 88, y: 23 });
  b.prop(90, 23, 'barrel');
  b.prop(97, 25, 'cone');
  b.prop(98, 25, 'cone');
  b.lamp(91, 26, 'area:warehouses', 'twin');
  b.lamp(104, 22, 'area:warehouses', 'twin');
  warehouseExtras(b);
  b.treeLine(84, 106, 'top', 9, ['pine', 'round']);
}

/**
 * Bolt's one-way lanes: two alleys (IN on the left, OUT on the right) and a back lane with
 * his rulebook, a crane ridge above it, a cargo pier, a breakwater and a sandbar chest.
 */
function warehouseExtras(b: MapBuilder) {
  // The back lane behind the warehouses, reached through the alleys.
  b.blob('dirt', 95, 11.5, 9.5, 2.2, 0.12);
  b.path('dirt', [{ x: 91.5, y: 12 }, { x: 91.5, y: 19 }], 1.4);
  b.path('dirt', [{ x: 97.5, y: 12 }, { x: 97.5, y: 19 }], 1.4);
  b.path('dirt', [{ x: 98, y: 8 }, { x: 98, y: 11 }], 2);
  // The crane ridge: a ladder from the lane up onto a sand cliff.
  b.plateau(93, 1, 10, 7, 'sand');
  b.ladder(98, 7, 'sand');
  b.lamp(94, 4, 'area:warehouses', 'twin');
  b.prop(96, 3, 'crate');
  b.prop(97, 3, 'crate');
  b.prop(101, 5, 'barrel');
  b.flowers(100, 5);
  b.tree(95, 5, 'dead');
  b.chest('harbour-wh-crane', 101, 2, 25);
  // The lane: crates, a rulebook, lamps, and a way to read the rules.
  scatter(b, [[87, 11], [88, 11], [87, 12], [101, 10], [102, 10], [102, 11], [89, 13], [93, 10]], 'crate');
  scatter(b, [[103, 12], [92, 13]], 'barrel');
  scatter(b, [[90, 10], [100, 13]], 'cone');
  b.lamp(86, 12, 'area:warehouses', 'twin');
  b.lamp(104, 12, 'area:warehouses', 'twin');
  b.prop(100, 11, 'crate');
  b.secret({ id: 'harbour-rulebook', x: 100, y: 11 });
  sign(b, 90, 19, 'ONE WAY: IN. Bolt’s Rule 4: every alley is a one-way street. A diode is the same for electricity: current goes through one way, never back.');
  sign(b, 96, 19, 'ONE WAY: OUT. Bolt’s Rule 5: no running. Rule 6: see Rule 4.');
  b.resident('bolt', 100, 24, 'left', { chat: 'harbour-bolt-rules' });
  sign(b, 94, 12, 'Bolt’s Rule 11: the lane behind the warehouses is for authorised persons only. You are authorised. Congratulations.');

  // A cargo pier with a boat tied up, and a breakwater of rocks.
  b.boards(88, 28, 3, 6, 'v', true);
  b.prop(88, 29, 'crate');
  b.prop(90, 31, 'crate');
  b.prop(88, 32, 'barrel');
  beached(b, 88, 34);
  b.object(86, 34, 1, 1, [at('water', 12)]);
  b.block(86, 34, 1, 1);

  // A sandbar chest on stepping stones.
  b.stones([[97, 28], [97, 29], [97, 30]]);
  b.blob('sand', 97, 33, 3, 1.8, 0.1);
  b.chest('harbour-wh-isle', 98, 33, 20);
  rocks(b, [[86, 37], [92, 36], [94, 38], [101, 37], [103, 34], [90, 38], [104, 31]]);
  sign(b, 99, 27, 'Stepping stones out to a sandbar. Rule 12: do not step off the stones. Rule 13: nobody checks Rule 12.');
}

// ── H5: Clocktower Hill ──────────────────────────────────────────────────────
function clockHill(b: MapBuilder) {
  b.area(
    {
      id: 'hill',
      name: 'Clocktower Hill',
      jobs: [26, 27, 28, 29],
      intro: 'hill-intro',
      entry: { x: 108, y: 25, facing: 'up' },
      gate: 'The hilltop gate is locked tight, and the clock’s still spinning. Fix the tower first!',
    },
    [{ x: 106, y: 0, w: 22, h: H }],
  );
  b.wall(106, 24, 26, 'fence');
  b.gate(4, [{ x: 106, y: 24 }, { x: 106, y: 25 }, { x: 106, y: 26 }]);
  b.rect('meadow', 107, 0, 21, 30);
  // The path climbs the hill in zig-zags.
  b.path('darkDirt', [{ x: 106, y: 25 }, { x: 112, y: 25 }, { x: 118, y: 21 }, { x: 110, y: 15 }, { x: 117, y: 9 }, { x: 128, y: 9 }], 3);

  // Professor Lumen's clocktower, all four of its jobs round its foot.
  const tower = b.clocktower(119, 11, 'town', 'area:hill');
  b.glow(121.5, 14.2, 'area:hill', 5, '#fff1b0');
  b.path('darkDirt', [{ x: 117, y: 21 }, { x: 121, y: 21 }], 2);
  lumenJob(b, 26, tower.x, tower.y - 1, tower.x + 1, tower.y);
  b.group('job:27', [27]);
  b.object(112, 19, 2, 2, [at('towers', 60), at('towers', 61), at('towers', 84), at('towers', 85)], 'job:27');
  b.block(112, 20, 2, 1);
  lumenJob(b, 27, 112, 20, 114, 20);
  b.group('job:28', [28]);
  b.lamp(108, 15, 'job:28', 'park');
  lumenJob(b, 28, 108, 15, 108, 16);
  b.group('job:29', [29]);
  b.lamp(126, 21, 'job:29', 'park');
  lumenJob(b, 29, 126, 21, 125, 21);

  hillExtras(b);
  b.treeLine(106, 128, 'top', 4, ['pine', 'dead']);
  b.treeLine(106, 128, 'bottom', 32, ['pine', 'round', 'dead']);
  for (const [x, y] of [[115, 27], [111, 11], [124, 17]] as const) b.tree(x, y, 'pine');
  rocks(b, [[109, 22], [126, 14], [114, 14]]);
  b.lamp(116, 24, 'area:hill', 'park');
  b.spots.push({ kind: 'note', x: 126, y: 11, note: 'beginning' });
  b.prop(126, 11, 'sign');
}

/** A terrace with a cave where a bell rings thirteen times, and a tarn with a chest on stones. */
function hillExtras(b: MapBuilder) {
  b.path('dirt', [{ x: 113, y: 8 }, { x: 114, y: 12 }], 2);
  b.plateau(108, 1, 9, 7, 'green'); // x108..116, y1..7; interior y2..5
  b.ladder(114, 7, 'green');
  const door = b.cave(110, 5, 'green');
  b.secret({ id: 'harbour-bell13', x: door.x, y: door.y });
  b.prop(111, 3, 'bench');
  b.prop(112, 3, 'bench');
  b.lamp(113, 3, 'area:hill', 'park');
  b.chest('harbour-hill-ridge', 115, 3, 40);
  b.flowers(109, 4);
  b.flowers(115, 5);
  sign(b, 111, 9, 'NORTH TERRACE. Ladder on the east side. Some say you can hear a bell in the rock. Some say it rings thirteen times.');
  b.resident('lumen', 109, 19, 'right', { chat: 'harbour-lumen-bell' });

  // The tarn, still as glass, with a chest on a stone path.
  b.blob('pond', 123, 26, 4, 2.6, 0.12);
  b.stones([[123, 23], [123, 24], [123, 25]]);
  b.chest('harbour-hill-tarn', 123, 26, 35);
  scatter(b, [[119, 24], [127, 26], [120, 29]], 'reeds');
  scatter(b, [[121, 22]], 'rock');
  sign(b, 122, 22, 'The tarn. Still as glass. Something sits at the bottom, and the stones are only a little slippery.');
}

// ── H6: The hilltop ──────────────────────────────────────────────────────────
function hilltop(b: MapBuilder) {
  b.area(
    {
      id: 'top',
      name: 'The Hilltop',
      jobs: [30, 31, 35],
      intro: 'top-intro',
      outro: 'hill-outro',
      entry: { x: 130, y: 9, facing: 'right' },
    },
    [{ x: 128, y: 0, w: W - 128, h: H }],
  );
  b.wall(128, 8, 10, 'fence');
  b.gate(5, [{ x: 128, y: 8 }, { x: 128, y: 9 }, { x: 128, y: 10 }]);
  b.rect('meadow', 128, 0, W - 128, 30);
  b.path('darkDirt', [{ x: 128, y: 9 }, { x: 136, y: 10 }, { x: 140, y: 16 }, { x: 146, y: 18 }], 3);
  // The hill railway signal, the hilltop gate, and the clock's heart: an old stone shrine.
  b.group('job:30', [30]);
  b.lamp(134, 13, 'job:30', 'twin');
  lumenJob(b, 30, 134, 13, 133, 13);
  b.group('job:31', [31]);
  b.object(141, 11, 2, 2, [at('towers', 12), at('towers', 13), at('towers', 36), at('towers', 37)], 'job:31');
  b.block(141, 12, 2, 1);
  lumenJob(b, 31, 141, 12, 143, 12);
  b.group('job:35', [35]);
  b.object(145, 13, 2, 2, [at('towers', 114), at('towers', 115), at('towers', 138), at('towers', 139)], 'job:35');
  b.block(145, 14, 2, 1);
  b.glow(146, 13.5, 'job:35', 6, '#c9e7ff');
  lumenJob(b, 35, 145, 14, 147, 15);
  b.resident('grumble', 146, 16, 'up', { after: 'job:31', until: 'job:35' });
  // The bus that goes one stop further: up the valley to Mossbell Hollow.
  b.object(131, 7, 1, 2, [b.cityTile(167), b.cityTile(194)]);
  b.block(131, 8, 1, 1);
  b.spots.push({ kind: 'exit', x: 131, y: 8, to: 'mossbell' });
  topExtras(b);
  b.treeLine(128, W, 'top', 4, ['pine', 'dead']);
  b.treeLine(128, W, 'bottom', 24, ['pine', 'round']);
  rocks(b, [[139, 19], [148, 10], [131, 15]]);
}

/** A ledge with a telescope and a view of the whole coast, and a pond with a chest. */
function topExtras(b: MapBuilder) {
  b.path('dirt', [{ x: 134, y: 22 }, { x: 142, y: 22 }, { x: 146, y: 19 }], 2);
  b.plateau(130, 16, 8, 6, 'green'); // x130..137, y16..21; interior y17..19
  b.ladder(134, 21, 'green');
  b.prop(131, 18, 'bench');
  b.prop(132, 18, 'bench');
  b.prop(133, 17, 'mailbox');
  b.secret({ id: 'harbour-top-lights', x: 133, y: 17 });
  b.chest('harbour-top-ledge', 136, 17, 35);
  b.flowers(135, 19);
  sign(b, 132, 23, 'The Telescope Ledge. Ladder in the cliff. On a clear night you can see two lights from up there, and one is not ours.');

  b.blob('pond', 145, 7.5, 3, 1.8, 0.1);
  b.stones([[145, 9], [145, 8], [145, 7]]);
  b.chest('harbour-top-pond', 145, 6, 30);
  scatter(b, [[142, 8], [148, 6]], 'reeds');

  // A glade in the pines, down a trail from the ledge path, with a chest by the stumps.
  b.path('dirt', [{ x: 142, y: 22 }, { x: 142, y: 28 }], 2);
  b.blob('dirt', 142, 29.5, 3.6, 2.4, 0.15);
  scatter(b, [[139, 29], [140, 31], [145, 31], [145, 28]], 'stump');
  b.chest('harbour-top-glade', 143, 29, 25);
  for (const [x, y] of [[141, 28], [144, 30]] as const) b.flowers(x, y);
  sign(b, 140, 23, 'A trail runs south into the pines. Gran says the glade down there is the quietest spot on the whole hill.');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function houseJob(b: MapBuilder, id: number, who: string, style: HouseStyle, x: number, y: number) {
  const group = `job:${id}`;
  b.group(group, [id]);
  const door = b.house(style, x, y, group);
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: id });
  b.doorLight(door, group);
  b.resident(who, door.x + 1, door.y, 'down', { job: id });
}

function cityJob(b: MapBuilder, id: number, who: string, x: number, y: number, w: number, roof: number) {
  const group = `job:${id}`;
  b.group(group, [id]);
  const door = b.building({ x, y, w, roof, roofStyle: 'tan', wall: 'orange', door: 'double', window: 'square', group });
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: id });
  b.doorLight(door, group);
  b.resident(who, door.x + 1, door.y, 'down', { job: id });
}

/** One of Professor Lumen's jobs: a spot to knock on and where Lumen waits. */
function lumenJob(b: MapBuilder, id: number, sx: number, sy: number, rx: number, ry: number) {
  if (!b.groups[`job:${id}`]) b.group(`job:${id}`, [id]);
  b.spots.push({ kind: 'job', x: sx, y: sy, job: id });
  b.resident('lumen', rx, ry, 'down', { job: id });
}

/** A rowing boat on the water; its lamp is the job. The client waits on the boards. */
function boat(b: MapBuilder, x: number, y: number, job: number, who: string, rx: number, ry: number, big = false) {
  const group = `job:${job}`;
  b.group(group, [job]);
  const t = (i: number) => at('water', i);
  b.object(x, y, 2, 1, [t(26), t(27)], group);
  if (big) b.object(x + 2, y, 2, 1, [t(26), t(27)], group);
  b.glow(x + 1, y + 0.5, group, 3.2, '#ffd27a');
  b.spots.push({ kind: 'job', x, y, job });
  b.resident(who, rx, ry, 'down', { job });
}

/** A sign you can read: the prop plus its text. */
function sign(b: MapBuilder, x: number, y: number, text: string) {
  b.prop(x, y, 'sign');
  b.spots.push({ kind: 'sign', x, y, text });
}

/** A rowing boat pulled up on the sand (nobody's job). */
function beached(b: MapBuilder, x: number, y: number) {
  const t = (i: number) => at('water', i);
  b.object(x, y, 2, 1, [t(26), t(27)]);
  b.block(x, y, 2, 1);
}

/** Clutter that only goes where there's room: not on anything solid, not in the water. */
function scatter(b: MapBuilder, cells: (readonly [number, number])[], name: PropName) {
  for (const [x, y] of cells) {
    const g = b.groundAt(x, y);
    if (!g || g === 'sea' || g === 'pond' || b.solid[y * b.width + x]) continue;
    b.prop(x, y, name);
  }
}

function rocks(b: MapBuilder, cells: (readonly [number, number])[]) {
  for (const [x, y] of cells) {
    const g = b.groundAt(x, y);
    if (g === 'sea') b.object(x, y, 1, 1, [at('water', 12)]);
    else b.prop(x, y, 'rock');
    b.block(x, y, 1, 1);
  }
}

export type { Point };

/** Tiny physical puzzles: boulders to push, ledges to hop, and fish off the docks. */
function puzzles(b: MapBuilder) {
  rockFill(b, 5, 15, 'harbour-rock-channel', 25, 'A tide channel runs through this hedge room, and there’s a chest across it. Boulders slide when you lean on them. Water is just a hole that hasn’t been filled yet.');
  rockPlug(b, 107, 28, 'harbour-rock-plug', 25, 'The old sailors jammed a boulder in the doorway. Push it in, then walk round it. Pulling is cheating, and impossible.');
  ledgeTerrace(b, 46, 17, 'harbour-ledge-west', 20, 'Ledge on the south side of this terrace. Down is easy, up is impossible. Plan your exit before you enter.');
  ledgeTerrace(b, 85, 3, 'harbour-ledge-clifftop', 25, 'A cliff-top nook with a one-way drop. Sailors call it the shortcut with no return ticket.');
  b.fish('harbour-bay', 36, 27);
  b.fish('harbour-pier', 72, 30);
}
