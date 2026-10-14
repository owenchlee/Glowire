import { describe, expect, it } from 'vitest';

import { type BoardState, eraseWire, fromEngineBoard, rotateAt, wireCount } from '../board/board';
import { type Tile, getPorts, parseBoard, simulate } from '../engine';
import {
  createLevelBoard,
  describeGoal,
  evaluateLevel,
  goalWordsFor,
  ledNamesFor,
  levelLabels,
  remainingParts,
} from './evaluate';
import { CHAPTERS, LEVELS, getLevel, levelNumber, nextLevel } from './levels';
import type { LevelDef } from './types';

/** A tile's identity, ignoring lock flags and switch positions. */
const shape = (tile: Tile) => {
  const { locked: _locked, ...rest } = tile;
  if (rest.kind === 'switch') return { ...rest, closed: false };
  if (rest.kind === 'changeover') return { ...rest, up: false };
  return rest;
};

/** A finished board drawn as a picture, with the level's locked parts kept locked. */
function solved(id: number, picture: string[]): BoardState {
  const level = getLevel(id)!;
  const start = createLevelBoard(level);
  const board = fromEngineBoard(parseBoard(picture));
  expect(board.width, `level ${id} width`).toBe(start.width);
  expect(board.height, `level ${id} height`).toBe(start.height);
  return {
    ...board,
    cells: board.cells.map((p, i) => {
      const fixed = start.cells[i];
      if (fixed?.tile.spin) {
        // Twist pieces may be turned, but nothing else about them changes.
        expect(p?.tile.kind, `level ${id} cell ${i}`).toBe(fixed.tile.kind);
        return { ...p!, tile: { ...p!.tile, locked: true, spin: true } };
      }
      if (fixed?.tile.locked) {
        // The solution must leave every locked part exactly where it was.
        expect(p && shape(p.tile), `level ${id} cell ${i}`).toEqual(shape(fixed.tile));
        return { ...p!, tile: fixed.tile };
      }
      return p;
    }),
  };
}

/** Evaluate a picture of a board for a level. */
const check = (id: number, picture: string[]) => evaluateLevel(getLevel(id)!, solved(id, picture));

/** Every level's worked solution (twist levels: the drawn picture). */
const SOLUTIONS: Record<number, string[]> = {};
for (const l of LEVELS) {
  const picture = l.solution ?? (l.twist ? l.board : null);
  if (picture) SOLUTIONS[l.id] = picture;
}

describe('levels', () => {
  it('has unique ids and valid pictures', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const level of LEVELS) {
      const labels = levelLabels(level);
      for (const g of level.goals) {
        if (g.kind === 'lit' || g.kind === 'dark') expect(labels[g.led]).toBeDefined();
        if (g.kind === 'only') for (const l of g.leds) expect(labels[l]).toBeDefined();
        for (const s of Object.keys(g.when ?? {})) expect(labels[s]).toBeDefined();
      }
    }
  });

  it('numbers levels within their chapter and links them in order', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(levelNumber(1)).toBe('1-1');
    expect(levelNumber(11)).toBe('2-1');
    expect(nextLevel(10)?.id).toBe(32); // the Maple Street boss
    expect(nextLevel(32)?.id).toBe(11);
    expect(nextLevel(LEVELS.at(-1)!.id)).toBeUndefined();
  });

  it('no level starts out solved', () => {
    for (const level of LEVELS) {
      expect(evaluateLevel(level, createLevelBoard(level)).complete, `level ${level.id}`).toBe(
        false,
      );
    }
  });

  it('every level has a worked solution', () => {
    const missing = LEVELS.filter((l) => !SOLUTIONS[l.id]).map((l) => l.id);
    expect(missing).toEqual([]);
  });

  for (const [id, picture] of Object.entries(SOLUTIONS)) {
    it(`level ${id} is solvable within its wire budget and parts`, () => {
      const level = getLevel(Number(id))!;
      const board = solved(level.id, picture);
      const result = evaluateLevel(level, board);
      expect(result.goals.filter((g) => !g.met).map((g) => g.goal)).toEqual([]);
      expect(result.problem).toBeNull();
      expect(result.overBudget).toBe(false);
      if (level.wireBudget !== null) expect(wireCount(board)).toBeLessThanOrEqual(level.wireBudget);
      expect(Object.values(remainingParts(level, board)).every((n) => (n ?? 0) >= 0)).toBe(true);
      expect(result.complete).toBe(true);
    });
  }

  it('level 3 (repair) is solved by cutting the short and flipping the LED', () => {
    const level = getLevel(3)!;
    let board = createLevelBoard(level);
    expect(evaluateLevel(level, board).problem).toBe('short');
    board = eraseWire(board, 2 * 5 + 0); // the wire making the short
    const ledCell = 2 * 5 + 3;
    board = rotateAt(rotateAt(board, ledCell), ledCell);
    expect(evaluateLevel(level, board).complete).toBe(true);
  });

  it('chapter 1: the obvious wrong answers fail', () => {
    // Level 4: the 220 Ω resistor is too bright for "dim".
    const tooBright = solved(
      4,
      SOLUTIONS[4]!.map((r) => r.replace('R1000', 'R220 ')),
    );
    expect(evaluateLevel(getLevel(4)!, tooBright).complete).toBe(false);
    // Level 6: one 220 Ω resistor isn't bright enough.
    expect(
      check(6, [
        '.  . .    . .',
        '┌  ─ R220 ─ ┐',
        'B^ . .    . Lv',
        '└  ─ ─    ─ ┘',
        '.  . .    . .',
      ]).complete,
    ).toBe(false);
    // Level 7: the short way puts B in series with A, so neither lights.
    const trap = check(7, [
      '.  . .    . .',
      '┌  ─ L>   ─ ┐',
      'B^ . .    . Lv',
      '└  ─ R220 ─ ┘',
      '.  . .    . .',
    ]);
    expect(trap.goals[0]!.met).toBe(false);
  });
});

