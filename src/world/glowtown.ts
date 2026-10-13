// World 1: Glowtown, a city gone dark. Maple Street (chapter 1) runs down the west side,
// Market Square (chapter 2) the east, and Gran's workshop sits in the middle of town.
//
//          col 0          20  23            41  44            59
//   row 0  ┌ A1 Maple N ┐ ║  ┌ B1 Park    ┐ ║  ┌ C1 Market N ┐
//      12  ═════════════════════════════════════════════════════
//      15  ┌ A2 Maple   ┐ ║  ┌ B2 Workshop┐ ║  ┌ C2 Market   ┐
//      25  ═════════════════════════════════════════════════════
//      28  └ A3 Maple S ┘ ║  └ B3 Café    ┘ ║  └ C3 Clock    ┘

import { CITY, MapBuilder } from './builder';
import type { WorldMap } from './types';

export function buildGlowtown(): WorldMap {
  const b = new MapBuilder(60, 36);

  // Streets.
  b.road('h', 12);
  b.road('h', 25);
  b.road('v', 20);
  b.road('v', 41);
  for (const x of [20, 41]) for (const y of [12, 25]) b.junction(x, y);

  // Blocks of pavement between the streets.
  const cols = [
    [0, 20],
    [23, 18],
    [44, 16],
  ] as const;
  const rows = [
    [0, 12],
    [15, 10],
    [28, 8],
  ] as const;
  for (const [x, w] of cols) for (const [y, h] of rows) b.sidewalk(x, y, w, h);

  // Gran's workshop and the gadget shop glow from the start: home base.
  b.group('home', []);

  // ── A1: Maple Street north ──────────────────────────────────────────────
  job(b, 1, 'pell', { x: 2, y: 2, w: 5, roofStyle: 'tan', wall: 'red', door: 'wood' });
  job(b, 2, 'okoro', { x: 8, y: 2, w: 4, roofStyle: 'slate', wall: 'orange', door: 'wood' });
  job(b, 3, 'rafi', { x: 13, y: 2, w: 5, roofStyle: 'tan', wall: 'orange', door: 'double' });
  b.park(1, 8, 18, 3);
  b.group('lamp:a1', [1, 2, 3]);
  b.lamp(1, 7, 'lamp:a1');
  b.lamp(9, 7, 'lamp:a1');
  b.lamp(18, 7, 'lamp:a1');
  b.tree(2, 10, 'oak');
  b.tree(15, 10, 'lime');
  b.bush(7, 8);
  b.bush(12, 8);
  for (const x of [3, 4, 5]) b.flowers(x, 7);
  b.prop(11, 10, 'bench');
  for (const x of [1, 7, 12, 18]) b.bush(x, 1);

  // ── A2: Maple Street ───────────────────────────────────────────────────
  job(b, 4, 'theo', { x: 2, y: 16, w: 5, roofStyle: 'slate', wall: 'red', door: 'wood' });
  job(b, 5, 'twins', { x: 8, y: 16, w: 5, roofStyle: 'tan', wall: 'red', door: 'double' });
  job(b, 6, 'arjun', {
    x: 13,
    y: 16,
    w: 6,
    doorAt: 4,
    roofStyle: 'slate',
    wall: 'orange',
    door: 'shop',
    storefront: true,
  });
  b.park(1, 22, 18, 2);
  b.group('lamp:a2', [4, 5, 6]);
  b.lamp(1, 21, 'lamp:a2');
  b.lamp(13, 21, 'lamp:a2');
  b.tree(7, 23, 'cherry');
  b.bush(3, 23);
  b.prop(16, 23, 'bench');
  b.prop(19, 21, 'hydrant');
  for (const x of [10, 11]) b.flowers(x, 22);

  // ── A3: Maple Street south (school and library) ─────────────────────────
  job(b, 7, 'nadia', { x: 2, y: 29, w: 4, roofStyle: 'tan', wall: 'orange', door: 'wood' });
  job(b, 8, 'ito', { x: 7, y: 29, w: 6, doorAt: 3, roofStyle: 'slate', wall: 'orange', door: 'double', window: 'tall' });
  job(b, 9, 'finch', { x: 13, y: 29, w: 5, roofStyle: 'slate', wall: 'red', door: 'glass', window: 'tall' });
  b.park(1, 34, 18, 1);
  b.group('lamp:a3', [7, 8, 9]);
  b.lamp(1, 34, 'lamp:a3');
  b.lamp(12, 34, 'lamp:a3');
  // The school crossing light on the corner (job 16 belongs to Market Square's story).
  signal(b, 16, 'dot', 19, 28, 'left');

  // ── B1: the park, with the twins' secret treehouse ───────────────────────
  b.park(24, 1, 16, 10);
  b.pond(27, 3, 7, 4);
  b.group('job:10', [10]);
  b.object(36, 3, 2, 2, [...CITY.trees.oak], 'job:10');
  b.block(36, 4, 2, 1);
  b.spots.push({ kind: 'job', x: 36, y: 4, job: 10 });
  b.spots.push({ kind: 'job', x: 37, y: 4, job: 10 });
  b.resident('twins', 38, 5, 'left', { job: 10 });
  b.lights.push({ x: 37, y: 3.5, radius: 3.6, color: '#ffcf7a', group: 'job:10' });
  b.group('lamp:park', [10]);
  b.lamp(28, 9, 'lamp:park', 'park');
  b.lamp(36, 9, 'lamp:park', 'park');
  b.tree(24, 3, 'pine');
  b.tree(24, 10, 'lime');
  b.tree(33, 10, 'round');
  b.bush(27, 8);
  b.bush(34, 7);
  b.prop(31, 8, 'bench', false);
  for (const [x, y] of [[30, 1], [31, 1], [35, 1], [39, 7], [26, 7]]) b.flowers(x!, y!);

  // ── B2: Gran's workshop, the gadget shop and Pip ───────────────────────
  job(b, 32, 'gran', { x: 24, y: 16, w: 7, roofStyle: 'tan', wall: 'orange', door: 'double' }, 'home');
  const shop = b.building({
    x: 33,
    y: 16,
    w: 6,
    doorAt: 4,
    roofStyle: 'slate',
    wall: 'red',
    door: 'shop',
    storefront: true,
    group: 'home',
  });
  b.spots.push({ kind: 'shop', x: shop.x, y: shop.y - 1 });
  b.doorLight(shop, 'home');
  b.resident('pip', 31, 22, 'down');
  b.spots.push({ kind: 'daily', x: 31, y: 22 });
  b.tree(31, 19, 'round');
  b.group('lamp:b2', [32]);
  b.lamp(24, 23, 'lamp:b2');
  b.lamp(38, 23, 'lamp:b2');
  for (const x of [33, 34]) b.flowers(x, 22);
  b.prop(35, 23, 'bench');
  // The crossroads light by the market (job 18).
  signal(b, 18, 'dot', 40, 21, 'down');

  // ── C1: Market Square north ─────────────────────────────────────────────
  job(b, 11, 'benny', { x: 45, y: 2, w: 6, doorAt: 4, roofStyle: 'slate', wall: 'red', door: 'shop', storefront: true });
  job(b, 12, 'coral', { x: 52, y: 2, w: 6, doorAt: 3, roofStyle: 'tan', wall: 'orange', door: 'glass', window: 'wide' });
  b.park(45, 8, 14, 3);
  b.group('lamp:c1', [11, 12]);
  b.lamp(44, 7, 'lamp:c1', 'twin');
  b.lamp(58, 7, 'lamp:c1', 'twin');
  b.tree(51, 10, 'cherry');
  b.prop(47, 7, 'mailbox');
  b.bush(46, 9);
  b.bush(56, 9);
  for (const x of [45, 59]) b.bush(x, 1);

  // ── C2: Market Square ──────────────────────────────────────────────────
  job(b, 13, 'luca', { x: 45, y: 16, w: 4, roofStyle: 'tan', wall: 'red', door: 'double' });
  job(b, 14, 'sunny', { x: 50, y: 16, w: 4, roofStyle: 'slate', wall: 'orange', door: 'glass' });
  job(b, 15, 'iris', { x: 55, y: 16, w: 4, roofStyle: 'tan', wall: 'orange', door: 'wood' });
  b.park(45, 22, 14, 2);
  b.group('lamp:c2', [13, 14, 15]);
  b.lamp(44, 21, 'lamp:c2');
  b.lamp(58, 22, 'lamp:c2');
  for (const x of [54, 55, 56, 57]) b.flowers(x, 22);
  b.prop(50, 23, 'bench');
  b.bush(47, 23);

  // ── B3: Café Moonbeam and the bus stop ──────────────────────────────────
  job(b, 17, 'mei', { x: 25, y: 29, w: 6, doorAt: 2, roofStyle: 'tan', wall: 'red', door: 'glass', window: 'wide' });
  b.group('lamp:b3', [17]);
  b.lamp(32, 34, 'lamp:b3');
  b.object(38, 32, 1, 2, [167, 194]);
  b.block(38, 33, 1, 1);
  b.spots.push({ kind: 'exit', x: 38, y: 33, to: 'harbour' });
  b.prop(37, 33, 'bench');
  b.tree(34, 31, 'pine');
  b.bush(24, 34);

  // ── C3: the Market Clock (Market Square's boss) ──────────────────────────
  job(b, 33, 'dot', { x: 48, y: 29, w: 8, roofStyle: 'slate', wall: 'red', door: 'double', window: 'tall' });
  b.group('lamp:c3', [33]);
  b.lamp(45, 34, 'lamp:c3', 'twin');
  b.lamp(58, 34, 'lamp:c3', 'twin');
  b.tree(45, 31, 'oak');

  return b.finish({ id: 'glowtown', name: 'Glowtown', spawn: { x: 28, y: 22, facing: 'down' } });
}

/** A job building: its windows glow once the job is solved; the client waits by the door. */
function job(
  b: MapBuilder,
  id: number,
  who: string,
  spec: Parameters<MapBuilder['building']>[0],
  group = `job:${id}`,
) {
  if (group === `job:${id}`) b.group(group, [id]);
  const door = b.building({ ...spec, group });
  b.spots.push({ kind: 'job', x: door.x, y: door.y - 1, job: id });
  b.doorLight(door, group);
  b.resident(who, door.x + 1, door.y, 'down', { job: id });
}

/** A traffic signal on a corner, with its client beside it. */
function signal(b: MapBuilder, id: number, who: string, x: number, y: number, side: 'left' | 'down') {
  const group = `job:${id}`;
  b.group(group, [id]);
  b.object(x, y - 1, 1, 2, [166, 193], group);
  b.block(x, y, 1, 1);
  b.spots.push({ kind: 'job', x, y, job: id });
  b.lights.push({ x: x + 0.5, y: y - 0.5, radius: 3, color: '#9dffb0', group });
  if (side === 'left') b.resident(who, x - 1, y, 'right', { job: id });
  else b.resident(who, x, y + 1, 'up', { job: id });
}
