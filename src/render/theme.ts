import type { LedColor } from '../engine';

// Pastel palette shared by the 3D scene and the 2D UI.
export const COLORS = {
  background: '#f3ece4',
  boardTop: '#fbf5ec',
  boardSide: '#e6d6c0',
  cellA: '#f3e8d8',
  cellB: '#efe2cf',
  cellHighlight: '#bfe8d6',

  wireBase: '#cdeadf',
  resistorBase: '#fbe0b5',
  ledBase: '#f9d0d8',
  batteryBase: '#d3def8',
  switchBase: '#e5d9f5',
  blockStone: '#cfc6dc',
  bush: '#9fd4a8',
  switchOn: '#5bbf8f',
  switchOff: '#b8b0c4',
  lockedRivet: '#8f84a6',

  wire: '#e8a93a',
  wireGlow: '#ffd56b',
  shortGlow: '#ff4b3e',
  marking: '#5b4e6e',
  markingLight: '#ffffff',

  ledRed: '#ff5a5f',
  ledGreen: '#3fcf7f',
  ledBlue: '#4d8dff',
  ledBurned: '#4a4048',
  resistorBody: '#f1dcb4',
  batteryBody: '#6f8fe0',
  batteryCap: '#e9eef9',

  particle: '#fff3b8',
  particleShort: '#ff6b5e',
  shadow: '#6e5f8a',

  text: '#4a4058',
  textSoft: '#7a6f8c',
  card: '#fffaf4',
  danger: '#ff7b6b',
  success: '#5bbf8f',
} as const;

/** Per LED colour: lit dome, unlit dome, glow halo, and the label tag behind its current. */
export const LED_PALETTE: Record<
  LedColor,
  { lit: string; unlit: string; halo: string; tag: string }
> = {
  red: { lit: COLORS.ledRed, unlit: '#e98f93', halo: '#ff7a6e', tag: 'rgba(255,90,95,0.92)' },
  green: { lit: COLORS.ledGreen, unlit: '#93d4ae', halo: '#7dffb4', tag: 'rgba(47,177,105,0.92)' },
  blue: { lit: COLORS.ledBlue, unlit: '#9db8e6', halo: '#82b4ff', tag: 'rgba(66,120,230,0.92)' },
};

/** Standard resistor colour code (digits 0–9). */
export const BAND_COLORS = [
  '#3b3340', // black
  '#8a5a3c', // brown
  '#e0524f', // red
  '#f08c3a', // orange
  '#f2cf4a', // yellow
  '#5bb37a', // green
  '#4f86d9', // blue
  '#9a6fd6', // violet
  '#9a96a0', // grey
  '#f4f1ec', // white
] as const;

/** Two significant digits + multiplier, e.g. 220 Ω → [2, 2, 1] (red, red, brown). */
export function resistorBandDigits(ohms: number): [number, number, number] {
  const exponent = Math.max(0, Math.floor(Math.log10(ohms)) - 1);
  const digits = Math.round(ohms / 10 ** exponent);
  return [Math.floor(digits / 10) % 10, digits % 10, Math.min(9, exponent)];
}

export function resistorBands(ohms: number): string[] {
  return resistorBandDigits(ohms).map((d) => BAND_COLORS[d]!);
}

/** Friendly units for labels: 0.0055 A → "5.5 mA". */
export function formatCurrent(amps: number): string {
  const a = Math.abs(amps);
  if (a >= 1) return `${a.toFixed(1)} A`;
  if (a >= 0.01) return `${Math.round(a * 1000)} mA`;
  return `${(a * 1000).toFixed(1)} mA`;
}

export function formatOhms(ohms: number): string {
  return ohms >= 1000 ? `${ohms / 1000} kΩ` : `${ohms} Ω`;
}
