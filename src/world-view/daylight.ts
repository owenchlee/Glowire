// The slow time of day over every world: one shared clock, and pure helpers that turn the
// phase of the day into light. Nothing here touches React or three.js.
//
// Phase runs 0..1 and wraps: 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight. A game starts
// at dusk, so the first thing you see is the town's lamps coming on.

/** Real seconds for one whole day. */
export const DAY_SECONDS = 420;
/** Where the clock starts (dusk). */
export const START_PHASE = 0.5;

export type RGB = readonly [number, number, number];

/** Ambient colour keyframes (phase, rgb); 'night' is the world's own night colour. */
const KEYS: { at: number; rgb: RGB | 'night' }[] = [
  { at: 0.0, rgb: [0.98, 0.7, 0.58] }, // sunrise: warm pink
  { at: 0.1, rgb: [1.0, 0.9, 0.78] }, // morning
  { at: 0.25, rgb: [1.0, 1.0, 0.97] }, // noon: bright and pale
  { at: 0.4, rgb: [1.0, 0.94, 0.82] }, // afternoon
  { at: 0.5, rgb: [0.98, 0.58, 0.4] }, // sunset: orange
  { at: 0.58, rgb: [0.55, 0.42, 0.62] }, // dusk purple
  { at: 0.66, rgb: 'night' },
  { at: 0.86, rgb: 'night' },
  { at: 0.94, rgb: [0.6, 0.5, 0.62] }, // first grey light
  { at: 1.0, rgb: [0.98, 0.7, 0.58] },
];

export function wrapPhase(p: number): number {
  return ((p % 1) + 1) % 1;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** The tint of the world's ambient light at this phase; `night` is the colour of its night. */
export function ambientColor(phase: number, night: RGB): [number, number, number] {
  const p = wrapPhase(phase);
  let i = 0;
  while (i < KEYS.length - 2 && p >= KEYS[i + 1]!.at) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = smooth(clamp01((p - a.at) / (b.at - a.at)));
  const ca = a.rgb === 'night' ? night : a.rgb;
  const cb = b.rgb === 'night' ? night : b.rgb;
  return [mix(ca[0], cb[0], t), mix(ca[1], cb[1], t), mix(ca[2], cb[2], t)];
}

/** 0 in the dead of night, 1 at full day. */
export function dayLevel(phase: number): number {
  const p = wrapPhase(phase);
  if (p >= 0.94) return smooth((p - 0.94) / 0.12);
  if (p <= 0.06) return smooth((p + 0.06) / 0.12);
  if (p <= 0.4) return 1;
  if (p <= 0.62) return 1 - smooth((p - 0.4) / 0.22);
  return 0;
}

export interface Daylight {
  phase: number;
  /** 0 night … 1 day. */
  day: number;
  /** How strongly lamps and lit windows glow: full at night, barely there at noon. */
  lamp: number;
  /** The night sky is showing (a moon in the HUD). */
  stars: boolean;
  /** 0..1: how many fireflies are out (dusk and night only). */
  fireflies: number;
  /** 0..1: how many daytime birds and sparkles are about. */
  birds: number;
  /** True when it is dark enough that people go indoors. */
  night: boolean;
  /** Where the sun or moon sits on its arc, 0 (rising) … 1 (setting). */
  arc: number;
}

export function daylight(phase: number): Daylight {
  const p = wrapPhase(phase);
  const day = dayLevel(p);
  const dark = 1 - day;
  return {
    phase: p,
    day,
    lamp: mix(0.12, 1, smooth(clamp01(dark * 1.3))),
    stars: dark > 0.85,
    fireflies: smooth(clamp01((dark - 0.35) / 0.4)),
    birds: smooth(clamp01((day - 0.5) / 0.4)),
    night: dark > 0.7,
    arc: p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5,
  };
}

/** HUD clock text for a phase, as if sunrise were 06:00. */
export function clockText(phase: number): string {
  const minutes = Math.floor(wrapPhase(phase + 0.25) * 24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// The shared clock ------------------------------------------------------------------------

const NAMED: Record<string, number> = { dawn: 0.0, morning: 0.1, day: 0.25, noon: 0.25, dusk: 0.5, sunset: 0.5, night: 0.75, midnight: 0.75 };

let override: number | null = null;
const t0 = Date.now();

/** Pin the time of day (a phase or a name like 'noon'); null lets it run. For screenshots and tests. */
export function setDayOverride(value: number | string | null) {
  if (value === null) override = null;
  else if (typeof value === 'number') override = wrapPhase(value);
  else override = value in NAMED ? NAMED[value]! : Number.isFinite(Number(value)) ? wrapPhase(Number(value)) : null;
}

// On web, ?time=night (or ?time=0.3) pins the clock.
try {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  const q = search ? new URLSearchParams(search).get('time') : null;
  if (q) setDayOverride(q);
} catch {
  /* no location here */
}

/** Seconds on the shared clock (frozen when the time is pinned), for routines. */
export function dayClockSeconds(now = Date.now()): number {
  return override === null ? (now - t0) / 1000 : override * DAY_SECONDS;
}

export function currentPhase(now = Date.now()): number {
  return override === null ? wrapPhase(START_PHASE + (now - t0) / 1000 / DAY_SECONDS) : override;
}
