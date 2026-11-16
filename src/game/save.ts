// The save file and the rules for sparks, stars, the shop and the daily streak.
// Pure TypeScript: the UI only calls these and writes the result to disk.

import { type Random, rollSurge } from './luck';
import { item, itemOf, type ItemKind } from './shop';

export interface LuckStats {
  spins: number;
  wagered: number;
  won: number;
  /** The biggest single win. */
  biggest: number;
  /** Paid jobs since the last Surge (it raises the next one's chance). */
  dry: number;
  surges: number;
}

export const NEW_LUCK: LuckStats = { spins: 0, wagered: 0, won: 0, biggest: 0, dry: 0, surges: 0 };

export interface DailyRecord {
  /** The last day solved, as YYYY-MM-DD. */
  last: string | null;
  streak: number;
  best: number;
  /** Best stars per day. */
  stars: Record<string, number>;
}

export interface SaveData {
  version: 2;
  /** Best stars per job id (1–3). A job is solved when it has any. */
  stars: Record<string, number>;
  sparks: number;
  owned: string[];
  equipped: { pet: string | null; wire: string; board: string; hat: string; outfit: string };
  daily: DailyRecord;
  /** The Daily Brain Teaser: same record as `daily`, stars are 1–3 by score. */
  brainDaily: DailyRecord;
  /** Story scenes already shown. */
  seen: string[];
  /** Best score in each mini-game (games.ts). */
  games: Record<string, number>;
  /** Lifetime luck: the Lucky Lantern and payday Surges. */
  luck: LuckStats;
  /** Fish caught, by kind (world/fishing.ts). */
  fish: Record<string, number>;
  /** Testing switch: every job is open. */
  unlockAll: boolean;
  /** Sound and music off. */
  muted: boolean;
}

export const NEW_SAVE: SaveData = {
  version: 2,
  stars: {},
  sparks: 0,
  owned: ['copper', 'wood', 'nohat', 'uniform'],
  equipped: { pet: null, wire: 'copper', board: 'wood', hat: 'nohat', outfit: 'uniform' },
  daily: { last: null, streak: 0, best: 0, stars: {} },
  brainDaily: { last: null, streak: 0, best: 0, stars: {} },
  seen: [],
  games: {},
  luck: NEW_LUCK,
  fish: {},
  unlockAll: false,
  muted: false,
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
    for (const id of ids) if (Number.isInteger(id) && id >= 0) stars[String(id)] = 1;
    return { ...structuredClone(NEW_SAVE), stars };
  }
  // Any other version (missing, or written by a newer app) is read field by field, so progress survives.
  const base = structuredClone(NEW_SAVE);
  const daily = isRecord(raw.daily) ? raw.daily : {};
  const brain = isRecord(raw.brainDaily) ? raw.brainDaily : {};
  const equipped = isRecord(raw.equipped) ? raw.equipped : {};
  const owned = [
    ...new Set([
      ...base.owned,
      ...(Array.isArray(raw.owned) ? raw.owned.filter((x) => typeof x === 'string') : []),
    ]),
  ];
  // An equipped item must be owned and of that slot's kind, else the slot falls back.
  const worn = (kind: ItemKind, fallback: string) => {
    const id = equipped[kind];
    return typeof id === 'string' && owned.includes(id) && itemOf(kind, id) ? id : fallback;
  };
  const streak = count(daily.streak);
  return {
    version: 2,
    stars: isRecord(raw.stars) ? starsBy(raw.stars, (k) => /^\d+$/.test(k)) : {},
    sparks: count(raw.sparks),
    owned,
    equipped: {
      pet: worn('pet', '') || null,
      wire: worn('wire', base.equipped.wire),
      board: worn('board', base.equipped.board),
      hat: worn('hat', base.equipped.hat),
      outfit: worn('outfit', base.equipped.outfit),
    },
    daily: {
      last: typeof daily.last === 'string' && isDay(daily.last) ? daily.last : null,
      streak,
      best: Math.max(count(daily.best), streak),
      stars: isRecord(daily.stars) ? starsBy(daily.stars, isDay) : {},
    },
    brainDaily: {
      last: typeof brain.last === 'string' ? brain.last : null,
      streak: typeof brain.streak === 'number' ? brain.streak : 0,
      best: typeof brain.best === 'number' ? brain.best : 0,
      stars: isRecord(brain.stars) ? numbers(brain.stars) : {},
    },
    seen: Array.isArray(raw.seen) ? raw.seen.filter((x) => typeof x === 'string') : [],
    games: isRecord(raw.games) ? numbers(raw.games) : {},
    luck: { ...NEW_LUCK, ...(isRecord(raw.luck) ? numbers(raw.luck) : {}) },
    fish: isRecord(raw.fish) ? numbers(raw.fish) : {},
    unlockAll: raw.unlockAll === true,
    muted: raw.muted === true,
  };
}

/** A non-negative whole number, or 0 for anything else (NaN, Infinity, strings). */
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

/** A real calendar day written as YYYY-MM-DD (no 2026-02-30). */
function isDay(k: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
  const [y, m, d] = k.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Star ratings (whole numbers 1-3) under keys that pass `validKey`; anything else is dropped. */
function starsBy(r: Record<string, unknown>, validKey: (k: string) => boolean) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(r)) {
    if (validKey(k) && typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 3) out[k] = v;
  }
  return out;
}

