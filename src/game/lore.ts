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
//
// …in Brightwater Deep. Its lamplighters caught sea storms in great glass jars, and their
// Heart Jar sent light up the Glowire to the whole land long before Marigold. The night she
// switched her town on, lightning struck the wire and the whole storm ran down into the
// Heart Jar, which cracked at 11:52 (so every clock on the Glowire still stops then). Out of
// the crack came Glimmer and Grumble, and a third cloud nobody saw: the Hush, born in the
// dark and eating light to keep warm. Bits of her drift up the wire as Mossbell's fog. The
// two bells were cast together, one for the sea and one for the Hollow, and answer each
// other: that's the thirteenth ring. Fill the Heart Jar and the crack mends, and the Hush
// is just a little cloud who was cold. The storms that filled the jars come from Stormpeak.

import { SECRETS_BRAIN } from './extras/brain';
import { SECRETS_DEEP } from './extras/deep';
import { SECRETS_GLOWTOWN } from './extras/glowtown';
import { SECRETS_HARBOUR } from './extras/harbour';
import { SECRETS_MOSSBELL } from './extras/mossbell';
import type { Line } from './story';

export type WorldId = 'glowtown' | 'harbour' | 'mossbell' | 'deep';

export interface Secret {
  id: string;
  title: string;
  world: WorldId;
  /** The townsperson this secret is about, for the journal's People page. */
  about?: string;
  lines: Line[];
  /** Earned, not found: a best score in a brain game (save.games[game]) opens it. */
  unlock?: { game: string; score: number };
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

    // ── Things to find in Brightwater Deep ──
    secret('well-rope', 'deep', 'The little bell', [
      pip('A rope hangs all the way down the well from Mossbell. Tied to the end of it: a little bronze bell.'),
      pip('Every time the big bell rings up top, this one rings down here. Thirteen… the thirteenth ring is THIS one. Somebody down here has been answering.'),
    ]),
    secret('jar-labels', 'deep', 'The last jar', [
      pip('A shelf of old jars, each with a label. “Storm of 1903.” “Storm of 1911.” “The Big Blow, 1919.”'),
      pip('The last one says “THE NIGHT IT CRACKED. 11:52.” It’s empty. No, wait. It isn’t empty. Something in it is breathing.'),
    ]),
    secret('clam-pearl', 'deep', 'The pearl that blinks', [
      pip('Inside the great clam: a pearl with a tiny light in it, like a candle in a snow globe.'),
      pip('It’s blinking at the same speed as my eye. Bzzt. Blink. Blink. …It’s blinking AT me.'),
    ]),
    secret('drowned-bell', 'deep', 'One for the sea', [
      pip('A great bronze bell, half sunk in the sand. Words round the lip: “ONE FOR THE SEA. ONE FOR THE HOLLOW.”'),
      pip('There were TWO bells! One went up to Mossbell. When that one rings thirteen times, this one rings back.'),
    ]),
    secret('wreck-log', 'deep', 'The last page of the log', [
      pip('The Marigold’s logbook, dry in a tin box. The last page: “Going down to see the Heart Jar with Echo. Marlo says it holds every storm since forever.”'),
      pip('“If I can join it to my town, nobody up top will ever sit in the dark again.” And underneath, in wobbly writing: “What have I done.”'),
    ]),
    secret('hall-names', 'deep', 'Names on the floor', [
      pip('Names carved round the hall floor: every family who lived in Brightwater. Hundreds of them.'),
      pip('And by the jar, scratched very small, the newest name: “HUSH”. Somebody gave it a name a long time ago.'),
    ]),
    secret('street-shadow', 'deep', 'Something drinking', [
      pip('Something DARK just slid past that lamp, and the lamp went dim as it passed. Like it was… drinking it.'),
      pip('Gone. The lamp’s coming back. Slowly. Bzzt. I am staying RIGHT next to you.'),
    ]),
    secret('nursery-eyes', 'deep', 'Eyes in the kelp', [
      pip('EYES. Two eyes, in the kelp, looking right at us!'),
      pip('…and gone. Tess said not to look at them. I LOOKED AT THEM.'),
    ]),
    secret('wreck-diver', 'deep', 'The diver', [
      pip('A diver! In a brass suit, walking along the sea floor… and waving at us.'),
      pip('Then the kelp closes and they’re gone. Divers don’t live down here. Do they?'),
    ]),
    secret('wreck-shadow', 'deep', 'It follows', [
      pip('The shadow is following us. When we stop, it stops. When we look, it isn’t there.'),
      pip('It doesn’t feel angry, though. It feels… cold. Like it wants to sit by our lantern.'),
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
    secret('who:pearl', 'deep', 'Pearl’s name', [
      says('pearl', 'Grandpa says I’m named after the light in the big clam.'),
      says('pearl', 'When I was a baby, every lamp in the street went out but that one. He says it kept watch over me all night.'),
    ], 'pearl'),
    secret('who:marlo', 'deep', 'Marigold’s lantern', [
      says('marlo', 'When Marigold went back up, she left me her lantern. I lit every lamp on this street from it for ninety years.'),
      says('marlo', 'Then one winter it went out. That was the winter the Hush moved into the hall.'),
    ], 'marlo'),
    secret('who:tess', 'deep', 'What the fish know', [
      says('tess', 'Every night, at eight minutes to midnight, all my fish turn to face the Heart Hall. All at once.'),
      says('tess', 'There’s a lady in a town up top who keeps fish. I bet hers do the same.'),
    ], 'tess'),
    secret('who:echo', 'deep', 'Memory file 0003', [
      says('marigold', '“Echo, if I don’t come back down, keep taking pictures. One day someone will need to see what’s in the dark.”'),
      says('echo', 'Echo has taken 31,412 pictures of the dark. In six of them, it is smiling.'),
    ], 'echo'),
    secret('who:hush', 'deep', 'The lady who sang', [
      says('hush', 'Sssh… a lady with a lantern used to sit by the crack and sing to me.'),
      says('hush', 'Then she stopped coming. I waited. I got so cold. …Is she coming back?'),
      says('gran', '…No, sweetheart. But I’m her granddaughter. And I know all her songs.'),
    ], 'hush'),
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
  pearl: { secret: 'who:pearl' },
  marlo: { secret: 'who:marlo' },
  tess: { secret: 'who:tess' },
  echo: { secret: 'who:echo' },
  hush: { secret: 'who:hush', afterScene: 'heart-outro' },
};

for (const s of [...SECRETS_GLOWTOWN, ...SECRETS_HARBOUR, ...SECRETS_MOSSBELL, ...SECRETS_DEEP, ...SECRETS_BRAIN]) SECRETS[s.id] = s;

/** Secrets that belong to a world (for its counter in the corner). */
export function secretsIn(world: string): Secret[] {
  return Object.values(SECRETS).filter((s) => s.world === world);
}

/** Secrets that a mini-game score opens (extras/brain.ts). */
export function puzzleSecrets(): Secret[] {
  return Object.values(SECRETS).filter((s) => s.unlock);
}

/** Puzzle secrets whose score the best scores in `games` reach and `seen` doesn't hold yet. */
export function earnedPuzzleSecrets(games: Record<string, number>, seen: string[], game?: string): Secret[] {
  return puzzleSecrets().filter(
    (s) => (!game || s.unlock!.game === game) && (games[s.unlock!.game] ?? 0) >= s.unlock!.score && !seen.includes(secretKey(s.id)),
  );
}
