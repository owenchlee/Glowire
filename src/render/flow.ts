/**
 * Map a current to a 0–1 visual "level" on a log scale, so 0.1 mA, 5 mA and an 8 A
 * short all look clearly different. 0 means no visible flow.
 */
export function currentLevel(amps: number): number {
  const a = Math.abs(amps);
  if (a < 1e-5) return 0;
  return Math.min(1, Math.max(0.05, Math.log10(a / 1e-4) / Math.log10(2 / 1e-4)));
}

/** LED brightness (linear in current) to perceived glow, so dim LEDs are still visible. */
export function perceivedGlow(brightness: number): number {
  return brightness > 0.001 ? 0.25 + 0.75 * Math.sqrt(brightness) : 0;
}
