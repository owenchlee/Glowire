import { describe, expect, it } from 'vitest';

import { LEVELS } from '../levels/levels';
import { CAST } from './cast';
import {
  NEW_SAVE,
  buy,
  currentStreak,
  dayKey,
  equip,
  isUnlocked,
  migrate,
  previousDay,
  recordDaily,
  recordJob,
  sparksForStars,
} from './save';
import { CATALOGUE } from './shop';
import { NOTES, SCENES } from './story';

const fresh = () => structuredClone(NEW_SAVE);
const ORDER = LEVELS.map((l) => l.id);

describe('save file', () => {
  it('turns a v1 save into stars and a fresh wallet', () => {
    const save = migrate({ version: 1, completed: [1, 3, 'x', 20] });
    expect(save.stars).toEqual({ '1': 1, '3': 1, '20': 1 });
    expect(save.sparks).toBe(0);
    expect(save.equipped.wire).toBe('copper');
  });

  it('survives junk and keeps the free items owned', () => {
    expect(migrate(null)).toEqual(NEW_SAVE);
    expect(migrate('nope')).toEqual(NEW_SAVE);
    const save = migrate({ version: 2, sparks: -5, owned: ['scout', 4], stars: { 1: 'x', 2: 3 } });
    expect(save.sparks).toBe(0);
    expect(save.owned).toEqual(['copper', 'wood', 'nohat', 'uniform', 'scout']);
    expect(save.stars).toEqual({ '2': 3 });
  });

  it('round-trips through JSON', () => {
    let save = recordJob(fresh(), 1, 3).save;
    save = recordDaily(save, '2026-10-08', 2).save;
    expect(migrate(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });
});

describe('sparks', () => {
  it('pays each star once', () => {
    expect(sparksForStars(0, 3)).toBe(35);
    expect(sparksForStars(1, 3)).toBe(25);
    expect(sparksForStars(0, 1, true)).toBe(20); // bosses pay double
    const first = recordJob(fresh(), 5, 2);
    expect(first.earned).toBe(20);
    expect(first.firstClear).toBe(true);
    const again = recordJob(first.save, 5, 2);
    expect(again.earned).toBe(0);
    const better = recordJob(first.save, 5, 3);
    expect(better.earned).toBe(15);
    expect(better.save.stars['5']).toBe(3);
    expect(better.firstClear).toBe(false);
  });

  it('Penny adds half again', () => {
    const save = { ...fresh(), owned: [...NEW_SAVE.owned, 'penny'] };
    const withPenny = equip(save, 'penny');
    expect(recordJob(withPenny, 1, 3).earned).toBe(53); // 35 × 1.5, rounded
  });
});

describe('shop', () => {
  it('buys, pays and wears', () => {
    const rich = { ...fresh(), sparks: 300 };
    const result = buy(rich, 'scout');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.sparks).toBe(100);
    expect(result.save.owned).toContain('scout');
    expect(result.save.equipped.pet).toBe('scout');
    expect(buy(result.save, 'scout')).toEqual({ ok: false, reason: 'owned' });
    expect(buy(result.save, 'penny')).toEqual({ ok: false, reason: 'poor' });
  });

  it('equips cosmetics by kind, and toggles pets', () => {
    let save = { ...fresh(), owned: [...NEW_SAVE.owned, 'neon', 'midnight', 'crown', 'hoot'] };
    save = equip(save, 'neon');
    save = equip(save, 'midnight');
    save = equip(save, 'crown');
    save = equip(save, 'hoot');
    expect(save.equipped).toEqual({ pet: 'hoot', wire: 'neon', board: 'midnight', hat: 'crown', outfit: 'uniform' });
    expect(equip(save, 'hoot').equipped.pet).toBeNull();
    expect(equip(save, 'gold')).toBe(save); // not owned
  });

  it('has unique ids and free starters', () => {
    const ids = CATALOGUE.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of NEW_SAVE.owned) expect(CATALOGUE.find((i) => i.id === id)?.price).toBe(0);
  });
});

describe('daily streak', () => {
  it('counts consecutive days and resets after a gap', () => {
    let save = fresh();
    save = recordDaily(save, '2026-10-08', 1).save;
    expect(save.daily.streak).toBe(1);
    save = recordDaily(save, '2026-10-09', 1).save;
    expect(save.daily.streak).toBe(2);
    expect(currentStreak(save, '2026-10-10')).toBe(2); // still alive today
    expect(currentStreak(save, '2026-10-11')).toBe(0); // missed a day
    save = recordDaily(save, '2026-10-11', 1).save;
    expect(save.daily.streak).toBe(1);
    expect(save.daily.best).toBe(2);
  });

  it('pays the streak bonus once per day, stars on top', () => {
    const first = recordDaily(fresh(), '2026-10-08', 1);
    expect(first.earned).toBe(10 + 30 + 5);
    const more = recordDaily(first.save, '2026-10-08', 3);
    expect(more.earned).toBe(25);
    expect(more.save.daily.streak).toBe(1);
  });

  it('handles month and year boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(dayKey(new Date(2026, 9, 8))).toBe('2026-10-08');
  });
});

describe('unlocking', () => {
  it('opens jobs in order, keeps solved ones open', () => {
    const save = { ...fresh(), stars: { '1': 1, '3': 2 } };
    expect(isUnlocked(save, ORDER, 1)).toBe(true);
    expect(isUnlocked(save, ORDER, 2)).toBe(true);
    expect(isUnlocked(save, ORDER, 3)).toBe(true); // solved
    expect(isUnlocked(save, ORDER, 4)).toBe(false);
    expect(isUnlocked({ ...save, unlockAll: true }, ORDER, 31)).toBe(true);
  });
});

describe('story', () => {
  it('every job’s client exists', () => {
    for (const level of LEVELS) expect(CAST[level.job!.client], `level ${level.id}`).toBeDefined();
  });

  it('every speaker in every scene and note exists', () => {
    const lines = [...Object.values(SCENES), ...Object.values(NOTES)].flatMap((s) => s.lines);
    for (const line of lines) expect(line.who === 'pip' || line.who === 'grumble' || !!CAST[line.who], line.who).toBe(true);
  });

  it('numbers the notebook pages 1, 2, 3… with no gaps', () => {
    const pages = Object.values(NOTES).map((n) => n.page).sort((a, b) => a - b);
    expect(pages).toEqual(pages.map((_, i) => i + 1));
  });
});

describe('outfits', () => {
  it('every outfit in the shop has a hero sprite and a portrait', async () => {
    const { OUTFITS, outfitSprite } = await import('./shop');
    const { PEOPLE } = await import('../world/people.generated');
    for (const o of OUTFITS) expect(PEOPLE as readonly string[], o.id).toContain(outfitSprite(o.id));
  });
});
