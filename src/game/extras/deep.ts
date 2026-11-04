// Extra secrets and rumours for the deep map (added in the map polish pass).
// SECRETS_DEEP are merged into game/lore.ts, SCENES_DEEP into game/story.ts.

import type { Secret } from '../lore';
import type { Scene } from '../story';

export const SECRETS_DEEP: Secret[] = [
  {
    id: 'deep-lookout',
    title: 'The lamplighters’ lookout',
    world: 'deep',
    lines: [
      { who: 'pip', text: 'From up here you can see every lamp on the street. They’re all joined in one long loop, wire to jar to wire.' },
      { who: 'pip', text: 'Someone scratched into the sand: “Current has to get home. Never leave a loop open.” The first rule of lamplighting!' },
    ],
  },
  {
    id: 'lamp-graveyard',
    title: 'The lamp graveyard',
    world: 'deep',
    lines: [
      { who: 'pip', text: 'Dead jars, all in a row, each with a paper tag tied to its neck. “Retired: the winter Marigold left.”' },
      { who: 'pip', text: 'Ninety years of lamps, switched off one by one. Marlo kept every single one. He couldn’t throw out a light.' },
    ],
  },
  {
    id: 'first-lamplighters',
    title: 'The first lamplighters',
    world: 'deep',
    lines: [
      { who: 'pip', text: 'A tiny dome, hidden behind the coral. Inside: a workbench, and a jar with a note stuck to the glass.' },
      { who: 'pip', text: '“Lightning wants to go home. Give it a loop to run round and it will stay as long as you like. Signed, the First Lamplighters.”' },
      { who: 'pip', text: 'They worked it out before anyone wrote it down. A loop, a jar, and a lot of patience.' },
    ],
  },
  {
    id: 'marigold-marlo',
    title: 'M and M',
    world: 'deep',
    lines: [
      { who: 'pip', text: 'Two names carved on the rock, side by side: MARIGOLD and MARLO, and a little lamp between them.' },
      { who: 'pip', text: 'Underneath, in two different hands: “Her lantern. His lamps.” They looked after this place together, once.' },
    ],
  },
  {
    id: 'hush-cold',
    title: 'A cold patch of sand',
    world: 'deep',
    lines: [
      { who: 'pip', text: 'The sand here is cold. Properly cold. And all round it, the footprints of something that sat very still and very small.' },
      { who: 'pip', text: 'There’s a jar lid beside it, licked clean of light. Whatever it is, it was only trying to get warm.' },
    ],
  },
  {
    id: 'two-bells',
    title: 'The second bell',
    world: 'deep',
    lines: [
      { who: 'pip', text: 'A smaller bell, hung beside the hall. Same bronze as the one in Mossbell, same writing on the lip: “Cast together.”' },
      { who: 'pip', text: 'When the big bell rings up top, this one hums without anyone touching it. Same note, same moment. That’s the thirteenth ring.' },
    ],
  },
  {
    id: 'crack-hum',
    title: 'The crack',
    world: 'deep',
    lines: [
      { who: 'pip', text: 'A hairline crack runs down the Heart Jar, thin as a whisker. Cold air whistles out of it. And a very quiet humming.' },
      { who: 'pip', text: 'It’s not a sad noise. It’s a lullaby, hummed by someone who forgot the words. Hush? Is that you?' },
    ],
  },
];

/** Short scenes for people to say (a resident's `chat` id): rumours that point at hidden things. */
export const SCENES_DEEP: Scene[] = [
  {
    id: 'pearl-rumour',
    lines: [
      { who: 'pearl', text: 'See the sandy hill north of the street? Grandpa says the lamplighters sat up there. There’s a ladder and everything.' },
      { who: 'pearl', text: 'And the crabs all hide behind the kelp at the west end. They only go in through one gap. I bet there’s something in there.' },
    ],
  },
  {
    id: 'wren-nursery',
    lines: [
      { who: 'wren', text: 'There’s a dome up in the corner, all walled in with kelp. I can see its roof but I can’t find the door.' },
      { who: 'wren', text: 'A jar is glowing right beside the wall. Lamps don’t glow beside nothing.' },
    ],
  },
  {
    id: 'tess-rumour',
    lines: [
      { who: 'tess', text: 'My coral always leans one way: toward the old lamp by the corner dome. Follow where the branches point.' },
      { who: 'tess', text: 'And the vents to the north are warm, if you ever get cold. The fish go there to sulk.' },
    ],
  },
  {
    id: 'glimmer-wreck',
    lines: [
      { who: 'glimmer', text: 'There’s a ring of kelp in the west where the sand is cold. Not cold like water. Cold like someone is lonely.' },
      { who: 'glimmer', text: 'Don’t be scared of it. I think it just wants someone to sit with.' },
    ],
  },
  {
    id: 'echo-rumour',
    lines: [
      { who: 'echo', text: 'Echo has mapped the wreck. A second hull lies south-east, with a hold that has one gap in its side. A lamp marks the gap.' },
      { who: 'echo', text: 'Echo has also noted a ladder behind the camera. Echo is afraid of ladders. Echo does not know why.' },
    ],
  },
  {
    id: 'marlo-rumour',
    lines: [
      { who: 'marlo', text: 'The two of us used to sit on a rock in the north-east corner of the hall and watch the jar. Marigold and me.' },
      { who: 'marlo', text: 'There’s a ladder up it now. Go on. Mind the lamp. I never could bring myself to switch that one off.' },
    ],
  },
];
