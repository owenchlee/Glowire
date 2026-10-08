import { type Tile, battery, led, resistor, wire } from '../engine';
import { type BoardState, createBoard } from './board';

export const TUTORIAL_SIZE = 5;

const at = (x: number, y: number) => y * TUTORIAL_SIZE + x;

/**
 * Battery (+ on top) and LED (anode on top) face each other across the middle row,
 * both vertical, so the shortest circuit is a loop over the top and under the bottom.
 */
export function createTutorialBoard(): BoardState {
  return createBoard(TUTORIAL_SIZE, TUTORIAL_SIZE, [
    [at(1, 2), { ...battery(1), locked: true }],
    [at(3, 2), { ...led(1), locked: true }],
  ]);
}

export interface TrayItem {
  key: 'straight' | 'corner' | 'tee' | 'cross' | 'resistor' | 'led';
  label: string;
  tile: Tile;
}

export const TUTORIAL_TRAY: TrayItem[] = [
  { key: 'straight', label: 'Wire', tile: wire('straight', 1) },
  { key: 'corner', label: 'Corner', tile: wire('corner', 1) },
  { key: 'tee', label: 'T', tile: wire('tee', 0) },
  { key: 'cross', label: 'Cross', tile: wire('cross', 0) },
  { key: 'resistor', label: '220 Ω', tile: resistor(220, 0) },
  { key: 'led', label: 'LED', tile: led(0) },
];
