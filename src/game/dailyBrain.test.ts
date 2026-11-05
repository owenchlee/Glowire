import { describe, expect, it } from 'vitest';

import { BRAIN_MAX, BRAIN_POOL, BRAIN_STARS, brainDaily, brainStars } from './dailyBrain';
import { SECRETS, earnedPuzzleSecrets, puzzleSecrets, secretKey } from './lore';
import { GAMES } from './games';
import { NEW_SAVE, currentBrainStreak, dayKey, migrate, recordBrainDaily } from './save';

const DAYS = Array.from({ length: 400 }, (_, i) => dayKey(new Date(2026, 9, 5 + i)));

describe('daily brain teaser', () => {
  it('is the same for everyone on a day, and a pool game with a seed', () => {
    expect(brainDaily('2026-11-04')).toEqual(brainDaily('2026-11-04'));
    for (const d of DAYS) expect(BRAIN_POOL).toContain(brainDaily(d).game);
    expect(new Set(DAYS.map((d) => brainDaily(d).seed)).size).toBe(DAYS.length);
  });

  it('mixes games across the week', () => {
    expect(new Set(DAYS.slice(0, 28).map((d) => brainDaily(d).game)).size).toBeGreaterThanOrEqual(4);
  });

  it('every day is winnable: each star target is below what the game can give', () => {
    for (const d of DAYS) {
      const b = brainDaily(d);
      expect(b.targets[0]).toBeLessThan(b.targets[1]);
      expect(b.targets[1]).toBeLessThan(b.targets[2]);
      expect(b.targets[2], d).toBeLessThanOrEqual(BRAIN_MAX[b.game]! * 0.8);
      expect(brainStars(b, b.targets[2])).toBe(3);
      expect(brainStars(b, 0)).toBe(0);
    }
    for (const g of BRAIN_POOL) expect(BRAIN_STARS[g]).toBeDefined();
  });

  it('pays sparks and keeps a streak', () => {
    const a = recordBrainDaily(NEW_SAVE, '2026-11-04', 2);
    expect(a.firstClear).toBe(true);
    expect(a.earned).toBeGreaterThan(30);
    expect(a.save.sparks).toBe(a.earned);
    const b = recordBrainDaily(a.save, '2026-11-05', 1);
    expect(b.save.brainDaily.streak).toBe(2);
    expect(currentBrainStreak(b.save, '2026-11-07')).toBe(0);
    expect(recordBrainDaily(b.save, '2026-11-05', 1).earned).toBe(0);
    expect(recordBrainDaily(b.save, "2026-11-05", 3).earned).toBe(25);
  });

  it('old saves load with an empty record', () => {
    const old: Record<string, unknown> = { ...structuredClone(NEW_SAVE) };
    delete old.brainDaily;
    expect(migrate(old).brainDaily).toEqual(NEW_SAVE.brainDaily);
  });
});

describe('lore earned from puzzles', () => {
  const secrets = puzzleSecrets();
  it('every world has 2 or more, all reachable', () => {
    for (const w of ['glowtown', 'harbour', 'mossbell', 'deep']) {
      expect(secrets.filter((s) => s.world === w).length, w).toBeGreaterThanOrEqual(2);
    }
    for (const s of secrets) {
      const u = s.unlock!;
      expect(GAMES[u.game as keyof typeof GAMES], s.id).toBeDefined();
      expect(u.score, s.id).toBeLessThanOrEqual((BRAIN_MAX[u.game] ?? 24) * 0.8);
      expect(s.lines.length).toBeGreaterThan(1);
      expect(SECRETS[s.id]).toBe(s);
    }
  });
  it('opens when the score is reached, and only once', () => {
    expect(earnedPuzzleSecrets({}, [])).toEqual([]);
    const got = earnedPuzzleSecrets({ probe: 45 }, []);
    expect(got.map((s) => s.id)).toEqual(['brain-gran-dead-lamp']);
    expect(earnedPuzzleSecrets({ probe: 45 }, [secretKey('brain-gran-dead-lamp')])).toEqual([]);
  });
});
