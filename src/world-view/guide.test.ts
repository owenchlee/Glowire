import { describe, expect, it } from 'vitest';

import { blockedCells, findPath, presentResidents } from '../world/logic';
import { worldMap } from '../world/worlds';
import { firstJob, guideTip, inTutorial, nextGoal } from './guide';

const town = worldMap('glowtown')!;
const none = () => false;

describe('Pip the guide', () => {
  it('starts in the tutorial, pointed at the first house, with a walkable glowing trail to it', () => {
    const first = firstJob(town)!;
    expect(inTutorial(town, none)).toBe(true);
    const residents = presentResidents(town, none);
    const goal = nextGoal(town, none, residents, town.spawn)!;
    expect(goal.job).toBe(first);
    const path = findPath(town, blockedCells(town, residents, none), town.spawn, goal);
    expect(path?.length).toBeGreaterThan(0);
    expect(guideTip(town, none, goal)).toMatch(/gold dots/);
  });

  it('leaves the tutorial once the first house is lit, then points at the nearest open job', () => {
    const first = firstJob(town)!;
    const solved = (j: number) => j === first;
    expect(inTutorial(town, solved)).toBe(false);
    const goal = nextGoal(town, solved, presentResidents(town, solved), town.spawn)!;
    expect(goal.job).not.toBe(first);
  });

  it('has nothing to point at when every job is done', () => {
    const all = () => true;
    expect(nextGoal(town, all, presentResidents(town, all), town.spawn)).toBeNull();
    expect(guideTip(town, all, null)).toMatch(/Every light/);
  });
});
