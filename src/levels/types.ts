export type PartKey =
  'led' | 'ledGreen' | 'ledBlue' | 'battery' | 'r100' | 'r220' | 'r470' | 'r1000' | 'diode';

/** Brightness bands, as fractions of full (20 mA) LED brightness. */
export const BRIGHTNESS = {
  any: { min: 0, max: 1, word: '' },
  dim: { min: 0.03, max: 0.15, word: 'dimly' },
  medium: { min: 0.2, max: 0.42, word: 'at medium brightness' },
  bright: { min: 0.45, max: 1, word: 'brightly' },
} as const;
export type Brightness = keyof typeof BRIGHTNESS;

/**
 * Switch positions a goal is checked in. Switches not listed are OFF. For a changeover
 * switch, true means UP and false DOWN.
 */
export type SwitchStates = Record<string, boolean>;

export type Goal =
  | { kind: 'lit'; led: string; brightness?: Brightness; when?: SwitchStates }
  | { kind: 'dark'; led: string; when?: SwitchStates }
  /** Exactly these LEDs light (in the band, if given) and every other LED is dark. */
  | { kind: 'only'; leds: string[]; brightness?: Brightness; when?: SwitchStates }
  /** Free builds: at least `count` LEDs on the board (placed ones too), every one lit. */
  | { kind: 'all'; count: number; brightness?: Brightness; when?: SwitchStates }
  /** A meter's reading lands between min and max: milliamps (ammeter) or volts (voltmeter). */
  | { kind: 'meter'; meter: string; min: number; max: number; when?: SwitchStates };

/**
 * Extra challenges for the second and third star (the first star is solving the job).
 * - wire:  at most `max` wire tiles on the board.
 * - parts: at most `max` parts placed by the player (wires don't count).
 * - turns: twist jobs, at most `max` taps that turn a piece.
 * - goal:  an extra condition on top of the job's goals.
 * - safe:  no LED burned out at any point (the board the job starts with doesn't count).
 * - solo:  solved without Pip's tip or a pet's ability.
 */
export type StarGoal =
  | { kind: 'wire'; max: number }
  | { kind: 'parts'; max: number }
  | { kind: 'turns'; max: number }
  | { kind: 'goal'; goal: Goal }
  | { kind: 'safe' }
  | { kind: 'solo' };

/** Something Grumble does to the board between boss phases. */
export type Sabotage =
  /** Every battery: a new voltage, and/or turned around. */
  | { op: 'battery'; volts?: number; flip?: boolean }
  /** One placed part of this kind is zapped off the board, and the tray loses one. */
  | { op: 'zap'; part: PartKey }
  /** Gran throws in spare parts. */
  | { op: 'give'; part: PartKey; count: number }
  /** A boulder lands on cell (x, y), crushing whatever was there. */
  | { op: 'drop'; at: [number, number] }
  /** Twist bosses: every turnable piece spins again (from this seed). */
  | { op: 'scramble'; seed: number };

export interface Phase {
  /** What Grumble says as he strikes. */
  grumble: string;
  sabotage: Sabotage[];
  intro: string;
  goals: Goal[];
  /** A known solution for this phase, starting from the board after the sabotage. */
  solution: string[];
}

/** Who asked for the job, and what it means in the town. */
export interface Job {
  /** A townsperson id from game/cast.ts. */
  client: string;
  /** The building on the town map, e.g. "Mrs. Pell's porch". */
  place: string;
  building: BuildingKind;
  /** The client's request, in their own voice. */
  ask: string;
  /** What the client says when the job is done. */
  thanks: string;
}

export type BuildingKind =
  | 'house'
  | 'cottage'
  | 'shop'
  | 'cafe'
  | 'school'
  | 'signal'
  | 'tower'
  | 'lighthouse'
  | 'boat'
  | 'warehouse'
  | 'clock'
  | 'workshop'
  | 'station'
  | 'treehouse';

export interface LevelDef {
  id: number;
  title: string;
  /** Shown in the hint bubble when nothing is going wrong. */
  intro: string;
  /** Starting board as a picture (see engine/parse.ts). Pre-placed parts are locked. */
  board: string[];
  /**
   * A known solution as a picture (twist levels: `board` itself). Tests prove it solves the
   * job with all three stars, and pets use it to help.
   */
  solution?: string[];
  /** Pip's tip when the player taps Pip: a nudge, not the answer. */
  tip?: string;
  /** Goals for the second and third star. */
  stars?: [StarGoal, StarGoal];
  job?: Job;
  /** A Grumble sabotage at the end of a district: harder, and pays double. */
  boss?: boolean;
  /**
   * Boss fights: after the first goals are met, Grumble sabotages the board and sets new
   * goals, once per phase. The level's own goals, intro and solution are phase one.
   */
  phases?: Phase[];
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
