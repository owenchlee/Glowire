import { describe, expect, it } from 'vitest';

import { fromEngineBoard, toEngineBoard } from '../board/board';
import { parseBoard, simulate } from '../engine';
import {
  cellsMeantDark,
  createLevelBoard,
  describeGoal,
  evaluateLevel,
  formatReading,
  goalWordsFor,
  isLedLabel,
  ledNamesFor,
  levelLabels,
  meterReading,
  partKey,
  remainingParts,
  scrambleState,
} from './evaluate';
import type { LevelDef } from './types';

/** A bare level around a picture; tests override what they care about. */
const level = (board: string[], extra: Partial<LevelDef> = {}): LevelDef => ({
  id: 999,
  title: 't',
  intro: '',
  board,
  inventory: {},
  wireBudget: null,
  goals: [],
  ...extra,
});

const LOOP = ['. .  .    .  .', '. ┌  R220 ┐  .', '. B^ .    Lv .', '. └  ─    ┘  .', '. .  .    .  .'];

describe('partKey', () => {
  it('maps tiles to inventory keys, and nothing else', () => {
    const cell = (token: string) => parseBoard([token]).cells[0]!;
    expect(partKey(cell('L>'))).toBe('led');
    expect(partKey(cell('Lg>'))).toBe('ledGreen');
    expect(partKey(cell('Lb>'))).toBe('ledBlue');
    expect(partKey(cell('R470'))).toBe('r470');
    expect(partKey(cell('B>'))).toBe('battery');
    expect(partKey(cell('D>'))).toBe('diode');
    expect(partKey(cell('C2200'))).toBe('c2200');
    expect(partKey(cell('─'))).toBeNull();
    expect(partKey(cell('S0'))).toBeNull();
    // Only the 3 V battery is a tray part.
    expect(partKey(cell('B9>'))).toBeNull();
  });
});

describe('labels', () => {
  it('numbers LEDs, switches and meters in reading order', () => {
    const l = level(['L> S1 MA', 'Cu L> MV']);
    expect(levelLabels(l)).toEqual({ A: 0, S1: 1, M1: 2, S2: 3, B: 4, M2: 5 });
  });

  it('explicit labels replace LED letters but keep switch and meter labels', () => {
    const l = level(['L> S1 MA', '. . L>'], { labels: { X: [2, 1] } });
    expect(levelLabels(l)).toEqual({ S1: 1, M1: 2, X: 5 });
  });

  it('tells LED labels from switch and meter labels', () => {
    expect(isLedLabel('A')).toBe(true);
    expect(isLedLabel('S1')).toBe(false);
    expect(isLedLabel('M12')).toBe(false);
    expect(isLedLabel('S')).toBe(true);
  });

  it('names a lone LED "the LED" and falls back to letters for same-colour LEDs', () => {
    expect(ledNamesFor(level(['L>']))).toEqual({ A: 'the LED' });
    expect(ledNamesFor(level(['L> L>']))).toEqual({ A: 'A', B: 'B' });
    expect(ledNamesFor(level(['L> Lg> Lg>']))).toEqual({ A: 'the red LED', B: 'B', C: 'C' });
  });
});

describe('remainingParts and the tray', () => {
  it('counts only unlocked placed parts and can go negative', () => {
    const l = level(['R220 R220 B>'], { inventory: { r220: 1, led: 2 } });
    const start = createLevelBoard(l);
    // Locked pre-placed parts are not charged to the tray.
    expect(remainingParts(l, start)).toEqual({ r220: 1, led: 2 });
    const placed = {
      ...start,
      cells: start.cells.map((p) => (p ? { ...p, tile: { ...p.tile, locked: false } } : p)),
    };
    expect(remainingParts(l, placed)).toEqual({ r220: -1, led: 2, battery: -1 });
  });

  it('does not change the level inventory', () => {
    const l = level(['R220'], { inventory: { r220: 1 } });
    const state = createLevelBoard({ ...l, loose: true });
    remainingParts(l, state);
    expect(l.inventory).toEqual({ r220: 1 });
  });
});

