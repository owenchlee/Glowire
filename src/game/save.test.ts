import { describe, expect, it } from 'vitest';
import { migrate, NEW_SAVE, recordJob } from './save';

describe('save loading', () => {
  it('gives a fresh save that is not shared between loads', () => {
    const a = migrate(null);
    a.owned.push('x');
    a.stars['1'] = 3;
    expect(migrate(null)).toEqual(NEW_SAVE);
    expect(NEW_SAVE.owned).not.toContain('x');
  });

  it('never throws on any junk', () => {
    for (const junk of [undefined, null, 0, 1, true, 'x', [], [1], {}, { version: 2, stars: [] }, { version: 2, luck: 5, daily: 'x', equipped: [] }]) {
      expect(() => migrate(junk)).not.toThrow();
      expect(migrate(junk).version).toBe(2);
    }
  });

  it('fills a partial v2 save from defaults and keeps what is there', () => {
    const save = migrate({ version: 2, sparks: 40.9, stars: { '1': 3 }, equipped: { hat: 'crown' }, daily: { streak: 4 } });
    expect(save.sparks).toBe(40);
    expect(save.stars).toEqual({ '1': 3 });
    expect(save.equipped).toEqual({ ...NEW_SAVE.equipped, hat: 'crown' });
    expect(save.daily).toEqual({ ...NEW_SAVE.daily, streak: 4 });
    expect(save.luck).toEqual(NEW_SAVE.luck);
    expect(save.brainDaily).toEqual(NEW_SAVE.brainDaily);
    expect(save.games).toEqual({});
  });

  it('keeps progress when the version is missing or newer, and drops unknown fields', () => {
    for (const version of [undefined, 3, '2']) {
      const save = migrate({ version, sparks: 99, stars: { '5': 2 }, seen: ['a'], mystery: { deep: true } });
      expect(save.sparks).toBe(99);
      expect(save.stars).toEqual({ '5': 2 });
      expect(save.seen).toEqual(['a']);
      expect(save).not.toHaveProperty('mystery');
    }
  });

  it('keeps partial luck stats on top of the defaults', () => {
    expect(migrate({ version: 2, luck: { spins: 7, junk: 'x' } }).luck).toEqual({ ...NEW_SAVE.luck, spins: 7 });
  });

  it('ignores non-numbers and non-finite numbers in score tables', () => {
    const save = migrate({ version: 2, games: { a: 5, b: '9', c: null, d: 1e999 }, fish: { eel: 2 } });
    expect(save.games).toEqual({ a: 5 });
    expect(save.fish).toEqual({ eel: 2 });
  });

  it('round-trips a played save and does not mutate its input', () => {
    const played = recordJob(structuredClone(NEW_SAVE), 3, 2).save;
    const text = JSON.stringify(played);
    const raw = JSON.parse(text);
    expect(migrate(raw)).toEqual(played);
    expect(JSON.stringify(raw)).toBe(text);
  });
});