describe('chapter 2: colours', () => {
  it('2-1: only the 220 Ω resistor gives green a medium glow', () => {
    for (const r of ['R100', 'R470']) {
      expect(
        check(
          11,
          SOLUTIONS[11]!.map((row) => row.replace('R220', r)),
        ).complete,
        r,
      ).toBe(false);
    }
  });

  it('2-2: a resistor makes blue dim; no resistor is bright and safe', () => {
    const withResistor = check(12, [
      '. .  .    .   .',
      '. ┌  R100 ┐   .',
      '. B^ .    Lbv .',
      '. └  ─    ┘   .',
      '. .  .    .   .',
    ]);
    expect(withResistor.goals[0]!.met).toBe(false);
  });

  it('2-3: a shared resistor starves blue; none at all burns red', () => {
    const shared = check(13, [
      '.  .    .  . .',
      '┌  R100 ┬  ─ ┐',
      'B^ .    Lv . Lbv',
      '│  .    │  . │',
      '└  ─    ┴  ─ ┘',
    ]);
    expect(shared.goals.map((g) => g.met)).toEqual([true, false]);
    const none = check(
      13,
      SOLUTIONS[13]!.map((r) => r.replace('R100v', '│    ')),
    );
    expect(none.problem).toBe('burn');
    // Resistor on the blue side instead: red burns.
    const wrongSide = check(13, [
      '.  . .  . .',
      '┌  ─ ┬  ─ ┐',
      'B^ . Lv . Lbv',
      '│  . │  . R100v',
      '└  ─ ┴  ─ ┘',
    ]);
    expect(wrongSide.problem).toBe('burn');
  });

  it('2-4: swapping the red and green resistors misses both bands', () => {
    const swapped = check(14, [
      '.  . .     . .     .',
      '┌  ─ ┬     ─ ┬     ┐',
      'B^ . Lv    . Lgv   Lbv',
      '│  . R220v . R100v │',
      '└  ─ ┴     ─ ┴     ┘',
    ]);
    expect(swapped.goals.map((g) => g.met)).toEqual([false, false, true]);
  });

  it('2-5: green sharing red’s resistor is too faint, even once blue is freed', () => {
    const level = getLevel(15)!;
    const start = evaluateLevel(level, createLevelBoard(level));
    expect(start.goals.map((g) => g.met)).toEqual([true, false, false]);
    // Quick fix: give blue its own path from the battery, leave red and green sharing.
    const blueFreed = check(15, [
      '┌  ─    ─  ─   ┐',
      '├  R100 ┬  ┐   │',
      'B^ .    Lv Lgv Lbv',
      '└  ─    ┴  ┴   ┘',
      '.  .    .  .   .',
    ]);
    expect(blueFreed.goals.map((g) => g.met)).toEqual([true, false, true]);
    const result = simulate(parseBoard(level.board));
    const leds = result.tiles.filter((t) => t?.kind === 'led');
    expect(leds.map((t) => t!.status)).toEqual(['OK', 'OK', 'OFF']); // green faint, blue dark
    expect(leds[1]!.brightness).toBeLessThan(0.1);
  });

  it('2-6: separate resistors light red AND green; a 100 Ω shared one lets green glow', () => {
    // Each LED fed through its own resistor: switch ON lights both.
    const separate = check(16, [
      '┌  ─    ─   ─ ┐',
      '├  R220 ┐   . R100v',
      'B^ .    Lv  . Lgv',
      '│  .    S0v . │',
      '└  ─    ┴   ─ ┘',
    ]);
    expect(separate.goals.map((g) => g.met)).toEqual([false, true]);
    const shared100 = check(
      16,
      SOLUTIONS[16]!.map((r) => r.replace('R220', 'R100')),
    );
    expect(shared100.goals.map((g) => g.met)).toEqual([false, true]);
  });

  it('2-7: red burns without its resistor; swapped resistors leave red too dim', () => {
    const bare = check(
      17,
      SOLUTIONS[17]!.map((r) => r.replace('R100v', '│    ')),
    );
    expect(bare.problem).toBe('burn');
    const swapped = check(
      17,
      SOLUTIONS[17]!.map((r) => r.replace('R100v', 'R220v').replace('R220 ', 'R100 ')),
    );
    expect(swapped.goals.map((g) => g.met)).toEqual([true, true, false, false]);
  });

  it('2-8: with 100 Ω, green still glows faintly while red is on', () => {
    const r100 = check(
      18,
      SOLUTIONS[18]!.map((r) => r.replace('R220', 'R100')),
    );
    expect(r100.goals.map((g) => g.met)).toEqual([false, true, true]);
  });
});

