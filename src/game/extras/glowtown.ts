// Extra secrets and rumours for the glowtown map (added in the map polish pass).
// SECRETS_GLOWTOWN are merged into game/lore.ts, SCENES_GLOWTOWN into game/story.ts.

import type { Secret } from '../lore';
import type { Scene } from '../story';

const pip = (text: string) => ({ who: 'pip', text });
const gran = (text: string) => ({ who: 'gran', text });

export const SECRETS_GLOWTOWN: Secret[] = [
  {
    id: 'gran-cellar',
    world: 'glowtown',
    title: 'Gran’s root cellar',
    about: 'gran',
    lines: [
      pip('Shelves of spare bulbs, every one labelled in Gran’s tiny writing. And a tin marked “M.W. – DO NOT LOSE”.'),
      pip('Inside is a bulb with a really, really thin wire. Gran’s note says: “It glows because the current has to squeeze through. Squeeze = heat = light.”'),
      pip('So a resistor is just a polite traffic jam. Bzzt. I like it.'),
    ],
  },
  {
    id: 'marigold-bench',
    world: 'glowtown',
    title: 'The bench on Marigold’s Rise',
    about: 'marigold',
    lines: [
      pip('Letters cut deep into the bench: “M.W. made the first one here. One battery, one bulb, one switch. A circle of wire.”'),
      pip('Under it, scratched smaller: “It would not light until I closed the circle. Everything is a circle, Gran.”'),
      gran('(Faintly, from far away.) That’s my grandmother’s bench. I wondered who’d find it.'),
    ],
  },
  {
    id: 'maple-grotto',
    world: 'glowtown',
    title: 'The lemon batteries',
    lines: [
      pip('A grotto full of old jars, and in each one a shrivelled lemon with a copper coin and a nail stuck in it.'),
      pip('A card says: “Two different metals plus something sour makes a battery. Marigold’s trick, for when the shop was shut.”'),
      pip('A tiny bulb is still wired to the last lemon. It’s glowing. A hundred years of lemons? Bzzt. That’s not how lemons work.'),
    ],
  },
  {
    id: 'grumble-scorch',
    world: 'glowtown',
    title: 'Scorch marks',
    lines: [
      pip('Black marks all over the rock inside, in a long zigzag from the roof to the floor.'),
      pip('It’s where lightning found the shortest way to the ground. Electricity is lazy: it always takes the easy road.'),
      says('grumble', '…I did NOT make those. Okay I did. I was LITTLE. It was my first zap and I couldn’t find the OFF switch.'),
    ],
  },
  {
    id: 'power-station',
    world: 'glowtown',
    title: 'The old power station',
    lines: [
      pip('The Glowire’s power station: a stone kiln with a lightning rod next to it. The main fuse is on the wall, and it’s snapped.'),
      pip('A fuse is a thin wire built to break first when too much current comes. It sacrifices itself so the lamps don’t have to.'),
      pip('Last night’s zap blew it. We can’t just put it back. We’d have to find out WHY it blew, or Grumble will do it again.'),
    ],
  },
  {
    id: 'woods-den',
    world: 'glowtown',
    title: 'Grumble’s old den',
    lines: [
      pip('A hollow in the ridge, dark and tidy, lined with feathers of storm. And a drawing scratched in the rock: two little clouds, holding hands.'),
      pip('One is shaded in dark. The other has been rubbed out, over and over, like someone kept trying to draw her back.'),
      says('grumble', '…don’t look at that. Everybody has a twin. Mine just happens to be somewhere I can’t go.'),
    ],
  },
  {
    id: 'market-ledger',
    world: 'glowtown',
    title: 'Benny’s great-grandad’s ledger',
    about: 'benny',
    lines: [
      pip('A dusty ledger in the alley. Every page is lamp oil, lamp oil, lamp oil, in a hundred years of handwriting.'),
      pip('Until one page: “Sold: one copper wire, to M. Watts, 11:40 p.m. Paid in lemons.” And the next page has been torn out.'),
      pip('11:40 p.m. Twelve minutes before the clock stopped. Bzzt. She was in a hurry.'),
    ],
  },
  {
    id: 'storm-drain',
    world: 'glowtown',
    title: 'The copper under the road',
    lines: [
      pip('Down in the storm drain there’s a thick copper wire, green with age, running along under the road. And it’s WARM.'),
      pip('It runs east to west, the way the Glowire does… but there’s a second branch. That one doesn’t go to any building. It goes out of town. Towards the sea.'),
      pip('Where does the Glowire really start? Gran said it started with Marigold. I’m not sure that’s true.'),
    ],
  },
  {
    id: 'clock-reflection',
    world: 'glowtown',
    title: 'The clock in the water',
    lines: [
      pip('On the water the Market Clock’s reflection shows the same time: 11:52. Obviously.'),
      pip('But the water is rippling and the hands in the water are… moving. Slowly. Backwards.'),
      pip('Then a ripple, and they’re stuck at 11:52 again. Bzzt. I didn’t see that. I definitely didn’t see that.'),
    ],
  },
  {
    id: 'clock-cellar',
    world: 'glowtown',
    title: 'Under the clock',
    about: 'marigold',
    lines: [
      pip('A little cellar under the ridge. There’s a switch on the wall, an old brass knife switch, left in the ON position.'),
      pip('Beside it: “M.W. 11:52. It lit. Then it lit too much.” The wire from it goes up, into the foot of the Market Clock.'),
      pip('A clock’s motor needs a steady push from the circuit. When the push stops, so does the clock. That’s why every clock on the Glowire shows 11:52.'),
    ],
  },
];

/** Short scenes for people to say (a resident's `chat` id): rumours that point at hidden things. */
export const SCENES_GLOWTOWN: Scene[] = [
  {
    id: 'glowtown-wren-maple',
    lines: [
      { who: 'wren', text: 'I’m mapping the Glowire, bend by bend. This lane is marked “three odd things, one cheeky pond”.' },
      { who: 'wren', text: 'There’s a rocky outcrop to the west with a cave in it. And south-west, a path that just… stops, next to a very large pink tree. I didn’t dig. Not my map to dig.' },
    ],
  },
  {
    id: 'glowtown-wren-school',
    lines: [
      { who: 'wren', text: 'Up that ladder behind the school is the old power station. Be careful with the fuse: it’s thin on purpose, so it breaks before everything else does.' },
      { who: 'wren', text: 'And there’s a boardwalk at the south of the schoolyard that goes right out over the pond. Why would anyone build a dock to nowhere? Unless it’s not nowhere.' },
    ],
  },
  {
    id: 'glowtown-moth-woods',
    lines: [
      { who: 'moth', text: 'I’ve seen the Lantern Lady twice. But I’ve also heard something grumbling up in the north ridge, behind the trees.' },
      { who: 'moth', text: 'And the fireflies at the dark pool in the south-west? They only sit over one spot. Why would they do that?' },
    ],
  },
];

function says(who: string, text: string) {
  return { who, text };
}
