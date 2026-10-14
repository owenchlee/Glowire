// The board's circuit as it is right now. Without capacitors that's just the settled
// circuit; with them, time matters (a capacitor fills and empties), so the circuit is
// stepped forward every frame and each capacitor keeps its charge, even when it's moved.

import { useEffect, useMemo, useRef, useState } from 'react';

import { type BoardState, toEngineBoard } from '../board/board';
import { type Charges, type SimulationResult, hasCapacitors, stepCircuit } from '../engine';

/** What the player can see of a result, rounded, so frames that look the same don't re-render. */
function looks(result: SimulationResult): string {
  return result.tiles
    .map((t) => (t ? `${t.status}${Math.round(t.brightness * 40)}:${Math.round(t.voltage * 20)}:${Math.round(t.current * 4000)}` : ''))
    .join('|');
}

export function useLiveCircuit(board: BoardState, steady: SimulationResult): SimulationResult {
  const timed = useMemo(() => hasCapacitors(toEngineBoard(board)), [board]);
  const [live, setLive] = useState<SimulationResult | null>(null);
  const now = useRef(board);
  useEffect(() => {
    now.current = board;
  }, [board]);

  useEffect(() => {
    if (!timed) return;
    // Charge by tile id, so a capacitor carried to another cell takes its charge with it.
    let charges = new Map<number, number>();
    let shown = '';
    let last = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Date.now();
      const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000));
      last = t;
      const b = now.current;
      const byCell: Charges = {};
      b.cells.forEach((p, cell) => {
        if (p?.tile.kind === 'capacitor') byCell[cell] = charges.get(p.id) ?? 0;
      });
      const step = stepCircuit(toEngineBoard(b), byCell, dt);
      const next = new Map<number, number>();
      b.cells.forEach((p, cell) => {
        if (p?.tile.kind === 'capacitor') next.set(p.id, step.charges[cell] ?? 0);
      });
      charges = next;
      const look = looks(step.result);
      if (look !== shown) {
        shown = look;
        setLive(step.result);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timed]);

  return timed && live && live.tiles.length === board.cells.length ? live : steady;
}