describe('createLevelBoard', () => {
  it('locks every pre-placed part by default', () => {
    const state = createLevelBoard(level(LOOP));
    expect(state.cells.every((p) => !p || p.tile.locked)).toBe(true);
  });

  it('loose levels free wires and listed parts, but never blocks or unlisted parts', () => {
    const l = level(['─ R220 R100 # B>'], { loose: true, inventory: { r220: 1 } });
    const locked = createLevelBoard(l).cells.map((p) => p?.tile.locked);
    expect(locked).toEqual([false, false, true, true, true]);
  });

  it('a loose level whose listed part has a zero count keeps it locked', () => {
    const l = level(['R220'], { loose: true, inventory: { r220: 0 } });
    expect(createLevelBoard(l).cells[0]!.tile.locked).toBe(true);
  });

  it('twist levels are the same shuffle every time and never leave a piece solved-looking by luck of seed 0', () => {
    const l = level(LOOP, { twist: { seed: 7 } });
    const a = createLevelBoard(l);
    const b = createLevelBoard(l);
    expect(a).toEqual(b);
    expect(a.cells.every((p) => !p || p.tile.locked)).toBe(true);
    expect(a.cells.some((p) => p?.tile.spin)).toBe(true);
  });
});

describe('scrambleState', () => {
  it('is deterministic per seed, leaves non-spin parts alone and keeps tile kinds', () => {
    const state = createLevelBoard(level(LOOP, { twist: { seed: 3 } }));
    const a = scrambleState(state, 11);
    expect(scrambleState(state, 11)).toEqual(a);
    state.cells.forEach((p, i) => {
      if (!p) expect(a.cells[i]).toBeNull();
      else {
        expect(a.cells[i]!.tile.kind).toBe(p.tile.kind);
        if (!p.tile.spin) expect(a.cells[i]).toBe(p);
      }
    });
  });

  it('does not mutate the board it is given', () => {
    const state = createLevelBoard(level(LOOP, { twist: { seed: 3 } }));
    const copy = JSON.parse(JSON.stringify(state));
    scrambleState(state, 99);
    expect(JSON.parse(JSON.stringify(state))).toEqual(copy);
  });
});

describe('meterReading and formatReading', () => {
  it('reads absolute milliamps or volts, and 0 for anything that is not a meter', () => {
    const meter = { kind: 'meter', current: -0.005, voltage: -2.5 } as never;
    expect(meterReading(meter, 'A')).toBeCloseTo(5);
    expect(meterReading(meter, 'V')).toBeCloseTo(2.5);
    expect(meterReading(null, 'A')).toBe(0);
    expect(meterReading(undefined, 'V')).toBe(0);
    expect(meterReading({ kind: 'led', current: 1, voltage: 1 } as never, 'A')).toBe(0);
  });

  it('formats whole numbers plainly and others to one decimal', () => {
    expect(formatReading(5)).toBe('5');
    expect(formatReading(0)).toBe('0');
    expect(formatReading(2.54)).toBe('2.5');
    expect(formatReading(0.05)).toBe('0.1');
  });
});

describe('cellsMeantDark', () => {
  it('collects dark goals and the LEDs an "only" goal leaves out', () => {
    const l = level(['L> L> L>'], {
      goals: [
        { kind: 'dark', led: 'A' },
        { kind: 'only', leds: ['B'] },
      ],
    });
    expect([...cellsMeantDark(l)].sort()).toEqual([0, 2]);
  });

  it('is empty when no goal wants a dark LED', () => {
    expect(cellsMeantDark(level(['L>'], { goals: [{ kind: 'lit', led: 'A' }] })).size).toBe(0);
  });
});

