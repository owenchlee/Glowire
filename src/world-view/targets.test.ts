import { describe, expect, it } from 'vitest';

import type { Target } from '../world/logic';
import { chestKey, labelFor, sceneReady } from './targets';

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

describe('sceneReady', () => {
  const gran = { who: 'gran', x: 20, y: 5 };
  const lines = [{ who: 'pip' }, { who: 'gran' }];
  it('waits until the hero is near the speaker', () => {
    expect(sceneReady(lines, [gran], { x: 5, y: 5 })).toBe(false);
    expect(sceneReady(lines, [gran], { x: 17, y: 6 })).toBe(true);
  });
  it('plays Pip-only scenes and absent speakers at once', () => {
    expect(sceneReady([{ who: 'pip' }], [gran], { x: 0, y: 0 })).toBe(true);
    expect(sceneReady([{ who: 'marlo' }], [gran], { x: 0, y: 0 })).toBe(true);
  });
});
