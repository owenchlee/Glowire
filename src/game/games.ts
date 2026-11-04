// Mini-games: quick things to play around town between jobs. Pure TypeScript.
//
// - Colour Code (Ms. Ito's blackboard, Schoolhouse Hill): read a resistor's colour bands
//   and pick its value. Real electricians do this every day.
// - Signal Lamp (Old Gus's lighthouse): the lamp flashes a pattern of colours; flash it
//   back. Each round adds one more flash.
// - Needle Drop (Moth's old schoolroom, Mossbell): a meter, a battery and a lamp. Which
//   resistor puts the needle where it should be? Real circuits, worked out by the solver.
// - Jar Catch (Pearl's porch, Brightwater): lightning falls; catch it in your jar and pour
//   it into the lamp before the jar overflows. Mind the dark drops: they drink your jar dry.

import { LED_MODELS, parseBoard, simulate } from '../engine';
import type { GameSpot } from '../world/types';

export type GameId = GameSpot;

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
  needle: {
    id: 'needle',
    title: 'Needle Drop',
    host: 'moth',
    how: 'Grandpa’s old meter game! A battery, a lamp, and a meter. Pick the resistor that puts the needle where it’s asked. Bigger resistor, less current. Quick answers score double.',
  },
  jars: {
    id: 'jars',
    title: 'Jar Catch',
    host: 'pearl',
    how: 'Catch the falling sparks in your jar, then POUR it into the lamp before it overflows. A full jar holds five. Dodge the dark drops: they drink your jar dry!',
  },
  probe: {
    id: 'probe',
    title: 'Dead Lamp Hunt',
    host: 'gran',
    how: 'Grumble’s zap killed ONE lamp in the string. A dead lamp is a gap, so the whole battery pushes across it. Probe a stretch: volts means it’s in there, 0 means it isn’t. Few probes! Then name the lamp.',
  },
  pipes: {
    id: 'pipes',
    title: 'Dockyard Wiring',
    host: 'bolt',
    how: 'Tap a tile to turn it and carry power from the battery to EVERY lamp. Wires must meet end to end. A diode (arrow) is bolted down and only passes power the way it points.',
  },
  panel: {
    id: 'panel',
    title: 'Clock Panel',
    host: 'hazel',
    how: 'Every clock stopped at 11:52. Each switch flips ITSELF and the ones touching it. Get them all ticking. Beat par for a bonus. Pressing twice undoes it.',
  },
  lantern: {
    id: 'lantern',
    title: 'Lantern Budget',
    host: 'pearl',
    how: 'Your lantern burns down and the Hush is hungry. Pick the circuit that lights the lamp BRIGHTEST. Right refills it; wrong feeds the Hush. A resistor beside the lamp isn’t in its way.',
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

// ── Needle Drop ──────────────────────────────────────────────────────────────

export const NEEDLE_RESISTORS = [100, 220, 470, 1000] as const;
export type LampColour = keyof typeof LED_MODELS;

export interface NeedleQuestion {
  volts: number;
  lamp: LampColour;
  /** Milliamps the meter reads with each resistor, worked out by the circuit solver. */
  readings: Record<number, number>;
  /** The resistor that's right… */
  ohms: number;
  /** …and the reading asked for (rounded, as the meter shows it). */
  target: number;
}

const readingCache = new Map<string, number>();

/** What the meter reads: a battery, a resistor, a lamp and an ammeter in one loop. */
export function needleReading(volts: number, ohms: number, lamp: LampColour): number {
  const key = `${volts}/${ohms}/${lamp}`;
  let mA = readingCache.get(key);
  if (mA === undefined) {
    const led = { red: 'L>', green: 'Lg>', blue: 'Lb>' }[lamp];
    const result = simulate(parseBoard([`┌ B${volts === 3 ? '' : volts}< R${ohms} ┐`, `└ ${led}  MA   ┘`]));
    const meter = result.tiles.find((t) => t?.kind === 'meter');
    mA = Math.round(Math.abs(meter?.current ?? 0) * 10000) / 10;
    readingCache.set(key, mA);
  }
  return mA;
}

/**
 * Question `round` (0-based): a battery and a lamp, and a reading to hit. Early rounds are
 * one battery and a red lamp; later ones bring in more volts and fussier colours. Only
 * setups where every resistor gives a different, safe reading are asked.
 */
export function needleQuestion(round: number, random: () => number): NeedleQuestion {
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  for (let guard = 0; ; guard++) {
    const volts = round < 3 ? 3 : pick([3, 6, 6, 9]);
    const lamp: LampColour = round < 3 ? 'red' : pick(['red', 'red', 'green', 'blue']);
    const readings: Record<number, number> = {};
    for (const r of NEEDLE_RESISTORS) readings[r] = needleReading(volts, r, lamp);
    const values = Object.values(readings);
    const distinct = new Set(values.map((v) => Math.round(v))).size === values.length;
    const safe = values.every((v) => v < LED_MODELS[lamp].maxCurrent * 1000 && v > 0.3);
    if ((distinct && safe) || guard > 40) {
      const usable = NEEDLE_RESISTORS.filter((r) => readings[r]! < LED_MODELS[lamp].maxCurrent * 1000);
      const ohms = pick(usable.length ? usable : NEEDLE_RESISTORS);
      return { volts, lamp, readings, ohms, target: readings[ohms]! };
    }
  }
}

/** Seconds per Needle Drop question, and questions in a game. */
export const NEEDLE_TIME = 15;
export const NEEDLE_ROUNDS = 10;

// ── Jar Catch ────────────────────────────────────────────────────────────────

/** Seconds in a game of Jar Catch, and sparks a full jar holds. */
export const JAR_SECONDS = 45;
export const JAR_SIZE = 5;

export interface Drop {
  /** Across the play area, 0 (left) to 1 (right). */
  x: number;
  /** Down the play area, 0 (top) to 1 (bottom). */
  y: number;
  /** A spark of lightning, or a drop of the dark. */
  dark: boolean;
  /** Play-area heights per second. */
  speed: number;
}

/** The next thing to fall, `t` seconds into the game: faster, and more often dark, as it goes on. */
export function nextDrop(t: number, random: () => number): Drop {
  const dark = t > 8 && random() < Math.min(0.35, 0.12 + t / 150);
  return { x: 0.06 + random() * 0.88, y: -0.05, dark, speed: 0.32 + t / 120 + random() * 0.12 };
}

/** Seconds between drops, `t` seconds in. */
export const dropGap = (t: number) => Math.max(0.32, 0.75 - t / 90);
