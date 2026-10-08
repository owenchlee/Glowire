import { describe, expect, it } from 'vitest';

import { buildCircuit } from './circuit';
import { solveNetlist } from './mna';
import { simulate } from './simulate';
import { randomBoard, rng } from './test-helpers';
import { neighbourIndex, opposite } from './tiles';
import { DIRECTIONS } from './types';

describe('10. Kirchhoff current law on random boards', () => {
  const rand = rng(12345);
  const boards = Array.from({ length: 400 }, (_, i) => randomBoard(rand, i % 4 === 0 ? 7 : 5));

  it('current in equals current out at every circuit node', () => {
    let live = 0;
    for (const board of boards) {
      const circuit = buildCircuit(board);
      const sol = solveNetlist(circuit);
      expect(sol.converged).toBe(true);
      const net = new Float64Array(circuit.nodeCount);
      let scale = 1e-3;
      circuit.elements.forEach((el, i) => {
        const I = sol.currents[i] ?? NaN;
        expect(Number.isFinite(I)).toBe(true);
        net[el.a] = (net[el.a] ?? 0) - I;
        net[el.b] = (net[el.b] ?? 0) + I;
        scale = Math.max(scale, Math.abs(I));
      });
      for (const v of net) expect(Math.abs(v)).toBeLessThan(1e-9 * scale);
      if (sol.currents.some((I) => Math.abs(I) > 1e-4)) live++;
    }
    // Make sure the test isn't vacuous.
    expect(live).toBeGreaterThan(50);
  });

  it('every tile conserves current, and neighbours agree across shared edges', () => {
    for (const board of boards) {
      const result = simulate(board);
      result.tiles.forEach((t, cell) => {
        if (!t) return;
        const flows = Object.values(t.portCurrents);
        const total = flows.reduce((s, I) => s + I, 0);
        const scale = Math.max(1e-3, ...flows.map(Math.abs));
        expect(Math.abs(total)).toBeLessThan(1e-9 * scale);
        for (const d of DIRECTIONS) {
          const I = t.portCurrents[d];
          if (I === undefined) continue;
          const back = result.tiles[neighbourIndex(board, cell, d)]?.portCurrents[opposite(d)];
          if (back !== undefined) expect(Math.abs(I + back)).toBeLessThan(1e-9 * scale);
        }
      });
    }
  });
});
