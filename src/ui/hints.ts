import type { SimulationResult } from '../engine';
import type { Evaluation } from '../levels/evaluate';

export type HintTone = 'info' | 'warning' | 'success';

export interface Hint {
  text: string;
  tone: HintTone;
}

export const HINTS = {
  short: 'Short circuit! The current skipped the LED and rushed straight back to the battery.',
  burned:
    'Pop! Too much current burned out the LED. Put a resistor in the loop to slow the current down.',
  reversed: 'An LED is backwards. Current only flows in through its + side. Tap it to turn it.',
  bypassed: 'The current found a shortcut around an LED, so that LED stays dark.',
  outOfWire: 'Out of wire! Tap a wire to erase it and try a shorter path.',
  solved: 'Solved! ⚡',
} as const;

/** The most useful thing to tell the player right now. */
export function pickHint(
  intro: string,
  result: SimulationResult,
  evaluation: Evaluation,
  outOfWire: boolean,
): Hint {
  const any = (status: string) =>
    result.tiles.some((t) => t?.kind === 'led' && t.status === status);
  if (evaluation.complete) return { text: HINTS.solved, tone: 'success' };
  if (result.shortCircuit) return { text: HINTS.short, tone: 'warning' };
  if (any('BURNED_OUT')) return { text: HINTS.burned, tone: 'warning' };
  if (outOfWire) return { text: HINTS.outOfWire, tone: 'warning' };
  if (any('REVERSED')) return { text: HINTS.reversed, tone: 'warning' };
  if (any('BYPASSED')) return { text: HINTS.bypassed, tone: 'warning' };
  return { text: intro, tone: 'info' };
}
