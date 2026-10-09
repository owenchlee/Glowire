// Districts of Glowtown and the little scenes between them.

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

export interface District {
  /** The chapter whose jobs are in this district. */
  chapter: number;
  name: string;
  /** Night sky, top to bottom. */
  sky: [string, string];
  ground: string;
  /** Plays the first time the district opens. */
  intro: Scene;
  /** Plays when its last job is solved. */
  outro: Scene;
}

export const PROLOGUE: Scene = {
  id: 'prologue',
  lines: [
    { who: 'gran', text: 'Pip! Wake up! The whole town has gone dark.' },
    { who: 'pip', text: 'Bzzt! Wha…? Oh no. Not again. Was it Grumble?' },
    {
      who: 'gran',
      text: 'That grumpy little thundercloud zapped the power station last night. Every light in Glowtown is out.',
    },
    { who: 'grumble', text: 'HMPH. Too bright. Too cheerful. Much better now.' },
    {
      who: 'gran',
      text: 'My knees are too old for ladders, so you two are my apprentices now. Folks will call with jobs.',
    },
    {
      who: 'gran',
      text: 'Fix their lights and the town comes back to life. Use real electronics, mind. No shortcuts.',
    },
    { who: 'pip', text: 'And they pay in sparks! Let’s light this town up!' },
  ],
};

export const DISTRICTS: District[] = [
  {
    chapter: 1,
    name: 'Maple Street',
    sky: ['#1d1b3a', '#3b3363'],
    ground: '#2f3d3a',
    intro: PROLOGUE,
    outro: {
      id: 'outro-1',
      lines: [
        { who: 'pell', text: 'Look at our street! Every window glowing!' },
        { who: 'grumble', text: 'Grr. Fine. Enjoy your little street. The MARKET stays dark!' },
        { who: 'pip', text: 'Market Square is next. Bring it on, cloud!' },
      ],
    },
  },
  {
    chapter: 2,
    name: 'Market Square',
    sky: ['#1b2440', '#3c3a6e'],
    ground: '#3a3348',
    intro: {
      id: 'intro-2',
      lines: [
        { who: 'gran', text: 'The shops want colour: green signs, blue signs, red signs.' },
        {
          who: 'gran',
          text: 'Here’s the thing. Every colour of LED needs a different push to light. Red is easy. Green needs a bit more. Blue needs nearly the whole battery.',
        },
        {
          who: 'grumble',
          text: 'Colours, schmolours. They’ll fight over the current like seagulls over a chip!',
        },
        { who: 'pip', text: 'He’s not wrong, actually. Let’s find out why.' },
      ],
    },
    outro: {
      id: 'outro-2',
      lines: [
        { who: 'dot', text: 'Traffic’s flowing! Shops are open! Market Square owes you one.' },
        {
          who: 'grumble',
          text: 'Pah. Wait till you see the Docks. Big batteries. Big danger. Big FRIZZLE.',
        },
      ],
    },
  },
  {
    chapter: 3,
    name: 'The Docks',
    sky: ['#14263a', '#2d4b6b'],
    ground: '#2a3a4c',
    intro: {
      id: 'intro-3',
      lines: [
        {
          who: 'rosa',
          text: 'Ahoy! The harbour’s pitch black. The boats can’t find their way in.',
        },
        {
          who: 'gran',
          text: 'Out here you’ll stack batteries for more push. Two in a row make 6 volts. Three make 9.',
        },
        {
          who: 'gran',
          text: 'More volts, more danger. A resistor that was safe before can fry an LED now.',
        },
        { who: 'grumble', text: 'Nine volts! Let’s see you not frizzle anything, sparky.' },
      ],
    },
    outro: {
      id: 'outro-3',
      lines: [
        {
          who: 'gus',
          text: 'The lighthouse is shining again. Fifty years, and I’ve never seen it brighter.',
        },
        { who: 'grumble', text: 'NO! Fine! I’ll hide in the clocktower. Nobody can fix THAT.' },
      ],
    },
  },
  {
    chapter: 4,
    name: 'Clocktower Hill',
    sky: ['#221a36', '#4a3768'],
    ground: '#33284a',
    intro: {
      id: 'intro-4',
      lines: [
        {
          who: 'lumen',
          text: 'Ah, the apprentices! Grumble’s lightning spun every gear and wire in my clock.',
        },
        {
          who: 'lumen',
          text: 'All the parts are still here. They’re just… turned. No drawing up here: tap a piece to turn it.',
        },
        { who: 'pip', text: 'Just turning? Bzzt. Okay, brain. Time to shine.' },
      ],
    },
    outro: {
      id: 'outro-4',
      lines: [
        { who: 'lumen', text: 'Listen! The clock is ticking again!' },
        { who: 'grumble', text: '…it is quite a nice tick, actually. Hmph.' },
        { who: 'pip', text: 'Was that… a compliment? Gran! Grumble said something nice!' },
        {
          who: 'gran',
          text: 'Well done, both of you. There’s more of Glowtown out there. Keep your eyes on the daily jobs.',
        },
      ],
    },
  },
];

export function districtFor(chapter: number): District | undefined {
  return DISTRICTS.find((d) => d.chapter === chapter);
}
