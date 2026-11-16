import { describe, expect, it } from 'vitest';

import { areaDone, openAreas } from '../world/logic';
import { worldMap } from '../world/worlds';
import {
  decodeExplored,
  emptyExplored,
  encodeExplored,
  fromBase64,
  isExplored,
  nextGoal,
  readExplored,
  revealAround,
  toBase64,
  writeExplored,
} from './explored';
import { bmpBase64, paintMap, terrainGrid } from './mapPaint';

const map = worldMap('glowtown')!;
const upTo = (k: number) => {
  const done = new Set(map.areas.filter((a) => a.jobs.length).slice(0, k).flatMap((a) => a.jobs));
  return (id: number) => done.has(id);
};

describe('explored cells', () => {
  it('reveals a disc around the hero, and says whether anything was new', () => {
    const ex = emptyExplored(map);
    expect(revealAround(ex, map, 10, 10, 3)).toBe(true);
    expect(isExplored(ex, map, 10, 10)).toBe(true);
    expect(isExplored(ex, map, 13, 10)).toBe(true);
    expect(isExplored(ex, map, 13, 13)).toBe(false);
    expect(revealAround(ex, map, 10, 10, 3)).toBe(false);
    expect(revealAround(ex, map, 0, 0, 2)).toBe(true); // clipped at the edge, no throw
  });

  it('round-trips through a short string, and through the save', () => {
    const ex = emptyExplored(map);
    revealAround(ex, map, 50, 20, 6);
    revealAround(ex, map, map.width - 1, map.height - 1, 4);
    expect(decodeExplored(encodeExplored(ex), map)).toEqual(ex);
    expect(encodeExplored(ex).length).toBeLessThan(1300);
    const seen = writeExplored(writeExplored(['note:a'], map, emptyExplored(map)), map, ex);
    expect(seen.filter((k) => k.startsWith('explored:glowtown:'))).toHaveLength(1);
    expect(seen).toContain('note:a');
    expect(readExplored(seen, map)).toEqual(ex);
  });

  it('shrugs off a missing, corrupt or wrong-sized string', () => {
    const empty = emptyExplored(map);
    expect(decodeExplored(undefined, map)).toEqual(empty);
    expect(decodeExplored('!!not base64', map)).toEqual(empty);
    expect(decodeExplored('AAAA', map)).toEqual(empty);
    expect(readExplored([], map)).toEqual(empty);
  });

  it('base64 matches the standard alphabet and padding', () => {
    for (const s of ['', 'a', 'ab', 'abc', 'abcdÿ']) {
      const bytes = new Uint8Array([...s].map((c) => c.charCodeAt(0)));
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      expect(fromBase64(toBase64(bytes))).toEqual(bytes);
    }
  });
});

describe('nextGoal', () => {
  it('starts at the first road job of the first area that has any', () => {
    const goal = nextGoal(map, () => false)!;
    expect(goal.kind).toBe('job');
    expect(goal.job).toBe(map.areas.find((a) => a.jobs.length)!.jobs[0]);
    expect(map.spots).toContainEqual({ kind: 'job', x: goal.x, y: goal.y, job: goal.job });
    expect(goal.label).toMatch(/^Help /);
  });

  it('moves on to the next area once one is done, via its gate if you have not been there', () => {
    const solved = upTo(1);
    const front = openAreas(map, solved) - 1;
    expect(areaDone(map.areas[front - 1]!, solved)).toBe(true);
    const goal = nextGoal(map, solved)!;
    expect(goal.job).toBe(map.areas[front]!.jobs[0]);
    const gate = map.gates.find((g) => g.area === front - 1);
    expect(gate).toBeDefined();
    if (gate) {
      const viaGate = nextGoal(map, solved, emptyExplored(map))!;
      expect(viaGate.kind).toBe('gate');
      expect(gate.cells).toContainEqual({ x: viaGate.x, y: viaGate.y });
      const ex = emptyExplored(map);
      revealAround(ex, map, goal.x, goal.y, 1);
      expect(nextGoal(map, solved, ex)).toEqual(goal);
    }
  });

  it('ends at the bus to the next world once every job is done', () => {
    const all = new Set(map.areas.flatMap((a) => [...a.jobs, ...(a.side ?? [])]));
    const goal = nextGoal(map, (j) => all.has(j))!;
    expect(goal.kind).toBe('exit');
    expect(map.spots).toContainEqual(expect.objectContaining({ kind: 'exit', x: goal.x, y: goal.y, to: 'harbour' }));
  });
});

describe('map painting', () => {
  it('sees roads, water and buildings in a real town', () => {
    const t = terrainGrid(map, () => false);
    for (const kind of ['grass', 'road', 'water', 'building', 'gate'] as const) expect(t).toContain(kind);
  });

  it('paints fog where you have not been and a valid BMP', () => {
    const ex = emptyExplored(map);
    revealAround(ex, map, map.spawn.x, map.spawn.y, 5);
    const img = paintMap(map, ex, () => false, 2);
    expect(img.width).toBe(map.width * 2);
    const px = (x: number, y: number) => [...img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];
    expect(px(img.width - 1, 0)).toEqual([9, 10, 22]);
    expect(px(map.spawn.x * 2, map.spawn.y * 2)).not.toEqual([9, 10, 22]);
    const bmp = Buffer.from(bmpBase64(img, toBase64), 'base64');
    expect(bmp.subarray(0, 2).toString()).toBe('BM');
    expect(bmp.readUInt32LE(2)).toBe(bmp.length);
  });
});
