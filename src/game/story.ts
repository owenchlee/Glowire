import { SCENES_DEEP } from './extras/deep';
import { SCENES_GLOWTOWN } from './extras/glowtown';
import { SCENES_HARBOUR } from './extras/harbour';
import { SCENES_MOSSBELL } from './extras/mossbell';

// The story: scenes that play as you travel the route, and the pages of Marigold's
// notebook you find along the way.
//
// The lore, in short. A hundred years ago Marigold Watts (Gran's grandmother) joined up
// the Glowire, one copper line that carries light to every lamp in town. The night she
// first switched it on, lightning struck it and left a little storm cloud behind: Grumble.
// He hides from bright lights and hums in the dark, and last night he zapped the power.
// Marigold's pages hint that the Glowire is older than her, and runs in from the sea.
//
// After Star Night, one light stays on far up the valley, in Mossbell Hollow, where a
// "Lantern Lady" walks at night. She is Glimmer, Grumble's twin. Below Mossbell's well
// lies Brightwater Deep, where the Glowire really begins: the cracked Heart Jar, and the
// Hush, the third cloud nobody saw. The mystery behind it all, and the secrets that hint
// at it, live in lore.ts.

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
      { who: 'wren', text: 'Wait. Everybody’s switched off for Star Night… so why is there still ONE light on? Way up the valley?' },
      { who: 'lumen', text: '…Mossbell Hollow. That light hasn’t gone out in fifty years.' },
      { who: 'grumble', text: '…' },
      { who: 'pip', text: 'Grumble? Your sparks have gone all wobbly.' },
      { who: 'grumble', text: 'Nothing. It’s NOTHING. Don’t go up there.' },
      { who: 'gran', text: 'There’s a bus by the hilltop gate that goes one stop further. I think it’s time I took it again.' },
    ]),

    // ── Mossbell Hollow ──
    scene('hollow-intro', [
      { who: 'wren', text: 'Mossbell Hollow. It’s on Marigold’s map. It isn’t on anybody else’s.' },
      { who: 'gran', text: 'I’ve been here before. A long, long time ago.' },
      { who: 'pip', text: 'Gran? Why are you whispering?' },
      {
        who: 'gran',
        text: 'Stay on the path, kiddo. And if you see a light moving where no light should be… don’t chase it. Let it come to you.',
      },
      { who: 'pip', text: 'Bzzt. That is the spookiest thing you have ever said.' },
    ]),
    scene('gran-hollow', [
      { who: 'gran', text: 'Hazel Thorn still keeps the mill, I think. If anyone knows what’s going on up here, she will.' },
    ]),
    scene('wren-hollow', [
      { who: 'wren', text: 'My map says the Glowire runs right through the middle of the village… and ends at a bell.' },
    ]),
    scene('mill-intro', [
      { who: 'hazel', text: 'Visitors? Nobody visits Mossbell. Not since the Long Dark.' },
      { who: 'pip', text: 'The… Long Dark?' },
      {
        who: 'hazel',
        text: 'Fifty years ago every lamp in the Hollow went out at once, and the bell rang thirteen times. By morning, half the village had packed up and gone.',
      },
      { who: 'hazel', text: 'I stayed. My Tom stayed. Somebody had to keep the lamps lit for… well. You’ll see.' },
    ]),
    scene('mill-outro', [
      { who: 'hazel', text: 'Light on the mill again. Tom would have cried like a baby.' },
      { who: 'wren', text: 'Hazel… Thorn? My mum’s name was Thorn. Ivy Thorn. She grew up somewhere she never told me about.' },
      { who: 'hazel', text: '…Ivy? My little Ivy? Then you’re… oh. Oh, come here.' },
      { who: 'pip', text: 'Bzzt! She’s Wren’s GRANDMA! I’m crying. Robots can’t cry. I’m leaking.' },
      { who: 'hazel', text: 'The Mere’s next. Mind the fog. It doesn’t like light, and it’s been getting braver.' },
    ]),
    scene('mere-intro', [
      { who: 'bram', text: 'Stop there. Don’t step off the path. The fog’s in tonight.' },
      { who: 'bram', text: 'It rolls off the water when the lamps get low. Swallows the light whole, then moves on to the next lamp.' },
      { who: 'grumble', text: 'That’s NOT me, before anyone asks. I don’t DO fog.' },
      { who: 'pip', text: 'Grumble?! You came after all!' },
      { who: 'grumble', text: 'I got bored on the bus. Shush.' },
    ]),
    scene('mere-outro', [
      { who: 'bram', text: 'Look at it pull back. Fog can’t stand a good bright lamp.' },
      { who: 'moth', text: 'Psst! Up here! You fixed the Mere? Then you HAVE to come to Bellfield. She was there last night.' },
      { who: 'moth', text: 'The Lantern Lady.' },
    ]),
    scene('bellfield-intro', [
      { who: 'pip', text: 'BONG… bong… bong… bong… bong… …thirteen? Bells don’t DO thirteen!' },
      { who: 'moth', text: 'It does that when she’s close. I count every time.' },
      { who: 'moth', text: 'Nobody’s lived in Bellfield since the Long Dark. I just visit. Grandpa used to look after the lamps here.' },
      { who: 'wren', text: 'Look at the moss. Footprints. Glowing ones. Going toward the tower.' },
    ]),
    scene('bellfield-outro', [
      { who: 'moth', text: 'Every house in Bellfield lit! Grandpa would be SO happy.' },
      { who: 'lumen', text: 'Hello, Mossbell. It’s been seventy years.' },
      { who: 'pip', text: 'Professor Lumen?! What are YOU doing here?' },
      {
        who: 'lumen',
        text: 'Coming home, Pip. I was born in that little house. And I think it’s time I told you what I saw the night of the Long Dark.',
      },
    ]),
    scene('tower-intro', [
      {
        who: 'lumen',
        text: 'I was six. I looked up, and she was at the top of the tower with a lantern, trying to keep every lamp in the Hollow lit all by herself.',
      },
      { who: 'lumen', text: 'She couldn’t. The lamps went out, the bell rang, and everyone ran. Everyone but me. She waved at me.' },
      { who: 'grumble', text: '…I know that bell.' },
      { who: 'pip', text: 'Grumble? Your sparks are going all wobbly again.' },
    ]),
    scene('tower-outro', [
      { who: 'glimmer', text: 'A hundred years I’ve kept Marigold’s lantern burning up here. I was getting so tired.' },
      { who: 'grumble', text: 'You could have come HOME. You could have come and found ME.' },
      {
        who: 'glimmer',
        text: 'I tried! But every time I came near the town, the lamps were so bright I couldn’t find you. And you were always hiding in the dark.',
      },
      {
        who: 'gran',
        text: 'Two clouds from one storm. One who loves the dark, one who loves the light. Grandma Marigold told me. I was the only one who believed her.',
      },
      { who: 'grumble', text: '…I missed you.' },
      { who: 'glimmer', text: 'I missed you too, little brother.' },
      { who: 'grumble', text: 'I’m OLDER!' },
      { who: 'glimmer', text: 'By one lightning bolt.' },
      { who: 'pip', text: 'Bzzt… my eye’s glowing all by itself. Gran… is my LED from her lantern?' },
      { who: 'gran', text: 'It is. Marigold gave it to me. “Keep a bit of the light with you,” she said. “It’ll always find its way home.”' },
      { who: 'wren', text: 'Then that’s the end of the Glowire. My map’s finished!' },
      { who: 'lumen', text: 'Is it? Read what’s written round the bell.' },
      { who: 'pip', text: '“Cast from the light under the sea.” …Under the SEA?!' },
      { who: 'glimmer', text: 'That’s where the light comes from. I can feel it, deep down. The old well behind the tower goes all the way there.' },
      { who: 'glimmer', text: 'Hold on to my bubble and I’ll take you. But it’s very dark down there. And something lives in the dark.' },
    ]),

    // ── Brightwater Deep ──
    scene('deep-intro', [
      { who: 'glimmer', text: 'Hold on to my bubble! Down, down, down…' },
      { who: 'pip', text: 'Bzzt… we’re UNDER THE SEA. I’m a robot. Robots and seawater are NOT friends.' },
      { who: 'glimmer', text: 'My bubble keeps the water out. But it’s darker down here than any night up top, and your lantern will run down.' },
      { who: 'gran', text: 'Keep to the light, kiddo. Stand by a lit lamp and your lantern fills right back up. Let it run out and… well. Don’t let it run out.' },
      { who: 'wren', text: 'Look, a street! Lamps in rows. Old Gus’s grandad was right: there’s a whole town down here.' },
      { who: 'hush', text: 'Sssssshhhhhhh…' },
      { who: 'pip', text: '…who said that?' },
      { who: 'glimmer', text: 'Nobody. Stay in the light.' },
    ]),
    scene('gran-deep', [
      { who: 'gran', text: 'My grandmother came down here once. She never told me how. Only that she left something behind, and she was sorry.' },
    ]),
    scene('wren-deep', [{ who: 'wren', text: 'My map’s never had a “down” before. I’m drawing it sideways. It looks like a jellyfish.' }]),
    scene('glimmer-deep', [
      { who: 'glimmer', text: 'I remember this place. Not with my eyes. With my sparks. It feels like where I was born.' },
    ]),
    scene('jars-intro', [
      { who: 'pearl', text: 'Visitors! From UP? Nobody ever comes from up! I’m Pearl. Welcome to Brightwater!' },
      {
        who: 'pearl',
        text: 'We keep lightning in jars down here. Every lamp has one. Fill it while the battery’s on, and it keeps glowing after the battery stops.',
      },
      { who: 'marlo', text: 'Pearl. Inside. It’s getting dark.' },
      { who: 'pearl', text: 'That’s Grandpa Marlo. He’s grumpy because the lamps keep fading. Every year they’re dimmer, and the dark gets closer.' },
    ]),
    scene('jars-outro', [
      { who: 'marlo', text: 'Hm. You’ve lit the whole street. I haven’t seen it like this since I was a boy.' },
      { who: 'marlo', text: '…A girl came down here once, when I was a boy. From up top, with a lantern and a notebook. Her name was Marigold.' },
      { who: 'gran', text: 'That was my grandmother!' },
      { who: 'marlo', text: 'Then you’d better come and see what she did. Through the nursery. And mind the dark.' },
    ]),
    scene('nursery-intro', [
      { who: 'tess', text: 'Shh! Slowly, slowly. The little ones scare easily since the dark started moving.' },
      { who: 'pip', text: 'Since the dark started… MOVING?' },
      { who: 'tess', text: 'A lamp goes out, then another, and something drifts past where it was. Something cold. We call it the Hush.' },
    ]),
    scene('nursery-outro', [
      { who: 'tess', text: 'The nursery’s never been so bright. Look, the baby fish are following YOU.' },
      { who: 'echo', text: 'PING. PING. Light detected. Unusual amount. Approaching.' },
      { who: 'pip', text: 'A ROBOT! A brass one! Hello! Are you related to Bolt?' },
      { who: 'echo', text: 'Bolt? …Bolt. My brother. Marigold built us both. He went up. Echo stayed down. To keep watch.' },
    ]),
    scene('wreck-intro', [
      { who: 'echo', text: 'This is the Marigold. Her boat. She sailed it out past the lighthouse, one hundred years ago, to find where the Glowire began.' },
      { who: 'wren', text: 'Marigold’s boat was called the Marigold?' },
      { who: 'echo', text: 'She said that was a coincidence. Nobody believed her.' },
      { who: 'grumble', text: '…I don’t like it here. It smells like the night I was made.' },
    ]),
    scene('wreck-outro', [
      { who: 'echo', text: 'Playing memory file 0002.' },
      {
        who: 'marigold',
        text: '“A storm’s coming, Echo. If lightning hits the line tonight, the Heart Jar will take all of it. Keep the lights on. For all THREE of them.”',
      },
      { who: 'pip', text: 'All three? THREE?' },
      { who: 'echo', text: 'Memory ends. Echo has wondered about the third for ninety-nine years.' },
      { who: 'glimmer', text: '…Grumble. Do you hear that? In the hall. Something’s crying.' },
      { who: 'grumble', text: 'It’s not crying. It’s going “shhhh”.' },
    ]),
    scene('heart-intro', [
      { who: 'marlo', text: 'The Heart Jar. It sent our light up the Glowire to the whole land, long before Marigold ever joined her town to it.' },
      {
        who: 'marlo',
        text: 'The night she switched her town on, lightning hit the wire up on the hill. The whole storm ran down the line, into this jar. And it cracked. At eight minutes to midnight.',
      },
      { who: 'marlo', text: 'Light poured out of the crack: two little bright clouds, up the wire. And the dark poured in. It’s been feeding ever since.' },
      { who: 'hush', text: 'Sssshhhhh. Mine. The light is MINE.' },
      { who: 'pip', text: 'That’s the Hush?! It’s… a cloud! A dark little cloud!' },
      { who: 'marlo', text: 'Fill the jar. Whatever it eats, fill it again.' },
    ]),
    scene('heart-outro', [
      { who: 'marlo', text: 'Full. And the crack… look. It’s closing. The jar is mending itself.' },
      { who: 'hush', text: '…warm. It’s… warm.' },
      { who: 'glimmer', text: 'Grumble, look at her. She’s just like us. She came out of the crack the same night we did.' },
      { who: 'grumble', text: 'A THIRD one? We have a little SISTER?' },
      { who: 'hush', text: '…sssh. …hello.' },
      {
        who: 'glimmer',
        text: 'She was born in the dark, where nobody could see her. So she ate the light to keep warm. All alone, for a hundred years.',
      },
      { who: 'grumble', text: 'Well, she’s not alone NOW. Hmph. She can sit with me. I like the dark too.' },
      { who: 'gran', text: 'Two clouds from one storm, my grandmother told me. She never mentioned a third. Or maybe she tried to.' },
      { who: 'pip', text: 'THREE clouds! Grumble, Glimmer and Hush! That’s a whole weather!' },
      { who: 'marlo', text: 'The jar is full for now. But it was made to be filled by storms, and storms don’t reach this far down any more.' },
      { who: 'marlo', text: 'They’re born up north, on Stormpeak, where the Glowire’s other end climbs right into the clouds.' },
      { who: 'wren', text: 'The Glowire has ANOTHER end? My map isn’t finished at ALL!' },
    ]),
    scene('hush-before', [{ who: 'hush', text: 'Sssshhhhh. Go away. Go AWAY. It’s mine. All of it.' }]),
    scene('hush-after', [{ who: 'hush', text: 'Sssh… thank you… light-fixer. The jar hums. Like a heartbeat.' }]),
    scene('grumble-deep', [{ who: 'grumble', text: 'She snores. Clouds don’t snore. She SNORES. …I’m keeping her.' }]),
    scene('glimmer-after', [
      { who: 'glimmer', text: 'Marigold always set out three cups on Star Night. Gran thought she was being silly. Now I know why.' },
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
    note('valley', 9, 'Up the valley', [
      'The little cloud is not alone. On the night of the storm I saw another light going AWAY, following the wire up the valley.',
      'Up to the Hollow, where the mill-folk keep their lamps burning late. I hope they’re kind to it.',
    ]),
    note('two', 10, 'Two of them', [
      'I never told anyone, because who would believe it? The lightning didn’t leave one little cloud. It left TWO.',
      'One sulked in the dark. One sang in the light. I named the dark one Grumble. The bright one named herself: Glimmer. She lit my kitchen for a week.',
    ]),
    note('jars', 11, 'Jars of light', [
      'They keep lightning in JARS down here! A jar fills up while current flows into it, and pours it back out, slowly, once the current stops.',
      'The bigger the jar, the longer it pours. Marlo calls it “capacity”. I call it magic with good manners.',
    ]),
    note('heart', 12, 'Three', [
      'When the Heart Jar cracked, three things came out of it, not two. Two flew up the wire, glowing. The third hid in the crack and wouldn’t come to me.',
      'I named it Hush, because that’s all it would say. I left a lantern burning by the jar for it. I hope that one day somebody finds it, and is kind to it.',
    ]),
  ].map((n) => [n.id, n]),
);

export function sceneOf(id: string): Scene | undefined {
  return SCENES[id];
}
for (const s of [...SCENES_GLOWTOWN, ...SCENES_HARBOUR, ...SCENES_MOSSBELL, ...SCENES_DEEP]) SCENES[s.id] = s;
