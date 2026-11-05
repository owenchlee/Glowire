// What you can catch, and how the bite timing works. Pure, so it can be tested.

export interface Fish {
  id: string;
  name: string;
  sparks: number;
  /** Relative chance. */
  weight: number;
  /** How long the bobber stays down, in seconds: rarer fish let go sooner. */
  window: number;
}

export const FISH: readonly Fish[] = [
  { id: 'minnow', name: 'Minnow', sparks: 2, weight: 6, window: 1.1 },
  { id: 'trout', name: 'Trout', sparks: 5, weight: 3, window: 0.9 },
  { id: 'carp', name: 'Golden carp', sparks: 12, weight: 1, window: 0.7 },
];

/** Pick a fish from a random number in [0, 1). */
export function rollFish(r: number): Fish {
  const total = FISH.reduce((n, f) => n + f.weight, 0);
  let at = Math.min(0.999999, Math.max(0, r)) * total;
  for (const f of FISH) {
    if (at < f.weight) return f;
    at -= f.weight;
  }
  return FISH[0]!;
}

/** Seconds of waiting before the bobber dips, from a random number in [0, 1). */
export const biteDelay = (r: number) => 1.2 + r * 2.6;

export type Verdict = 'caught' | 'early' | 'late';

/** Pressed `t` seconds after the bite began (negative: before it). */
export function verdict(t: number, fish: Fish): Verdict {
  return t < 0 ? 'early' : t <= fish.window ? 'caught' : 'late';
}
