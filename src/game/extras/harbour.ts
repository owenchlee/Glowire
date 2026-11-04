// Extra secrets and rumours for the harbour map (added in the map polish pass).
// SECRETS_HARBOUR are merged into game/lore.ts, SCENES_HARBOUR into game/story.ts.

import type { Secret } from '../lore';
import type { Scene } from '../story';

export const SECRETS_HARBOUR: Secret[] = [
  {
    id: 'harbour-bottle',
    world: 'harbour',
    title: 'A message in a bottle',
    lines: [
      { who: 'pip', text: 'A glass jar, half buried in the sand. There’s a paper inside, rolled up tight.' },
      { who: 'pip', text: '“To whoever finds this: the lamps under the water are not broken. They are WAITING. Keep the light on. —M.W.”' },
      { who: 'pip', text: 'M.W. again! She’s been writing to us for a hundred years. Bzzt.' },
    ],
  },
  {
    id: 'harbour-gull-nest',
    world: 'harbour',
    title: 'The gulls’ treasure',
    lines: [
      { who: 'pip', text: 'A nest made of bottle caps, bits of rope… and one tiny striped resistor. The gulls think it’s a candy.' },
      { who: 'pip', text: 'A resistor’s a speed bump for current. It doesn’t stop the flow, it just slows it down so the LED lives.' },
      { who: 'pip', text: 'I’m leaving it. The gulls would never forgive me.' },
    ],
  },
  {
    id: 'harbour-keeper-log',
    world: 'harbour',
    title: 'The keeper’s log',
    lines: [
      { who: 'pip', text: 'The lighthouse keeper’s log, in tidy ink. “Night 9,999. Lamp lit. Sea quiet.” Then, in a shakier hand:' },
      { who: 'gus', text: '“…Night 10,000. Sea not quiet. Something below the waves blinked back at me. Not once. In ROWS.”' },
      { who: 'pip', text: 'That’s Old Gus’s handwriting! He told us nothing had ever answered. He was fibbing a little.' },
    ],
    about: 'gus',
  },
  {
    id: 'harbour-tide-cave',
    world: 'harbour',
    title: 'The tide cave',
    lines: [
      { who: 'pip', text: 'Inside the cave the wall is covered in little drawings of lamps. Rows and rows of them, going down and down.' },
      { who: 'pip', text: 'Below the lamps, scratched in a child’s hand: “Grandad says they get switched on from underneath.”' },
      { who: 'pip', text: 'Underneath what? The sea? Whoever draws a ROW of lamps wants to say they’re in PARALLEL. Interesting, bzzt.' },
    ],
    about: 'gus',
  },
  {
    id: 'harbour-jar-row',
    world: 'harbour',
    title: 'Jars in a row',
    lines: [
      { who: 'pip', text: 'A row of old glass jars, half buried, with a wire running between them. They’re not dead. They’re DIM.' },
      { who: 'pip', text: 'Lamps in a row on one wire, Gus’s grandad was right. Someone made these in a line, and sent them under the sea.' },
      { who: 'pip', text: 'If one of them went out, would the others keep burning? Only if each had its own path. Bzzt!' },
    ],
  },
  {
    id: 'harbour-rulebook',
    world: 'harbour',
    title: 'Bolt’s rulebook',
    lines: [
      { who: 'pip', text: 'A fat notebook with BOLT’S RULES on the cover. It’s mostly sticky notes.' },
      { who: 'bolt', text: 'Rule 4: every alley is one-way. Rule 4b: a diode is an alley for current. Rule 4c: it has a stripe at the exit end.' },
      { who: 'bolt', text: 'Rule 99: if the rulebook goes missing, assume the gulls have it. Rule 100: do not read Rule 99 aloud.' },
    ],
    about: 'bolt',
  },
  {
    id: 'harbour-bell13',
    world: 'harbour',
    title: 'The thirteenth bell',
    lines: [
      { who: 'pip', text: 'You put your ear to the cave wall. Bong… bong… bong… all the way to twelve. Right on the hour.' },
      { who: 'pip', text: '…and then, a long way off, a thirteenth. Very faint. Like something deep under the sea just answered.' },
      { who: 'pip', text: 'Gus’s bell and the Hollow’s bell. Are they the same bell? Bzzt. Don’t tell the Professor. He’ll want to measure it.' },
    ],
  },
  {
    id: 'harbour-top-lights',
    world: 'harbour',
    title: 'Two lights on the horizon',
    lines: [
      { who: 'pip', text: 'You squint through the old brass telescope. The harbour looks tiny, with the lighthouse blinking at its tip.' },
      { who: 'pip', text: 'And far to the east, up the valley, a second light. Small and gold. It’s blinking the SAME pattern, a little late.' },
      { who: 'pip', text: 'Somebody’s answering our lighthouse. From Mossbell Hollow? Bzzt.' },
    ],
  },
];

/** Short scenes for people to say (a resident's `chat` id): rumours that point at hidden things. */
export const SCENES_HARBOUR: Scene[] = [
  {
    id: 'harbour-sal-ridge',
    lines: [
      { who: 'sal', text: 'See the rock ridge north of the market? Ladder on it. The gulls nest up there and they pinch anything shiny.' },
      { who: 'sal', text: 'I’d go and look, but I get dizzy. And seasick. And ladder-sick.' },
    ],
  },
  {
    id: 'harbour-sal-cove',
    lines: [
      { who: 'sal', text: 'The seals hide in the cove past the pier. Two rocks stand guard, with a gap just wide enough for a seal. Or you.' },
      { who: 'sal', text: 'Some old glass jars wash in there. They twinkle after dark. Don’t tell anyone I said.' },
    ],
  },
  {
    id: 'harbour-gus-cave',
    lines: [
      { who: 'gus', text: 'My grandad wrote everything in his log. His last page went in the tide cave, at the foot of the east rocks.' },
      { who: 'gus', text: 'He said the waves had lamps in them, in rows, and that one night they all went out at once. Eight minutes to midnight.' },
    ],
  },
  {
    id: 'harbour-bolt-rules',
    lines: [
      { who: 'bolt', text: 'Rule 4: alleys are one-way. IN on the left, OUT on the right. A diode works the same: current passes one way, never back.' },
      { who: 'bolt', text: 'My rulebook is in the back lane behind the warehouses. It is not lost. It is misfiled.' },
    ],
  },
  {
    id: 'harbour-lumen-bell',
    lines: [
      { who: 'lumen', text: 'Hm! There is a terrace north of the hill path, with a cave in its foot. Put your ear to the rock at midnight.' },
      { who: 'lumen', text: 'I counted thirteen bongs once. The bell tower only has twelve. Fascinating. I wrote it down. I lost the paper.' },
    ],
  },
];
