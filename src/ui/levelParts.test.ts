import { describe, expect, it } from 'vitest';

import type { Goal, PartKey } from '../levels/types';
import { PART_ORDER, formatSeconds, partLabel, tileForPart } from './levelParts';

describe('level tray parts', () => {
  it('every tray part has a tile and a non-empty label', () => {
    for (const key of PART_ORDER) {
      expect(tileForPart(key)).toBeTruthy();
      expect(partLabel(key).length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate parts in the tray order', () => {
    expect(new Set(PART_ORDER).size).toBe(PART_ORDER.length);
  });

  it('maps part keys to the right tile kind and value', () => {
    expect(tileForPart('battery').kind).toBe('battery');
    expect(tileForPart('diode').kind).toBe('diode');
    expect(tileForPart('ledBlue')).toMatchObject({ kind: 'led', color: 'blue' });
    expect(tileForPart('r470')).toMatchObject({ kind: 'resistor', ohms: 470 });
    expect(tileForPart('c2200')).toMatchObject({ kind: 'capacitor', uf: 2200 });
  });

  it('labels values in plain units', () => {
    expect(partLabel('r220' as PartKey)).toBe('220 Ω');
    expect(partLabel('r1000')).toBe('1 kΩ');
    expect(partLabel('c4700')).toBe('4700 µF');
    expect(partLabel('ledGreen')).toBe('Green');
  });
});

describe('formatSeconds', () => {
  const hold = { kind: 'hold' } as Goal;
  const delay = { kind: 'delay' } as Goal;

  it('rounds to one decimal', () => {
    expect(formatSeconds(delay, 2.14)).toBe('2.1 s');
    expect(formatSeconds(delay, 0)).toBe('0.0 s');
  });

  it('describes a lamp that never changed by goal kind', () => {
    expect(formatSeconds(hold, Infinity)).toBe('stays on');
    expect(formatSeconds(delay, Infinity)).toBe('never lights');
  });
});
