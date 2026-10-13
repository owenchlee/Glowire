// World 2: Driftwood Harbour. The night bus drops you at the west end; the road follows
// the shore past the docks, out to the lighthouse and along the piers, then climbs
// Clocktower Hill to the old clock where the Glowire begins.
//
//   x:  0     14          38           62          84           106          128      150
//       Bus   │ Fish Market │ Lighthouse │ Ferry Pier │ Warehouse  │ Clocktower │ Hilltop
//       stop  │ Docks 19,20 │ Pt 21, 23  │ 22, 24     │ Row 25, B  │ Hill 26–29 │ 30,31,B
//                                                  (sea along the bottom; the hill rises north)

import { MapBuilder, at, type HouseStyle } from './builder';
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
  b.treeLine(0, 14, 'top', 15, ['pine', 'round', 'pine']);
  for (const [x, y] of [[11, 22], [12, 29], [3, 29]] as const) b.prop(x, y, 'reeds');
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
  b.treeLine(14, 38, 'top', 14, ['pine', 'round', 'bigGreen']);
  rocks(b, [[20, 35], [35, 37], [24, 38]]);
  b.lamp(19, 23, 'area:docks', 'post');
  b.spots.push({ kind: 'note', x: 36, y: 24, note: 'volts' });
  b.prop(36, 24, 'sign');
}

// ── H2: Lighthouse Point ─────────────────────────────────────────────────────
function lighthouse(b: MapBuilder) {
  b.area(
    {
      id: 'point',
      name: 'Lighthouse Point',
      jobs: [21, 23],
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
  b.prop(45, 20, 'well');
  b.treeLine(38, 62, 'top', 14, ['pine', 'bigGreen', 'round']);
  rocks(b, [[44, 34], [56, 33], [55, 37], [45, 38], [58, 30]]);
  b.lamp(42, 23, 'area:point', 'post');
  b.lamp(57, 25, 'area:point', 'post');
}

// ── H3: Ferry Pier ───────────────────────────────────────────────────────────
function ferryPier(b: MapBuilder) {
  b.area(
    {
      id: 'pier',
      name: 'Ferry Pier',
      jobs: [22, 24],
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
  b.treeLine(62, 84, 'top', 14, ['pine', 'round']);
  rocks(b, [[75, 37], [82, 35], [63, 34]]);
  b.lamp(67, 26, 'area:pier', 'hook');
  b.lamp(80, 26, 'area:pier', 'hook');
}

// ── H4: Warehouse Row ────────────────────────────────────────────────────────
function warehouses(b: MapBuilder) {
  b.area(
    {
      id: 'warehouses',
      name: 'Warehouse Row',
      jobs: [25, 34],
      intro: 'warehouse-intro',
      outro: 'warehouse-outro',
      entry: { x: 86, y: 25, facing: 'right' },
      gate: 'The hill path is dark, and the power station’s still humming wrong. Not yet!',
    },
    [{ x: 84, y: 0, w: 22, h: H }],
  );
  b.wall(84, 24, 26, 'fence');
  b.gate(3, [{ x: 84, y: 24 }, { x: 84, y: 25 }, { x: 84, y: 26 }]);
  b.plaza(85, 20, 20, 7, true);
  b.skyline(85, 105, 16, 'area:warehouses');
  cityJob(b, 25, 'rosa', 86, 15, 6, 3);
  // The harbour power station: where Grumble has dug in.
  b.group('job:34', [34]);
  const door = b.building({ x: 95, y: 13, w: 8, roof: 3, roofStyle: 'slate', wall: 'red', door: 'double', window: 'wide', group: 'job:34' });
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: 34 });
  b.doorLight(door, 'job:34');
  b.resident('rosa', door.x + 1, door.y, 'down', { job: 34 });
  b.resident('grumble', door.x - 2, door.y, 'right', { until: 'job:34', after: 'job:25' });
  for (const x of [88, 89, 101, 102]) b.prop(x, 23, 'crate');
  b.prop(90, 23, 'barrel');
  b.prop(98, 26, 'cone');
  b.prop(99, 26, 'cone');
  b.lamp(92, 26, 'area:warehouses', 'twin');
  b.lamp(104, 22, 'area:warehouses', 'twin');
  b.treeLine(84, 106, 'top', 9, ['pine', 'round']);
  rocks(b, [[90, 36], [100, 34]]);
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
  const tower = b.building({ x: 118, y: 11, w: 7, roof: 3, roofStyle: 'slate', wall: 'orange', door: 'double', window: 'tall', group: 'area:hill' });
  lumenJob(b, 26, tower.x, tower.y - 1, tower.x + 1, tower.y);
  b.group('job:27', [27]);
  b.object(112, 19, 2, 2, [at('towers', 60), at('towers', 61), at('towers', 84), at('towers', 85)], 'job:27');
  b.block(112, 20, 2, 1);
  lumenJob(b, 27, 112, 20, 114, 20);
  b.group('job:28', [28]);
  b.lamp(108, 15, 'job:28', 'park');
  lumenJob(b, 28, 108, 15, 108, 16);
  b.group('job:29', [29]);
  b.lamp(122, 21, 'job:29', 'park');
  lumenJob(b, 29, 122, 21, 121, 21);

  b.treeLine(106, 128, 'top', 4, ['pine', 'dead']);
  for (const [x, y] of [[115, 27], [125, 26], [111, 11], [124, 17]] as const) b.tree(x, y, 'pine');
  rocks(b, [[109, 22], [120, 26], [126, 14], [114, 13]]);
  b.lamp(116, 24, 'area:hill', 'park');
  b.spots.push({ kind: 'note', x: 126, y: 11, note: 'beginning' });
  b.prop(126, 11, 'sign');
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
  b.treeLine(128, W, 'top', 4, ['pine', 'dead']);
  b.treeLine(128, W, 'bottom', 24, ['pine', 'round']);
  rocks(b, [[137, 19], [148, 10], [131, 15]]);
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

function rocks(b: MapBuilder, cells: (readonly [number, number])[]) {
  for (const [x, y] of cells) {
    const g = b.groundAt(x, y);
    if (g === 'sea') b.object(x, y, 1, 1, [at('water', 12)]);
    else b.prop(x, y, 'rock');
    b.block(x, y, 1, 1);
  }
}

export type { Point };
