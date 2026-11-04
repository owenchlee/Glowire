// Build boards from little text pictures. Used by tests and by level definitions.
import { battery, block, capacitor, changeover, diode, led, meter, resistor, switchTile, transistor, wire } from './tiles';
import type { Board, LedColor, Rotation, Tile } from './types';

/**
 * Tokens (space separated, one row per string):
 *   ─ │            straight wires          . empty cell        # blocked cell
 *   ┌ ┐ └ ┘        corners                 ├ ┤ ┬ ┴  tees      ┼ cross
 *   B< B> B^ Bv    3 V battery; the arrow is the way current leaves through + (B< has + on W)
 *   B6^ B9>        battery of another voltage
 *   L> L< Lv L^    red LED; the arrow points anode → cathode (L> has anode on W)
 *   Lg> Lb^        green / blue LED
 *   D> D< Dv D^    diode; the arrow points anode → cathode, the way current may flow
 *   R100 R100v     resistor, horizontal / vertical
 *   S0 S1 S0v S1v  switch open (0) / closed (1), horizontal / vertical
 *   Cu Cd Cu2      changeover switch flipped up / down; common on W, throws N and S, then
 *                  an optional number of quarter turns (Cu2: common on E, throws S and N)
 *   MA MAv MV MVv  ammeter / voltmeter, + on W (horizontal) or N (vertical)
 *   C1000 C4700v   capacitor (microfarads), horizontal / vertical
 *   Q Q1 Q2 Q3     transistor: base W, collector N, emitter S, then quarter turns clockwise
 */
export function parseBoard(rows: string[]): Board {
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const width = grid[0]?.length ?? 0;
  const cells: (Tile | null)[] = [];
  for (const row of grid) {
    if (row.length !== width) throw new Error(`ragged board row: ${row.join(' ')}`);
    for (const token of row) cells.push(parseToken(token));
  }
  return { width, height: grid.length, cells };
}

const ARROW_ROTATION = { '>': 0, v: 1, '<': 2, '^': 3 } as const;
const LED_LETTERS: Record<string, LedColor> = { r: 'red', g: 'green', b: 'blue' };

export function parseToken(token: string): Tile | null {
  switch (token) {
    case '.':
      return null;
    case '#':
      return block();
    case '│':
      return wire('straight', 0);
    case '─':
      return wire('straight', 1);
    case '└':
      return wire('corner', 0);
    case '┌':
      return wire('corner', 1);
    case '┐':
      return wire('corner', 2);
    case '┘':
      return wire('corner', 3);
    case '┬':
      return wire('tee', 0);
    case '┤':
      return wire('tee', 1);
    case '┴':
      return wire('tee', 2);
    case '├':
      return wire('tee', 3);
    case '┼':
      return wire('cross', 0);
  }
  const lb = /^(L[gb]?|B\d*)([<>v^])$/.exec(token);
  if (lb) {
    const [, head, arrow] = lb as unknown as [string, string, keyof typeof ARROW_ROTATION];
    const rot = ARROW_ROTATION[arrow];
    if (head[0] === 'L') return led(rot, LED_LETTERS[head[1] ?? 'r']!);
    // Battery: current leaves + and travels through the part − → +, so "B<" means + on W
    // (rotation 0), the opposite arrow convention to an LED.
    return battery(((rot + 2) % 4) as Rotation, head.length > 1 ? Number(head.slice(1)) : 3);
  }
  const dm = /^D([<>v^])$/.exec(token);
  if (dm) return diode(ARROW_ROTATION[dm[1] as keyof typeof ARROW_ROTATION]);
  const co = /^C([ud])([0-3]?)$/.exec(token);
  if (co) return changeover(co[1] === 'u', Number(co[2] || 0) as Rotation);
  const mt = /^M([AV])(v?)$/.exec(token);
  if (mt) return meter(mt[1] as 'A' | 'V', mt[2] ? 1 : 0);
  const sw = /^S([01])(v?)$/.exec(token);
  if (sw) return switchTile(sw[1] === '1', sw[2] ? 1 : 0);
  const r = /^R(\d+)(v?)$/.exec(token);
  if (r) return resistor(Number(r[1]), r[2] ? 1 : 0);
  const q = /^Q([0-3]?)$/.exec(token);
  if (q) return transistor(Number(q[1] || 0) as Rotation);
  const cap = /^C(\d+)(v?)$/.exec(token);
  if (cap) return capacitor(Number(cap[1]), cap[2] ? 1 : 0);
  throw new Error(`unknown token ${token}`);
}