describe('chapter 3: power up', () => {
  it('3-1: one battery is not enough; a backwards one cancels; no resistor burns', () => {
    const one = SOLUTIONS[19]!.map((r, y) => (y === 3 ? r.replace('B^', '│ ') : r));
    expect(check(19, one).goals[0]!.met).toBe(false);
    const backwards = SOLUTIONS[19]!.map((r, y) => (y === 3 ? r.replace('B^', 'Bv') : r));
    expect(check(19, backwards).goals[0]!.met).toBe(false);
    const noResistor = SOLUTIONS[19]!.map((r) => r.replace('R220', '─   '));
    expect(check(19, noResistor).problem).toBe('burn');
  });

  it('3-2: three LEDs on 3 V stay dark', () => {
    const single = SOLUTIONS[20]!.map((r, y) => (y === 3 ? r.replace('B^', '│ ') : r));
    expect(check(20, single).goals[0]!.met).toBe(false);
  });

  it('3-3: one or two 100 Ω resistors burn the LED on 9 V', () => {
    for (const row of ['┌   R100 ─    ─    ┐', '┌   R100 R100 ─    ┐']) {
      const picture = SOLUTIONS[21]!.map((r, y) => (y === 1 ? row : r));
      expect(check(21, picture).problem).toBe('burn');
    }
  });

  it('3-4: fixing only some of the faults is not enough', () => {
    const level = getLevel(22)!;
    const start = createLevelBoard(level);
    const battery = 3 * 5 + 1;
    const led = 2 * 5 + 3;
    const flipBattery = rotateAt(rotateAt(start, battery), battery);
    const flipBoth = rotateAt(rotateAt(flipBattery, led), led);
    expect(evaluateLevel(level, flipBattery).complete).toBe(false);
    expect(evaluateLevel(level, flipBoth).complete).toBe(false); // still the 1 kΩ: too dim
    const result = simulate(parseBoard(level.board));
    expect(result.batteryCurrent).toBeCloseTo(0, 6); // the batteries cancel
  });

  it('3-5: with no resistor (or 220 Ω) the switch spoils one of the states', () => {
    const none = check(
      23,
      SOLUTIONS[23]!.map((r) => r.replace('R100', '─   ')),
    );
    expect(none.problem).toBe('burn');
    const r220 = check(
      23,
      SOLUTIONS[23]!.map((r) => r.replace('R100', 'R220')),
    );
    expect(r220.goals.map((g) => g.met)).toEqual([false, true]);
  });

  it('3-6: on 3 V the four LEDs cannot all be bright', () => {
    // Best effort on one battery: blue direct, red on 100 Ω, red + green sharing 220 Ω.
    const oneBattery = check(24, [
      '.  . .     .     .   .',
      '┌  ─ ┬     ┬     ┬   ┐',
      'B^ . Lv    Lv    Lgv Lbv',
      '│  . R100v R220v │   │',
      '│  . │     │     │   │',
      '└  ─ ┴     ┴     ┴   ┘',
    ]);
    expect(oneBattery.complete).toBe(false);
  });

  it('3-7: blue across the whole 6 V burns', () => {
    const fullStack = check(25, [
      '┌ ┬  R220 ─   ─ ┐',
      '│ B^ .    .   . Lv',
      '│ │  .    .   . Lv',
      '│ B^ .    Lbv . │',
      '└ ┴  ─    ┴   ─ ┘',
    ]);
    expect(fullStack.complete).toBe(false);
  });
});

