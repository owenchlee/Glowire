// Secrets: the mystery under the story, found by looking closely.
//
// The whole truth, which the player pieces together across the three worlds:
//
// A hundred years ago, at 8 minutes to midnight (11:52), Marigold Watts switched on the
// Glowire. Lightning struck it, and the storm left behind not one little cloud but two:
// Grumble, who loves the dark, and his twin Glimmer, who loves the light. Marigold kept
// Grumble. Glimmer followed the wire up the valley to Mossbell Hollow and made a home in
// the bell tower, where she kept the village lamps lit with Marigold's old lantern.
//
// Every clock on the Glowire stops at 11:52 when the power fails: the minute the twins
// were born. Fifty years ago, Glimmer grew too tired to light every lamp in the Hollow.
// They all went out at once, the bell rang thirteen times (it does that when she's close),
// and most of the village left. People still see her: the Lantern Lady.
//
// Gran met Glimmer once, as a girl, and nobody believed her. Pip's LED eye came from
// Marigold's lantern. Hazel, the last miller, is Wren's grandmother. Professor Lumen was
// born in Mossbell and saw Glimmer wave to him the night of the Long Dark. And the bell
// was cast "under the sea", where Old Gus's grandad saw lamps in rows like a street…

import type { Line } from './story';

export type WorldId = 'glowtown' | 'harbour' | 'mossbell';

export interface Secret {
  id: string;
  title: string;
  world: WorldId;
  /** The townsperson this secret is about, for the journal's People page. */
  about?: string;
  lines: Line[];
}

const says = (who: string, text: string): Line => ({ who, text });
const pip = (text: string) => says('pip', text);

const secret = (id: string, world: WorldId, title: string, lines: Line[], about?: string): Secret => ({
  id,
  world,
  title,
  lines,
  about,
});

