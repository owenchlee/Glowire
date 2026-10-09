// Chapter 4: twist puzzles. A new format on the same board: every piece is already in
// place, turned the wrong way, and the player can only turn pieces (no drawing, no tray).
// Each board below is the SOLVED picture; createLevelBoard shuffles it from `seed`, so
// every twist level is solvable by construction. Decoy pieces tempt shorts and bypasses.

import type { ChapterDef } from './types';

export const CHAPTER_4: ChapterDef = {
  id: 4,
  title: 'Twist',
  blurb: 'Everything’s here. Just turn it.',
  levels: [
    {
      id: 26,
      title: 'Turn, Turn',
      intro: 'Tap the pieces to turn them until the loop is closed.',
      board: ['┌  R220 ┐', 'B^ .    Lv', '└  ─    ┘'],
      twist: { seed: 7 },
      inventory: {},
      wireBudget: null,
      goals: [{ kind: 'lit', led: 'A' }],
      newPart: {
        name: 'Twist',
        token: '┌',
        text: 'In twist puzzles every piece is already on the board, just turned the wrong way. Tap a piece to turn it. No drawing allowed!',
      },
    },
    {
      id: 27,
      title: 'Both Ways',
      intro: 'Two LEDs on 6 volts. Every LED has to face along the loop.',
      board: ['┌   R220 ─ ┐', 'B6^ .    . Lv', '│   .    . Lv', '└   ─    ─ ┘'],
      twist: { seed: 3 },
      inventory: {},
      wireBudget: null,
      goals: [{ kind: 'only', leds: ['A', 'B'] }],
    },
    {
      id: 28,
      title: 'No Shortcuts',
      intro: 'One wrong turn and the current skips the LED entirely.',
      board: ['┌  ┬ R220 ┐', 'B^ ─ ┌    Lv', '└  ┴ ─    ┘'],
      twist: { seed: 11 },
      inventory: {},
      wireBudget: null,
      goals: [{ kind: 'lit', led: 'A' }],
    },
    {
      id: 29,
      title: 'Off Switch',
      intro: 'The switch must turn the LED on and off. Watch out for the path around it!',
      board: ['┌  R220 ┐', 'B^ .    Lv', '├  S0   ┤', '┌  ─    ┐'],
      twist: { seed: 5 },
      inventory: {},
      wireBudget: null,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'dark', led: 'A', when: {} },
      ],
    },
    {
      id: 30,
      title: 'Signal Box',
      intro: 'Switch ON: red only. Switch OFF: green only. Remember who hogs the current?',
      board: ['┌  R220 ┬   ┐', 'B^ ┌    Lv  Lgv', '│  ┘    S0v │', '└  ─    ┴   ┘'],
      twist: { seed: 21 },
      inventory: {},
      wireBudget: null,
      goals: [
        { kind: 'only', leds: ['A'], when: { S1: true } },
        { kind: 'only', leds: ['B'], when: {} },
      ],
    },
    {
      id: 31,
      title: 'Two Roads',
      intro: 'Either switch lights the LED; both off, it is dark. Not every piece belongs.',
      board: ['┐  ┌ S0   ┐ ┌', '┌  ┴ S0   ┴ ┐', 'B^ ┐ ─    ┌ Lv', '└  ┴ R220 ┴ ┘', '.  └ ─    ┘ .'],
      twist: { seed: 42 },
      inventory: {},
      wireBudget: null,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'lit', led: 'A', when: { S2: true } },
        { kind: 'dark', led: 'A', when: {} },
      ],
    },
  ],
};
