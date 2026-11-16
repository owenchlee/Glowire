// Pip, your guide: where to go next, what to say in the corner box, and the longer
// "Need help?" talk. No React in here.

import type { Line } from '../game/story';
import { person } from '../game/cast';
import { bandText } from '../levels/evaluate';
import { LEVELS } from '../levels/levels';
import { type Solved, areaOfJob, jobOpen } from '../world/logic';
import type { Point, Resident, WorldMap } from '../world/types';

const levelById = (id: number) => LEVELS.find((l) => l.id === id)!;

export interface Goal extends Point {
  job: number;
  /** Who needs the light (a cast id). */
  client: string;
}

/** The world's very first job: until it's done, Pip keeps you on the road to it. */
export function firstJob(map: WorldMap): number | undefined {
  return map.areas.find((a) => a.jobs.length > 0)?.jobs[0];
}

/** The tutorial is on until the first job of the first world is done. */
export const inTutorial = (map: WorldMap, solved: Solved) => {
  const first = firstJob(map);
  return map.id === 'glowtown' && first !== undefined && !solved(first);
};

/** The nearest job you can do right now (open, not done yet), or null when there's none. */
export function nextGoal(map: WorldMap, solved: Solved, residents: Resident[], from: Point): Goal | null {
  const spots: Goal[] = [];
  const add = (job: number, x: number, y: number) => {
    if (solved(job) || !jobOpen(map, job, solved)) return;
    spots.push({ job, x, y, client: levelById(job).job!.client });
  };
  for (const r of residents) if (r.job !== undefined) add(r.job, r.x, r.y);
  for (const s of map.spots) if (s.kind === 'job') add(s.job, s.x, s.y);
  if (!spots.length) return null;
  // In the tutorial, always the first house, however close the others are.
  const first = firstJob(map);
  const tutorial = inTutorial(map, solved) && spots.find((g) => g.job === first);
  if (tutorial) return tutorial;
  const dist = (g: Goal) => Math.abs(g.x - from.x) + Math.abs(g.y - from.y);
  return spots.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

const nameOf = (id: string) => {
  try {
    return person(id).name;
  } catch {
    return 'someone';
  }
};

/** The one line in Pip's corner box. */
export function guideTip(map: WorldMap, solved: Solved, goal: Goal | null): string {
  if (!goal) return `Every light I can reach in ${map.name} is on! Explore, open chests, or come find me for the daily puzzle.`;
  const who = nameOf(goal.client);
  if (inTutorial(map, solved))
    return `Follow the glowing gold dots to ${who}’s house. Face the “!” and press E (or tap Knock).`;
  const area = map.areas[areaOfJob(map, goal.job)]?.name ?? 'town';
  return `${who} in ${area} still needs light. Follow the gold dots and knock.`;
}

/** What Pip says when you press "Need help?" out in the world. */
export function guideHelp(map: WorldMap, solved: Solved, goal: Goal | null, web: boolean): Line[] {
  const pip = (text: string): Line => ({ who: 'pip', text });
  const move = web
    ? 'Walk with the arrow keys or WASD, or click where you want to go. Press E to talk, knock or open things.'
    : 'Tap where you want to walk, or use the stick. Tap the button in the corner to talk, knock or open things.';
  const lines = [
    pip('Bzzt! I’m Pip, your guide. Here’s how it all works.'),
    pip(
      'The Glowire is the old copper line under the road. It carries light to every lamp in town, and tonight it’s gone dark.',
    ),
    pip(
      'The gold dots on the ground are the Glowire glowing through the road. They always lead to the next place that needs power. Just follow them!',
    ),
    pip(move),
    pip(
      'A “!” over someone means their lights are out. Knock, and you get a little circuit puzzle: wire up the battery so their lamp glows.',
    ),
    pip('Fix every house in a stretch of road and the power flows on, lighting the way to the next part of town.'),
  ];
  if (goal) lines.push(pip(guideTip(map, solved, goal)));
  else lines.push(pip(guideTip(map, solved, null)));
  lines.push(pip('Press M for the map. And if you ever get lost, tap “Need help?” and I’ll pop up again.'));
  return lines;
}

/** What Pip says when you try something else before the first house is done. */
export const tutorialNudge = (goal: Goal | null): Line[] => [
  {
    who: 'pip',
    text: `Ooh, later! First things first: ${goal ? `${nameOf(goal.client)}’s` : 'the first house’s'} lights. Follow the gold dots on the ground!`,
  },
];

/** Pip's first lesson on circuits, at the first puzzle and behind "Need help?" in every puzzle. */
export const CIRCUIT_LESSON: Line[] = [
  { who: 'pip', text: 'Bzzt! A circuit puzzle. Here’s everything you need to know.' },
  {
    who: 'pip',
    text: 'The battery pushes electricity out of its + end, and it wants it back in its − end.',
  },
  {
    who: 'pip',
    text: 'The LED is a little light. It only glows when electricity flows through it: in at its + side, out the other.',
  },
  {
    who: 'pip',
    text: 'So you need a full loop: battery +, wire, LED, wire, back to battery −. Any gap and nothing flows.',
  },
  {
    who: 'pip',
    text: 'Draw a wire by dragging. Start ON the battery, a part, or a wire you already drew. Wires can only grow out of the pieces that are built in place, never from an empty square.',
  },
  {
    who: 'pip',
    text: 'Now the numbers. A small battery pushes 3 volts, but a red LED only wants about 2 volts. That extra volt shoves too much current through, and the LED burns out. Pop.',
  },
  {
    who: 'pip',
    text: 'A resistor takes the extra volts for itself. Current = leftover volts ÷ ohms, so 1 volt ÷ 220 ohms is about 5 milliamps: safe and glowing. Drag one from the tray onto a wire.',
  },
  { who: 'pip', text: 'Tap a wire to rub it out. Stuck? Tap my face for a tip, or “Need help?” for this talk again.' },
];

export const CIRCUIT_LESSON_SEEN = 'tutorial:circuit';

/** Pip on dim, medium and bright: the first job that asks for one, and behind "Need help?" in those jobs. */
export const BRIGHTNESS_LESSON: Line[] = [
  {
    who: 'pip',
    text: 'This job wants a certain brightness. Brightness is just current: how many milliamps (mA) flow through the LED. The tag over a glowing LED shows it.',
  },
  {
    who: 'pip',
    text: `Dim is ${bandText('dim')}. Medium is ${bandText('medium')}. Bright is ${bandText('bright')}, and past 30 mA it pops. In between doesn’t count, so aim for the middle.`,
  },
  {
    who: 'pip',
    text: 'Too dim? Use less resistance. Too bright? Use more. The goal list shows the mA each job wants.',
  },
];

export const BRIGHTNESS_LESSON_SEEN = 'tutorial:brightness';