export const SECRETS: Record<string, Secret> = Object.fromEntries(
  [
    // ── Things to find in Glowtown ──
    secret('fountain-coin', 'glowtown', 'The warm coin', [
      pip('Coins at the bottom of the fountain. Most are new. This one’s ancient… it says “M.W. 1926”.'),
      pip('And it’s WARM. Like someone was holding it a minute ago. Bzzt. Nobody’s here.'),
    ]),
    secret('clock-marks', 'glowtown', 'A hundred scratches', [
      pip('Under the Market Clock, someone has scratched little marks into the stone. Lots of them.'),
      pip('…ninety-eight, ninety-nine, a hundred. One for every year since the Glowire was switched on?'),
      pip('The clock is stuck at 8 minutes to midnight. Dot says it ALWAYS stops at 11:52.'),
    ]),
    secret('hollow-stump', 'glowtown', 'A nest of sparks', [
      pip('Inside the hollow stump: a little nest of golden sparks, still warm.'),
      pip('There’s a feather in it. A feather made of light. It fades when you touch it.'),
      says('grumble', '…don’t touch that. It’s not yours. It’s not MINE either. Leave it.'),
    ]),
    secret('woods-lantern', 'glowtown', 'A lantern in the woods', [
      pip('D-d-did you SEE that?! Between the trees! Someone with a lantern!'),
      pip('And then they just… went out. Like a light. Bzzt. I am NOT scared. My fan is just very loud right now.'),
    ]),
    secret('window-lantern', 'glowtown', 'At Theo’s window', [
      pip('There! By Theo’s window! A lady, glowing all over, with a lantern!'),
      pip('…gone. Theo said he sees her every night. I thought he was making it up.'),
    ]),

    // ── Things to find in Driftwood Harbour ──
    secret('mossbell-crate', 'harbour', 'The crate from the Hollow', [
      pip('A crate stamped “MOSSBELL HOLLOW MILL. DO NOT OPEN BEFORE STAR NIGHT.”'),
      pip('It’s empty. It smells of rain, and honey, and candles. Who’s been sending things from Mossbell?'),
    ]),
    secret('sea-lamps', 'harbour', 'Lamps under the sea', [
      pip('Look out there, under the water. Little lights, in rows. Like streetlamps.'),
      pip('A wave rolls over them and they’re gone. Old Gus wasn’t joking, was he?'),
    ]),
    secret('sea-answer', 'harbour', 'The sea answers', [
      says('gus', 'Wait. Look out there. Far out, past the point… something is flashing back.'),
      says('gus', 'Your whole pattern, colour for colour. And then one more flash, that you never sent. Fifty years I’ve kept this light, and nothing has EVER answered.'),
    ]),
    secret('cliff-lantern', 'harbour', 'The lady on the cliff', [
      pip('On the cliff path! The lantern lady again! She’s looking out to sea…'),
      pip('…and she’s gone. She keeps showing up wherever the Glowire goes. Is she FOLLOWING it?'),
    ]),

    // ── Things to find in Mossbell Hollow ──
    secret('scratched-sign', 'mossbell', 'Carved in the stump', [
      pip('Carved into this old stump: “M.W.” and two little clouds, holding hands.'),
      pip('M.W. Marigold Watts! She was HERE. And… two clouds?'),
    ]),
    secret('mill-well', 'mossbell', 'The bottomless well', [
      pip('You drop a pebble down the well. It never splashes.'),
      pip('Instead, very faint, from far below: a bell. Bong. Bong. Bong… thirteen times.'),
    ]),
    secret('mere-reflection', 'mossbell', 'Your reflection', [
      pip('Look at your reflection in the water. You’re holding a lantern in it.'),
      pip('You are NOT holding a lantern. Bzzt. Bzzt. Can we go now? Please?'),
    ]),
    secret('frog-statue', 'mossbell', 'The stone frog', [
      pip('A stone frog. Its mouth is stuffed with old candle stubs, all burned down to exactly the same height.'),
      pip('As if they were all lit at the same moment… and all went out at the same moment too.'),
    ]),
    secret('chapel-stone', 'mossbell', 'Tom’s stone', [
      pip('“TOM THORN. HE KEPT THE LAMPS.” Hazel’s husband.'),
      pip('There are fresh flowers on it. And a tiny handprint that glows gold, very softly.'),
    ]),
    secret('tower-clock', 'mossbell', 'Eight minutes to midnight', [
      pip('The bell tower clock is stopped at 11:52. Just like the Market Clock in Glowtown.'),
      pip('Just like Professor Lumen’s. Every clock on the Glowire stopped at the SAME minute.'),
      pip('What happened at 11:52?'),
    ]),
    secret('mill-lantern', 'mossbell', 'Across the stream', [
      pip('Across the stream! A light, walking! Walking by ITSELF!'),
      pip('…and gone. Hazel didn’t even look up. “Oh, that’s just her,” she said. JUST HER?!'),
    ]),
    secret('bellfield-lantern', 'mossbell', 'In the empty houses', [
      pip('In the window of an empty house… she’s looking right at us.'),
      pip('She doesn’t look scary. She looks like she’s waiting for someone.'),
    ]),

    // ── What people tell you once you've helped them ──
    secret('who:gran', 'glowtown', 'Gran’s friend', [
      says('gran', 'When I was about your age, Grandma Marigold took me up a valley to a village with a bell.'),
      says('gran', 'I made a friend there. A little girl made all of light. We played until the stars came out.'),
      says('gran', 'I told everyone at school. Nobody believed me. So I stopped telling.'),
    ], 'gran'),
    secret('who:theo', 'glowtown', 'Theo’s visitor', [
      says('theo', 'I’m NOT scared of the dark. But every night a lady with a lantern goes past my window.'),
      says('theo', 'Always at the same time. I checked the clock. Eight minutes to midnight.'),
    ], 'theo'),
    secret('who:finch', 'glowtown', 'The book nobody borrows', [
      says('finch', 'Shhh. There’s a book in my library nobody may borrow. The Glowire Ledger.'),
      says('finch', 'It says Marigold’s notebook had TEN pages. Not eight. Ten. Count yours.'),
    ], 'finch'),
    secret('who:coral', 'glowtown', 'What the fish know', [
      says('coral', 'Every night, at 8 minutes to midnight, all my fish turn to face the hills at once.'),
      says('coral', 'They stay like that for one minute. Then they go back to being fish.'),
    ], 'coral'),
    secret('who:dot', 'glowtown', 'The stubborn clock', [
      says('dot', 'Off the record? That Market Clock always stops at 11:52 when the power goes. Always.'),
      says('dot', 'New batteries, new springs, doesn’t matter. 11:52. Like it remembers something.'),
    ], 'dot'),
    secret('who:gus', 'harbour', 'Grandad’s lamps', [
      says('gus', 'My grandad swore there are lamps under the sea, out past the point. Rows of them, like a street.'),
      says('gus', 'He said the Glowire comes from there. That someone down there laid it first.'),
    ], 'gus'),
    secret('who:bolt', 'harbour', 'Memory file 0001', [
      says('bolt', 'BEEP. Playing memory file 0001.'),
      says('marigold', '“Keep the lights on, Bolt. For both of them.”'),
      says('bolt', 'Speaker: unknown. Initials stamped inside my chassis: M.W. BOOP.'),
    ], 'bolt'),
    secret('who:rosa', 'harbour', 'One stop further', [
      says('rosa', 'That night bus? The timetable says the harbour is the last stop.'),
      says('rosa', 'But some nights it goes one stop further. Up the valley. Nobody ever gets off there.'),
    ], 'rosa'),
    secret('who:lumen', 'harbour', 'Where Lumen grew up', [
      says('lumen', 'I wasn’t born in the harbour, you know. I grew up in a village up the valley. Mossbell.'),
      says('lumen', 'I left when I was six, the night the lights went out there. I don’t talk about it.'),
    ], 'lumen'),
    secret('who:hazel', 'mossbell', 'Thirteen bells', [
      says('hazel', 'Tom never fixed that bell. Something rings it. Thirteen times, when she’s close.'),
      says('hazel', 'He used to leave a lamp in the window for her. So she’d know somebody was still here.'),
    ], 'hazel'),
    secret('who:bram', 'mossbell', 'What the fog wants', [
      says('bram', 'The fog only comes when the lamps get low. It goes from lamp to lamp, swallowing.'),
      says('bram', 'It’s not wicked, I think. It’s hungry. Like something that’s forgotten how to shine.'),
    ], 'bram'),
    secret('who:moth', 'mossbell', 'Not scary', [
      says('moth', 'Everyone says the Lantern Lady is a ghost. She isn’t scary, though.'),
      says('moth', 'She looks sad. Like she’s looking for someone she lost.'),
    ], 'moth'),
    secret('who:wren', 'mossbell', 'Why Wren maps the wire', [
      says('wren', 'Mum grew up somewhere at the end of the Glowire, but she never said where.'),
      says('wren', 'That’s why I’ve been mapping it. To find the way to wherever she came from.'),
    ], 'wren'),
    secret('who:pip', 'glowtown', 'Pip’s eye', [
      pip('Bzzt… can I tell you something? Gran built me from an old battery and ONE LED.'),
      pip('The LED came out of a lantern. A very old one. Whose lantern? She won’t say.'),
    ], 'pip'),
    secret('who:grumble', 'mossbell', 'What Grumble missed', [
      says('grumble', '…all those years in the dark, I thought she forgot me.'),
      says('grumble', 'Don’t tell anyone I said this. I missed her. Every night. Hmph.'),
    ], 'grumble'),
  ].map((s) => [s.id, s]),
);