/** Mini-game best scores; NaN, Infinity and negative scores are dropped. */
function numbers(r: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
  }
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

/** Paid on every clear, replays too: a little for solving, more for 2 and 3 stars. */
export const SOLVE_SPARKS = 5;
export const STAR_BONUS = [0, 0, 5, 10] as const;
const clearPay = (stars: number) => ({ solve: stars > 0 ? SOLVE_SPARKS : 0, bonus: STAR_BONUS[Math.min(3, stars)] ?? 0 });

/** "Solved +⚡5 · ★★★ bonus +⚡10", for the result cards. */
export function payNote(p: { solve?: number; bonus?: number }, stars: number): string {
  return [p.solve ? `Solved +⚡${p.solve}` : '', p.bonus ? `${'★'.repeat(stars)} bonus +⚡${p.bonus}` : ''].filter(Boolean).join('  ·  ');
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
  /** 2 or 5 when a payday Surge hit (already in `earned`); 1 otherwise. */
  surge?: 1 | 2 | 5;
  /** The every-clear part of `earned` (before Penny and Surge): for solving, and the 2★/3★ bonus. */
  solve?: number;
  bonus?: number;
}

/**
 * Roll a payday Surge on top of `earned` sparks (already in `save`). With no random source
 * (tests) nothing rolls. Misses build pity so a long dry spell ends.
 */
function withSurge(save: SaveData, earned: number, random?: Random): { save: SaveData; earned: number; surge: 1 | 2 | 5 } {
  if (!random || earned <= 0) return { save, earned, surge: 1 };
  const surge = rollSurge(save.luck.dry, random);
  const luck = surge > 1 ? { ...save.luck, dry: 0, surges: save.luck.surges + 1 } : { ...save.luck, dry: save.luck.dry + 1 };
  return { save: { ...save, sparks: save.sparks + earned * (surge - 1), luck }, earned: earned * surge, surge };
}

export function recordJob(save: SaveData, id: number, stars: number, boss = false, random?: Random): JobPayout {
  const before = save.stars[String(id)] ?? 0;
  const { solve, bonus } = clearPay(stars);
  const fresh = stars > before ? sparksForStars(before, stars, boss) : 0;
  const base = withPetBonus(save, fresh + solve + bonus);
  if (base <= 0) return { save, earned: 0, firstClear: false };
  const starsNow = stars > before ? { ...save.stars, [id]: stars } : save.stars;
  const paid = withSurge({ ...save, stars: starsNow, sparks: save.sparks + base }, base, random);
  return { save: paid.save, earned: paid.earned, firstClear: before === 0, surge: paid.surge, solve, bonus };
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

/** The Daily Brain Teaser's streak as it stands on `today`. */
export function currentBrainStreak(save: SaveData, today: string): number {
  const { last, streak } = save.brainDaily;
  return last === today || last === previousDay(today) ? streak : 0;
}

export const DAILY_BASE = 30;
/** Extra sparks per streak day, capped at a week. */
export const DAILY_STREAK_BONUS = 5;

export function recordDaily(save: SaveData, today: string, stars: number, random?: Random): JobPayout {
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
  const paid = withSurge(
    {
      ...save,
      sparks: save.sparks + earned,
      daily: { last, streak, best, stars: { ...save.daily.stars, [today]: stars } },
    },
    earned,
    random,
  );
  return { save: paid.save, earned: paid.earned, firstClear, surge: paid.surge };
}

/** The Daily Brain Teaser finished with `stars` (1–3): pays like the Daily Blackout. */
export function recordBrainDaily(save: SaveData, today: string, stars: number, random?: Random): JobPayout {
  const before = save.brainDaily.stars[today] ?? 0;
  if (stars <= before) return { save, earned: 0, firstClear: false };
  const firstClear = before === 0;
  let { streak, best, last } = save.brainDaily;
  let earned = sparksForStars(before, stars);
  if (firstClear) {
    streak = currentBrainStreak(save, today) + 1;
    best = Math.max(best, streak);
    last = today;
    earned += DAILY_BASE + DAILY_STREAK_BONUS * Math.min(streak, 7);
  }
  earned = withPetBonus(save, earned);
  const paid = withSurge(
    {
      ...save,
      sparks: save.sparks + earned,
      brainDaily: { last, streak, best, stars: { ...save.brainDaily.stars, [today]: stars } },
    },
    earned,
    random,
  );
  return { save: paid.save, earned: paid.earned, firstClear, surge: paid.surge };
}

/** Sparks for each point a mini-game score beats your best by. */
export const GAME_SPARKS_PER_POINT = 3;

/** A mini-game finished: a new best pays sparks for every point it beats the old one by. */
/** A finished mini-game run: sparks for a new best, plus the every-clear pay for its `stars` (0 for none). */
export function recordGame(save: SaveData, game: string, score: number, stars = 0): JobPayout {
  const best = save.games[game] ?? 0;
  const { solve, bonus } = clearPay(stars);
  const record = score > best ? (score - best) * GAME_SPARKS_PER_POINT : 0;
  const earned = withPetBonus(save, record + solve + bonus);
  if (earned <= 0) return { save, earned: 0, firstClear: false };
  return {
    save: { ...save, sparks: save.sparks + earned, games: score > best ? { ...save.games, [game]: score } : save.games },
    earned,
    firstClear: best === 0 && score > best,
    solve,
    bonus,
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
