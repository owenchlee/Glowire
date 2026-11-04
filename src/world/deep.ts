// World 4: Brightwater Deep. A town at the bottom of the sea, where the first lights were
// kept in jars of caught lightning. Glimmer's bubble carries you down the bottomless well
// from Mossbell. Down here it's darker than any night: your lantern is a little jar too,
// and it runs down unless you keep to the light.
//
//   x:  0       16           44              72               104           136
//       Well's  │ Jar Street  │ Coral Nursery │ The Wreck of    │ The Heart
//       Bottom  │ 47, 48      │ 49, 50        │ the Marigold    │ Hall 53 (B)
//                                             │ 51, 52          │

import { MapBuilder } from './builder';
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
  b.reef(0, 16, 'top', 14);
  b.reef(0, 16, 'bottom', 32);
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
  b.jarLamp(25, STREET - 1, 'home');
  b.jarLamp(41, STREET + STREET_H, 'home');
  b.jarLamp(30, STREET - 1, 'area:jars');
  b.jarLamp(19, STREET + STREET_H, 'area:jars');
  b.jarLamp(35, STREET + STREET_H, 'area:jars');
  b.deepTall(42, 18, 'anchor');
  b.deepTall(25, 30, 'pillar');
  for (const [x, y] of [[23, 28], [39, 29], [27, 17], [41, 16]] as const) b.deepProp(x, y, 'coral');
  b.deepProp(31, 29, 'crab');
  b.secret({ id: 'jar-labels', x: 41, y: 26 });
  b.spots.push({ kind: 'note', x: 43, y: 28, note: 'jars' });
  b.deepTall(43, 28, 'signpost');
  b.sighting({ id: 'street-shadow', who: 'hush', x: 38, y: 31 });
  b.reef(16, 44, 'top', 9);
  b.reef(16, 44, 'bottom', 34);
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
  b.reef(44, 72, 'top', 9);
  b.reef(44, 72, 'bottom', 35);
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
  b.reef(72, 104, 'top', 9);
  b.reef(72, 104, 'bottom', 36);
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
  b.reef(104, W, 'top', 3);
  b.reef(104, W, 'bottom', 33);
}

/** The cells of the gap in a reef wall at column `x`, where the street goes through. */
function gateCells(x: number) {
  return Array.from({ length: STREET_H }, (_, k) => ({ x, y: STREET + k }));
}
