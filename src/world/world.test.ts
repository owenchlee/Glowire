import { describe, expect, it } from 'vitest';

import { CAST } from '../game/cast';
import { NOTES, SCENES } from '../game/story';
import { CHAPTERS } from '../levels/levels';
import {
  allJobs,
  blockedCells,
  findPath,
  fogMask,
  gateAt,
  jobOpen,
  litGroups,
  openAreas,
  presentResidents,
  targetAt,
} from './logic';
import { newRocks, pushRock, solvedRocks, withRocks } from './rocks';
import { WORLDS, worldMap } from './worlds';

for (const info of WORLDS.filter((w) => w.build)) {
  describe(info.name, () => {
    const map = worldMap(info.id)!;
    const jobs = CHAPTERS.filter((c) => info.chapters.includes(c.id)).flatMap((c) => c.levels.map((l) => l.id));
    /** Solved = every job in the first `k` areas. */
    const upTo = (k: number) => {
      const done = new Set(map.areas.slice(0, k).flatMap((a) => a.jobs));
      return (id: number) => done.has(id);
    };

    it('puts every job of its chapters in exactly one area, with a door, a client and a light', () => {
      expect([...map.areas.flatMap(allJobs)].sort((a, b) => a - b)).toEqual([...jobs].sort((a, b) => a - b));
      for (const id of jobs) {
        expect(map.spots.some((s) => s.kind === 'job' && s.job === id), `spot for job ${id}`).toBe(true);
        expect(map.residents.some((r) => r.job === id), `client for job ${id}`).toBe(true);
        expect(Object.values(map.groups).some((g) => g.includes(id)), `light group for ${id}`).toBe(true);
      }
    });

    it('keeps everything inside the map', () => {
      for (const o of map.objects) {
        expect(o.x).toBeGreaterThanOrEqual(-1);
        expect(o.x + o.w).toBeLessThanOrEqual(map.width + 1);
        expect(o.y + o.h).toBeLessThanOrEqual(map.height + 1);
        expect(o.tiles).toHaveLength(o.w * o.h);
      }
      for (const r of map.residents) expect(r.x >= 0 && r.y >= 0 && r.x < map.width && r.y < map.height).toBe(true);
    });

    it('never puts two residents, or a resident and a wall, in one cell', () => {
      const seen = new Set<string>();
      for (const r of map.residents) {
        const key = `${r.x},${r.y}`;
        expect(seen.has(key), `two residents at ${key}`).toBe(false);
        seen.add(key);
        const others = map.objects.filter(
          (o) =>
            !o.flat &&
            r.x >= o.x &&
            r.x < o.x + o.w &&
            r.y === o.y + o.h - 1 &&
            o.tiles[(r.y - o.y) * o.w + r.x - o.x]! >= 0,
        );
        expect(others, `${r.who} stands inside something at ${key}`).toHaveLength(0);
      }
    });

    it('opens the route one area at a time, and everything in an open area can be reached', () => {
      for (let k = 0; k < map.areas.length; k++) {
        const solved = upTo(k);
        const open = openAreas(map, solved);
        // Areas with no jobs (home) don't hold you up.
        let expected = 1;
        while (expected < map.areas.length && map.areas[expected - 1]!.jobs.every(solved)) expected++;
        expect(open, `after ${k} areas`).toBe(expected);
        expect(open).toBeGreaterThanOrEqual(Math.min(k + 1, map.areas.length));
        const residents = presentResidents(map, solved);
        const base = blockedCells(map, residents, solved);
        // Rock puzzles are solved first, so the chests and signs behind them count as reachable.
        const blocked = withRocks(map, base, solvedRocks(map, base) ?? undefined);
        expect(blocked[map.spawn.y * map.width + map.spawn.x]).toBe(0);
        for (const spot of map.spots) {
          const a = map.areaOf[spot.y * map.width + spot.x]!;
          const path = findPath(map, blocked, map.spawn, spot);
          if (a < open) expect(path, `can't reach ${spot.kind} at ${spot.x},${spot.y} after ${k} areas`).not.toBeNull();
          else expect(path, `${spot.kind} at ${spot.x},${spot.y} reachable too early`).toBeNull();
        }
        for (const r of residents) {
          const a = map.areaOf[r.y * map.width + r.x]!;
          if (a < open) expect(findPath(map, blocked, map.spawn, r), `${r.who} after ${k}`).not.toBeNull();
        }
        // Jobs open exactly when their area does.
        for (const [i, area] of map.areas.entries())
          for (const j of allJobs(area)) expect(jobOpen(map, j, solved), `job ${j} after ${k}`).toBe(i < open || solved(j));
      }
    });

    it('is dark beyond the open areas only', () => {
      const open = openAreas(map, upTo(1));
      const fog = fogMask(map, upTo(1));
      for (let i = 0; i < fog.length; i++) {
        const a = map.areaOf[i]!;
        expect(fog[i]).toBe(a !== 255 && a >= open ? 255 : 0);
      }
      expect(fogMask(map, () => true).every((v) => v === 0)).toBe(true);
    });

    it('has a gate out of every area but the last, which opens with that area', () => {
      for (let i = 0; i < map.areas.length - 1; i++) {
        if (map.areas[i]!.jobs.length === 0) continue;
        const g = map.gates.find((x) => x.area === i);
        expect(g, `gate out of ${map.areas[i]!.name}`).toBeDefined();
        const c = g!.cells[0]!;
        expect(gateAt(map, upTo(i), c.x, c.y)).toBe(i);
        expect(gateAt(map, upTo(i + 1), c.x, c.y)).toBeNull();
      }
    });

    it('only uses scenes, notes and speakers that exist', () => {
      for (const a of map.areas) {
        if (a.intro) expect(SCENES[a.intro], a.intro).toBeDefined();
        if (a.outro) expect(SCENES[a.outro], a.outro).toBeDefined();
      }
      for (const s of map.spots) if (s.kind === 'note') expect(NOTES[s.note], s.note).toBeDefined();
      for (const r of map.residents) {
        if (r.chat) expect(SCENES[r.chat], r.chat).toBeDefined();
        expect(r.who === 'pip' || r.who === 'grumble' || !!CAST[r.who], r.who).toBe(true);
      }
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
    const dots = (solved: number[]) => presentResidents(map, (id) => solved.includes(id)).filter((r) => r.who === 'dot');
    expect(dots([])).toHaveLength(1);
    expect(dots([])[0]!.job).toBe(16);
    expect(dots([16])[0]!.job).toBe(18);
    expect(dots([16, 18])[0]!.job).toBe(33);
    expect(dots([16, 18, 33])[0]!.job).toBe(33);
  });

  it('moves Gran from her workshop to the woods once Maple Lane is done', () => {
    const grans = (solved: number[]) =>
      presentResidents(map, (id) => solved.includes(id)).filter((r) => r.who === 'gran');
    expect(grans([])).toHaveLength(1);
    expect(grans([])[0]!.job).toBeUndefined();
    expect(grans([1, 2, 3])[0]!.job).toBe(32);
  });
});

describe('findPath', () => {
  const map = worldMap('glowtown')!;
  const residents = presentResidents(map, () => false);
  const blocked = blockedCells(map, residents);

  it('walks up next to a person instead of into them', () => {
    const pip = residents.find((r) => r.who === 'pip')!;
    const path = findPath(map, blocked, map.spawn, pip)!;
    const end = path[path.length - 1] ?? map.spawn;
    expect(Math.abs(end.x - pip.x) + Math.abs(end.y - pip.y)).toBe(1);
    expect(targetAt(residents, map, pip.x, pip.y)?.kind).toBe('resident');
  });

  it('takes the shortest route on open ground', () => {
    const path = findPath(map, blocked, { x: 5, y: 25 }, { x: 5, y: 27 })!;
    expect(path).toHaveLength(2);
  });

  it('finds the gate when facing it', () => {
    const g = map.gates[0]!.cells[0]!;
    expect(targetAt(residents, map, g.x, g.y)?.kind).toBe('gate');
  });
});

for (const info of WORLDS.filter((w) => w.build)) {
  describe(`${info.name} puzzles`, () => {
    const map = worldMap(info.id)!;
    const base = blockedCells(map, [], () => true);
    const puzzles = map.puzzles ?? [];
    const at = (p: { x: number; y: number }) => p.y * map.width + p.x;

    it('has rocks to push and ledges to hop', () => {
      expect(puzzles.filter((p) => p.kind === 'rocks').length).toBeGreaterThanOrEqual(1);
      expect(puzzles.filter((p) => p.kind === 'ledge').length).toBeGreaterThanOrEqual(1);
    });

    it('keeps every chest behind a rock puzzle out of reach until the rocks are moved, then reachable', () => {
      for (const p of puzzles) {
        if (p.kind !== 'rocks') continue;
        const chest = map.spots.find((s) => s.kind === 'chest' && s.id === p.chest)!;
        let state = newRocks(map);
        const reach = (to: { x: number; y: number }) => findPath(map, withRocks(map, base, state), map.spawn, to);
        expect(reach(chest), `${p.chest} open without pushing`).toBeNull();
        expect(reach(p.from), `can't get to the start of ${p.chest}`).not.toBeNull();
        for (const push of p.pushes) {
          const behind = { x: push.rock.x - STEP_OF[push.dir].x, y: push.rock.y - STEP_OF[push.dir].y };
          expect(reach(behind), `can't stand behind the rock at ${push.rock.x},${push.rock.y}`).not.toBeNull();
          const next = pushRock(map, base, state, push.rock.x, push.rock.y, push.dir);
          expect(next, `push at ${push.rock.x},${push.rock.y} ${push.dir}`).not.toBeNull();
          state = next!.state;
        }
        expect(reach(chest), `${p.chest} can't be reached once solved`).not.toBeNull();
      }
    });

    it('lets you drop down a ledge but not climb it', () => {
      for (const p of puzzles) {
        if (p.kind !== 'ledge') continue;
        expect(map.ledges![at({ x: p.above.x, y: p.above.y + 1 })]).toBe(1);
        expect(findPath(map, base, p.above, p.below)).toHaveLength(2);
        const back = findPath(map, base, p.below, p.above);
        expect(back === null || back.length >= 8, 'climbing a ledge').toBe(true);
        expect(findPath(map, base, map.spawn, p.below), 'the foot of a ledge is reachable').not.toBeNull();
      }
    });

    it('puts every fishing spot on water with a shore you can stand on', () => {
      for (const s of map.spots) {
        if (s.kind !== 'fish') continue;
        expect(map.water![at(s)], `fish at ${s.x},${s.y} isn't water`).toBe(1);
        expect(findPath(map, base, map.spawn, s), `no shore at ${s.x},${s.y}`).not.toBeNull();
      }
      if (info.id !== 'deep') expect(map.spots.some((s) => s.kind === 'fish')).toBe(true);
    });
  });
}

const STEP_OF = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
