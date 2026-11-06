import { describe, expect, it } from 'vitest';

import { type Tile, type TileResult, parseBoard } from '../engine';
import {
  cellsMeantDark,
  createLevelBoard,
  formatReading,
  isLedLabel,
  levelLabels,
  meterReading,
  scrambleState,
  spins,
} from './evaluate';
import { LEVELS } from './levels';

const tileOf = (token: string): Tile => parseBoard([token]).cells[0]!;

describe('spins', () => {
  it('is true only for wires, LEDs and resistors', () => {
    expect(spins(tileOf('─'))).toBe(true);
    expect(spins(tileOf('L>'))).toBe(true);
    expect(spins(tileOf('R220'))).toBe(true);
    expect(spins(tileOf('B^'))).toBe(false);
  });
});

describe('isLedLabel', () => {
  it('rejects switch and meter labels and accepts LED names', () => {
    expect(isLedLabel('S1')).toBe(false);
    expect(isLedLabel('M12')).toBe(false);
    expect(isLedLabel('A')).toBe(true);
    expect(isLedLabel('Sun')).toBe(true);
  });
});

describe('formatReading', () => {
  it('shows whole numbers bare and others to one decimal', () => {
    expect(formatReading(5)).toBe('5');
    expect(formatReading(4.56)).toBe('4.6');
    expect(formatReading(0)).toBe('0');
  });
});

describe('meterReading', () => {
  const meter = { kind: 'meter', current: -0.02, voltage: -3.3 } as TileResult;
  it('gives absolute milliamps or volts', () => {
    expect(meterReading(meter, 'A')).toBeCloseTo(20);
    expect(meterReading(meter, 'V')).toBeCloseTo(3.3);
  });
  it('reads zero for non-meters and missing tiles', () => {
    expect(meterReading({ ...meter, kind: 'led' }, 'A')).toBe(0);
    expect(meterReading(null, 'V')).toBe(0);
    expect(meterReading(undefined, 'A')).toBe(0);
  });
});

describe('scrambleState', () => {
  const level = LEVELS.find((l) => l.twist)!;
  const start = createLevelBoard(level);

  it('is deterministic per seed and changes every spinnable piece that can look different', () => {
    const a = scrambleState(start, 3);
    expect(scrambleState(start, 3)).toEqual(a);
    expect(a.cells.length).toBe(start.cells.length);
    a.cells.forEach((placed, i) => {
      const before = start.cells[i];
      if (!before) return expect(placed).toBeNull();
      expect(placed!.tile.kind).toBe(before.tile.kind);
      if (!before.tile.spin) expect(placed).toBe(before);
    });
    expect(a).not.toEqual(start);
  });
});

describe('cellsMeantDark', () => {
  it('collects the cells of LEDs that a dark goal names', () => {
    const level = LEVELS.find((l) => l.goals.some((g) => g.kind === 'dark'))!;
    const labels = levelLabels(level);
    const dark = cellsMeantDark(level);
    expect(dark.size).toBeGreaterThan(0);
    for (const g of level.goals) if (g.kind === 'dark') expect(dark.has(labels[g.led]!)).toBe(true);
  });

  it('is empty when every goal wants light', () => {
    const level = LEVELS.find((l) => l.goals.every((g) => g.kind === 'lit'))!;
    expect(cellsMeantDark(level).size).toBe(0);
  });
});
