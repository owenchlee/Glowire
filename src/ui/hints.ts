import type { SimulationResult } from '../engine';

export type HintTone = 'info' | 'warning' | 'success';

export interface Hint {
  text: string;
  tone: HintTone;
}

export const HINTS = {
  intro: 'Connect the battery to the LED to make it glow!',
  short: 'Short circuit! The current skipped the LED and rushed straight back to the battery.',
  burned:
    'Pop! Too much current burned out the LED. Swap one wire for a resistor to slow the current down.',
  reversed: 'That LED is backwards. Current only flows in through its + side. Tap it to turn it.',
  bypassed: 'The current found a shortcut around the LED, so the LED stays dark.',
  lit: 'It glows! The resistor keeps the current gentle. Now try adding a second LED. What changes?',
  explore: 'Keep experimenting! What makes the LED brighter or dimmer?',
} as const;

/** The most important thing to tell the player about the circuit right now. */
export function pickHint(result: SimulationResult, hasLit: boolean): Hint {
  const leds = result.tiles.filter((t) => t?.kind === 'led');
  const any = (status: string) => leds.some((l) => l?.status === status);
  if (result.shortCircuit) return { text: HINTS.short, tone: 'warning' };
  if (any('BURNED_OUT')) return { text: HINTS.burned, tone: 'warning' };
  if (any('REVERSED')) return { text: HINTS.reversed, tone: 'warning' };
  if (any('BYPASSED')) return { text: HINTS.bypassed, tone: 'warning' };
  if (any('OK')) return { text: HINTS.lit, tone: 'success' };
  return { text: hasLit ? HINTS.explore : HINTS.intro, tone: 'info' };
}
