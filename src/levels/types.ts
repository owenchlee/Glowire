export type PartKey =
  'led' | 'ledGreen' | 'ledBlue' | 'battery' | 'r100' | 'r220' | 'r470' | 'r1000';

/** Brightness bands, as fractions of full (20 mA) LED brightness. */
export const BRIGHTNESS = {
  any: { min: 0, max: 1, word: '' },
  dim: { min: 0.03, max: 0.15, word: 'dimly' },
  medium: { min: 0.2, max: 0.42, word: 'at medium brightness' },
  bright: { min: 0.45, max: 1, word: 'brightly' },
} as const;
export type Brightness = keyof typeof BRIGHTNESS;

/** Switch positions a goal is checked in. Switches not listed are OFF. */
export type SwitchStates = Record<string, boolean>;

export type Goal =
  | { kind: 'lit'; led: string; brightness?: Brightness; when?: SwitchStates }
  | { kind: 'dark'; led: string; when?: SwitchStates }
  /** Exactly these LEDs light (in the band, if given) and every other LED is dark. */
  | { kind: 'only'; leds: string[]; brightness?: Brightness; when?: SwitchStates }
  /** Free builds: at least `count` LEDs on the board (placed ones too), every one lit. */
  | { kind: 'all'; count: number; brightness?: Brightness; when?: SwitchStates };

export interface LevelDef {
  id: number;
  title: string;
  /** Shown in the hint bubble when nothing is going wrong. */
  intro: string;
  /** Starting board as a picture (see engine/parse.ts). Pre-placed parts are locked. */
  board: string[];
  /**
   * Repair levels: pre-placed wires can be erased, and pre-placed parts whose kind is in
   * the inventory can be moved, turned and removed. Everything else stays locked.
   */
  loose?: boolean;
  /** Parts the player may have on the board (including loose pre-placed ones). */
  inventory: Partial<Record<PartKey, number>>;
  /**
   * Twist levels: `board` is the SOLVED picture. Every wire, LED and resistor is shuffled
   * by a turn picked from `seed`, and the player can only turn pieces back (no drawing).
   */
  twist?: { seed: number };
  /** Max wire tiles on the board, or null for unlimited. */
  wireBudget: number | null;
  goals: Goal[];
  /** Explicit labels for parts at (x, y); otherwise LEDs are A, B… and switches S1, S2… */
  labels?: Record<string, [number, number]>;
  /** Introduces a new part with a short explainer card; `token` draws it (parse.ts). */
  newPart?: { name: string; text: string; token: string };
}

export interface ChapterDef {
  id: number;
  title: string;
  /** One line under the chapter title on the level select screen. */
  blurb: string;
  levels: LevelDef[];
}
