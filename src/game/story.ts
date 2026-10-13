// The story: scenes that play as you travel the route, and the pages of Marigold's
// notebook you find along the way.
//
// The lore, in short. A hundred years ago Marigold Watts (Gran's grandmother) joined up
// the Glowire, one copper line that carries light to every lamp in town. The night she
// first switched it on, lightning struck it and left a little storm cloud behind: Grumble.
// He hides from bright lights and hums in the dark, and last night he zapped the power.
// Marigold's pages hint that the Glowire is older than her, and runs in from the sea.

/** Who speaks a line: Pip, Grumble, or a townsperson id from cast.ts. */
export type Speaker = 'pip' | 'grumble' | string;

export interface Line {
  who: Speaker;
  text: string;
}

export interface Scene {
  id: string;
  lines: Line[];
}

/** A page of Marigold's notebook, found lying somewhere along the route. */
export interface Note {
  id: string;
  /** "Page 3", and so on: the order they're meant to be read in. */
  page: number;
  title: string;
  lines: Line[];
}

const scene = (id: string, lines: Line[]): Scene => ({ id, lines });

export const PROLOGUE: Scene = scene('prologue', [
  { who: 'gran', text: 'Pip! Wake up! The whole town has gone dark.' },
  { who: 'pip', text: 'Bzzt! Wha…? Oh no. Not again. Was it Grumble?' },
  {
    who: 'gran',
    text: 'That grumpy little thundercloud zapped the power station last night. Every light in Glowtown is out.',
  },
  { who: 'grumble', text: 'HMPH. Too bright. Too cheerful. Much better now.' },
  {
    who: 'gran',
    text: 'See the road out of my yard? The Glowire runs under it. My grandmother Marigold laid it a hundred years ago, and every lamp in town hangs off it.',
  },
  {
    who: 'gran',
    text: 'Fix the lights along the road, one stretch at a time, and the power flows on to the next part of town.',
  },
  {
    who: 'gran',
    text: 'Start with Maple Lane, past my gate. Use real electronics, mind. No shortcuts.',
  },
  { who: 'pip', text: 'And they pay in sparks! Let’s light this town up!' },
]);

