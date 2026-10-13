// The worlds you travel between. Each one is its own map and its own set of jobs.

import { buildGlowtown } from './glowtown';
import { buildHarbour } from './harbour';
import { buildMossbell } from './mossbell';
import type { WorldMap } from './types';

export interface WorldInfo {
  id: string;
  name: string;
  tagline: string;
  /** Chapters (levels/chapterN) whose jobs live in this world. */
  chapters: number[];
  /** Null while the world is still being built. */
  build: (() => WorldMap) | null;
}

export const WORLDS: WorldInfo[] = [
  {
    id: 'glowtown',
    name: 'Glowtown',
    tagline: 'A city gone dark. Light it up again, one street at a time.',
    chapters: [1, 2],
    build: buildGlowtown,
  },
  {
    id: 'harbour',
    name: 'Driftwood Harbour',
    tagline: 'Fishing boats, a lighthouse, and the old clock on the hill where the Glowire begins.',
    chapters: [3, 4],
    build: buildHarbour,
  },
  {
    id: 'mossbell',
    name: 'Mossbell Hollow',
    tagline: 'An old mill village up the valley, where a lantern walks the lanes at night.',
    chapters: [5, 6],
    build: buildMossbell,
  },
];

const cache = new Map<string, WorldMap>();

/** Where a job happens: its world and the door (or signal, or tree) you knock on. */
export function jobPlace(job: number): { world: WorldInfo; map: WorldMap; x: number; y: number } | null {
  for (const world of WORLDS) {
    if (!world.build) continue;
    const map = worldMap(world.id)!;
    const spot = map.spots.find((s) => s.kind === 'job' && s.job === job);
    if (spot) return { world, map, x: spot.x, y: spot.y };
  }
  return null;
}

export function worldMap(id: string): WorldMap | null {
  const info = WORLDS.find((w) => w.id === id);
  if (!info?.build) return null;
  let map = cache.get(id);
  if (!map) cache.set(id, (map = info.build()));
  return map;
}
