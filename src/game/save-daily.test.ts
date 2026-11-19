import { describe, expect, it } from 'vitest';
import { buy, NEW_SAVE, recordBrainDaily, recordDaily, recordGame } from './save';
import { PETS } from './shop';

const days: string[] = ['2026-03-01', '2026-03-02', '2026-03-03'];

describe.each([
  ['daily', recordDaily, 'daily'],
  ['brain daily', recordBrainDaily, 'brainDaily'],
] as const)('%s streak and best', (_n, record, key) => {
  it('raises streak and best day by day, and keeps best after a gap', () => {
    let s = NEW_SAVE;
    for (const [i, d] of days.entries()) {
      const r = record(s, d, 3);
      expect(r.firstClear).toBe(true);
      s = r.save;
      expect(s[key].streak).toBe(i + 1);
      expect(s[key].best).toBe(i + 1);
      expect(s[key].last).toBe(d);
    }
    const gap = record(s, '2026-03-10', 3).save;
    expect(gap[key].streak).toBe(1);
    expect(gap[key].best).toBe(3);
  });

  it('pays a bigger bonus for a longer streak, and nothing for a repeat', () => {
    const a = record(NEW_SAVE, days[0]!, 3);
    const b = record(a.save, days[1]!, 3);
    expect(b.earned).toBe(a.earned + 5);
    const again = record(b.save, days[1]!, 3);
    expect(again.earned).toBe(0);
    expect(again.firstClear).toBe(false);
    expect(again.save).toBe(b.save);
  });

  it('a better score on the same day pays but is not a first clear', () => {
    const a = record(NEW_SAVE, days[0]!, 1);
    const b = record(a.save, days[0]!, 3);
    expect(b.firstClear).toBe(false);
    expect(b.earned).toBeGreaterThan(0);
    expect(b.save[key].streak).toBe(1);
    expect(b.save[key].stars[days[0]!]).toBe(3);
  });
});

describe('buy', () => {
  const pet = PETS[0]!;
  it('sells at exactly the price and charges it', () => {
    const r = buy({ ...NEW_SAVE, sparks: pet.price }, pet.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.save.sparks).toBe(0);
  });
  it('refuses one spark short', () => {
    expect(buy({ ...NEW_SAVE, sparks: pet.price - 1 }, pet.id)).toEqual({ ok: false, reason: 'poor' });
  });
});

describe('recordGame', () => {
  it('pays 3 per point beaten and flags only a first score', () => {
    const a = recordGame(NEW_SAVE, 'x', 5);
    expect(a.earned).toBe(15);
    expect(a.firstClear).toBe(true);
    const b = recordGame(a.save, 'x', 7);
    expect(b.earned).toBe(6);
    expect(b.firstClear).toBe(false);
    expect(b.save.games.x).toBe(7);
    const c = recordGame(b.save, 'x', 7);
    expect(c.earned).toBe(0);
  });
});
