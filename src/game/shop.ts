// Everything sparks can buy. Pets are tools; the rest is cosmetic.

export type ItemKind = 'pet' | 'wire' | 'board' | 'hat' | 'outfit';

interface ItemBase {
  id: string;
  kind: ItemKind;
  name: string;
  price: number;
  blurb: string;
}

export interface PetItem extends ItemBase {
  kind: 'pet';
  ability: 'dig' | 'wise' | 'shiny';
  /** What the ability does, shown on its button and in the shop. */
  power: string;
  body: string;
  accent: string;
}

export interface WireItem extends ItemBase {
  kind: 'wire';
  color: string;
  glow: string;
}

export interface BoardItem extends ItemBase {
  kind: 'board';
  side: string;
  cellA: string;
  cellB: string;
  /** Behind the board in the 3D scene. */
  backdrop: string;
}

export interface HatItem extends ItemBase {
  kind: 'hat';
}

/** Clothes for the hero. The sprites are made by scripts/art.mjs (OUTFITS there). */
export interface OutfitItem extends ItemBase {
  kind: 'outfit';
}

export type ShopItem = PetItem | WireItem | BoardItem | HatItem | OutfitItem;

export const PETS: PetItem[] = [
  {
    id: 'scout',
    kind: 'pet',
    name: 'Scout the Dog',
    price: 200,
    blurb: 'Digs where nobody else would think to look. Good dog.',
    ability: 'dig',
    power: 'Dig: fixes one piece of your board. Once per job.',
    body: '#8a7a92',
    accent: '#ff9fb2',
  },
  {
    id: 'hoot',
    kind: 'pet',
    name: 'Hoot the Parrot',
    price: 250,
    blurb: 'Very sharp eyes. Repeats everything you say.',
    ability: 'wise',
    power: 'Wise Eye: crosses out parts you won’t need. Once per job.',
    body: '#c49a6c',
    accent: '#ffd56b',
  },
  {
    id: 'penny',
    kind: 'pet',
    name: 'Penny the Raccoon',
    price: 400,
    blurb: 'Loves anything shiny. Especially sparks.',
    ability: 'shiny',
    power: 'Shiny Finder: +50% sparks from every job.',
    body: '#3d3a4a',
    accent: '#7fb3ff',
  },
];

export const WIRES: WireItem[] = [
  {
    id: 'copper',
    kind: 'wire',
    name: 'Copper',
    price: 0,
    blurb: 'The classic.',
    color: '#e8a93a',
    glow: '#ffd56b',
  },
  {
    id: 'gold',
    kind: 'wire',
    name: 'Gold',
    price: 60,
    blurb: 'Fancy.',
    color: '#f4cf3f',
    glow: '#fff1a0',
  },
  {
    id: 'mint',
    kind: 'wire',
    name: 'Mint',
    price: 80,
    blurb: 'Cool and fresh.',
    color: '#45c99a',
    glow: '#a8ffd9',
  },
  {
    id: 'bubblegum',
    kind: 'wire',
    name: 'Bubblegum',
    price: 80,
    blurb: 'Pop!',
    color: '#ff7eb6',
    glow: '#ffc4de',
  },
  {
    id: 'ice',
    kind: 'wire',
    name: 'Ice',
    price: 100,
    blurb: 'Brrr.',
    color: '#69b7ff',
    glow: '#c9e6ff',
  },
  {
    id: 'neon',
    kind: 'wire',
    name: 'Neon',
    price: 150,
    blurb: 'Glows extra hard.',
    color: '#a65cff',
    glow: '#e2c4ff',
  },
];

export const BOARDS: BoardItem[] = [
  {
    id: 'wood',
    kind: 'board',
    name: 'Workbench',
    price: 0,
    blurb: 'Gran’s old workbench.',
    side: '#e6d6c0',
    cellA: '#f3e8d8',
    cellB: '#efe2cf',
    backdrop: '#f3ece4',
  },
  {
    id: 'blueprint',
    kind: 'board',
    name: 'Blueprint',
    price: 120,
    blurb: 'Feel like a real engineer.',
    side: '#3f6fb5',
    cellA: '#4f84cc',
    cellB: '#4a7cc2',
    backdrop: '#dfe9f7',
  },
  {
    id: 'meadow',
    kind: 'board',
    name: 'Meadow',
    price: 100,
    blurb: 'Circuits on a picnic.',
    side: '#8cc57e',
    cellA: '#b9e2a6',
    cellB: '#acd99a',
    backdrop: '#eef7e6',
  },
  {
    id: 'candy',
    kind: 'board',
    name: 'Candy',
    price: 120,
    blurb: 'Do not lick the board.',
    side: '#f3a6c8',
    cellA: '#ffd6e8',
    cellB: '#fcc9df',
    backdrop: '#fff0f6',
  },
  {
    id: 'midnight',
    kind: 'board',
    name: 'Midnight',
    price: 150,
    blurb: 'Your lights look brighter in the dark.',
    side: '#3a3458',
    cellA: '#4b4470',
    cellB: '#453f68',
    backdrop: '#26223a',
  },
];

export const HATS: HatItem[] = [
  { id: 'nohat', kind: 'hat', name: 'No hat', price: 0, blurb: 'Pip, as nature intended.' },
  { id: 'hardhat', kind: 'hat', name: 'Hard hat', price: 50, blurb: 'Safety first!' },
  { id: 'party', kind: 'hat', name: 'Party hat', price: 60, blurb: 'Every job is a party.' },
  { id: 'headphones', kind: 'hat', name: 'Headphones', price: 90, blurb: 'Beep boop beats.' },
  { id: 'wizard', kind: 'hat', name: 'Wizard hat', price: 140, blurb: 'Electricity is magic.' },
  { id: 'crown', kind: 'hat', name: 'Crown', price: 250, blurb: 'Ruler of Glowtown.' },
];

export const OUTFITS: OutfitItem[] = [
  { id: 'uniform', kind: 'outfit', name: 'Glowire uniform', price: 0, blurb: 'Sunny yellow. Gran’s orders.' },
  { id: 'ember', kind: 'outfit', name: 'Ember hoodie', price: 80, blurb: 'Warm as a lit filament.' },
  { id: 'tide', kind: 'outfit', name: 'Harbour blue', price: 100, blurb: 'Captain Rosa approves.' },
  { id: 'moss', kind: 'outfit', name: 'Explorer', price: 120, blurb: 'Wren lent you the pattern.' },
  { id: 'plum', kind: 'outfit', name: 'Stargazer', price: 150, blurb: 'For Star Night.' },
  { id: 'snow', kind: 'outfit', name: 'Night shift', price: 200, blurb: 'So bright it glows in the dark. Almost.' },
];

export const CATALOGUE: ShopItem[] = [...PETS, ...WIRES, ...BOARDS, ...HATS, ...OUTFITS];

/** The hero's sprite (people.generated.ts) for an outfit. */
export const outfitSprite = (id: string) => (id === 'uniform' ? 'hero' : `hero-${id}`);

export function item(id: string): ShopItem | undefined {
  return CATALOGUE.find((i) => i.id === id);
}

export function itemOf<K extends ItemKind>(kind: K, id: string | null) {
  const found = CATALOGUE.find((i) => i.kind === kind && i.id === id);
  return found as Extract<ShopItem, { kind: K }> | undefined;
}
