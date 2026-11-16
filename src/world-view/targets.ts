// Plain-word helpers for what you can do at a world target; no React in here.

import type { Target } from '../world/logic';

export const chestKey = (id: string) => `chest:${id}`;
/** Seen-key for a character who has spoken to you: their face shows on the world page after. */
export const metKey = (who: string) => `met:${who}`;

export function labelFor(t: Target): string {
  if (t.kind === 'gate') return 'Look';
  if (t.kind === 'resident') return t.resident.who === 'pip' ? 'Talk to Pip' : 'Talk';
  switch (t.spot.kind) {
    case 'job':
      return 'Knock';
    case 'shop':
      return 'Enter shop';
    case 'daily':
      return 'Talk';
    case 'exit':
      return t.spot.via === 'bubble' ? 'The well' : 'Bus stop';
    case 'sign':
    case 'note':
      return 'Read';
    case 'secret':
      return 'Look';
    case 'chest':
      return 'Open';
    case 'game':
      return 'Play';
    case 'fish':
      return 'Fish';
    case 'reset':
      return 'Reset rocks';
  }
}

/** Tiles from a scene's speaker within which their scene may start. */
export const SCENE_RADIUS = 4;

/**
 * A story scene starts only once you're near whoever speaks it (the first speaker who
 * isn't Pip, Grumble or you). Pip-only scenes, or a speaker not standing in this world, start at once.
 */
export function sceneReady(
  lines: readonly { who: string }[],
  people: readonly { who: string; x: number; y: number }[],
  hero: { x: number; y: number },
): boolean {
  const who = lines.find((l) => !['pip', 'grumble', 'hero'].includes(l.who))?.who;
  const p = who ? people.find((r) => r.who === who) : undefined;
  return !p || Math.hypot(p.x - hero.x, p.y - hero.y) <= SCENE_RADIUS;
}
