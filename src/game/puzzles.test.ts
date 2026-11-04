import { describe, expect, it } from 'vitest';

import { rng } from './games';
import {
  LAMP_OHMS,
  canTurn,
  lampMilliamps,
  lanternRound,
  panelBoard,
  panelSolved,
  pipeBoard,
  pipesSolved,
  powered,
  pressPanel,
  probeReading,
  probeRound,
  turnMask,
  turnPipe,
  type PipeBoard,
} from './puzzles';

describe('Dead Lamp Hunt', () => {
  it('can always be solved by halving the string within the probes', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const random = rng(seed);
      for (let round = 0; round < 8; round++) {
        const r = probeRound(round, random);
        let lo = 0;
        let hi = r.lamps - 1;
        let used = 0;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          used++;
          if (probeReading(r, lo, mid) > 0) hi = mid;
          else lo = mid + 1;
        }
        expect(lo).toBe(r.dead);
        expect(used).toBeLessThanOrEqual(r.probes);
      }
    }
  });

  it('reads full battery voltage across the dead lamp and nothing elsewhere', () => {
    const r = { lamps: 6, dead: 3, probes: 4, volts: 9 };
    expect(probeReading(r, 3, 3)).toBe(9);
    expect(probeReading(r, 0, 2)).toBe(0);
    expect(probeReading(r, 5, 2)).toBe(9);
  });
});

/** Row-major backtracking: each tile only has to agree with the tiles placed before it. */
function solve(b: PipeBoard): PipeBoard | null {
  const agrees = (board: PipeBoard, i: number) => {
    const t = board.tiles[i]!;
    const x = i % board.w;
    const y = Math.floor(i / board.w);
    if (y === 0 && t.mask & 1) return false;
    if (x === 0 && t.mask & 8) return false;
    if (x === board.w - 1 && t.mask & 2) return false;
    if (y === board.h - 1 && t.mask & 4) return false;
    if (y > 0 && !!(t.mask & 1) !== !!(board.tiles[i - board.w]!.mask & 4)) return false;
    if (x > 0 && !!(t.mask & 8) !== !!(board.tiles[i - 1]!.mask & 2)) return false;
    return true;
  };
  const rec = (board: PipeBoard, i: number): PipeBoard | null => {
    if (i >= board.tiles.length) return pipesSolved(board) ? board : null;
    let cur = board;
    const turns = canTurn(board.tiles[i]!) ? 4 : 1;
    for (let k = 0; k < turns; k++) {
      if (agrees(cur, i)) {
        const hit = rec(cur, i + 1);
        if (hit) return hit;
      }
      cur = turnPipe(cur, i);
    }
    return null;
  };
  return rec(b, 0);
}

describe('Dockyard Wiring', () => {
  it('starts scrambled, has a battery and lamps, and can be solved', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const random = rng(seed);
      for (let round = 0; round < 6; round++) {
        const b = pipeBoard(round, random);
        expect(pipesSolved(b)).toBe(false);
        expect(b.tiles.filter((t) => t.kind === 'battery')).toHaveLength(1);
        expect(b.tiles.some((t) => t.kind === 'lamp')).toBe(true);
        expect(b.par).toBeGreaterThan(0);
        expect(solve(b)).not.toBeNull();
      }
    }
  });

  it('keeps diodes bolted down', () => {
    const b = pipeBoard(4, rng(7));
    const diodes = b.tiles.map((t, i) => ({ t, i })).filter(({ t }) => t.kind === 'diode');
    expect(diodes.length).toBeGreaterThan(0);
    for (const { t, i } of diodes) {
      expect(canTurn(t)).toBe(false);
      expect(turnPipe(b, i)).toBe(b);
    }
  });

  it('a backwards diode blocks power and a forwards one passes it', () => {
    const E = 2;
    const W = 8;
    const board: PipeBoard = {
      w: 3,
      h: 1,
      par: 0,
      tiles: [
        { kind: 'battery', mask: E },
        { kind: 'diode', mask: E | W, flow: W },
        { kind: 'lamp', mask: W },
      ],
    };
    expect(pipesSolved(board)).toBe(false);
    board.tiles[1] = { kind: 'diode', mask: E | W, flow: E };
    expect(pipesSolved(board)).toBe(true);
    expect(powered(board)).toEqual([true, true, true]);
  });

  it('turning four times comes back round', () => {
    expect(turnMask(turnMask(turnMask(turnMask(1))))).toBe(1);
  });
});

describe('Clock Panel', () => {
  it('is always scrambled', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const random = rng(seed);
      for (let round = 0; round < 6; round++) {
        const p = panelBoard(round, random);
        expect(panelSolved(p)).toBe(false);
        expect(p.par).toBeGreaterThan(0);
      }
    }
  });

  it('flips a cell and its neighbours, and pressing twice undoes it', () => {
    const on = new Array<boolean>(9).fill(true);
    const after = pressPanel(3, on, 4);
    expect(after.filter((v) => !v)).toHaveLength(5);
    expect(pressPanel(3, after, 4)).toEqual(on);
  });

  it('flips only what is on the board at a corner', () => {
    const after = pressPanel(3, new Array<boolean>(9).fill(true), 0);
    expect(after.filter((v) => !v)).toHaveLength(3);
  });
});

describe('Lantern Budget', () => {
  it('always has one clearly brightest rig', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const random = rng(seed);
      for (let round = 0; round < 10; round++) {
        const { rigs, best } = lanternRound(round, random);
        const ma = rigs.map(lampMilliamps);
        const others = ma.filter((_, i) => i !== best);
        expect(ma[best]!).toBeGreaterThanOrEqual(Math.max(...others) * 1.15);
      }
    }
  });

  it('knows a parallel resistor does not dim the lamp', () => {
    expect(lampMilliamps({ kind: 'parallel', volts: 6, ohms: 47 })).toBeCloseTo((6 / LAMP_OHMS) * 1000);
    expect(lampMilliamps({ kind: 'twin', volts: 6, ohms: 0 })).toBeCloseTo(30);
  });
});
