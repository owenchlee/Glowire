// Luck: the Lucky Lantern slot machine, double-or-nothing, and payday Surges. Pure TypeScript.
// Everything takes the random source as an argument, so tests can rig it. Sparks are an
// in-game currency only. The odds are fair on purpose (the machine pays back about 99%).

import type { LuckStats, SaveData } from './save';

export type Random = () => number;

export const SLOT_SYMBOLS = ['plug', 'battery', 'bulb', 'bolt', 'star', 'cloud'] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];

/** Out of 100 on every reel. Grumble's cloud is the dud. */
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = {
  plug: 30,
  battery: 26,
  bulb: 20,
  bolt: 14,
  star: 7,
  cloud: 3,
};
/** Three of a kind pays this many times your bet. */
export const SLOT_TRIPLE: Record<SlotSymbol, number> = {
  plug: 4,
  battery: 8,
  bulb: 15,
  bolt: 30,
  star: 100,
  cloud: 0,
};
/** Any two of a kind (not clouds) pays your bet back. */
export const SLOT_PAIR = 1;

export const BETS = [5, 10, 25, 50] as const;
/** Doubling chains stop here, so a hot streak ends in a cash-out. */
export const MAX_DOUBLES = 3;

export function spinReel(random: Random): SlotSymbol {
  let roll = random() * 100;
  for (const s of SLOT_SYMBOLS) {
    roll -= SLOT_WEIGHTS[s];
    if (roll < 0) return s;
  }
  return 'plug';
}

/** Multiplier of the bet that these three reels pay. */
export function slotMultiplier(reels: readonly SlotSymbol[]): number {
  const [a, b, c] = reels;
  if (a === b && b === c) return SLOT_TRIPLE[a!];
  const pair = a === b ? a : b === c ? b : a === c ? a : null;
  return pair && pair !== 'cloud' ? SLOT_PAIR : 0;
}

/** Exact expected payout per spark bet, from the weights. */
export function slotReturn(): number {
  let total = 0;
  for (const a of SLOT_SYMBOLS)
    for (const b of SLOT_SYMBOLS)
      for (const c of SLOT_SYMBOLS)
        total +=
          (SLOT_WEIGHTS[a] * SLOT_WEIGHTS[b] * SLOT_WEIGHTS[c] * slotMultiplier([a, b, c])) / 1e6;
  return total;
}

export interface SpinResult {
  save: SaveData;
  reels: SlotSymbol[];
  win: number;
}

const withLuck = (save: SaveData, sparks: number, patch: Partial<LuckStats>): SaveData => ({
  ...save,
  sparks,
  luck: { ...save.luck, ...patch },
});

/** Pull the lever. Returns null if you can't cover the bet. */
export function spin(save: SaveData, bet: number, random: Random): SpinResult | null {
  if (!BETS.includes(bet as (typeof BETS)[number]) || save.sparks < bet) return null;
  const reels = [spinReel(random), spinReel(random), spinReel(random)];
  const win = bet * slotMultiplier(reels);
  const { luck } = save;
  return {
    reels,
    win,
    save: withLuck(save, save.sparks - bet + win, {
      spins: luck.spins + 1,
      wagered: luck.wagered + bet,
      won: luck.won + win,
      biggest: Math.max(luck.biggest, win),
    }),
  };
}

export interface FlipResult {
  save: SaveData;
  won: boolean;
}

/** Double or nothing on `stake` sparks (a win you just made). A fair coin. */
export function gamble(save: SaveData, stake: number, random: Random): FlipResult | null {
  if (stake <= 0 || save.sparks < stake) return null;
  const won = random() < 0.5;
  const sparks = save.sparks + (won ? stake : -stake);
  return {
    won,
    save: withLuck(save, sparks, {
      won: save.luck.won + (won ? stake * 2 : 0),
      wagered: save.luck.wagered + stake,
      biggest: Math.max(save.luck.biggest, won ? stake * 2 : 0),
    }),
  };
}

// ── Payday Surges ────────────────────────────────────────────────────────────

export const SURGE_BASE = 0.1;
export const SURGE_PITY = 0.05;
export const SURGE_PITY_CAP = 0.5;
export const MEGA_SURGE = 0.02;

/** The chance of a x2 Surge after `dry` paid jobs without one: it climbs until one hits. */
export function surgeChance(dry: number): number {
  return Math.min(SURGE_PITY_CAP, SURGE_BASE + SURGE_PITY * dry);
}

/** The payday multiplier: 1 (nothing), 2 (Surge) or 5 (Mega Surge). */
export function rollSurge(dry: number, random: Random): 1 | 2 | 5 {
  const roll = random();
  if (roll < MEGA_SURGE) return 5;
  return roll < MEGA_SURGE + surgeChance(dry) ? 2 : 1;
}
