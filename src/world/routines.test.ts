import { describe, expect, it } from 'vitest';

import { type Routine, cycle, placeResident, placeResidents, residentKey, routineCells } from './routines';
import { ROUTINES } from './routines.data';
import type { Resident } from './types';
import { WORLDS, worldMap } from './worlds';

const built = WORLDS.filter((w) => w.build).map((w) => w.id);

describe('routines data', () => {
  it('covers the maps that exist', () => {
    for (const id of Object.keys(ROUTINES)) expect(built).toContain(id);
  });

  for (const id of built) {
    describe(id, () => {
      const map = worldMap(id)!;
      const routines = ROUTINES[id] ?? {};
      const gateCells = new Set(map.gates.flatMap((g) => g.cells.map((c) => c.y * map.width + c.x)));
      const homes = new Map(map.residents.map((r) => [r.y * map.width + r.x, residentKey(r)]));
      /** Open ground: not solid (a resident's own home cell is solid, and that is fine) and nobody else's home. */
      const open = (i: number, own: string) => (map.solid[i] === 0 && !homes.has(i)) || homes.get(i) === own;
      const spotCells = new Set(map.spots.map((s) => s.y * map.width + s.x));

      it('names real residents', () => {
        const keys = new Set(map.residents.map(residentKey));
        for (const k of Object.keys(routines)) expect(keys.has(k), k).toBe(true);
      });

      it('has routines that are walkable cell by cell', () => {
        for (const [k, r] of Object.entries(routines)) {
          const cells = routineCells(r);
          for (const c of cells) {
            expect(c.x >= 0 && c.y >= 0 && c.x < map.width && c.y < map.height, `${k} in bounds`).toBe(true);
            const i = c.y * map.width + c.x;
            expect(open(i, k), `${k} at ${c.x},${c.y} is solid or someone's home`).toBe(true);
            expect(gateCells.has(i), `${k} at ${c.x},${c.y} is a gate`).toBe(false);
            expect(spotCells.has(i), `${k} at ${c.x},${c.y} is on a door or sign`).toBe(false);
          }
          const pts = cycle(r);
          for (let a = 0; a < pts.length; a++) {
            const p = pts[a]!;
            const q = pts[(a + 1) % pts.length]!;
            expect(p.x === q.x || p.y === q.y, `${k} leg is straight`).toBe(true);
          }
        }
      });

      it('never puts anyone on a blocked cell, at any moment, day or night', () => {
        for (let t = 0; t < 500; t += 0.5)
          for (const night of [false, true])
            for (const p of placeResidents(map.residents, routines, t, night, { x: 0, y: 0 })) {
              const i = p.y * map.width + p.x;
              expect(open(i, p.key), `${p.key} at ${p.x},${p.y} t=${t}`).toBe(true);
              expect(gateCells.has(i)).toBe(false);
            }
      });

      it('keeps residents with jobs outdoors at night', () => {
        for (const r of map.residents) {
          if (r.job === undefined) continue;
          const placed = placeResident(r, routines[residentKey(r)], 0, true);
          expect(placed, residentKey(r)).not.toBeNull();
        }
      });
    });
  }
});

describe('placeResident', () => {
  const base: Resident = { who: 'gus', x: 5, y: 5, facing: 'down' };
  const pace: Routine = { path: [{ x: 5, y: 5 }, { x: 9, y: 5 }], speed: 1, pause: 2 };

  it('stays put with no routine', () => {
    expect(placeResident(base, undefined, 123, false)).toMatchObject({ x: 5, y: 5, facing: 'down' });
  });

  it('is deterministic and stays inside its path', () => {
    for (let t = 0; t < 100; t += 0.3) {
      const a = placeResident(base, pace, t, false)!;
      const b = placeResident(base, pace, t, false)!;
      expect(a).toEqual(b);
      expect(a.y).toBe(5);
      expect(a.x).toBeGreaterThanOrEqual(5);
      expect(a.x).toBeLessThanOrEqual(9);
    }
  });

  it('actually moves and walks along the leg', () => {
    const xs = new Set<number>();
    for (let t = 0; t < 30; t += 0.25) xs.add(placeResident(base, pace, t, false)!.x);
    expect(xs.size).toBe(5);
  });

  it('turns to the hero when standing near', () => {
    const still: Routine = { look: 3 };
    expect(placeResident(base, still, 0, false, { x: 7, y: 5 })!.facing).toBe('right');
    expect(placeResident(base, still, 0, false, { x: 5, y: 3 })!.facing).toBe('up');
    expect(placeResident(base, still, 0, false, { x: 50, y: 5 })!.facing).toBe('down');
  });

  it('goes indoors at night unless they have a job', () => {
    const r: Routine = { ...pace, night: 'hide' };
    expect(placeResident(base, r, 0, true)).toBeNull();
    expect(placeResident(base, r, 0, false)).not.toBeNull();
    expect(placeResident({ ...base, job: 4 }, r, 0, true)).not.toBeNull();
  });

  it('can stand by a lamp at night', () => {
    const r: Routine = { night: { x: 8, y: 2, facing: 'left' } };
    expect(placeResident(base, r, 0, true)).toMatchObject({ x: 8, y: 2, facing: 'left' });
    expect(placeResident(base, r, 0, false)).toMatchObject({ x: 5, y: 5 });
  });

  it('walks a loop through every corner', () => {
    const loop: Routine = { loop: true, path: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }], speed: 2, pause: 0.5 };
    const seen = new Set<string>();
    for (let t = 0; t < 30; t += 0.1) {
      const p = placeResident(base, loop, t, false)!;
      seen.add(`${p.x},${p.y}`);
    }
    for (const c of ['0,0', '2,0', '2,2', '0,2']) expect(seen.has(c)).toBe(true);
  });
});
