// Chapter 5: Two Ways. The changeover switch: one common terminal, two throws. It picks
// which of two paths gets the current, so one lever can choose between lamps, between
// brightnesses, or between batteries. Two of them make the staircase light.

import type { ChapterDef } from './types';

export const CHAPTER_5: ChapterDef = {
  id: 5,
  title: 'Two Ways',
  blurb: 'One lever, two roads for the current.',
  levels: [
    {
      id: 38,
      title: 'Up or Down',
      job: {
        client: 'hazel',
        place: 'The mill yard',
        building: 'house',
        ask: 'One lever for the yard lamp and the porch lamp. Up for the yard, down for the porch. My late husband wired it before he… well. It hasn’t worked since.',
        thanks: 'There. Up, yard. Down, porch. Just as Tom had it. Thank you, dear.',
      },
      tip: 'The lever’s middle (the common) gets the battery. Each of the two ends feeds one lamp.',
      stars: [
        { kind: 'parts', max: 1 },
        { kind: 'wire', max: 14 },
      ],
      intro: 'UP lights the red lamp, DOWN lights the green one. Tap the switch to flip it.',
      board: [
        '.  . .  . .   .',
        '.  . .  . .   .',
        '.  . Cu . .   Lv',
        'B^ . .  . Lg> .',
        '.  . .  . .   .',
      ],
      solution: [
        '.  .    .  . .   .',
        '.  .    ┌  ─ ─   ┐',
        '┌  R100 Cu . .   Lv',
        'B^ .    └  ─ Lg> ┤',
        '└  ─    ─  ─ ─   ┘',
      ],
      inventory: { r100: 2 },
      wireBudget: 16,
      goals: [
        { kind: 'only', leds: ['A'], when: { S1: true } },
        { kind: 'only', leds: ['B'], when: { S1: false } },
      ],
      newPart: {
        name: 'Changeover switch',
        token: 'Cu',
        text: 'A switch with three legs. The middle one (common) always connects to ONE of the other two: up joins the top leg, down joins the bottom leg. Tap it to flip.',
      },
    },
    {
      id: 39,
      title: 'Staircase',
      job: {
        client: 'hazel',
        place: 'The mill stairs',
        building: 'house',
        ask: 'One lamp on the mill stairs, a switch at the top and one at the bottom. Flip either one and the lamp should change. I won’t climb those stairs in the dark. Not with what I hear up there at night.',
        thanks: 'Either end! Clever. Now I can see who’s… what’s… oh, never mind. Thank you.',
      },
      tip: 'Join the two switches with TWO wires, top leg to top leg and bottom leg to bottom leg. Those two wires are called travellers.',
      stars: [{ kind: 'wire', max: 20 }, { kind: 'solo' }],
      intro: 'Each switch should flip the lamp, whatever the other one is doing.',
      board: [
        '.  .  . . . .   .',
        '.  Cu . . . Cd2 .',
        '.  .  . . . .   .',
        'B^ .  . . . .   .',
        '.  .  . L< . .  .',
      ],
      solution: [
        '.  ┌  ─ ─  ─    ┐   .',
        '┌  Cu . .  .    Cd2 ┐',
        '│  └  ─ ─  ─    ┘   │',
        'B^ .  . .  .    .   │',
        '└  ─  ─ L< R100 ─   ┘',
      ],
      inventory: { r100: 1 },
      wireBudget: 22,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true, S2: false } },
        { kind: 'lit', led: 'A', when: { S1: false, S2: true } },
        { kind: 'dark', led: 'A', when: { S1: true, S2: true } },
        { kind: 'dark', led: 'A', when: { S1: false, S2: false } },
      ],
    },
    {
      id: 40,
      title: 'Low and High',
      job: {
        client: 'bram',
        place: 'The ferry lantern',
        building: 'boat',
        ask: 'My ferry lantern wants two settings. Low, for quiet nights, so I don’t wake the mere. High, for fog. And there’s fog most nights now.',
        thanks: 'Low… and high. Good. The fog doesn’t like it bright. It keeps its distance.',
      },
      tip: 'Give each leg of the switch its own resistor, then join the two legs again before the lamp.',
      stars: [{ kind: 'wire', max: 17 }, { kind: 'safe' }],
      intro: 'UP: the lamp glows dimly. DOWN: it shines brightly.',
      board: [
        '.  .  .  .  .  .   .',
        '.  .  .  .  .  .   .',
        '.  Cu .  .  .  L>  .',
        'B^ .  .  .  .  .   .',
        '.  .  .  .  .  .   .',
      ],
      solution: [
        '.  .  .     .  .  .   .',
        '.  ┌  R1000 ─  ┐  .   .',
        '┌  Cu .     .  ├  L>  ┐',
        'B^ └  R100  ─  ┘  .   │',
        '└  ─  ─     ─  ─  ─   ┘',
      ],
      inventory: { r100: 1, r220: 1, r1000: 1 },
      wireBudget: 18,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'dim', when: { S1: true } },
        { kind: 'lit', led: 'A', brightness: 'bright', when: { S1: false } },
      ],
    },
    {
      id: 41,
      title: 'Back-up Battery',
      job: {
        client: 'bram',
        place: 'The landing beacon',
        building: 'boat',
        ask: 'The landing beacon has a small battery and a big back-up one. A lever picks which. Last time I flipped to the big one, the bulb went POP. I’d rather it didn’t.',
        thanks: 'Both batteries, both bright, no pop. If the main one dies on a foggy night, I’ll still find the landing.',
      },
      tip: 'The big battery pushes twice as hard. Does it really want the same resistor as the small one?',
      stars: [{ kind: 'safe' }, { kind: 'solo' }],
      intro: 'UP runs the beacon on 3 volts, DOWN on the 6 volt back-up. Bright both ways, and don’t pop it!',
      board: [
        '.  .  . .  . . .   .',
        '.  .  . .  . . B<  .',
        '.  L< . Cu . . .   .',
        '.  .  . .  . . B6< .',
      ],
      solution: [
        '┌  ─  ─ ─  ─    ─ ─   ┐',
        '│  .  . ┌  R100 ─ B<  ┤',
        '└  L< ─ Cu .    . .   │',
        '.  .  . └  R220 ─ B6< ┘',
      ],
      inventory: { r100: 1, r220: 1, r470: 1 },
      wireBudget: 20,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'bright', when: { S1: true } },
        { kind: 'lit', led: 'A', brightness: 'bright', when: { S1: false } },
      ],
    },
  ],
};
