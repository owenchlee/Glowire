import { describe, expect, it } from 'vitest';

import type { Target } from '../world/logic';
import { chestKey, labelFor } from './targets';

const spot = (spot: object) => ({ kind: 'spot', spot }) as unknown as Target;

describe('targets', () => {
  it('namespaces chest ids so they cannot clash with other seen keys', () => {
    expect(chestKey('a1')).toBe('chest:a1');
  });

  it('gives each target kind a plain-word label', () => {
    expect(labelFor({ kind: 'gate' } as unknown as Target)).toBe('Look');
    expect(labelFor({ kind: 'resident', resident: { who: 'pip' } } as unknown as Target)).toBe('Talk to Pip');
    expect(labelFor({ kind: 'resident', resident: { who: 'mo' } } as unknown as Target)).toBe('Talk');
    expect(labelFor(spot({ kind: 'job' }))).toBe('Knock');
    expect(labelFor(spot({ kind: 'exit', via: 'bubble' }))).toBe('The well');
    expect(labelFor(spot({ kind: 'exit', via: 'bus' }))).toBe('Bus stop');
    expect(labelFor(spot({ kind: 'sign' }))).toBe('Read');
    expect(labelFor(spot({ kind: 'reset' }))).toBe('Reset rocks');
  });
});