describe('chapter 4: twist', () => {
  const twists = LEVELS.filter((l) => l.twist);
  /** The level's picture as the player must turn it back to: all pieces locked. */
  const drawn = (level: LevelDef) => {
    const board = parseBoard(level.board);
    return fromEngineBoard({
      ...board,
      cells: board.cells.map((t) => (t ? { ...t, locked: true } : null)),
    });
  };

  it('has twist levels', () => expect(twists.length).toBeGreaterThan(0));

  for (const level of twists) {
    it(`${levelNumber(level.id)} turns back into its solved picture`, () => {
      expect(evaluateLevel(level, drawn(level)).complete).toBe(true);
      const start = createLevelBoard(level);
      const goal = drawn(level);
      start.cells.forEach((placed, i) => {
        const want = goal.cells[i]!;
        if (!placed) return expect(want).toBeNull();
        expect(placed.tile.locked).toBe(true);
        if (!placed.tile.spin) return expect(placed.tile.rotation).toBe(want.tile.rotation);
        // Some number of taps turns the piece back to its solved ports.
        let state = start;
        const reachable = [0, 1, 2, 3].some(() => {
          state = rotateAt(state, i);
          return (
            getPorts(state.cells[i]!.tile).join() === getPorts(want.tile).join() &&
            (want.tile.kind !== 'led' || state.cells[i]!.tile.rotation === want.tile.rotation)
          );
        });
        expect(reachable, `cell ${i}`).toBe(true);
      });
    });

    it(`${levelNumber(level.id)} is not solved by random turning`, () => {
      const start = createLevelBoard(level);
      let seed = level.id;
      const random = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
      let wins = 0;
      for (let k = 0; k < 300; k++) {
        let state = start;
        start.cells.forEach((p, i) => {
          if (!p?.tile.spin) return;
          for (let n = Math.floor(random() * 4); n > 0; n--) state = rotateAt(state, i);
        });
        if (evaluateLevel(level, state).complete) wins++;
      }
      expect(wins).toBeLessThan(6); // under 2 %
    });
  }

  it('twist pieces turn on tap but cannot be erased', () => {
    const level = getLevel(26)!;
    const start = createLevelBoard(level);
    const wire = start.cells.findIndex((p) => p?.tile.kind === 'wire');
    expect(eraseWire(start, wire)).toBe(start);
    expect(rotateAt(start, wire)).not.toBe(start);
    const battery = start.cells.findIndex((p) => p?.tile.kind === 'battery');
    expect(rotateAt(start, battery)).toBe(start);
  });
});

describe('goal text', () => {
  it('describes goals in plain English', () => {
    const l10 = getLevel(10)!;
    const names10 = ledNamesFor(l10);
    expect(describeGoal(l10.goals[0]!, names10, 2)).toBe(
      'Light the LED at medium brightness when S1 and S2 are ON',
    );
    expect(describeGoal(l10.goals[1]!, names10, 2)).toBe('Keep the LED dark when only S1 is ON');
    expect(describeGoal(getLevel(8)!.goals[1]!, ledNamesFor(getLevel(8)!), 1)).toBe(
      'Keep the LED dark when the switch is OFF',
    );
    expect(describeGoal(getLevel(7)!.goals[1]!, ledNamesFor(getLevel(7)!), 0)).toBe('Keep B dark');
  });

  it('names LEDs by colour when that is unambiguous', () => {
    const stopGo = getLevel(16)!;
    const names = ledNamesFor(stopGo);
    expect(describeGoal(stopGo.goals[0]!, names, 1)).toBe(
      'Light only the red LED when the switch is ON',
    );
    const middle = getLevel(25)!;
    expect(ledNamesFor(middle)).toEqual({ A: 'A', B: 'B', C: 'the blue LED' });
    expect(describeGoal(middle.goals[0]!, ledNamesFor(middle), 0)).toBe('Light every LED brightly');
    expect(describeGoal(getLevel(24)!.goals[0]!, {}, 0)).toBe('Light all 4 LEDs brightly');
  });
});

