import { describe, expect, it } from 'vitest';

import { rng } from '../game/games';
import {
  type PipeBoard,
  brainStars,
  lampMilliamps,
  lanternRound,
  panelBoard,
  panelPoints,
  panelSolved,
  pipeBoard,
  pipePoints,
  pipesSolved,
  pressPanel,
  probePoints,
  probeRound,
  probeSearch,
  solvePanel,
} from '../game/puzzles';
import { CAST } from '../game/cast';
import { LEVELS, chapterOf } from './levels';

const BRAIN = LEVELS.filter((l) => l.brain);
const ROUNDS = { probe: 6, pipes: 5, panel: 5 };

describe('brain jobs', () => {
  it('convert about a third of the jobs, across chapters and all four games', () => {
    expect(BRAIN.length).toBeGreaterThanOrEqual(Math.floor(LEVELS.length / 4));
    expect(new Set(BRAIN.map((l) => l.brain!.game))).toEqual(new Set(['probe', 'pipes', 'panel', 'lantern']));
    expect(new Set(BRAIN.map((l) => chapterOf(l.id)!.id)).size).toBeGreaterThanOrEqual(6);
  });

  it('never replace a boss, a tutorial level, or a level that introduces a part', () => {
    for (const l of BRAIN) {
      expect(l.boss, `level ${l.id}`).toBeFalsy();
      expect(l.newPart, `level ${l.id}`).toBeUndefined();
      expect([1, 2, 3], `level ${l.id}`).not.toContain(l.id);
      expect(l.job, `level ${l.id}`).toBeDefined();
      expect(CAST[l.job!.client], `level ${l.id}`).toBeDefined();
      expect(l.job!.ask.length).toBeGreaterThan(20);
    }
  });

  for (const l of BRAIN) {
    const { game, seed } = l.brain!;
    for (const offset of [0, 1, 2]) {
      it(`level ${l.id} (${game}) is winnable from seed ${seed} + ${offset}`, () => {
        const random = rng(seed + offset);
        if (game === 'probe') {
          let score = 0;
          for (let round = 0; round < ROUNDS.probe; round++) {
            const r = probeRound(round, random);
            const { found, probes } = probeSearch(r);
            expect(found).toBe(r.dead);
            expect(probes).toBeLessThanOrEqual(r.probes);
            score += probePoints(r, probes);
          }
          expect(brainStars(game, score)).toBe(3);
        } else if (game === 'pipes') {
          let score = 0;
          for (let round = 0; round < ROUNDS.pipes; round++) {
            const b = pipeBoard(round, random);
            expect(pipesSolved(b)).toBe(false);
            const fixed: PipeBoard = { ...b, tiles: b.tiles.map((t, i) => ({ ...t, mask: b.solution![i]! })) };
            expect(pipesSolved(fixed)).toBe(true);
            score += pipePoints(b.par, b.par);
          }
          expect(brainStars(game, score)).toBe(3);
        } else if (game === 'panel') {
          let score = 0;
          for (let round = 0; round < ROUNDS.panel; round++) {
            const p = panelBoard(round, random);
            expect(panelSolved(p)).toBe(false);
            const presses = solvePanel(p);
            expect(presses).not.toBeNull();
            let on = p.on;
            for (const i of presses!) on = pressPanel(p.n, on, i);
            expect(panelSolved({ ...p, on })).toBe(true);
            expect(presses!.length).toBeLessThanOrEqual(p.par);
            score += panelPoints(presses!.length, p.par);
          }
          expect(brainStars(game, score)).toBe(3);
        } else {
          for (let round = 0; round < 30; round++) {
            const q = lanternRound(round, random);
            const ma = q.rigs.map(lampMilliamps);
            expect(ma[q.best]).toBe(Math.max(...ma));
            expect(ma.filter((m) => m === ma[q.best]).length).toBe(1);
          }
        }
      });
    }
  }

  it('keep a leftover board and use the same 3-star scale as circuit jobs', () => {
    expect(new Set(LEVELS.map((x) => x.id)).size).toBe(LEVELS.length);
    for (const l of BRAIN) {
      expect(l.board.length, `level ${l.id}`).toBeGreaterThan(0);
      expect(brainStars(l.brain!.game, 1000), `level ${l.id}`).toBe(3);
    }
  });

  it('gives 0 stars for nothing and more for better play', () => {
    for (const game of ['probe', 'pipes', 'panel', 'lantern'] as const) {
      expect(brainStars(game, 0)).toBe(0);
      expect(brainStars(game, 1000)).toBe(3);
      expect(brainStars(game, 1000)).toBeGreaterThanOrEqual(brainStars(game, 50));
    }
  });
});
