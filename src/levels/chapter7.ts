// Chapter 7: Jars of Light. Capacitors: little tanks that fill up with charge while the
// battery is on and empty out through the lamp once it's off. A bigger jar (more µF), or
// a bigger resistor to slow the trickle, keeps the lamp glowing longer. The goals are
// timed: "keep it glowing for 2 to 4 seconds after the switch goes OFF".
//
// Times below come from the solver (see levels.test.ts). With a red LED, 3 V and the lamp
// fed through R from a capacitor charged to 3 V, it glows for about 4.5 × R × C seconds:
//   R100: 1000 µF 0.5 s, 2200 µF 1.0 s, 4700 µF 2.1 s
//   R220: 1000 µF 0.7 s, 2200 µF 1.5 s, 4700 µF 3.1 s
//   R470: 1000 µF 0.9 s, 2200 µF 2.0 s, 4700 µF 4.2 s

import type { ChapterDef } from './types';

export const CHAPTER_7: ChapterDef = {
  id: 7,
  title: 'Jars of Light',
  blurb: 'Fill it up. Let it glow.',
  levels: [
    {
      id: 47,
      title: 'Light in a Jar',
      job: {
        client: 'pearl',
        place: 'Pearl’s jar lamp',
        building: 'house',
        ask: 'Down here the lamps run on JARS. You fill a jar with the battery, and when the battery stops, the jar keeps the lamp going! Mine goes out the second I switch off. Can you fix it?',
        thanks: 'It’s glowing all by itself! Jar-light! Oh, Grandpa Marlo is going to be SO jealous.',
      },
      tip: 'The jar has to sit on the lamp’s side of the switch, joined across the lamp’s path. Otherwise switching off cuts the jar off too.',
      stars: [{ kind: 'wire', max: 8 }, { kind: 'solo' }],
      intro: 'Light the lamp, and keep it glowing for 1½ seconds after the switch goes OFF.',
      board: ['┌  S1 .  R100 ┐', 'B^ .  .  .    Lv', '└  ─  .  ─    ┘'],
      solution: ['┌  S1 ┬      R100 ┐', 'B^ .  C4700v .    Lv', '└  ─  ┴      ─    ┘'],
      inventory: { c1000: 1, c4700: 1 },
      wireBudget: 10,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'hold', led: 'A', switch: 'S1', min: 1.5 },
      ],
      newPart: {
        name: 'Capacitor',
        token: 'C4700',
        text: 'A capacitor is a jar for electricity. While the battery is on, it fills up. When the battery stops, it empties out again and keeps a lamp glowing for a while. Bigger jars (more µF) glow longer.',
      },
    },
    {
      id: 48,
      brain: { game: 'pipes', seed: 2440 },
      title: 'Longer, Please',
      job: {
        client: 'marlo',
        place: 'The lamp over Marlo’s door',
        building: 'house',
        ask: 'Hmph. My door lamp is dark because the wires got turned in the current. Turn the pipes so the power reaches every lamp. Longer route, mind. Diodes only pass one way.',
        thanks: 'Hmph. Acceptable. Quite good, actually.',
      },
      tip: 'Trace the route from the battery. Diode arrows point the way the current must go.',
      stars: [{ kind: 'wire', max: 9 }, { kind: 'safe' }],
      intro: 'Turn the pipes so the power reaches every lamp. Plan the whole route first.',
      board: ['┌  S1 .  .  ┐', 'B^ .  .  .  Lv', '└  ─  .  .  ┘'],
      solution: ['┌  S1 ┬      R220 ┐', 'B^ .  C4700v .    Lv', '└  ─  ┴      ─    ┘'],
      inventory: { r100: 1, r220: 1, r470: 1, c2200: 1, c4700: 1 },
      wireBudget: 10,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'medium', when: { S1: true } },
        { kind: 'hold', led: 'A', switch: 'S1', min: 2.5, max: 5 },
      ],
    },
    {
      id: 49,
      title: 'Sunrise',
      job: {
        client: 'tess',
        place: 'The nursery lamp',
        building: 'house',
        ask: 'Shh, the baby fish are sleeping. If their lamp snaps on all at once they panic and hide in the coral for a week. It needs to come on slowly. Like a sunrise.',
        thanks: 'Look at them, stretching their little fins. A sunrise, under the sea. Thank you.',
      },
      tip: 'Put the jar right across the lamp. Now the lamp can’t light until the jar is full enough, and a big resistor fills it slowly.',
      stars: [{ kind: 'wire', max: 8 }, { kind: 'solo' }],
      intro: 'After the switch goes ON, the lamp should light 1 to 3 seconds later.',
      board: ['┌  S1 . . ┐', 'B^ .  . . Lv', '└  ─  ─ . ┘'],
      solution: ['┌  S1 R1000 ┬      ┐', 'B^ .  .     C4700v Lv', '└  ─  ─     ┴      ┘'],
      inventory: { r470: 1, r1000: 1, c2200: 1, c4700: 1 },
      wireBudget: 9,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'delay', led: 'A', switch: 'S1', min: 1, max: 3 },
      ],
    },
    {
      id: 50,
      brain: { game: 'panel', seed: 2477 },
      title: 'Two Timers',
      job: {
        client: 'tess',
        place: 'The coral gate lamps',
        building: 'house',
        ask: 'Two lamps by the coral gate, and the switches on the panel affect their neighbours! Get all the lamps lit. Think before you press, little fish!',
        thanks: 'Both lamps shining. The coral thanks you.',
      },
      tip: 'Each press flips a cross of lights. Work out a plan, then press.',
      stars: [{ kind: 'safe' }, { kind: 'solo' }],
      intro: 'Press the switches in the right order so every clock runs again.',
      board: [
        '┌   S1 ─ ┬ ─    ─  ┬ ─    ┐',
        '│   .  . . .    .  . .    .',
        'B6^ .  . ├ R220 ┐  ├ R220 ┐',
        '│   .  . . .    Lv . .    Lv',
        '└   ─  ─ ┴ ─    ┴  ┴ ─    ┘',
      ],
      solution: [
        '┌   S1 ─ ┬      ─    ─  ┬      ─    ┐',
        '│   .  . Dv     .    .  Dv     .    .',
        'B6^ .  . ├      R220 ┐  ├      R220 ┐',
        '│   .  . C1000v .    Lv C4700v .    Lv',
        '└   ─  ─ ┴      ─    ┴  ┴      ─    ┘',
      ],
      inventory: { diode: 2, c1000: 1, c4700: 1 },
      wireBudget: 26,
      goals: [
        { kind: 'all', count: 2, when: { S1: true } },
        { kind: 'hold', led: 'A', switch: 'S1', min: 0.5, max: 1.5 },
        { kind: 'hold', led: 'B', switch: 'S1', min: 3, max: 6 },
      ],
    },
    {
      id: 51,
      title: 'Turn the Tide',
      job: {
        client: 'echo',
        place: 'The wreck’s stern lamp',
        building: 'boat',
        ask: 'PING. Stern lamp: scrambled by the current. All parts present. Orientation: wrong. Please turn. Note: both jars must be in the loop. One jar is not enough jar.',
        thanks: 'PING PING. Lamp holds light. Echo is… pleased. Echo has not been pleased in ninety-nine years.',
      },
      tip: 'Two jars side by side add up, like one big jar. Turn both upright, joined to both rails.',
      stars: [
        { kind: 'turns', max: 40 },
        { kind: 'turns', max: 27 },
      ],
      intro: 'Turn the pieces: lamp on when ON, still glowing 1.8 seconds after OFF.',
      board: [
        '┌  S1 ┬      ┬      R100 ┐',
        'B^ .  C2200v C2200v .    Lv',
        '└  ─  ┴      ┴      ─    ┘',
      ],
      twist: { seed: 51 },
      inventory: {},
      wireBudget: null,
      goals: [
        { kind: 'lit', led: 'A', when: { S1: true } },
        { kind: 'hold', led: 'A', switch: 'S1', min: 1.8 },
      ],
    },
    {
      id: 52,
      title: 'Flash!',
      job: {
        client: 'echo',
        place: 'Echo’s camera flash',
        building: 'boat',
        ask: 'PING. Echo takes photographs of the dark. For evidence. Lever UP: fill the jar from the battery, lamp dark. Lever DOWN: the jar empties into the lamp. FLASH. Duration required: about two seconds.',
        thanks: 'FLASH. Photograph taken. It shows… something big, with eyes. Echo will not look at it again.',
      },
      tip: 'The lever’s middle goes to the jar. UP joins the jar to the battery; DOWN joins it to the lamp’s resistor. Then pick a jar and resistor that make about 2 seconds.',
      stars: [{ kind: 'wire', max: 8 }, { kind: 'solo' }],
      intro: 'UP: lamp dark while the jar fills. DOWN: lamp flashes on for 1.8 to 2.6 seconds.',
      board: ['.  .  Cu3 . .', 'B^ .  .   . Lv', '.  .  .   . .'],
      solution: ['┌  ─  Cu3    R100 ┐', 'B^ .  C4700v .    Lv', '└  ─  ┴      ─    ┘'],
      inventory: { r100: 1, r220: 1, c2200: 1, c4700: 1 },
      wireBudget: 10,
      goals: [
        { kind: 'dark', led: 'A', when: { S1: true } },
        { kind: 'hold', led: 'A', switch: 'S1', min: 1.8, max: 2.6 },
      ],
    },
    {
      id: 53,
      title: 'The Heart Jar',
      boss: true,
      villain: 'hush',
      job: {
        client: 'marlo',
        place: 'The Heart Jar',
        building: 'tower',
        ask: 'The Heart Jar feeds the whole Glowire, from here to Mossbell. It’s been cracked a hundred years, and now it’s nearly empty. And the Hush is in the hall with it. Fill it. Quickly. Before the dark gets in.',
        thanks: 'Full. The Heart Jar is FULL. Listen… every lamp from here to the hills just got a little brighter.',
      },
      tip: 'Jars side by side add up. Two small jars are nearly as good as one big one.',
      stars: [{ kind: 'safe' }, { kind: 'solo' }],
      intro: 'Bright when ON, and still glowing 2 seconds after OFF.',
      board: [
        '┌  S1 . . . .  . ┐',
        'B^ .  . . . .  . Lv',
        '└  ─  . . . .  . ┘',
      ],
      solution: [
        '┌  S1 ┬      ─ ─ R100 ─ ┐',
        'B^ .  C4700v . . .    . Lv',
        '└  ─  ┴      ─ ─ ─    ─ ┘',
      ],
      inventory: { r100: 1, r220: 1, c2200: 1, c4700: 1 },
      wireBudget: null,
      goals: [
        { kind: 'lit', led: 'A', brightness: 'bright', when: { S1: true } },
        { kind: 'hold', led: 'A', switch: 'S1', min: 2 },
      ],
      phases: [
        {
          grumble: 'Sssshhhh. Such a big jar. Such a BRIGHT jar. Mine now. Mine mine mine.',
          sabotage: [
            { op: 'zap', part: 'c4700' },
            { op: 'give', part: 'c2200', count: 1 },
          ],
          intro: 'The Hush swallowed the big jar! Pearl threw you a small one. Bright, and 1.8 seconds after OFF.',
          goals: [
            { kind: 'lit', led: 'A', brightness: 'bright', when: { S1: true } },
            { kind: 'hold', led: 'A', switch: 'S1', min: 1.8 },
          ],
          solution: [
            '┌  S1 ┬      ┬      ─ R100 ─ ┐',
            'B^ .  C2200v C2200v . .    . Lv',
            '└  ─  ┴      ┴      ─ ─    ─ ┘',
          ],
        },
        {
          grumble: 'Hungry. So hungry. More push, little light? Then more to EAT. Sssshhh…',
          sabotage: [
            { op: 'battery', volts: 6 },
            { op: 'drop', at: [3, 1] },
          ],
          intro: 'Six volts, and the Hush is sitting on your board. Lamp lit when ON, 3 to 6 seconds after OFF.',
          goals: [
            { kind: 'lit', led: 'A', when: { S1: true } },
            { kind: 'hold', led: 'A', switch: 'S1', min: 3, max: 6 },
          ],
          solution: [
            '┌   S1 ┬      ─ ─ ┬      R220 ┐',
            'B6^ .  C2200v # . C2200v .    Lv',
            '└   ─  ┴      ─ ─ ┴      ─    ┘',
          ],
        },
      ],
    },
  ],
};
