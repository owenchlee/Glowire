// Plain-word helpers for what you can do at a world target; no React in here.

import type { Target } from '../world/logic';

export const chestKey = (id: string) => `chest:${id}`;

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
