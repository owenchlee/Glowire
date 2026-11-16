import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../levels/levels';
import { hash } from './builder';
import { buildGlowtown } from './glowtown';
import { buildHarbour } from './harbour';
import { buildMossbell } from './mossbell';
import { jobPlace, WORLDS, worldMap } from './worlds';

const BUILDERS = { glowtown: buildGlowtown, harbour: buildHarbour, mossbell: buildMossbell };

describe('map builders', () => {
  for (const [id, build] of Object.entries(BUILDERS)) {
    it(`${id} builds a deterministic, well-formed map`, () => {
      const a = build();
      const b = build();
      expect(a.id).toBe(id);
      expect(a.ground.length).toBe(a.width * a.height);
      expect(a.solid.length).toBe(a.width * a.height);
      expect(Array.from(a.ground)).toEqual(Array.from(b.ground));
      expect(Array.from(a.solid)).toEqual(Array.from(b.solid));
      expect(a.spawn.x).toBeGreaterThanOrEqual(0);
      expect(a.spawn.x).toBeLessThan(a.width);
      expect(a.spawn.y).toBeLessThan(a.height);
      expect(a.solid[Math.floor(a.spawn.y) * a.width + Math.floor(a.spawn.x)]).toBe(0);
    });
  }
});

describe('hash', () => {
  it('is deterministic and in [0, 1)', () => {
    expect(hash(3, 7)).toBe(hash(3, 7));
    for (let x = 0; x < 20; x++) for (let y = 0; y < 20; y++) {
      const v = hash(x, y);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(hash(1, 2)).not.toBe(hash(2, 1));
  });
});

describe('jobPlace', () => {
  it('finds every job in the world that owns its chapter, at its job spot', () => {
    for (const world of WORLDS) {
      const map = worldMap(world.id)!;
      const jobs = CHAPTERS.filter((c) => world.chapters.includes(c.id)).flatMap((c) => c.levels.map((l) => l.id));
      for (const job of jobs) {
        const place = jobPlace(job)!;
        expect(place.world.id).toBe(world.id);
        expect(place.map).toBe(map);
        expect(map.spots.some((s) => s.kind === 'job' && s.job === job && s.x === place.x && s.y === place.y)).toBe(true);
      }
    }
  });

  it('returns null for an unknown job', () => {
    expect(jobPlace(-1)).toBeNull();
  });
});
