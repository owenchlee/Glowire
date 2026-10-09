// Chapter 3: batteries become parts. Batteries end to end add their voltages; facing each
// other they cancel. More voltage lets LEDs run in strings, turns "safe" resistors
// dangerous, and a wire from between two batteries taps half the voltage.

import type { ChapterDef } from './types';

export const CHAPTER_3: ChapterDef = {
  id: 3,
  title: 'Power Up',
  blurb: 'Stack batteries for more push.',
  levels: [
    {
      id: 19,
      title: "Stack 'Em",
      intro: 'Two LEDs in a row need more than 3 volts. Add another battery!',
      board: ['. .  . .  .', '. .  . .  .', '. B^ . Lv .', '. .  . Lv .', '. .  . .  .'],
      inventory: { battery: 1, r220: 1 },
      wireBudget: 6,
      goals: [{ kind: 'only', leds: ['A', 'B'] }],
      newPart: {
        name: 'Battery',
        token: 'B^',
        text: 'Batteries end to end, + touching −, add up: two 3 V batteries push like 6 V. Turn one the wrong way and they cancel out!',
      },
    },
    {
      id: 20,
      title: 'Daisy Chain',
      intro: 'No resistors this time. Light all three LEDs without popping any.',
      board: ['.  . .  .  .', '.  . .  L> .', 'B^ . .  .  Lv', '.  . .  .  .', '.  . L< .  .'],
      inventory: { battery: 1 },
      wireBudget: 10,
      goals: [{ kind: 'only', leds: ['A', 'B', 'C'] }],
    },
    {
      id: 21,
      title: 'Nine Volts',
      intro: 'A big 9 V battery. Light the LED brightly without burning it out.',
      board: ['.   . . . .', '.   . . . .', 'B9^ . . . Lv', '.   . . . .', '.   . . . .'],
      inventory: { r100: 3 },
      wireBudget: 8,
      goals: [{ kind: 'lit', led: 'A', brightness: 'bright' }],
    },
    {
      id: 22,
      title: 'Tug of War',
      intro: 'This should light both LEDs brightly, but nothing happens. Find all three faults!',
      board: [
        '. .  .     .  .',
        '. ┌  R1000 ┐  .',
        '. B^ .     L^ .',
        '. Bv .     Lv .',
        '. └  ─     ┘  .',
      ],
      loose: true,
      inventory: { battery: 2, led: 2, r220: 1, r1000: 1 },
      wireBudget: 5,
      goals: [{ kind: 'only', leds: ['A', 'B'], brightness: 'bright' }],
    },
    {
      id: 23,
      title: 'Shortcut',
      intro: 'A switch beside an LED can steer the current around it. Mind the others!',
      board: [
        '.   . .  .  .  .',
        '.   . L> L> .  .',
        'B6^ . .  .  Lv S0v',
        '.   . .  .  .  .',
        '.   . .  .  .  .',
      ],
      inventory: { r100: 1, r220: 1 },
      wireBudget: 10,
      goals: [
        { kind: 'only', leds: ['A', 'B', 'C'], brightness: 'medium', when: {} },
        { kind: 'only', leds: ['A', 'B'], brightness: 'bright', when: { S1: true } },
      ],
    },
    {
      id: 24,
      title: 'Party Lights',
      intro: 'Place all four LEDs and make every one shine brightly. Two resistors won’t go far…',
      board: [
        '.  . . . . .',
        '.  . . . . .',
        'B^ . . . . .',
        '.  . . . . .',
        '.  . . . . .',
        '.  . . . . .',
      ],
      inventory: { led: 2, ledGreen: 1, ledBlue: 1, battery: 1, r100: 1, r220: 1 },
      wireBudget: null,
      goals: [{ kind: 'all', count: 4, brightness: 'bright' }],
    },
    {
      id: 25,
      title: 'Middle Ground',
      intro: 'The reds need 6 volts. Blue wants exactly 3. One stack of batteries can do both.',
      board: [
        '. .  . .   . .',
        '. B^ . .   . Lv',
        '. .  . .   . Lv',
        '. .  . Lbv . .',
        '. .  . .   . .',
      ],
      inventory: { battery: 1, r220: 1 },
      wireBudget: 14,
      goals: [{ kind: 'only', leds: ['A', 'B', 'C'], brightness: 'bright' }],
    },
  ],
};