describe('evaluateLevel edge cases', () => {
  const solution = createLevelBoard(level(LOOP));
  const lit = level(LOOP, { goals: [{ kind: 'lit', led: 'A' }], inventory: { r220: 1 } });
  const looseResistor = {
    ...solution,
    cells: solution.cells.map((p) => (p?.tile.kind === 'resistor' ? { ...p, tile: { ...p.tile, locked: false } } : p)),
  };

  it('a level with no goals is trivially met, but still reports shorts', () => {
    expect(evaluateLevel(level(['L>']), createLevelBoard(level(['L>']))).complete).toBe(true);
  });

  it('a goal naming an LED that does not exist is not met (and does not throw)', () => {
    const l = level(LOOP, { goals: [{ kind: 'lit', led: 'Z' }] });
    expect(evaluateLevel(l, solution).goals[0]!.met).toBe(false);
    const d = level(LOOP, { goals: [{ kind: 'dark', led: 'Z' }] });
    expect(evaluateLevel(d, solution).goals[0]!.met).toBe(false);
  });

  it('a meter goal on a missing meter reads 0', () => {
    const zero = level(LOOP, { goals: [{ kind: 'meter', meter: 'M1', min: 0, max: 1 }] });
    expect(evaluateLevel(zero, solution).goals[0]!.met).toBe(true);
    const some = level(LOOP, { goals: [{ kind: 'meter', meter: 'M1', min: 1, max: 2 }] });
    expect(evaluateLevel(some, solution).goals[0]!.met).toBe(false);
  });

  it('an "all" goal needs at least `count` LEDs on the board', () => {
    const l = (count: number) => level(LOOP, { goals: [{ kind: 'all', count }] });
    expect(evaluateLevel(l(1), solution).goals[0]!.met).toBe(true);
    expect(evaluateLevel(l(2), solution).goals[0]!.met).toBe(false);
  });

  it('a lit goal with a brightness band fails when the LED is outside it', () => {
    const dim = level(LOOP, { goals: [{ kind: 'lit', led: 'A', brightness: 'dim' }] });
    const bright = level(LOOP, { goals: [{ kind: 'lit', led: 'A', brightness: 'bright' }] });
    const b = simulate(toEngineBoard(solution)).tiles.find((t) => t?.kind === 'led')!.brightness;
    expect(evaluateLevel(dim, solution).goals[0]!.met).toBe(b >= 0.03 && b <= 0.15);
    expect(evaluateLevel(bright, solution).goals[0]!.met).toBe(b >= 0.45);
  });

  it('the wire budget is checked against the wires on the board', () => {
    const tight = { ...lit, wireBudget: 2 };
    const loose = { ...lit, wireBudget: 100 };
    expect(evaluateLevel(tight, solution).overBudget).toBe(true);
    expect(evaluateLevel(tight, solution).complete).toBe(false);
    expect(evaluateLevel(loose, solution).overBudget).toBe(false);
    expect(evaluateLevel(loose, solution).complete).toBe(true);
    expect(evaluateLevel({ ...lit, wireBudget: evaluateLevel(lit, solution).wires }, solution).overBudget).toBe(false);
  });

  it('using more of a part than the tray holds blocks completion', () => {
    const board = looseResistor;
    expect(evaluateLevel(lit, board).complete).toBe(true);
    expect(evaluateLevel({ ...lit, inventory: { r220: 0 } }, board).complete).toBe(false);
    expect(evaluateLevel({ ...lit, inventory: {} }, board).complete).toBe(false);
  });

  it('a bare battery loop is a short, and shorts block completion', () => {
    const rows = ['┌ ─ ┐', 'B^ . │', '└ ─ ┘'];
    const e = evaluateLevel(level(rows), fromEngineBoard(parseBoard(rows)));
    expect(e.problem).toBe('short');
    expect(e.complete).toBe(false);
  });
});

