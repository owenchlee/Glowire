import { type Board, type SimulationResult, LED_MODELS, rotateTile, simulate } from '../engine';
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
  cancel: 'Nothing flows: two batteries are pushing against each other. Tap one to turn it around.',
  bypassed: 'The current found a shortcut around an LED, so that LED stays dark.',
  faint:
    'An LED is getting a trickle of current, too little to glow. It needs more voltage, or another LED is hogging the current.',
  outOfWire: 'Out of wire! Tap a wire to erase it and try a shorter path.',
  solved: 'Solved! ⚡',
} as const;

/** Current through the batteries is (near) zero, but turning one battery around gets it flowing. */
function batteriesCancel(board: Board, result: SimulationResult): boolean {
  const batteries = board.cells.flatMap((t, i) => (t?.kind === 'battery' ? [i] : []));
  if (batteries.length < 2 || Math.abs(result.batteryCurrent) > 1e-4) return false;
  return batteries.some((cell) => {
    const flipped = board.cells.map((t, i) => (i === cell && t ? rotateTile(rotateTile(t)) : t));
    return Math.abs(simulate({ ...board, cells: flipped }).batteryCurrent) > 1e-3;
  });
}

/**
 * The most useful thing to tell the player right now. `meantDark` holds the cells of LEDs
 * the level wants dark in some switch position, so their faintness is not a problem.
 */
export function pickHint(
  intro: string,
  board: Board,
  result: SimulationResult,
  evaluation: Evaluation,
  outOfWire: boolean,
  meantDark: ReadonlySet<number>,
): Hint {
  const leds = result.tiles.filter((t) => t?.kind === 'led');
  const any = (status: string) => leds.some((t) => t!.status === status);
  if (evaluation.complete) return { text: HINTS.solved, tone: 'success' };
  if (result.shortCircuit) return { text: HINTS.short, tone: 'warning' };
  if (any('BURNED_OUT')) return { text: HINTS.burned, tone: 'warning' };
  if (outOfWire) return { text: HINTS.outOfWire, tone: 'warning' };
  if (any('REVERSED')) return { text: HINTS.reversed, tone: 'warning' };
  if (batteriesCancel(board, result)) return { text: HINTS.cancel, tone: 'warning' };
  if (any('BYPASSED')) return { text: HINTS.bypassed, tone: 'warning' };
  const faint = leds.some((t) => {
    const tile = board.cells[t!.cell];
    if (tile?.kind !== 'led' || t!.status !== 'OFF' || meantDark.has(t!.cell)) return false;
    // Pushed forwards with real voltage, yet below the visible current.
    return t!.voltage > 0.5 * LED_MODELS[tile.color].ratedVoltage && t!.current > 1e-7;
  });
  if (faint) return { text: HINTS.faint, tone: 'info' };
  return { text: intro, tone: 'info' };
}
