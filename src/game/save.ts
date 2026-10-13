// The save file and the rules for sparks, stars, the shop and the daily streak.
// Pure TypeScript: the UI only calls these and writes the result to disk.

import { item } from './shop';

export interface SaveData {
  version: 2;
  /** Best stars per job id (1–3). A job is solved when it has any. */
  stars: Record<string, number>;
  sparks: number;
  owned: string[];
  equipped: { pet: string | null; wire: string; board: string; hat: string };
  daily: {
    /** The last day solved, as YYYY-MM-DD. */
    last: string | null;
    streak: number;
    best: number;
    /** Best stars per day. */
    stars: Record<string, number>;
  };
  /** Story scenes already shown. */
  seen: string[];
  /** Testing switch: every job is open. */
  unlockAll: boolean;
}

export const NEW_SAVE: SaveData = {
  version: 2,
  stars: {},
  sparks: 0,
  owned: ['copper', 'wood', 'nohat'],
  equipped: { pet: null, wire: 'copper', board: 'wood', hat: 'nohat' },
  daily: { last: null, streak: 0, best: 0, stars: {} },
  seen: [],
  unlockAll: false,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Read any save (v1, v2 or junk) into a valid v2 save. */
export function migrate(raw: unknown): SaveData {
  if (!isRecord(raw)) return structuredClone(NEW_SAVE);
  if (raw.version === 1) {
    // v1 only knew which levels were solved: each one counts as one star.
    const ids = Array.isArray(raw.completed) ? raw.completed : [];
    const stars: Record<string, number> = {};
    for (const id of ids) if (Number.isInteger(id)) stars[String(id)] = 1;
    return { ...structuredClone(NEW_SAVE), stars };
  }
  if (raw.version !== 2) return structuredClone(NEW_SAVE);
  const base = structuredClone(NEW_SAVE);
  const daily = isRecord(raw.daily) ? raw.daily : {};
  const equipped = isRecord(raw.equipped) ? raw.equipped : {};
  const owned = Array.isArray(raw.owned) ? raw.owned.filter((x) => typeof x === 'string') : [];
  return {
    version: 2,
    stars: isRecord(raw.stars) ? numbers(raw.stars) : {},
    sparks: typeof raw.sparks === 'number' ? Math.max(0, Math.floor(raw.sparks)) : 0,
    owned: [...new Set([...base.owned, ...owned])],
    equipped: {
      pet: typeof equipped.pet === 'string' ? equipped.pet : null,
      wire: typeof equipped.wire === 'string' ? equipped.wire : base.equipped.wire,
      board: typeof equipped.board === 'string' ? equipped.board : base.equipped.board,
      hat: typeof equipped.hat === 'string' ? equipped.hat : base.equipped.hat,
    },
    daily: {
      last: typeof daily.last === 'string' ? daily.last : null,
      streak: typeof daily.streak === 'number' ? daily.streak : 0,
      best: typeof daily.best === 'number' ? daily.best : 0,
      stars: isRecord(daily.stars) ? numbers(daily.stars) : {},
    },
    seen: Array.isArray(raw.seen) ? raw.seen.filter((x) => typeof x === 'string') : [],
    unlockAll: raw.unlockAll === true,
  };
}

function numbers(r: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(r)) if (typeof v === 'number') out[k] = v;
  return out;
}

/** Sparks for each star, the first time it is earned. */
export const STAR_SPARKS = [10, 10, 15] as const;

/** Sparks for going from `before` to `after` stars on a job. */
export function sparksForStars(before: number, after: number, boss = false): number {
  let total = 0;
  for (let s = before; s < after; s++) total += STAR_SPARKS[s] ?? 0;
  return boss ? total * 2 : total;
}

/** Penny the Raccoon's bonus. */
export function withPetBonus(save: SaveData, sparks: number): number {
  return save.equipped.pet === 'penny' ? Math.round(sparks * 1.5) : sparks;
}

export interface JobPayout {
  save: SaveData;
  /** Sparks earned by this result (0 if no new stars). */
  earned: number;
  /** True the first time the job is solved. */
  firstClear: boolean;
}

export function recordJob(save: SaveData, id: number, stars: number, boss = false): JobPayout {
  const before = save.stars[String(id)] ?? 0;
  if (stars <= before) return { save, earned: 0, firstClear: false };
  const earned = withPetBonus(save, sparksForStars(before, stars, boss));
  return {
    save: { ...save, stars: { ...save.stars, [id]: stars }, sparks: save.sparks + earned },
    earned,
    firstClear: before === 0,
  };
}

/** YYYY-MM-DD in the player's own time zone. */
export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** The day before a YYYY-MM-DD key. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, d - 1));
}

/** The streak as it stands on `today` (it lapses if yesterday was missed). */
export function currentStreak(save: SaveData, today: string): number {
  const { last, streak } = save.daily;
  return last === today || last === previousDay(today) ? streak : 0;
}

export const DAILY_BASE = 30;
/** Extra sparks per streak day, capped at a week. */
export const DAILY_STREAK_BONUS = 5;

export function recordDaily(save: SaveData, today: string, stars: number): JobPayout {
  const before = save.daily.stars[today] ?? 0;
  if (stars <= before) return { save, earned: 0, firstClear: false };
  const firstClear = before === 0;
  let { streak, best, last } = save.daily;
  let earned = sparksForStars(before, stars);
  if (firstClear) {
    streak = currentStreak(save, today) + 1;
    best = Math.max(best, streak);
    last = today;
    earned += DAILY_BASE + DAILY_STREAK_BONUS * Math.min(streak, 7);
  }
  earned = withPetBonus(save, earned);
  return {
    save: {
      ...save,
      sparks: save.sparks + earned,
      daily: { last, streak, best, stars: { ...save.daily.stars, [today]: stars } },
    },
    earned,
    firstClear,
  };
}

export type BuyResult = { ok: true; save: SaveData } | { ok: false; reason: 'owned' | 'poor' };

export function buy(save: SaveData, id: string): BuyResult {
  const it = item(id);
  if (!it || save.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (save.sparks < it.price) return { ok: false, reason: 'poor' };
  return {
    ok: true,
    save: equip({ ...save, sparks: save.sparks - it.price, owned: [...save.owned, id] }, id),
  };
}

/** Wear or use an owned item. Equipping the equipped pet puts it away. */
export function equip(save: SaveData, id: string): SaveData {
  const it = item(id);
  if (!it || !save.owned.includes(id)) return save;
  if (it.kind === 'pet') {
    return { ...save, equipped: { ...save.equipped, pet: save.equipped.pet === id ? null : id } };
  }
  return { ...save, equipped: { ...save.equipped, [it.kind]: id } };
}

/**
 * Jobs open in order: a job is playable when it is solved or every job before it is.
 * `order` is every job id in campaign order.
 */
export function isUnlocked(save: SaveData, order: number[], id: number): boolean {
  if (save.unlockAll || (save.stars[String(id)] ?? 0) > 0) return true;
  const i = order.indexOf(id);
  return i >= 0 && order.slice(0, i).every((prev) => (save.stars[String(prev)] ?? 0) > 0);
}

export function totalStars(save: SaveData): number {
  return Object.values(save.stars).reduce((a, b) => a + b, 0);
}
