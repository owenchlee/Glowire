// Lore earned by the brain games: reach a best score at a world's puzzles and its people
// tell you something. Each one is tied to the idea the puzzle teaches. Merged into
// game/lore.ts (SECRETS), shown in the journal, and told after the game that earned it.

import type { Secret } from '../lore';

const pip = (text: string) => ({ who: 'pip', text });

export const SECRETS_BRAIN: Secret[] = [
  // ── Glowtown: Dead Lamp Hunt, Colour Code ──
  {
    id: 'brain-gran-dead-lamp',
    world: 'glowtown',
    title: 'Gran and the first dead lamp',
    unlock: { game: 'probe', score: 40 },
    lines: [
      { who: 'gran', text: 'You found the dead lamp quickly. Do you know who taught me that trick? Marigold, on the very first night.' },
      { who: 'gran', text: 'One lamp went dark and the whole string went with it. She walked along with a little meter and said, “Where the voltage is, the break is.”' },
      pip('Because a gap in the loop takes ALL the push. Zero volts here, full battery there. Bzzt. The meter points right at it.'),
    ],
  },
  {
    id: 'brain-gran-halving',
    world: 'glowtown',
    title: 'Halving the string',
    unlock: { game: 'probe', score: 70 },
    lines: [
      { who: 'gran', text: 'Sixteen lamps and you only used four probes? Marigold called that “halving”. Check the middle, throw away half the string, repeat.' },
      pip('Sixteen, eight, four, two, one. Every probe cuts the hunt in half. That’s why the game gives you just enough probes.'),
      { who: 'gran', text: 'Electricians do it with cables a mile long. Same trick, bigger string.' },
    ],
  },
  {
    id: 'brain-ito-bands',
    world: 'glowtown',
    title: 'Ms. Ito’s coloured stripes',
    unlock: { game: 'colours', score: 16 },
    lines: [
      { who: 'ito', text: 'Sixteen points! You read the bands like a book. Marigold painted them on every resistor herself, with a tiny brush.' },
      { who: 'ito', text: 'Her reason: a resistor is far too small to print numbers on. So the number wears a colour. Brown is one, red is two, orange is three.' },
      pip('A rainbow that tells you how much a wire pushes back. I’m never forgetting brown-black-red.'),
    ],
  },

  // ── Driftwood Harbour: Dockyard Wiring, Signal Lamp ──
  {
    id: 'brain-bolt-old-grid',
    world: 'harbour',
    title: 'Bolt remembers the dock grid',
    unlock: { game: 'pipes', score: 30 },
    lines: [
      { who: 'bolt', text: 'BEEP. Memory file 0007 unlocked by your wiring. Playing. The old dock grid: one battery, forty lamps, no loose ends.' },
      { who: 'bolt', text: 'Every wire met the next wire end to end. A lamp is only on if power can walk all the way to it from the battery and back.' },
      pip('So a dark lamp has no path home. Find where the road breaks and turn a tile. That’s the whole game, Bolt!'),
      { who: 'bolt', text: 'AFFIRMATIVE. BOOP.' },
    ],
  },
  {
    id: 'brain-bolt-diode-door',
    world: 'harbour',
    title: 'The one-way door',
    unlock: { game: 'pipes', score: 60 },
    lines: [
      { who: 'bolt', text: 'You turned past the diode tiles. Memory file 0012: the dock gate.' },
      { who: 'bolt', text: 'A diode is a one-way door for electricity. The arrow shows the way through. The workers bolted them in so no lamp could feed the battery backwards.' },
      pip('That’s why you can’t turn the arrow tiles. Some doors only open one way. Bzzt.'),
    ],
  },
  {
    id: 'brain-gus-code',
    world: 'harbour',
    title: 'Old Gus and the flash code',
    unlock: { game: 'signal', score: 6 },
    lines: [
      { who: 'gus', text: 'Six flashes back, flawless! My grandad could do thirty. Ships out at sea read the lamp the way you read a book.' },
      { who: 'gus', text: 'A light is the oldest message there is. On, off, on, off, with nothing in between. Real computers talk like that, every one of them.' },
      pip('So a blink is a letter and a pattern is a word. Gus, can the lamp say my name?'),
    ],
  },

  // ── Mossbell Hollow: Clock Panel, Needle Drop ──
  {
    id: 'brain-hazel-1152',
    world: 'mossbell',
    title: 'Hazel and the 11:52 switchboard',
    unlock: { game: 'panel', score: 30 },
    lines: [
      { who: 'hazel', text: 'Every clock in the mill stopped at 11:52, and I found out why. They all hang on one switchboard, and each switch is wired to its neighbours.' },
      { who: 'hazel', text: 'Flip one and its neighbours flip too. Whoever built it wanted nobody to fix a clock alone. You fix them in the right ORDER, or not at all.' },
      pip('Switches that are joined together. Press the right ones, one after another, and they all come on. Order matters!'),
    ],
  },
  {
    id: 'brain-hazel-par',
    world: 'mossbell',
    title: 'The panel that fixes itself',
    unlock: { game: 'panel', score: 60 },
    lines: [
      { who: 'hazel', text: 'Beat par on the old panel? Then you know the secret: pressing a switch twice undoes it. Never waste a press.' },
      { who: 'hazel', text: 'My grandmother wrote it on the wall in chalk: “Think before the click.” Electricians call it a plan.' },
      pip('And every light is only ever on or off. Two choices each. Bzzt, I like those odds.'),
    ],
  },
  {
    id: 'brain-moth-needle',
    world: 'mossbell',
    title: 'Moth’s meter',
    unlock: { game: 'needle', score: 12 },
    lines: [
      { who: 'moth', text: 'Your needle landed right on the line! Grandpa would be doing a little dance.' },
      { who: 'moth', text: 'A meter in the loop counts how much current flows. A bigger resistor squeezes harder, so the needle drops. Smaller, and it climbs.' },
      pip('Ohm’s law with a pointer: more squeeze, less flow. Bzzt. I could watch that needle all day.'),
    ],
  },

  // ── Brightwater Deep: Lantern Budget ──
  {
    id: 'brain-pearl-lantern',
    world: 'deep',
    title: 'Pearl’s lantern lore',
    unlock: { game: 'lantern', score: 4 },
    lines: [
      { who: 'pearl', text: 'You keep picking the brightest circuit. Do you know what a lamp wants? Plenty of current and nothing in the way.' },
      { who: 'pearl', text: 'A resistor in the lamp’s own path dims it. A resistor on a side branch leaves it alone. The old lamplighters read circuits like I read the tide.' },
      pip('Series: everything shares the same trickle. Parallel: each lamp gets its own road. Bzzt.'),
    ],
  },
  {
    id: 'brain-pearl-hush',
    world: 'deep',
    title: 'Feeding the Hush',
    unlock: { game: 'lantern', score: 8 },
    lines: [
      { who: 'pearl', text: 'Eight right while the Hush breathes down your neck. She isn’t cruel, you know. She’s cold. A wrong answer is just a lamp she gets to hold.' },
      { who: 'pearl', text: 'The lamplighters’ rule was: spend your light wisely. Every bit you waste, somebody downstream goes without.' },
      pip('A budget! The lantern burns down like a battery. Pick the best circuit and none of it goes to waste.'),
    ],
  },
  {
    id: 'brain-marlo-budget',
    world: 'deep',
    title: 'Marlo’s ledger of light',
    unlock: { game: 'lantern', score: 12 },
    lines: [
      { who: 'marlo', text: 'Twelve! In my day that earned you the lamplighters’ gold badge. I kept the book. Every lamp lit, every drop of storm spent.' },
      { who: 'marlo', text: 'Marigold borrowed it, once. She copied one line into her notebook: “Light is only ever moved, never made. Count it carefully.”' },
      pip('Energy is never made or lost, only moved. Even the Heart Jar can only hand out what it was given.'),
    ],
  },
];
