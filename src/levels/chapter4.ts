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
      job: {
        client: 'lumen',
        place: 'The clock face',
        building: 'clock',
        ask: 'My clock face lamp is all twisted around. Turn the pieces back until the circle is closed.',
        thanks: 'There’s my clock face! Hello, old friend.',
      },
      tip: 'Start at the battery’s + and turn each piece so it points at the next one.',
      stars: [
        { kind: 'turns', max: 17 },
        { kind: 'turns', max: 11 },
      ],
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
      brain: { game: 'pipes', seed: 2255 },
      title: 'Both Ways',
      job: {
        client: 'lumen',
        place: 'The bell lamps',
        building: 'clock',
        ask: 'Two lamps light the bells, but the pieces are twisted. Turn the pipes until power reaches every lamp. LEDs only work one way round, so watch the arrows!',
        thanks: 'The bells are lit, and so is the whole tower. Well turned!',
      },
      tip: 'Diodes and LEDs only pass current one way. Turn the other tiles until the path follows the arrows.',
      stars: [
        { kind: 'turns', max: 27 },
        { kind: 'turns', max: 18 },
      ],
      intro: 'LEDs only work one way round. Turn the pipes so the power reaches every lamp, and mind the diodes.',
      board: ['┌   R220 ─ ┐', 'B6^ .    . Lv', '│   .    . Lv', '└   ─    ─ ┘'],
      twist: { seed: 3 },
      inventory: {},
      wireBudget: null,
      goals: [{ kind: 'only', leds: ['A', 'B'] }],
    },
    {
      id: 28,
      title: 'No Shortcuts',
      job: {
        client: 'lumen',
        place: 'The pendulum lamp',
        building: 'clock',
        ask: 'The pendulum lamp. Careful: one wrong turn and the current skips the lamp altogether.',
        thanks: 'Tick, tock, glow. Marvellous.',
      },
      tip: 'A crossing piece can join the top of the loop to the bottom. Make sure it doesn’t.',
      stars: [
        { kind: 'turns', max: 30 },
        { kind: 'turns', max: 20 },
      ],
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
      job: {
        client: 'lumen',
        place: 'The tower stairs',
        building: 'clock',
        ask: 'The stair lamp needs its switch back. And watch out for the sneaky path around it!',
        thanks: 'Now I can find my way to bed. Thank you, apprentice.',
      },
      tip: 'If any path skips the switch, the switch can’t turn the lamp off.',
      stars: [
        { kind: 'turns', max: 23 },
        { kind: 'turns', max: 15 },
      ],
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
      job: {
        client: 'lumen',
        place: 'The hill railway signal',
        building: 'signal',
        ask: 'The old railway signal on the hill: switch ON for red, switch OFF for green.',
        thanks: 'The little train is running again! Toot toot!',
      },
      tip: 'This is Stop & Go again. Which pieces make red share green’s resistor?',
      stars: [
        { kind: 'turns', max: 36 },
        { kind: 'turns', max: 24 },
      ],
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
      job: {
        client: 'lumen',
        place: 'The hilltop gate',
        building: 'workshop',
        ask: 'The gate lamp has two switches, one on each side of the gate. Either one should work. Not every piece belongs.',
        thanks: 'Both sides of the gate, glowing. Glowtown is whole again!',
      },
      tip: 'Two switches side by side, then the resistor. Leave the decoy pieces pointing away.',
      stars: [
        { kind: 'turns', max: 53 },
        { kind: 'turns', max: 35 },
      ],
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
    {
      id: 35,
      title: 'The Clock’s Heart',
      boss: true,
      job: {
        client: 'lumen',
        place: 'The clock’s heart',
        building: 'clock',
        ask: 'Grumble is hiding in the very heart of my clock, spinning the gears. This is it: the last of him!',
        thanks: 'He’s gone quiet. I think… he’s actually enjoying the tick. Glowtown is safe!',
      },
      tip: 'The tee pieces next to the switch decide everything: point them away to use the switch, towards each other to skip it.',
      stars: [{ kind: 'safe' }, { kind: 'solo' }],
      intro: 'Turn the pieces so the switch turns the lamp on and off.',
      board: ['┌  ─ R220 ─ ┐', '│  ┌ ─    ┐ Lv', 'B^ │ .    │ │', '└  ┬ S0   ┬ ┘'],
      twist: { seed: 99 },
      inventory: {},
      wireBudget: null,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'dark', led: 'A', when: {} },
      ],
      phases: [
        {
          grumble: 'I JAMMED the switch! The lamp must stay on no matter what. Bet you can’t!',
          sabotage: [{ op: 'scramble', seed: 7 }],
          intro:
            'Grumble scrambled it again! Now the lamp must stay lit whether the switch is ON or OFF.',
          goals: [
            { kind: 'lit', led: 'A', when: { S1: true } },
            { kind: 'lit', led: 'A', when: {} },
          ],
          solution: ['┌  ─ R220 ─ ┐', '│  ┌ ─    ┐ Lv', 'B^ │ .    │ │', '└  ┴ S0   ┴ ┘'],
        },
        {
          grumble:
            'FINE. Then I’ll turn your battery UPSIDE DOWN! And spin everything! One last time!',
          sabotage: [
            { op: 'battery', flip: true },
            { op: 'scramble', seed: 13 },
          ],
          intro: 'The battery is upside down! Make the switch work again: ON lit, OFF dark.',
          goals: [
            { kind: 'lit', led: 'A', when: { S1: true } },
            { kind: 'dark', led: 'A', when: {} },
          ],
          solution: ['┌  ─ R220 ─ ┐', '│  ┌ ─    ┐ L^', 'Bv │ .    │ │', '└  ┬ S0   ┬ ┘'],
        },
      ],
    },
  ],
};
