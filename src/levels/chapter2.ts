// Chapter 2: green and blue LEDs. Colours differ in the voltage they need (red ≈ 2.0 V,
// green ≈ 2.2 V, blue ≈ 3.0 V), which gives three true surprises: blue needs no resistor
// on 3 V, the lowest-voltage LED hogs a shared resistor, and that hogging can be used
// to switch between colours. Everything runs on one 3 V battery.

import type { ChapterDef } from './types';

export const CHAPTER_2: ChapterDef = {
  id: 2,
  title: 'Colours',
  blurb: 'Every colour needs a different push.',
  levels: [
    {
      id: 11,
      title: 'Go Green',
      intro: 'Light the green LED at medium brightness. Which resistor is just right?',
      board: ['. .  . .   .', '. .  . .   .', '. B^ . Lgv .', '. .  . .   .', '. .  . .   .'],
      inventory: { r100: 1, r220: 1, r470: 1 },
      wireBudget: 5,
      goals: [{ kind: 'lit', led: 'A', brightness: 'medium' }],
      newPart: {
        name: 'Green LED',
        token: 'Lg>',
        text: 'Green LEDs need a little more voltage than red ones, so the same resistor lets a little less current through.',
      },
    },
    {
      id: 12,
      title: 'Feeling Blue',
      intro: 'Make the blue LED shine brightly.',
      board: ['. .  . .   .', '. .  . .   .', '. B^ . Lbv .', '. .  . .   .', '. .  . .   .'],
      inventory: { r100: 1 },
      wireBudget: 6,
      goals: [{ kind: 'lit', led: 'A', brightness: 'bright' }],
      newPart: {
        name: 'Blue LED',
        token: 'Lb>',
        text: 'Blue LEDs need about 3 volts just to start glowing. That is nearly everything a 3 V battery has. Does that change the rules?',
      },
    },
    {
      id: 13,
      title: 'Each Their Own',
      intro: 'Light both LEDs brightly. Watch what happens when they share a resistor.',
      board: ['.  . .  . .', '.  . .  . .', 'B^ . Lv . Lbv', '.  . .  . .', '.  . .  . .'],
      inventory: { r100: 1 },
      wireBudget: 12,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'bright' },
        { kind: 'lit', led: 'B', brightness: 'bright' },
      ],
    },
    {
      id: 14,
      title: 'Rainbow',
      intro: 'Three colours, three paths. Give each one exactly what it needs.',
      board: [
        '.  . .  . .   .',
        '.  . .  . .   .',
        'B^ . Lv . Lgv Lbv',
        '.  . .  . .   .',
        '.  . .  . .   .',
      ],
      inventory: { r100: 1, r220: 1 },
      wireBudget: null,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'bright' },
        { kind: 'lit', led: 'B', brightness: 'medium' },
        { kind: 'lit', led: 'C', brightness: 'bright' },
      ],
    },
    {
      id: 15,
      title: 'Colour Blind',
      intro:
        'Someone hung every colour on one resistor. Red is fine, green barely glows, blue is dark. Fix it!',
      board: [
        '.  .    .  .   .',
        '┌  R100 ┬  ┬   ┐',
        'B^ .    Lv Lgv Lbv',
        '└  ─    ┴  ┴   ┘',
        '.  .    .  .   .',
      ],
      loose: true,
      inventory: { r100: 1, r220: 1 },
      wireBudget: 13,
      goals: [
        { kind: 'lit', led: 'A' },
        { kind: 'lit', led: 'B', brightness: 'medium' },
        { kind: 'lit', led: 'C' },
      ],
    },
    {
      id: 16,
      title: 'Stop & Go',
      intro: 'Switch ON: red only. Switch OFF: green only. Can one switch do both?',
      board: ['.  . .   . .', '.  . .   . .', 'B^ . Lv  . Lgv', '.  . S0v . .', '.  . .   . .'],
      inventory: { r100: 1, r220: 1 },
      wireBudget: 12,
      goals: [
        { kind: 'only', leds: ['A'], when: { S1: true } },
        { kind: 'only', leds: ['B'], when: {} },
      ],
    },
    {
      id: 17,
      title: 'Dimmer Switch',
      intro: 'The switch should turn the blue LED from dim to bright, and red must stay bright.',
      board: [
        '.  . .  . S0 .',
        '.  . .  . .  .',
        'B^ . Lv . .  Lbv',
        '.  . .  . .  .',
        '.  . .  . .  .',
      ],
      inventory: { r100: 1, r220: 1 },
      wireBudget: 16,
      goals: [
        { kind: 'lit', led: 'B', brightness: 'dim', when: {} },
        { kind: 'lit', led: 'B', brightness: 'bright', when: { S1: true } },
        { kind: 'lit', led: 'A', brightness: 'bright', when: {} },
        { kind: 'lit', led: 'A', brightness: 'bright', when: { S1: true } },
      ],
    },
    {
      id: 18,
      title: 'Pecking Order',
      intro: 'Red beats green, green beats blue. Build a light that shows only the winner.',
      board: [
        '.  . .   .   . .',
        '.  . .   .   . .',
        'B^ . Lv  Lgv . Lbv',
        '.  . S0v S0v . .',
        '.  . .   .   . .',
      ],
      inventory: { r100: 1, r220: 1 },
      wireBudget: 14,
      goals: [
        { kind: 'only', leds: ['A'], when: { S1: true, S2: true } },
        { kind: 'only', leds: ['B'], when: { S2: true } },
        { kind: 'only', leds: ['C'], when: {} },
      ],
    },
  ],
};
