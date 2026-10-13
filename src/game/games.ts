// Mini-games: quick things to play around town between jobs. Pure TypeScript.
//
// - Colour Code (Ms. Ito's blackboard, Schoolhouse Hill): read a resistor's colour bands
//   and pick its value. Real electricians do this every day.
// - Signal Lamp (Old Gus's lighthouse): the lamp flashes a pattern of colours; flash it
//   back. Each round adds one more flash.

export type GameId = 'colours' | 'signal';

export interface GameInfo {
  id: GameId;
  title: string;
  /** Who runs it (a cast id), shown with the instructions. */
  host: string;
  how: string;
}

export const GAMES: Record<GameId, GameInfo> = {
  colours: {
    id: 'colours',
    title: 'Colour Code',
    host: 'ito',
    how: 'Every resistor wears its value as colour bands. First band, second band: two digits. Third band: how many zeros come after. Brown-black-red is 1, 0, and two zeros: 1000 Ω.',
  },
  signal: {
    id: 'signal',
    title: 'Signal Lamp',
    host: 'gus',
    how: 'Watch the lighthouse flash its colours, then flash them back in the same order. Every round, one more flash. How long can you keep up?',
  },
};

// ── Colour Code ──────────────────────────────────────────────────────────────

/** Band colours, digit 0 to 9. */
export const BAND_NAMES = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'] as const;

/** The three bands (digit, digit, number of zeros) of a value with two significant digits. */
export function bandsOf(ohms: number): [number, number, number] {
  const zeros = Math.max(0, Math.floor(Math.log10(ohms)) - 1);
  const digits = Math.round(ohms / 10 ** zeros);
  return [Math.floor(digits / 10) % 10, digits % 10, zeros];
}

export function ohmsOf([a, b, zeros]: [number, number, number]): number {
  return (a * 10 + b) * 10 ** zeros;
}

/** "4.7 kΩ", "220 Ω". */
export function formatOhms(ohms: number): string {
  if (ohms >= 1e6) return `${trim(ohms / 1e6)} MΩ`;
  if (ohms >= 1000) return `${trim(ohms / 1000)} kΩ`;
  return `${ohms} Ω`;
}
const trim = (n: number) => String(Math.round(n * 10) / 10);

/** The values real resistors come in (the E12 series), times 10, 100, … */
const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
const FIRST = [100, 220, 470, 1000];

export interface ColourQuestion {
  ohms: number;
  bands: [number, number, number];
  /** Four values to pick from, one of them right. */
  choices: number[];
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Question `round` (0-based). The first few use the resistors from the jobs; later ones any
 * E12 value from 10 Ω to 820 kΩ. Wrong answers are the mistakes people really make: the
 * right digits with the wrong number of zeros, or the digits read backwards.
 */
export function colourQuestion(round: number, random: () => number): ColourQuestion {
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const ohms = round < 4 ? pick(FIRST) : pick(E12) * 10 ** Math.floor(random() * (round < 8 ? 3 : 5));
  const bands = bandsOf(ohms);
  const [a, b, z] = bands;
  const wrong = new Set<number>();
  const add = (v: number) => {
    if (v !== ohms && v >= 1) wrong.add(v);
  };
  add(ohmsOf([a, b, z + 1]));
  if (z > 0) add(ohmsOf([a, b, z - 1]));
  if (b > 0 && a !== b) add(ohmsOf([b, a, z]));
  for (let guard = 0; wrong.size < 3 && guard < 50; guard++) add(pick(E12) * 10 ** Math.max(0, z + Math.floor(random() * 3) - 1));
  const choices = [ohms, ...[...wrong].slice(0, 3)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }
  return { ohms, bands, choices };
}

/** Seconds per Colour Code question. */
export const COLOUR_TIME = 12;
/** Questions in a game. */
export const COLOUR_ROUNDS = 12;

/** Points for a right answer: 1, plus 1 if answered in the first half of the time. */
export function colourPoints(right: boolean, secondsLeft: number): number {
  if (!right) return 0;
  return secondsLeft > COLOUR_TIME / 2 ? 2 : 1;
}

// ── Signal Lamp ──────────────────────────────────────────────────────────────

export const SIGNAL_COLOURS = ['red', 'green', 'blue', 'gold'] as const;
export type SignalColour = (typeof SIGNAL_COLOURS)[number];

/** The whole pattern for one game (each round shows the first `round + 1` flashes). */
export function signalPattern(length: number, random: () => number): SignalColour[] {
  const out: SignalColour[] = [];
  for (let i = 0; i < length; i++) {
    // Never the same colour three times running: it's no fun to watch.
    let c: SignalColour;
    do c = SIGNAL_COLOURS[Math.floor(random() * 4)]!;
    while (i >= 2 && out[i - 1] === c && out[i - 2] === c);
    out.push(c);
  }
  return out;
}

/** How long each flash lasts: quicker as the pattern grows. */
export function flashMs(length: number): number {
  return Math.max(260, 620 - length * 30);
}

/** A pattern this long gets an answer from far out at sea (a secret: see lore.ts). */
export const SEA_ANSWERS_AT = 7;
