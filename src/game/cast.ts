// The people of Glowtown. Portraits are drawn from these traits (ui/characters/Portrait).

export type HairStyle =
  'short' | 'curly' | 'bun' | 'long' | 'ponytail' | 'spiky' | 'bald' | 'afro' | 'bob';

export type Hat = 'cap' | 'chef' | 'captain' | 'police' | 'beanie' | 'flower' | 'top';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  kid?: boolean;
  glasses?: boolean;
  hat?: Hat;
  hatColor?: string;
  beard?: boolean;
  freckles?: boolean;
}

export interface Person {
  id: string;
  name: string;
  /** One line about them, shown on their job card. */
  role: string;
  look: Look;
}

const SKIN = ['#ffd9bf', '#f1c09b', '#d9a07a', '#b97c55', '#8d5a3b', '#6b4029'] as const;

export const CAST: Record<string, Person> = {
  gran: {
    id: 'gran',
    name: 'Gran Watts',
    role: 'Retired electrician. Runs the workshop.',
    look: { skin: SKIN[1], hair: '#d9d4e0', hairStyle: 'bun', shirt: '#9a7fd1', glasses: true },
  },
  pell: {
    id: 'pell',
    name: 'Mrs. Pell',
    role: 'Grows prize tomatoes on Maple Street.',
    look: { skin: SKIN[0], hair: '#d9653b', hairStyle: 'curly', shirt: '#7cc59a' },
  },
  okoro: {
    id: 'okoro',
    name: 'Mr. Okoro',
    role: 'Gardener. Very proud of his stone wall.',
    look: { skin: SKIN[5], hair: '#2b2230', hairStyle: 'short', shirt: '#e2a64b', beard: true },
  },
  rafi: {
    id: 'rafi',
    name: 'Uncle Rafi',
    role: 'Makes the best soup on the street.',
    look: { skin: SKIN[3], hair: '#3a2d2a', hairStyle: 'bald', shirt: '#e77d6b', beard: true },
  },
  theo: {
    id: 'theo',
    name: 'Theo',
    role: 'Age 7. Definitely not scared of the dark.',
    look: {
      skin: SKIN[1],
      hair: '#7a4a2b',
      hairStyle: 'spiky',
      shirt: '#6f9be8',
      kid: true,
      freckles: true,
    },
  },
  twins: {
    id: 'twins',
    name: 'Mo & Jo',
    role: 'Twins. Everything must be exactly fair.',
    look: { skin: SKIN[4], hair: '#1f1a22', hairStyle: 'afro', shirt: '#f2c94c', kid: true },
  },
  arjun: {
    id: 'arjun',
    name: 'Mr. Arjun',
    role: 'Baker. Up at 4 a.m. every day.',
    look: { skin: SKIN[3], hair: '#241c22', hairStyle: 'short', shirt: '#f7f2ea', hat: 'chef' },
  },
  nadia: {
    id: 'nadia',
    name: 'Nadia',
    role: 'New mum. Very, very tired.',
    look: { skin: SKIN[2], hair: '#3b2a26', hairStyle: 'ponytail', shirt: '#e98fb0' },
  },
  ito: {
    id: 'ito',
    name: 'Ms. Ito',
    role: 'Teaches Year 4 at Maple School.',
    look: { skin: SKIN[0], hair: '#1e1b26', hairStyle: 'bob', shirt: '#5bbfae', glasses: true },
  },
  finch: {
    id: 'finch',
    name: 'Mr. Finch',
    role: 'Librarian. Shhh.',
    look: {
      skin: SKIN[0],
      hair: '#b9b3c4',
      hairStyle: 'short',
      shirt: '#8a6d55',
      glasses: true,
      beard: true,
    },
  },
  benny: {
    id: 'benny',
    name: 'Benny',
    role: 'Runs the corner grocery.',
    look: {
      skin: SKIN[2],
      hair: '#4a3328',
      hairStyle: 'curly',
      shirt: '#3fcf7f',
      hat: 'cap',
      hatColor: '#2fa864',
    },
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    role: 'Keeps the aquarium. Talks to the fish.',
    look: { skin: SKIN[4], hair: '#3f8fd6', hairStyle: 'long', shirt: '#2a6fb0' },
  },
  luca: {
    id: 'luca',
    name: 'Luca',
    role: 'Pizza chef. Loud. Kind.',
    look: { skin: SKIN[1], hair: '#2d2128', hairStyle: 'short', shirt: '#e9554f', beard: true },
  },
  sunny: {
    id: 'sunny',
    name: 'Sunny',
    role: 'Sells ice cream, rain or shine.',
    look: {
      skin: SKIN[3],
      hair: '#f4c542',
      hairStyle: 'ponytail',
      shirt: '#ff9ec4',
      hat: 'flower',
    },
  },
  iris: {
    id: 'iris',
    name: 'Iris',
    role: 'Florist. Knows every flower’s name.',
    look: { skin: SKIN[5], hair: '#c06bd6', hairStyle: 'afro', shirt: '#a7d36b' },
  },
  dot: {
    id: 'dot',
    name: 'Officer Dot',
    role: 'Keeps Market Square traffic moving.',
    look: {
      skin: SKIN[2],
      hair: '#2a1f1d',
      hairStyle: 'bun',
      shirt: '#3c5aa8',
      hat: 'police',
      hatColor: '#2e447f',
    },
  },
  mei: {
    id: 'mei',
    name: 'Mei',
    role: 'Owns Café Moonbeam.',
    look: { skin: SKIN[0], hair: '#2b2028', hairStyle: 'long', shirt: '#c9a37a' },
  },
  rosa: {
    id: 'rosa',
    name: 'Captain Rosa',
    role: 'Harbour master. Has seen every kind of storm.',
    look: {
      skin: SKIN[3],
      hair: '#2a1d1b',
      hairStyle: 'ponytail',
      shirt: '#2f4e7a',
      hat: 'captain',
      hatColor: '#f7f4ee',
    },
  },
  sal: {
    id: 'sal',
    name: 'Sal',
    role: 'Throws the best boat parties.',
    look: {
      skin: SKIN[1],
      hair: '#e0784a',
      hairStyle: 'spiky',
      shirt: '#ff7aa8',
      freckles: true,
    },
  },
  gus: {
    id: 'gus',
    name: 'Old Gus',
    role: 'Lighthouse keeper for 50 years.',
    look: {
      skin: SKIN[2],
      hair: '#efeaf2',
      hairStyle: 'bald',
      shirt: '#e8c25a',
      beard: true,
      hat: 'beanie',
      hatColor: '#d0574f',
    },
  },
  lumen: {
    id: 'lumen',
    name: 'Professor Lumen',
    role: 'Keeper of the old clocktower.',
    look: {
      skin: SKIN[1],
      hair: '#ece6f3',
      hairStyle: 'curly',
      shirt: '#5a4a7a',
      glasses: true,
      hat: 'top',
      hatColor: '#3a3048',
    },
  },
  wren: {
    id: 'wren',
    name: 'Wren',
    role: 'Explorer. Mapping the Glowire, bend by bend.',
    look: { skin: SKIN[2], hair: '#5a3a2a', hairStyle: 'ponytail', shirt: '#4fa86e', kid: true },
  },
  marigold: {
    id: 'marigold',
    name: 'Marigold’s notebook',
    role: 'Gran’s grandmother. She joined up the Glowire.',
    look: { skin: SKIN[0], hair: '#e3b04b', hairStyle: 'bun', shirt: '#d07a4a' },
  },
};

export function person(id: string): Person {
  const p = CAST[id];
  if (!p) throw new Error(`unknown townsperson ${id}`);
  return p;
}
