// Build boards from little text pictures. Used by tests and by level definitions.
import { battery, block, led, resistor, switchTile, wire } from './tiles';
import type { Board, LedColor, Rotation, Tile } from './types';

/**
 * Tokens (space separated, one row per string):
 *   ─ │            straight wires          . empty cell        # blocked cell
 *   ┌ ┐ └ ┘        corners                 ├ ┤ ┬ ┴  tees      ┼ cross
 *   B< B> B^ Bv    3 V battery; the arrow is the way current leaves through + (B< has + on W)
 *   B6^ B9>        battery of another voltage
 *   L> L< Lv L^    red LED; the arrow points anode → cathode (L> has anode on W)
 *   Lg> Lb^        green / blue LED
 *   R100 R100v     resistor, horizontal / vertical
 *   S0 S1 S0v S1v  switch open (0) / closed (1), horizontal / vertical
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
  const sw = /^S([01])(v?)$/.exec(token);
  if (sw) return switchTile(sw[1] === '1', sw[2] ? 1 : 0);
  const r = /^R(\d+)(v?)$/.exec(token);
  if (r) return resistor(Number(r[1]), r[2] ? 1 : 0);
  throw new Error(`unknown token ${token}`);
}
