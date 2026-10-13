// The worlds you travel between. Each one is its own map and its own set of jobs.

import { buildGlowtown } from './glowtown';
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
    tagline: 'Fishing boats, a lighthouse and a clock on the hill. Coming soon.',
    chapters: [3, 4],
    build: null,
  },
];

const cache = new Map<string, WorldMap>();

export function worldMap(id: string): WorldMap | null {
  const info = WORLDS.find((w) => w.id === id);
  if (!info?.build) return null;
  let map = cache.get(id);
  if (!map) cache.set(id, (map = info.build()));
  return map;
}
