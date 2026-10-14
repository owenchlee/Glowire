// A circuit part as a crisp pixel-art icon for the 2D UI (the tray, the drag preview),
// cut from the 4× copy of the board's sprite sheet.

import { Image, View } from 'react-native';

import type { Tile } from '../engine';

const SHEET = require('../../assets/art/circuit-ui.png');
const CELL = 64; // one sprite in circuit-ui.png
const SHEET_W = 1024;
const SHEET_H = 192;

const RESISTORS: Record<number, number> = { 100: 5, 220: 6, 470: 7, 1000: 8 };

/** Column and row of a part's sprite (see scripts/circuit-art.mjs). */
export function spriteCell(tile: Tile): [number, number] {
  switch (tile.kind) {
    case 'wire':
      return [tile.arms & 15, 0];
    case 'battery':
      return [0, 1];
    case 'led':
      return [{ red: 1, green: 2, blue: 3 }[tile.color], 1];
    case 'resistor':
      return [RESISTORS[tile.ohms] ?? 6, 1];
    case 'switch':
      return [tile.closed ? 10 : 9, 1];
    case 'block':
      return [0, 2];
    case 'diode':
      return [4, 2];
    case 'changeover':
      return [tile.up ? 5 : 6, 2];
    case 'meter':
      return [tile.mode === 'A' ? 7 : 8, 2];
    case 'capacitor':
      return [tile.uf >= 4700 ? 11 : tile.uf >= 2200 ? 10 : 9, 2];
  }
}

export function PartIcon({ tile, size }: { tile: Tile; size: number }) {
  const [col, row] = spriteCell(tile);
  const k = size / CELL;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={SHEET}
        style={{
          position: 'absolute',
          width: SHEET_W * k,
          height: SHEET_H * k,
          left: -col * CELL * k,
          top: -row * CELL * k,
        }}
      />
    </View>
  );
}
