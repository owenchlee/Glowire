// Extra secrets and rumours for the mossbell map (added in the map polish pass).
// SECRETS_MOSSBELL are merged into game/lore.ts, SCENES_MOSSBELL into game/story.ts.

import type { Secret } from '../lore';
import type { Scene } from '../story';

export const SECRETS_MOSSBELL: Secret[] = [
  {
    id: 'mossbell-footprints',
    title: 'Wet footprints',
    world: 'mossbell',
    lines: [
      { who: 'pip', text: 'Footprints in the mud. Small. Bare. And WET, like someone just stepped out of the pond.' },
      { who: 'pip', text: 'They start at the water. They go up the boardwalk. They stop at the bus stop. Bzzt. Nobody has arrived on that bus in fifty years.' },
    ],
  },
  {
    id: 'mossbell-selflit',
    title: 'The lamp that lit itself',
    world: 'mossbell',
    lines: [
      { who: 'pip', text: 'A lamp burning on the island. No wire. No oil. No battery. Nothing connected to anything.' },
      { who: 'pip', text: 'A lamp needs a complete loop to glow. So either there is a loop I cannot see… or somebody is being the loop.' },
      { who: 'pip', text: 'The glass is cold. The light is not. I think I would like to go back now.' },
    ],
  },
  {
    id: 'mossbell-circle',
    title: 'The humming stones',
    world: 'mossbell',
    lines: [
      { who: 'pip', text: 'Standing in the middle of the ring, my fan goes quiet. Everything goes quiet. Then: a hum, very low, from the stones.' },
      { who: 'pip', text: 'It is the exact note a transformer makes. Hazel says her grandmother used to tune the mill wheel to it.' },
    ],
  },
  {
    id: 'mossbell-grotto-bell',
    title: 'The bell mould',
    world: 'mossbell',
    lines: [
      { who: 'pip', text: 'Inside the grotto: a huge clay mould, split in two. Stamped on it: BRIGHTWATER FOUNDRY, ONE OF TWO.' },
      { who: 'pip', text: 'I tap it. Far away, under a lot of water, something taps back. One. Two. Bzzt. I am not tapping it again.' },
    ],
  },
  {
    id: 'mossbell-ropes',
    title: 'A second set of ropes',
    world: 'mossbell',
    lines: [
      { who: 'pip', text: 'In the collapsed chapel: two bell ropes hanging side by side. One is grey and frayed to a thread.' },
      { who: 'pip', text: 'The other is brand new. And it is swinging. Gently. Like someone has just let go of it.' },
    ],
  },
  {
    id: 'mossbell-glade-oil',
    title: 'Warm lantern oil',
    world: 'mossbell',
    lines: [
      { who: 'pip', text: 'A ring of mushrooms, and in the middle, a little tin of lantern oil. I touch it. It is still warm.' },
      { who: 'pip', text: 'Warm, like it has been held in someone’s hands all evening. There are two cups beside it. Both are full of tea.' },
      { who: 'pip', text: 'Somebody is expected. I really hope it is not us.' },
    ],
  },
  {
    id: 'mossbell-hush-cave',
    title: 'The cave that breathes',
    world: 'mossbell',
    lines: [
      { who: 'pip', text: 'The cave is full of fog. It breathes in, slowly, and out. It smells like rain and wet pennies.' },
      { who: 'pip', text: 'Every time it breathes out, a tiny bit of it drifts along the wire and away up the valley. It is thin and cold and it sounds, almost, like a sigh.' },
      { who: 'pip', text: '…Like something that is only very, very cold. Bzzt. I feel strange. I think I feel sorry for it.' },
    ],
  },
];

/** Short scenes for people to say (a resident's `chat` id): rumours that point at hidden things. */
export const SCENES_MOSSBELL: Scene[] = [
  {
    id: 'gran-hollow-b',
    lines: [
      { who: 'gran', text: 'Hazel Thorn still keeps the mill, I think. If anyone knows what’s going on up here, she will.' },
      { who: 'gran', text: 'And if you see little wet footprints out on that pond boardwalk, don’t tell me which way they go. I would rather not know.' },
    ],
  },
  {
    id: 'wren-hollow-b',
    lines: [
      { who: 'wren', text: 'My map says the Glowire runs right through the middle of the village… and ends at a bell.' },
      { who: 'wren', text: 'There is a ladder behind the kiln, up the ridge. Locals leave little things on top for whoever climbs it next. I left a coin.' },
    ],
  },
  {
    id: 'hazel-mill',
    lines: [
      { who: 'hazel', text: 'There is a ring of standing stones behind my mill. Hum when it rains. Stand in the middle and tell me it is only wind.' },
      { who: 'hazel', text: 'And there is a lamp lit out on the bog island, been burning since the Long Dark. I have never put oil in it. Nobody has.' },
    ],
  },
  {
    id: 'wren-mere',
    lines: [
      { who: 'wren', text: 'The north marsh has a boardwalk all the way round. In the middle of it there is a reed island with something shiny on it.' },
      { who: 'wren', text: 'And a cave at the far end that smells of the sea. My map does not have a sea. I checked.' },
    ],
  },
  {
    id: 'moth-bellfield',
    lines: [
      { who: 'moth', text: 'There is a path behind the old tree, the crooked one. It looks like it stops. It does not.' },
      { who: 'moth', text: 'At the end is a ring of mushrooms and a cup of tea that is always warm. I never drink it. It is hers.' },
      { who: 'moth', text: 'Up on Chapel Hill there are two bell ropes. Only one of them was ever pulled. By me, I mean. The other one pulls itself.' },
    ],
  },
];
