// Ready-made tiny puzzles the worlds drop into a clearing: a rock to push into a gap in a
// stream, a rock plugging a doorway, and a ledge to hop down. Each clears its patch of
// trees, builds its hedges, and records itself on the map so tests can prove it's solvable.

import { type MapBuilder, hash } from './builder';

// `sea` builds with coral and rocks and a signpost, for the world under the sea.
const wall = (b: MapBuilder, x: number, y: number, sea: boolean) =>
  sea ? b.deepProp(x, y, hash(x, y) < 0.5 ? 'rock' : 'coral') : b.bush(x, y);

function signAt(b: MapBuilder, x: number, y: number, sea: boolean) {
  if (sea) b.deepTall(x, y, 'signpost');
  else b.prop(x, y, 'sign');
}

function reset(b: MapBuilder, x: number, y: number, sea: boolean) {
  signAt(b, x, y, sea);
  b.spots.push({ kind: 'reset', x, y });
}

/** A sign close to the entry (or inside, if the entry's flanks are solid). */
function hint(b: MapBuilder, x: number, y: number, text: string, alt: { x: number; y: number }, sea: boolean) {
  const spots = [{ x, y }, alt];
  for (const s of spots) {
    if (!b.inside(s.x, s.y) || b.solid[s.y * b.width + s.x]) continue;
    signAt(b, s.x, s.y, sea);
    b.spots.push({ kind: 'sign', x: s.x, y: s.y, text });
    return;
  }
}

/**
 * 7×7 at (x, y). A hedge room with a stream across it: push the rock down into the stream
 * and it fills the gap. Enter by the gap in the top wall, at (x+3, y).
 */
export function rockFill(b: MapBuilder, x: number, y: number, chest: string, sparks: number, text: string, sea = false) {
  b.clearRect(x, y - 1, 7, 8);
  for (let i = 0; i < 7; i++) {
    if (i !== 3) wall(b, x + i, y, sea);
    wall(b, x + i, y + 6, sea);
  }
  for (let j = 1; j < 6; j++) {
    wall(b, x, y + j, sea);
    wall(b, x + 6, y + j, sea);
  }
  b.rect('pond', x + 1, y + 3, 5, 1);
  b.rock(x + 3, y + 1);
  reset(b, x + 1, y + 1, sea);
  b.chest(chest, x + 3, y + 5, sparks);
  hint(b, x + 4, y - 1, text, { x: x + 5, y: y + 1 }, sea);
  b.puzzles.push({
    kind: 'rocks',
    chest,
    from: { x: x + 3, y: y - 1 },
    pushes: [
      { rock: { x: x + 3, y: y + 1 }, dir: 'down' },
      { rock: { x: x + 3, y: y + 2 }, dir: 'down' },
    ],
  });
}

/**
 * 7×5 at (x, y). A rock plugs the doorway in the top wall at (x+3, y); push it down and in,
 * then step round it to the chest in the corner.
 */
export function rockPlug(b: MapBuilder, x: number, y: number, chest: string, sparks: number, text: string, sea = false) {
  b.clearRect(x, y - 1, 7, 6);
  for (let i = 0; i < 7; i++) {
    if (i !== 3) wall(b, x + i, y, sea);
    wall(b, x + i, y + 4, sea);
  }
  for (let j = 1; j < 4; j++) {
    wall(b, x, y + j, sea);
    wall(b, x + 6, y + j, sea);
  }
  b.rock(x + 3, y);
  reset(b, x + 1, y + 3, sea);
  b.chest(chest, x + 5, y + 3, sparks);
  hint(b, x + 4, y - 1, text, { x: x + 1, y: y + 1 }, sea);
  b.puzzles.push({
    kind: 'rocks',
    chest,
    from: { x: x + 3, y: y - 1 },
    pushes: [
      { rock: { x: x + 3, y }, dir: 'down' },
      { rock: { x: x + 3, y: y + 1 }, dir: 'down' },
    ],
  });
}

/**
 * 7×5 at (x, y). A hedge terrace with a chest, entered by the gap at (x+1, y). Its south
 * side is a one-way ledge (x+4 and x+5): hop down it to get out the short way.
 */
export function ledgeTerrace(b: MapBuilder, x: number, y: number, chest: string, sparks: number, text: string, sea = false) {
  b.clearRect(x, y - 1, 7, 7);
  for (let i = 0; i < 7; i++) {
    if (i !== 1) wall(b, x + i, y, sea);
    if (i !== 4 && i !== 5) wall(b, x + i, y + 4, sea);
  }
  for (let j = 1; j < 4; j++) {
    wall(b, x, y + j, sea);
    wall(b, x + 6, y + j, sea);
  }
  b.ledge(x + 4, y + 4, 2);
  b.chest(chest, x + 5, y + 1, sparks);
  hint(b, x + 2, y - 1, text, { x: x + 2, y: y + 1 }, sea);
  b.puzzles.push({ kind: 'ledge', above: { x: x + 4, y: y + 3 }, below: { x: x + 4, y: y + 5 } });
}