describe('diodes', () => {
  it('conduct one way and block the other', () => {
    const forward = simulate(parseBoard(['┌  D>   ┐', 'B^ .    Lv', '└  R100 ┘']));
    const backward = simulate(parseBoard(['┌  D<   ┐', 'B^ .    Lv', '└  R100 ┘']));
    expect(forward.tiles[5]!.status).toBe('OK');
    expect(forward.tiles[5]!.brightness).toBeGreaterThan(0.05);
    expect(backward.tiles[1]!.status).toBe('REVERSED');
    expect(backward.tiles[5]!.status).toBe('OFF');
  });

  it('are the only way to solve the Doorbell: a plain wire lights both lamps from S2', () => {
    const level = getLevel(37)!;
    const withWire = level.solution!.map((row) => row.replace('Dv', '│ '));
    expect(check(37, level.solution!).complete).toBe(true);
    expect(check(37, withWire).complete).toBe(false);
  });
});

describe('diode side jobs', () => {
  it('Lamp Test: plain wires let each lamp’s switch light the other', () => {
    const wired = getLevel(54)!.solution!.map((r) => r.replace('D^', '│ ').replace('Dv', '│ '));
    expect(check(54, wired).goals.map((g) => g.met)).toEqual([false, false, true, true]);
  });

  it('Turn It Up: diodes pointing down turn the bar graph upside down', () => {
    const down = getLevel(55)!.solution!.map((r) => r.replaceAll('D^', 'Dv'));
    expect(check(55, down).complete).toBe(false);
    const wired = getLevel(55)!.solution!.map((r) => r.replaceAll('D^', '│ '));
    expect(check(55, wired).goals[0]!.met).toBe(false);
  });
});

describe('changeover switches (chapter 5)', () => {
  it('the staircase needs both travellers', () => {
    // Cut the top traveller: one combination of the switches can no longer reach the lamp.
    const cut = getLevel(39)!.solution!.map((row, y) => (y === 0 ? '.  .  . .  .    .   .' : row));
    expect(check(39, cut).complete).toBe(false);
  });

  it('Low and High: the resistors on the wrong legs swap dim and bright', () => {
    const swapped = getLevel(40)!.solution!.map((row) =>
      row.replace('R1000', 'R100X').replace('R100 ', 'R1000').replace('R100X', 'R100 '),
    );
    expect(check(40, swapped).complete).toBe(false);
  });

  it('Back-up Battery: one shared resistor either pops the lamp or leaves it dim', () => {
    // Shared 100 Ω between the lamp and the switch: the 6 V side burns it out.
    const shared = (r: string) => [
      '┌  ─  ─   ─  ─ ─ ─   ┐',
      '│  .  .   ┌  ─ ─ B<  ┤',
      `└  L< ${r} Cu . . .   │`,
      '.  .  .   └  ─ ─ B6< ┘',
    ];
    expect(check(41, shared('R100')).problem).toBe('burn');
    expect(check(41, shared('R220')).complete).toBe(false);
    expect(check(41, getLevel(41)!.solution!).complete).toBe(true);
  });

  it('says UP and DOWN for changeover switches', () => {
    const level = getLevel(39)!;
    expect(describeGoal(level.goals[0]!, ledNamesFor(level), 2, goalWordsFor(level))).toBe(
      'Light the LED when S1 is UP and S2 is DOWN',
    );
  });
});

