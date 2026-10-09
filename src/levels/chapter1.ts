// Chapter 1: wires, resistors, brightness, parallel paths and switches. Each level is
// proven solvable (within its limits) by a test in levels.test.ts.

import type { ChapterDef } from './types';

export const CHAPTER_1: ChapterDef = {
  id: 1,
  title: 'First Light',
  blurb: 'Wires, resistors and switches.',
  levels: [
    {
      id: 1,
      title: 'First Light',
      intro:
        'Drag from the battery to draw a wire to the LED and back. Then drop a resistor onto a wire.',
      board: ['. .  . .  .', '. .  . .  .', '. B^ . Lv .', '. .  . .  .', '. .  . .  .'],
      inventory: { r220: 1 },
      wireBudget: null,
      goals: [{ kind: 'lit', led: 'A' }],
      newPart: {
        name: 'Resistor',
        token: 'R220',
        text: 'A resistor slows the current down. Without one, an LED gets too much current and burns out!',
      },
    },
    {
      id: 2,
      title: 'Detour',
      intro: 'A wall is in the way, and wire is limited. Find the shortest way around.',
      board: ['.  . . . .', '.  . # . .', 'B^ . # . Lv', '.  . # . .', '.  . . . .'],
      inventory: { r220: 1 },
      wireBudget: 13,
      goals: [{ kind: 'lit', led: 'A' }],
    },
    {
      id: 3,
      title: 'Repair Shop',
      intro: 'Someone built this circuit wrong. Find the two mistakes and fix them!',
      board: [
        '. .  .    .  .',
        '┌ ┬  R220 ┐  .',
        '│ B^ .    L^ .',
        '└ ┴  ─    ┘  .',
        '. .  .    .  .',
      ],
      loose: true,
      inventory: { r220: 1, led: 1 },
      wireBudget: 8,
      goals: [{ kind: 'lit', led: 'A' }],
    },
    {
      id: 4,
      title: 'Night Light',
      intro: 'Make the LED glow softly. Bigger resistors let less current through.',
      board: ['. .  . .  .', '. .  . .  .', '. B^ . Lv .', '. .  . .  .', '. .  . .  .'],
      inventory: { r100: 1, r220: 1, r1000: 1 },
      wireBudget: 5,
      goals: [{ kind: 'lit', led: 'A', brightness: 'dim' }],
    },
    {
      id: 5,
      title: 'Double Up',
      intro: 'Light both LEDs at medium brightness. One battery, two paths?',
      board: ['.  . .  . .', '.  . .  . .', 'B^ . .  . .', '.  . Lv . Lv', '.  . .  . .'],
      inventory: { r220: 2 },
      wireBudget: 11,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'medium' },
        { kind: 'lit', led: 'B', brightness: 'medium' },
      ],
    },
    {
      id: 6,
      title: 'Brighter Together',
      intro: 'Make the LED shine brightly, but you only have 220 Ω resistors. Can two work as one?',
      board: ['.  . . . .', '.  . . . .', 'B^ . . . Lv', '.  . . . .', '.  . . . .'],
      inventory: { r220: 2 },
      wireBudget: 11,
      goals: [{ kind: 'lit', led: 'A', brightness: 'bright' }],
    },
    {
      id: 7,
      title: 'Decoy',
      intro: 'Light A, but B must stay dark. The short way is a trap!',
      board: ['.  . .  . .', '.  . L> . .', 'B^ . .  . Lv', '.  . .  . .', '.  . .  . .'],
      labels: { A: [4, 2], B: [2, 1] },
      inventory: { r220: 1 },
      wireBudget: 11,
      goals: [
        { kind: 'lit', led: 'A' },
        { kind: 'dark', led: 'B' },
      ],
    },
    {
      id: 8,
      title: 'Light Switch',
      intro: 'Wire it so the switch turns the LED on and off. Tap the switch to test it.',
      board: ['. .  .  .  .', '. .  .  .  .', '. B^ .  Lv .', '. .  S0 .  .', '. .  .  .  .'],
      inventory: { r220: 1 },
      wireBudget: 4,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'dark', led: 'A', when: { S1: false } },
      ],
      newPart: {
        name: 'Switch',
        token: 'S1',
        text: 'Tap a switch to flip it. When it is ON, current flows through. When it is OFF, the path is broken.',
      },
    },
    {
      id: 9,
      title: 'Either Way',
      intro: 'Either switch should turn the LED on. Both off: dark.',
      board: ['.  . S0 . .', '.  . S0 . .', 'B^ . .  . Lv', '.  . .  . .', '.  . .  . .'],
      inventory: { r220: 1 },
      wireBudget: 10,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'lit', led: 'A', when: { S2: true } },
        { kind: 'dark', led: 'A', when: {} },
      ],
    },
    {
      id: 10,
      title: 'Two Keys',
      intro: 'The LED should glow at medium brightness only when BOTH switches are on.',
      board: ['.  . S0 . .', '.  . #  . .', 'B^ . #  . Lv', '.  . #  . .', '.  . S0 . .'],
      inventory: { r100: 2, r1000: 1 },
      wireBudget: 10,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'medium', when: { S1: true, S2: true } },
        { kind: 'dark', led: 'A', when: { S1: true } },
        { kind: 'dark', led: 'A', when: { S2: true } },
      ],
    },
  ],
};
