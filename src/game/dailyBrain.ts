// The Daily Brain Teaser: one brain game picked from the date, the same seed for everyone
// that day. Score 1, 2 or 3 stars by points. Pure TypeScript.

import { type GameId } from './games';
import { hash } from './daily';

/** The games the teaser draws from (all have a fixed number of rounds or a fair cap). */
export const BRAIN_POOL: GameId[] = ['probe', 'pipes', 'panel', 'colours', 'needle', 'lantern'];

/** Points for 1, 2 and 3 stars in each game, from the top score a game can give. */
export const BRAIN_STARS: Record<string, [number, number, number]> = {
  probe: [25, 45, 65],
  pipes: [20, 40, 58],
  panel: [20, 40, 58],
  colours: [8, 13, 18],
  needle: [6, 10, 15],
  lantern: [2, 4, 7],
};

/** The most points each game can give (a cap its rounds allow). The 3-star mark sits below it. */
export const BRAIN_MAX: Record<string, number> = {
  probe: 6 * 22,
  pipes: 5 * 15,
  panel: 5 * 15,
  colours: 12 * 2,
  needle: 10 * 2,
  lantern: 30,
};

export interface BrainDaily {
  day: string;
  game: GameId;
  /** Seed for the game's questions: the same for everyone today. */
  seed: number;
  /** Points needed for 1, 2, 3 stars. */
  targets: [number, number, number];
}

export function brainDaily(day: string): BrainDaily {
  const h = hash(`brain:${day}`);
  const game = BRAIN_POOL[h % BRAIN_POOL.length]!;
  return { day, game, seed: hash(`seed:${day}`) & 0x7fffffff, targets: BRAIN_STARS[game]! };
}

/** Stars (0-3) a score earns today. */
export function brainStars(b: BrainDaily, score: number): number {
  return b.targets.filter((t) => score >= t).length;
}
