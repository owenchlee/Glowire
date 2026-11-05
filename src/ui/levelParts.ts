import { type Tile, battery, capacitor, diode, led, resistor } from '../engine';
import type { Goal, PartKey } from '../levels/types';
import { formatOhms } from '../render/theme';

/** The order parts appear in the tray. */
export const PART_ORDER: PartKey[] = [
  'battery',
  'led',
  'ledGreen',
  'ledBlue',
  'r100',
  'r220',
  'r470',
  'r1000',
  'diode',
  'c1000',
  'c2200',
  'c4700',
];

export function tileForPart(key: PartKey): Tile {
  if (key === 'battery') return battery(0);
  if (key === 'led') return led(0);
  if (key === 'ledGreen') return led(0, 'green');
  if (key === 'ledBlue') return led(0, 'blue');
  if (key === 'diode') return diode(0);
  if (key[0] === 'c') return capacitor(Number(key.slice(1)), 0);
  return resistor(Number(key.slice(1)), 0);
}

export function partLabel(key: PartKey): string {
  if (key === 'battery') return '3 V';
  if (key === 'led') return 'Red';
  if (key === 'ledGreen') return 'Green';
  if (key === 'ledBlue') return 'Blue';
  if (key === 'diode') return 'Diode';
  if (key[0] === 'c') return `${key.slice(1)} µF`;
  return formatOhms(Number(key.slice(1)));
}

/** "2.1 s", or how a lamp that never changed is described. */
export function formatSeconds(goal: Goal, seconds: number): string {
  if (seconds === Infinity) return goal.kind === 'hold' ? 'stays on' : 'never lights';
  return `${seconds.toFixed(1)} s`;
}