describe('describeGoal edge cases', () => {
  const names = { A: 'A', B: 'B', C: 'C' };

  it('words brightness bands, and says nothing for "any"', () => {
    expect(describeGoal({ kind: 'lit', led: 'A', brightness: 'dim' }, names, 0)).toBe('Light A dimly');
    expect(describeGoal({ kind: 'lit', led: 'A', brightness: 'any' }, names, 0)).toBe('Light A');
  });

  it('handles "only" with none, some and all LEDs', () => {
    expect(describeGoal({ kind: 'only', leds: [] }, names, 0)).toBe('Keep every LED dark');
    expect(describeGoal({ kind: 'only', leds: ['A', 'C'] }, names, 0)).toBe('Light only A and C');
    expect(describeGoal({ kind: 'only', leds: ['A', 'B', 'C'] }, names, 0)).toBe('Light every LED');
    expect(describeGoal({ kind: 'only', leds: ['A', 'B'] }, { A: 'A', B: 'B' }, 0)).toBe('Light both LEDs');
    expect(describeGoal({ kind: 'only', leds: ['A'] }, { A: 'the LED' }, 0)).toBe('Light the LED');
  });

  it('lists three switches with commas and "and"', () => {
    const g = { kind: 'lit', led: 'A', when: { S1: true, S2: true, S3: true } } as const;
    expect(describeGoal(g, names, 3)).toBe('Light A when S1, S2 and S3 are ON');
  });

  it('says all switches are OFF when none are on', () => {
    expect(describeGoal({ kind: 'lit', led: 'A', when: { S1: false } }, names, 2)).toBe(
      'Light A when all switches are OFF',
    );
  });

  it('says UP/DOWN for every switch with changeovers', () => {
    const g = { kind: 'lit', led: 'A', when: { S1: true } } as const;
    expect(describeGoal(g, names, 2, { twoWay: true })).toBe('Light A when S1 is UP and S2 is DOWN');
    expect(describeGoal(g, names, 1, { twoWay: true })).toBe('Light A when the switch is UP');
  });

  it('meter goals: "the meter" for one meter, its label for several, volts for a voltmeter', () => {
    const goal = { kind: 'meter', meter: 'M1', min: 5, max: 6.5 } as const;
    expect(describeGoal(goal, names, 0, { meters: { M1: 'A' } })).toBe('Make the meter read 5–6.5 mA');
    expect(describeGoal(goal, names, 0, { meters: { M1: 'V', M2: 'A' } })).toBe('Make M1 read 5–6.5 V');
    expect(describeGoal(goal, names, 0)).toBe('Make the meter read 5–6.5 mA');
  });

  it('timed goals: open-ended hold, bounded delay and changeover wording', () => {
    expect(describeGoal({ kind: 'hold', led: 'A', switch: 'S1', min: 2 }, { A: 'the LED' }, 1)).toBe(
      'After the switch goes OFF, keep the LED glowing for at least 2 s',
    );
    expect(describeGoal({ kind: 'delay', led: 'A', switch: 'S2', min: 1, max: 2.5 }, names, 2)).toBe(
      'After S2 goes ON, light A 1–2.5 s later',
    );
    expect(describeGoal({ kind: 'delay', led: 'A', switch: 'S1', min: 1, max: 2 }, names, 1, { twoWay: true })).toBe(
      'After the switch flips UP, light A 1–2 s later',
    );
  });

  it('falls back to the raw label when no name is known', () => {
    expect(describeGoal({ kind: 'dark', led: 'Q' }, {}, 0)).toBe('Keep Q dark');
  });
});

describe('goalWordsFor', () => {
  it('finds meter kinds and changeover switches', () => {
    const words = goalWordsFor(level(['MA MV Cu']));
    expect(words).toEqual({ twoWay: true, meters: { M1: 'A', M2: 'V' } });
    expect(goalWordsFor(level(['S1 L>']))).toEqual({ twoWay: false, meters: {} });
  });
});
