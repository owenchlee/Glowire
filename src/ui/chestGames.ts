// The maths behind the chest minigames, kept pure so it can be tested: which game a chest
// gets, where the sliding key is, whether it hit the keyhole, and how the mash meter moves.

export type ChestGameKind = 'keyhole' | 'mash';

/** FNV-1a, so the same chest always gets the same game. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Roughly a third of chests (null) still open at once; the rest get a game. */
export function chestGameFor(chestId: string, sparks: number): ChestGameKind | null {
  void sparks; // the game choice only depends on the id; sparks sets chestDifficulty
  const h = hash(chestId) % 3;
  return h === 0 ? null : h === 1 ? 'keyhole' : 'mash';
}

/** 0 for a small chest (⚡15 or less) up to 1 for a rich one (⚡40 or more). */
export function chestDifficulty(sparks: number): number {
  return Math.min(1, Math.max(0, (sparks - 15) / 25));
}

// ── Keyhole ──────────────────────────────────────────────────────────────────

/** Track lengths per second: a full sweep takes about 1.7s when easy, 0.7s when hard. */
export const keySpeed = (difficulty: number) => 0.6 + 0.9 * difficulty;

/** The key's place on the track, 0 (left) to 1 (right), bouncing back and forth. */
export function keyPos(elapsedMs: number, speed: number): number {
  const p = ((elapsedMs / 1000) * speed) % 2;
  return p <= 1 ? p : 2 - p;
}

/** The keyhole's width as a share of the track; every miss widens it a little, so everyone gets there. */
export function keyholeWidth(difficulty: number, misses: number): number {
  return 0.16 - 0.08 * difficulty + Math.min(misses, 4) * 0.02;
}

/** Where the keyhole's centre sits, kept away from the ends of the track. */
export const keyholeCentre = (random: number) => 0.2 + 0.6 * random;

export const keyHits = (pos: number, centre: number, width: number) => Math.abs(pos - centre) <= width / 2;

// ── Mash ─────────────────────────────────────────────────────────────────────

export const MASH_MS = 8000;
/** How much one press fills. */
export const mashGain = (difficulty: number) => 0.1 - 0.03 * difficulty;
/** How much the meter drains per second. */
export const mashDrain = (difficulty: number) => 0.12 + 0.13 * difficulty;

export const mashPress = (fill: number, difficulty: number) => Math.min(1, fill + mashGain(difficulty));
export const mashTick = (fill: number, dtMs: number, difficulty: number) =>
  Math.max(0, fill - (mashDrain(difficulty) * dtMs) / 1000);
