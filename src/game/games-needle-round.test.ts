import { describe, expect, it } from 'vitest';

import { needleQuestion } from './games';
import { SLOT_WEIGHTS, spinReel } from './luck';

describe('needleQuestion rounds', () => {
  it('rounds 0-2 are a 3V red lamp; round 3 (the 4th) already varies', () => {
    expect(needleQuestion(2, () => 0.99)).toMatchObject({ volts: 3, lamp: 'red' });
    expect(needleQuestion(3, () => 0.99)).toMatchObject({ volts: 9, lamp: 'blue' });
  });
});

describe('spinReel boundary', () => {
  it('a roll landing exactly on the first weight falls through to the next symbol', () => {
    const w = SLOT_WEIGHTS.plug;
    expect(spinReel(() => (w - 1) / 100)).toBe('plug');
    expect(spinReel(() => w / 100)).not.toBe('plug');
  });
});