export const SCENES: Record<string, Scene> = Object.fromEntries(
  [
    PROLOGUE,
    scene('gran-home', [{ who: 'gran', text: 'Maple Lane’s just down the road. Follow the Glowire, kiddo!' }]),

    // ── Glowtown ──
    scene('maple-intro', [
      {
        who: 'pell',
        text: 'Is that Gran’s new apprentice? Oh, thank goodness. Three of us on Maple Lane have been sitting in the dark all night.',
      },
      { who: 'pip', text: 'See the “!” over someone’s head? That means they need us. Walk up and talk to them.' },
    ]),
    scene('maple-outro', [
      { who: 'pell', text: 'Look at our lane! Every window glowing!' },
      { who: 'pip', text: 'Feel that hum? The power’s flowing on down the Glowire. The bridge to Willow Brook is lit!' },
      { who: 'grumble', text: 'Grr. Fine. Enjoy your little lane. You’ll never fix the BROOK.' },
    ]),
    scene('brook-intro', [
      { who: 'wren', text: 'Whoa, you got the bridge lit? Nice! I’m Wren.' },
      {
        who: 'wren',
        text: 'I’m mapping the Glowire, every bend of it, all the way back to where it starts.',
      },
      { who: 'pip', text: 'That’s easy. It starts at Gran’s workshop.' },
      {
        who: 'wren',
        text: 'That’s what everyone says. But Marigold left notebook pages all along the road, and they say something else. Read them and see.',
      },
    ]),
    scene('brook-outro', [
      { who: 'arjun', text: 'The whole brook is twinkling! Fresh bread for everyone in the morning.' },
      { who: 'wren', text: 'Schoolhouse Hill’s steps just lit up. Race you to the top!' },
    ]),
    scene('school-intro', [
      {
        who: 'ito',
        text: 'Welcome to Schoolhouse Hill! We teach circuits here. Rule one: electricity needs a full loop to get home.',
      },
      { who: 'pip', text: 'Rule two: never lick the battery. Trust me. Bzzt.' },
    ]),
    scene('school-outro', [
      { who: 'finch', text: 'Splendid. The whole hill, glowing. Quietly glowing, mind.' },
      {
        who: 'wren',
        text: 'Past here is Whisper Woods. The Glowire goes right through it… and so did Grumble. I saw him float in there.',
      },
    ]),
    scene('woods-intro', [
      { who: 'pip', text: 'It’s so quiet in here. I don’t like quiet. Quiet is when things jump out.' },
      { who: 'grumble', text: 'Go home, sparky. The woods like the dark. I like the dark.' },
      {
        who: 'wren',
        text: 'His nest is at the old junction box at the end of the path. Gran’s on her way to meet you there. Help the twins on the way!',
      },
    ]),
    scene('woods-outro', [
      {
        who: 'gran',
        text: 'Ha! Off he floats to sulk. That junction box powers the whole east side of town, and it’s humming again.',
      },
      { who: 'grumble', text: 'You think you’ve won? The MARKET is mine. Every sign. Every colour.' },
      { who: 'pip', text: 'Market Square, here we come!' },
    ]),
    scene('market-intro', [
      { who: 'benny', text: 'Customers! Well, nearly. Our shop signs are every colour of the rainbow, and none of them work.' },
      {
        who: 'coral',
        text: 'Here’s a funny thing about LEDs: every colour needs a different push to light. Red is easy. Green needs more. Blue needs nearly the whole battery.',
      },
      { who: 'grumble', text: 'Colours, schmolours. They’ll fight over the current like seagulls over a chip!' },
      { who: 'pip', text: 'He’s not wrong, actually. Let’s find out why.' },
    ]),
    scene('market-outro', [
      { who: 'luca', text: 'The square is ALIVE again! Pizza for the light fixers!' },
      { who: 'dot', text: 'Nice work, kid. But the crossroads is gridlock. Not one signal working.' },
    ]),
    scene('crossroads-intro', [
      { who: 'dot', text: 'Officer Dot. Traffic is my job, and right now it’s a pile-up. I need those signals back.' },
    ]),
    scene('crossroads-outro', [
      { who: 'mei', text: 'Hot chocolate on the house, for the light fixers!' },
      { who: 'dot', text: 'One job left: the Market Clock. Grumble’s wound himself right round its works.' },
    ]),
    scene('clock-intro', [
      { who: 'grumble', text: 'YOU. Again. This is MY clock now!' },
      { who: 'pip', text: 'That’s it, cloud. Last stop in Glowtown.' },
    ]),
    scene('clock-outro', [
      { who: 'dot', text: 'Traffic’s flowing! Shops are open! Glowtown owes you one.' },
      {
        who: 'grumble',
        text: 'Fine! FINE! I’m leaving this too-bright town. The sea storms will listen to me!',
      },
      {
        who: 'wren',
        text: 'He jumped on the night bus to Driftwood Harbour! And look: the Glowire goes on beside the bus road. It doesn’t start in Glowtown at all.',
      },
      { who: 'pip', text: 'Then we don’t stop here either. Next bus to the harbour!' },
    ]),

    // ── Driftwood Harbour ──
    scene('harbour-intro', [
      { who: 'rosa', text: 'Ahoy! You’re the light fixers from Glowtown? The harbour’s pitch black. The boats can’t find their way in.' },
      {
        who: 'rosa',
        text: 'A little black cloud came in on the night bus. Every lamp on the docks went out the moment he arrived.',
      },
      { who: 'pip', text: 'Grumble. Of course it was.' },
    ]),
    scene('gran-harbour', [
      { who: 'gran', text: 'Sea air! Good for the knees. Off you go, kiddo. Captain Rosa needs you on the docks.' },
    ]),
    scene('docks-intro', [
      {
        who: 'gran',
        text: 'Out here you’ll stack batteries for more push. Two in a row make 6 volts. Three make 9.',
      },
      { who: 'gran', text: 'More volts, more danger. A resistor that was safe before can fry an LED now.' },
      { who: 'grumble', text: 'Nine volts! Let’s see you not frizzle anything, sparky.' },
    ]),
    scene('docks-outro', [
      { who: 'sal', text: 'The docks are lit! Party on my boat tonight, and you’re invited.' },
      { who: 'wren', text: 'The Glowire runs out along the pier, toward the lighthouse. That’s where it goes next.' },
    ]),
    scene('lighthouse-intro', [
      { who: 'gus', text: 'Fifty years I’ve kept this light. Never once has it gone dark. Until last night.' },
      {
        who: 'gus',
        text: 'My grandad told me the Glowire comes in from the sea right here, under the rocks. Older than anyone knows.',
      },
    ]),
    scene('lighthouse-outro', [
      { who: 'gus', text: 'The lighthouse is shining again. I’ve never seen it brighter.' },
      { who: 'grumble', text: 'NO! Fine! I’ll hide up the clocktower. Nobody can fix THAT.' },
    ]),
    scene('pier-intro', [
      { who: 'rosa', text: 'The ferry’s stuck out at the end of the pier, and Sal’s party boat is bobbing about in the dark.' },
      { who: 'sal', text: 'No lights, no party! And I’ve already blown up forty balloons.' },
    ]),
    scene('pier-outro', [
      { who: 'sal', text: 'PARTY BOAT IS GO! Everyone aboard!' },
      { who: 'wren', text: 'The Glowire turns inland here, past the warehouses. Grumble’s holed up in the power station.' },
    ]),
    scene('warehouse-intro', [
      { who: 'rosa', text: 'Warehouse Row. Every crate in the harbour comes through here, and so does every wire.' },
      { who: 'grumble', text: 'Go away! This power station is MINE. Nine whole volts of it!' },
    ]),
    scene('warehouse-outro', [
      { who: 'rosa', text: 'Power station humming, every boat in safe. You’re a harbour hero now.' },
      { who: 'grumble', text: 'Fine! I’ll go UP. Up the hill, into the clock. You can’t follow me up there!' },
      { who: 'wren', text: 'Clocktower Hill. That’s where Marigold’s notes said the Glowire goes. We’re nearly at the start of it!' },
    ]),
    scene('top-intro', [
      { who: 'lumen', text: 'The very top. The railway signal, the old gate, and the clock’s heart itself.' },
      { who: 'wren', text: 'This is it. The Glowire starts right here. Under all these stars.' },
      { who: 'grumble', text: 'Leave me alone up here. It’s the only dark place left.' },
    ]),
    scene('hill-intro', [
      {
        who: 'lumen',
        text: 'Ah, the apprentices! Grumble’s lightning spun every gear and wire in my clock.',
      },
      {
        who: 'lumen',
        text: 'All the parts are still here. They’re just… turned. No drawing up here: tap a piece to turn it.',
      },
      { who: 'pip', text: 'Just turning? Bzzt. Okay, brain. Time to shine.' },
    ]),
    scene('hill-outro', [
      { who: 'lumen', text: 'Listen! The clock is ticking again!' },
      { who: 'grumble', text: '…it is quite a nice tick, actually. Hmph.' },
      {
        who: 'grumble',
        text: 'I only wanted it dark sometimes. When the lights are on, nobody looks up. Nobody sees the stars. That’s where I come from.',
      },
      { who: 'gran', text: 'Well, why didn’t you just SAY so? One night a year, we’ll switch the whole town off. Star Night.' },
      { who: 'pip', text: 'Was that… a smile? Gran! Grumble is SMILING!' },
    ]),
  ].map((s) => [s.id, s]),
);

