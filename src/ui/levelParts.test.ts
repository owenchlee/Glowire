import { describe, expect, it } from 'vitest';

import type { Goal, PartKey } from '../levels/types';
import { type TileResult, battery, capacitor, changeover, led, meter, resistor, switchTile } from '../engine';
import { PART_ORDER, formatSeconds, partLabel, tileForPart, tileTag } from './levelParts';

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

describe('tileTag', () => {
  const res = (p: Partial<TileResult>) =>
    ({ cell: 0, kind: 'led', voltage: 0, current: 0, portCurrents: {}, brightness: 0, status: 'OFF', ...p }) as TileResult;

  it('tags values and switch states, naming switches only when there are several', () => {
    expect(tileTag(resistor(220), null, undefined, 0, 0)?.text).toBe('220 Ω');
    expect(tileTag(battery(0, 5), null, undefined, 0, 0)?.text).toBe('5 V');
    expect(tileTag(switchTile(true), null, 'A', 1, 1)).toEqual({ text: 'ON', tone: '#3f7a52' });
    expect(tileTag(switchTile(false), null, 'A', 0, 2)).toEqual({ text: 'A OFF', tone: undefined });
    expect(tileTag(changeover(false), null, 'B', 0, 2)?.text).toBe('B DOWN');
    expect(tileTag(changeover(true), null, 'B', 0, 1)?.text).toBe('UP');
  });

  it('shows capacitor charge only above 0.05 V', () => {
    expect(tileTag(capacitor(1000), res({ voltage: 0.05 }), undefined, 0, 0)).toEqual({ text: '1000 µF', tone: undefined });
    expect(tileTag(capacitor(1000), res({ voltage: -2.04 }), undefined, 0, 0)).toEqual({ text: '1000µF 2.0V', tone: '#8a6a1f' });
  });

  it('formats meter readings per mode', () => {
    expect(tileTag(meter('A'), res({ kind: 'meter', current: 0.0042 }), undefined, 0, 0)?.text).toBe('4.2 mA');
    expect(tileTag(meter('A'), res({ kind: 'meter', current: -0.0151 }), undefined, 0, 0)?.text).toBe('15 mA');
    expect(tileTag(meter('V'), res({ kind: 'meter', voltage: -1.234 }), undefined, 0, 0)).toEqual({ text: '1.23 V', tone: '#2d697b' });
  });

  it('shows LED current, and its name only when there are several LEDs', () => {
    const on = res({ current: 0.02, status: 'OK' });
    expect(tileTag(led(), on, 'L1', 1, 0)?.text).toBe('20 mA');
    expect(tileTag(led(), on, 'L1', 2, 0)?.text).toBe('L1 · 20 mA');
    expect(tileTag(led(), res({ current: 0.00005 }), 'L2', 2, 0)).toEqual({ text: 'L2', tone: undefined });
    expect(tileTag(led(), res({ current: 0.02, status: 'BURNED_OUT' }), 'L2', 2, 0)?.text).toBe('L2');
    expect(tileTag(led(), null, 'L1', 1, 0)).toBeNull();
  });
});