/** Seen-list key for a found secret. */
export const secretKey = (id: string) => `secret:${id}`;

/**
 * Townspeople with something more to say once you've helped them (or, for those without a
 * job, once the story has reached them): the secret, and the scene that must have been
 * seen first, if any.
 */
export const PERSON_SECRETS: Record<string, { secret: string; afterScene?: string }> = {
  gran: { secret: 'who:gran', afterScene: 'woods-outro' },
  theo: { secret: 'who:theo' },
  finch: { secret: 'who:finch' },
  coral: { secret: 'who:coral' },
  dot: { secret: 'who:dot' },
  gus: { secret: 'who:gus' },
  bolt: { secret: 'who:bolt' },
  rosa: { secret: 'who:rosa' },
  lumen: { secret: 'who:lumen' },
  hazel: { secret: 'who:hazel' },
  bram: { secret: 'who:bram' },
  moth: { secret: 'who:moth' },
  wren: { secret: 'who:wren', afterScene: 'hollow-intro' },
  pip: { secret: 'who:pip', afterScene: 'clock-outro' },
  grumble: { secret: 'who:grumble', afterScene: 'tower-outro' },
};

/** Secrets that belong to a world (for its counter in the corner). */
export function secretsIn(world: string): Secret[] {
  return Object.values(SECRETS).filter((s) => s.world === world);
}