const note = (id: string, page: number, title: string, text: string[]): Note => ({
  id,
  page,
  title,
  lines: text.map((t) => ({ who: 'marigold', text: t })),
});

export const NOTES: Record<string, Note> = Object.fromEntries(
  [
    note('glowire', 1, 'The first wire', [
      'Today I laid the first stretch of the Glowire, from my workshop to the end of the lane.',
      'Power leaves the battery at its + end, runs all the way round the wire, and comes home at the − end. Always a round trip.',
    ]),
    note('circle', 2, 'Mind the gap', [
      'A circuit is a circle. Leave one gap, even the width of a hair, and nothing flows. Not one flicker.',
      'The neighbours think I’ve gone mad, crawling along the lane with a lamp, looking for gaps.',
    ]),
    note('storm', 3, 'The storm', [
      'The night I switched the whole Glowire on, a storm rolled in. Lightning struck the wire up on the hill.',
      'When the smoke cleared, a little cloud was sitting on my roof, crackling and sniffling. I think the lightning left him behind.',
    ]),
    note('hides', 4, 'The little cloud', [
      'The little cloud hides from the lamps. When the town is bright, he grumbles. When it’s dark, he hums.',
      'I’ve started calling him Grumble. He doesn’t seem to mind.',
    ]),
    note('sea', 5, 'Older than me', [
      'I have a secret. The Glowire isn’t really mine. I only joined it up.',
      'The real line comes in from the sea, past the lighthouse, and up to the old clock on the hill. Someone laid it long, long before me.',
    ]),
    note('colours', 6, 'Lazy red, fussy blue', [
      'Red light is lazy: a little push will do. Blue light is fussy: it wants nearly all the push you’ve got.',
      'Put them side by side on one battery and red will grab the current every time. Give each its own resistor.',
    ]),
    note('volts', 7, 'Stacking batteries', [
      'At the harbour they stack batteries end to end, + to −. Each one adds its push: 3 volts, 6, 9.',
      'Strong enough for the lighthouse. Strong enough to fry a careless LED, too.',
    ]),
    note('beginning', 8, 'Where it begins', [
      'I followed the line to the top of Clocktower Hill. It ends in the clock’s heart, under a sky full of stars.',
      'Whoever built it wanted us to have light at night. But I wonder if they meant us to switch it off, now and then, and look up.',
    ]),
  ].map((n) => [n.id, n]),
);

export function sceneOf(id: string): Scene | undefined {
  return SCENES[id];
}