describe('capacitors (chapter 7)', () => {
  const swap = (id: number, from: string, to: string) => getLevel(id)!.solution!.map((r) => r.replace(from, to));

  it('Light in a Jar: the small jar empties too fast; no jar at all goes dark at once', () => {
    expect(check(47, swap(47, 'C4700v', 'C1000v')).complete).toBe(false);
    const noJar = check(47, swap(47, 'C4700v', '.     '));
    expect(noJar.goals.map((g) => g.met)).toEqual([true, false]);
    expect(noJar.goals[1]!.seconds).toBeLessThan(0.1);
  });

  it('Longer, Please: 100 Ω is too bright and too short, 470 Ω too dim', () => {
    expect(check(48, swap(48, 'R220', 'R100')).goals.map((g) => g.met)).toEqual([false, false]);
    expect(check(48, swap(48, 'R220', 'R470')).goals[0]!.met).toBe(false);
  });

  it('Sunrise: 470 Ω fills the jar too fast; without a jar it snaps on', () => {
    expect(check(49, swap(49, 'R1000', 'R470 ')).complete).toBe(false);
    const snap = check(49, swap(49, 'C4700v', '.     '));
    expect(snap.goals[1]!.seconds).toBeLessThan(0.1);
  });

  it('Two Timers: plain wires let the jars share; swapped jars swap the times', () => {
    const shared = check(50, getLevel(50)!.solution!.map((r) => r.replaceAll('Dv', '│ ')));
    // Sharing, both glow the same in-between time: too long for A, too short for B.
    expect(shared.goals.map((g) => g.met)).toEqual([true, false, false]);
    expect(shared.goals[1]!.seconds).toBeGreaterThan(1.5);
    expect(shared.goals[2]!.seconds).toBeLessThan(3);
    const swapped = check(
      50,
      getLevel(50)!.solution!.map((r) => r.replace('C1000v', 'CXv').replace('C4700v', 'C1000v').replace('CXv', 'C4700v')),
    );
    expect(swapped.complete).toBe(false);
  });

  it('Flash!: the other resistor misses the two seconds', () => {
    expect(check(52, swap(52, 'R100', 'R220')).complete).toBe(false);
  });

  it('describes timed goals', () => {
    const l47 = getLevel(47)!;
    expect(describeGoal(l47.goals[1]!, ledNamesFor(l47), 1, goalWordsFor(l47))).toBe(
      'After the switch goes OFF, keep the LED glowing for at least 1.5 s',
    );
    const l49 = getLevel(49)!;
    expect(describeGoal(l49.goals[1]!, ledNamesFor(l49), 1, goalWordsFor(l49))).toBe(
      'After the switch goes ON, light the LED 1–3 s later',
    );
    const l52 = getLevel(52)!;
    expect(describeGoal(l52.goals[1]!, ledNamesFor(l52), 1, goalWordsFor(l52))).toBe(
      'After the switch flips DOWN, keep the LED glowing for 1.8–2.6 s',
    );
  });
});

describe('meters (chapter 6)', () => {
  it('Reading the Dial: only 220 Ω puts the needle between 5 and 6 mA', () => {
    const with100 = getLevel(42)!.solution!.map((r) => r.replace('R220', 'R100'));
    const with470 = getLevel(42)!.solution!.map((r) => r.replace('R220', 'R470'));
    expect(check(42, with100).complete).toBe(false);
    expect(check(42, with470).complete).toBe(false);
  });

  it('Adding Up: one shared resistor only gives half the current', () => {
    const shared = [
      '┌  R100 ┬  ─    ─  ┐',
      '│  .    │  .    .  Lv',
      'B^ .    │  .    .  │',
      '│  .    └  ─    L> ┤',
      '└  ─    MA ─    ─  ┘',
    ];
    expect(check(43, shared).complete).toBe(false);
  });

  it('Half and Half: unequal resistors miss the middle', () => {
    const uneven = getLevel(44)!.solution!.map((r) => r.replace('R220v', 'R470v'));
    expect(check(44, uneven).complete).toBe(false);
  });

  it('The LED’s Share: 470 Ω is too dim, 100 Ω pops it', () => {
    const dim = getLevel(45)!.solution!.map((r) => r.replace('R220', 'R470'));
    const pop = getLevel(45)!.solution!.map((r) => r.replace('R220', 'R100'));
    expect(check(45, dim).complete).toBe(false);
    expect(check(45, pop).problem).toBe('burn');
  });

  it('describes meter goals in milliamps and volts', () => {
    const l42 = getLevel(42)!;
    const l44 = getLevel(44)!;
    expect(describeGoal(l42.goals[1]!, ledNamesFor(l42), 0, goalWordsFor(l42))).toBe('Make the meter read 5–6 mA');
    expect(describeGoal(l44.goals[0]!, ledNamesFor(l44), 0, goalWordsFor(l44))).toBe('Make the meter read 1.4–1.6 V');
  });
});
