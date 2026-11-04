// World 3: Mossbell Hollow. An old mill village up the valley, half empty for fifty years.
// After Star Night one light stayed on up here, and people say a lady with a lantern walks
// the lanes at night. The road runs from the bus stop past the mill and the Mere, through
// the empty houses of Bellfield, and up to the old bell tower.
//
//   x:  0     16          44          72            104          136
//       Hollow │ Mill Lane │ The Mere  │ Bellfield    │ The Bell
//       Stop   │ 38, 39    │ 40, 41    │ 42, 43, 44   │ Tower 45, B

import { MapBuilder } from './builder';
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
  b.resident('gran', 11, 22, 'down', { chat: 'gran-hollow' });
  b.resident('wren', 12, 26, 'up', { chat: 'wren-hollow', until: 'area:mill' });
  b.ruin('kiln', 1, 17);
  b.spots.push({ kind: 'sign', x: 13, y: 21, text: 'MOSSBELL HOLLOW. Population: 3. Somebody has scratched out the 3 and written 4.' });
  b.prop(13, 21, 'sign');
  b.treeLine(0, 16, 'top', 14, ['dead', 'pine', 'dead']);
  b.treeLine(0, 16, 'bottom', 31, ['pine', 'dead', 'round']);
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
  // Hazel's cottage, with a vegetable bed run wild.
  b.ruin('paleHouse', 20, 15, 'area:mill');
  b.bed(24, 16, 3, 2, 'meadow');
  b.prop(23, 26, 'well');
  b.secret({ id: 'mill-well', x: 23, y: 26 });

  for (const [x, y] of [[34, 15], [21, 28], [41, 27]] as const) b.prop(x, y, 'barrel');
  b.lamp(19, 25, 'area:mill', 'hook');
  b.lamp(35, 26, 'area:mill', 'hook');
  b.mossy('bigTree', 17, 27);
  b.mossy('tree', 41, 16);
  b.treeLine(16, 44, 'top', 11, ['dead', 'pine', 'round']);
  b.treeLine(16, 44, 'bottom', 31, ['pine', 'dead', 'round']);
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

  b.ruin('mossHouse', 48, 15, 'area:mere');
  b.ruin('stiltHut', 64, 13);
  for (const [x, y] of [[49, 28], [66, 29], [47, 34], [69, 33], [62, 27]] as const) b.prop(x, y, 'reeds');
  for (const [x, y] of [[60, 30], [52, 36], [63, 35]] as const) b.prop(x, y, 'lily');
  b.mossy('boulder', 68, 25);
  b.lamp(51, 21, 'area:mere', 'park');
  b.lamp(66, 21, 'area:mere', 'park');
  // Will-o'-the-wisps over the water once the Mere is safe.
  for (const [x, y] of [[50, 31], [61, 37], [66, 32]] as const) b.glow(x, y, 'area:mere', 1.5, '#c6ff7a');
  b.treeLine(44, 72, 'top', 11, ['dead', 'pine', 'dead']);
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
  b.lamp(93, 20, 'area:bellfield', 'post');
  b.lamp(100, 23, 'area:bellfield', 'post');
  for (const [x, y] of [[79, 21], [85, 19], [98, 20], [90, 25], [83, 24]] as const) b.prop(x, y, 'mushroom');
  b.treeLine(72, 104, 'top', 10, ['dead', 'dead', 'pine']);
  b.treeLine(72, 104, 'bottom', 35, ['dead', 'pine']);
  // Moth's game: her grandpa's old meter, nailed to a post by the schoolroom path.
  b.prop(84, 19, 'sign');
  b.spots.push({ kind: 'game', x: 84, y: 19, game: 'needle' });
  // Hazel's mill-room panel of stopped clocks: Clock Panel.
  b.prop(87, 19, 'sign');
  b.spots.push({ kind: 'game', x: 87, y: 19, game: 'panel' });
  b.spots.push({ kind: 'note', x: 102, y: 25, note: 'two' });
  b.sighting({ id: 'bellfield-lantern', who: 'glimmer', x: 97, y: 30 });
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
  b.treeLine(104, W, 'top', 6, ['dead', 'pine']);
  b.treeLine(104, W, 'bottom', 32, ['dead', 'pine']);
  b.secret({ id: 'tower-clock', x: 124, y: 16 });
  // The old well behind the tower: Glimmer's bubble goes down it, all the way to the sea.
  b.prop(131, 22, 'well');
  b.spots.push({ kind: 'exit', x: 131, y: 22, to: 'deep', via: 'bubble' });
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
