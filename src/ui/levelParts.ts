import { type Tile, type TileResult, battery, capacitor, diode, led, resistor } from '../engine';
import { meterReading } from '../levels/evaluate';
import type { Goal, PartKey } from '../levels/types';
import { LED_PALETTE, formatCurrent, formatOhms } from '../render/theme';

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

/** The small tag shown over a placed part: its text and an optional background colour. */
export function tileTag(
  t: Tile,
  r: TileResult | null | undefined,
  name: string | undefined,
  ledCount: number,
  switchCount: number,
): { text: string; tone?: string } | null {
  let text: string | null = null;
  let tone: string | undefined;
  if (t.kind === 'resistor') text = formatOhms(t.ohms);
  else if (t.kind === 'battery') text = `${t.volts} V`;
  else if (t.kind === 'switch') {
    text = `${switchCount > 1 && name ? `${name} ` : ''}${t.closed ? 'ON' : 'OFF'}`;
    tone = t.closed ? '#3f7a52' : undefined;
  } else if (t.kind === 'changeover') {
    text = `${switchCount > 1 && name ? `${name} ` : ''}${t.up ? 'UP' : 'DOWN'}`;
    tone = '#3f5a7a';
  } else if (t.kind === 'capacitor') {
    const v = Math.abs(r?.voltage ?? 0);
    text = v > 0.05 ? `${t.uf}µF ${v.toFixed(1)}V` : `${t.uf} µF`;
    tone = v > 0.05 ? '#8a6a1f' : undefined;
  } else if (t.kind === 'meter') {
    const reading = meterReading(r, t.mode);
    text = t.mode === 'A' ? `${reading < 10 ? reading.toFixed(1) : Math.round(reading)} mA` : `${reading.toFixed(2)} V`;
    tone = t.mode === 'A' ? '#8a6a1f' : '#2d697b';
  } else if (t.kind === 'led') {
    // Show the current even when it is too faint to glow: that is how hogging shows up.
    const flowing = r && r.current > 1e-4 && r.status !== 'BURNED_OUT';
    const prefix = ledCount > 1 && name ? name : '';
    text = flowing ? `${prefix ? `${prefix} · ` : ''}${formatCurrent(r.current)}` : prefix || null;
    tone = r?.status === 'OK' ? LED_PALETTE[t.color].tag : undefined;
  }
  return text ? { text, tone } : null;
}
