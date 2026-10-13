import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../levels/levels';
import { blockedCells, findPath, litGroups, presentResidents, targetAt } from './logic';
import { WORLDS, worldMap } from './worlds';

const order = CHAPTERS.flatMap((c) => c.levels.map((l) => l.id));

for (const info of WORLDS.filter((w) => w.build)) {
  describe(info.name, () => {
    const map = worldMap(info.id)!;
    const jobs = CHAPTERS.filter((c) => info.chapters.includes(c.id)).flatMap((c) => c.levels.map((l) => l.id));

    it('has a door (or spot) and a client for every job in its chapters', () => {
      for (const id of jobs) {
        expect(map.spots.some((s) => s.kind === 'job' && s.job === id), `spot for job ${id}`).toBe(true);
        expect(map.residents.some((r) => r.job === id), `client for job ${id}`).toBe(true);
        expect(Object.values(map.groups).some((g) => g.includes(id)), `light group for ${id}`).toBe(true);
      }
    });

    it('keeps everything inside the map', () => {
      for (const o of map.objects) {
        expect(o.x).toBeGreaterThanOrEqual(0);
        expect(o.y).toBeGreaterThanOrEqual(-1);
        expect(o.x + o.w).toBeLessThanOrEqual(map.width);
        expect(o.y + o.h).toBeLessThanOrEqual(map.height);
        expect(o.tiles).toHaveLength(o.w * o.h);
      }
      for (const r of map.residents) {
        expect(r.x >= 0 && r.y >= 0 && r.x < map.width && r.y < map.height).toBe(true);
      }
    });

    it('never puts two residents, or a resident and a wall, in one cell', () => {
      const seen = new Set<string>();
      for (const r of map.residents) {
        const key = `${r.x},${r.y}`;
        expect(seen.has(key), `two residents at ${key}`).toBe(false);
        seen.add(key);
        // The builder marks residents solid; anything else solid there would be a clash.
        const others = map.objects.filter(
          (o) => r.x >= o.x && r.x < o.x + o.w && r.y === o.y + o.h - 1 && o.tiles[(r.y - o.y) * o.w + r.x - o.x]! >= 0,
        );
        expect(others, `${r.who} stands inside something at ${key}`).toHaveLength(0);
      }
    });

    it('lets the hero walk from the start to every job, the shop and the daily call', () => {
      const residents = presentResidents(map, order, () => false);
      const blocked = blockedCells(map, residents);
      expect(blocked[map.spawn.y * map.width + map.spawn.x]).toBe(0);
      for (const spot of map.spots) {
        const path = findPath(map, blocked, map.spawn, spot);
        expect(path, `can't reach ${spot.kind} at ${spot.x},${spot.y}`).not.toBeNull();
      }
      // With every job done, each client is standing somewhere reachable too.
      const done = presentResidents(map, order, () => true);
      const blockedDone = blockedCells(map, done);
      for (const r of done) expect(findPath(map, blockedDone, map.spawn, r), r.who).not.toBeNull();
    });

    it('starts dark except home, and lights groups as jobs are solved', () => {
      const none = litGroups(map, () => false);
      expect([...none].every((g) => map.groups[g]!.length === 0)).toBe(true);
      const all = litGroups(map, () => true);
      expect(all.size).toBe(Object.keys(map.groups).length);
    });
  });
}

describe('presentResidents', () => {
  const map = worldMap('glowtown')!;

  it('shows Officer Dot at one job at a time', () => {
    const dots = (solved: number[]) =>
      presentResidents(map, order, (id) => solved.includes(id)).filter((r) => r.who === 'dot');
    expect(dots([])).toHaveLength(1);
    expect(dots([])[0]!.job).toBe(16);
    expect(dots([16])[0]!.job).toBe(18);
    expect(dots([16, 18])[0]!.job).toBe(33);
    expect(dots([16, 18, 33])[0]!.job).toBe(33);
  });
});

describe('findPath', () => {
  const map = worldMap('glowtown')!;
  const residents = presentResidents(map, order, () => false);
  const blocked = blockedCells(map, residents);

  it('walks up next to a person instead of into them', () => {
    const pip = residents.find((r) => r.who === 'pip')!;
    const path = findPath(map, blocked, map.spawn, pip)!;
    const end = path[path.length - 1] ?? map.spawn;
    expect(Math.abs(end.x - pip.x) + Math.abs(end.y - pip.y)).toBe(1);
    expect(targetAt(residents, map, pip.x, pip.y)?.kind).toBe('resident');
  });

  it('takes the shortest route on open pavement', () => {
    const path = findPath(map, blocked, { x: 28, y: 22 }, { x: 28, y: 24 })!;
    expect(path).toHaveLength(2);
  });
});
