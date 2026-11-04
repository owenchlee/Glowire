import { describe, expect, it } from 'vitest';

import {
  MEGA_SURGE,
  SURGE_PITY_CAP,
  gamble,
  rollSurge,
  slotMultiplier,
  slotReturn,
  spin,
  surgeChance,
} from './luck';
import { NEW_SAVE, migrate, recordJob, type SaveData } from './save';
import { rng } from './games';

const rich = (sparks: number): SaveData => ({ ...structuredClone(NEW_SAVE), sparks });
const fixed = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length]!;
};

describe('slot machine', () => {
  it('pays back a fair-ish share (90%-100%), exactly', () => {
    expect(slotReturn()).toBeGreaterThan(0.9);
    expect(slotReturn()).toBeLessThanOrEqual(1);
  });
  it('pays triples, pairs and clouds', () => {
    expect(slotMultiplier(['star', 'star', 'star'])).toBe(100);
    expect(slotMultiplier(['plug', 'bulb', 'plug'])).toBe(1);
    expect(slotMultiplier(['cloud', 'cloud', 'bolt'])).toBe(0);
    expect(slotMultiplier(['cloud', 'cloud', 'cloud'])).toBe(0);
    expect(slotMultiplier(['plug', 'bulb', 'star'])).toBe(0);
  });
  it('deducts the bet and pays the win', () => {
    // 0.0 lands on a plug every reel: 4x.
    const r = spin(rich(100), 10, fixed(0))!;
    expect(r.win).toBe(40);
    expect(r.save.sparks).toBe(130);
    expect(r.save.luck.spins).toBe(1);
    expect(r.save.luck.biggest).toBe(40);
  });
  it('refuses a bet you cannot cover or that is not offered', () => {
    expect(spin(rich(4), 5, fixed(0))).toBeNull();
    expect(spin(rich(100), 7, fixed(0))).toBeNull();
  });
  it('over many spins stays near the exact return', () => {
    const r = rng(42);
    let save = rich(1e9);
    for (let i = 0; i < 20000; i++) save = spin(save, 10, r)!.save;
    const ret = save.luck.won / save.luck.wagered;
    expect(Math.abs(ret - slotReturn())).toBeLessThan(0.08);
  });
});

describe('double or nothing', () => {
  it('doubles or loses the stake', () => {
    const win = gamble(rich(100), 40, fixed(0.1))!;
    expect(win.won).toBe(true);
    expect(win.save.sparks).toBe(140);
    const lose = gamble(rich(100), 40, fixed(0.9))!;
    expect(lose.save.sparks).toBe(60);
  });
  it('needs the stake in hand', () => {
    expect(gamble(rich(10), 40, fixed(0.1))).toBeNull();
  });
});

describe('payday surges', () => {
  it('pity climbs and caps', () => {
    expect(surgeChance(0)).toBeCloseTo(0.1);
    expect(surgeChance(3)).toBeCloseTo(0.25);
    expect(surgeChance(99)).toBe(SURGE_PITY_CAP);
  });
  it('rolls 5x, 2x or nothing', () => {
    expect(rollSurge(0, fixed(MEGA_SURGE / 2))).toBe(5);
    expect(rollSurge(0, fixed(MEGA_SURGE + 0.05))).toBe(2);
    expect(rollSurge(0, fixed(0.9))).toBe(1);
  });
  it('never rolls without a random source, so old payouts are unchanged', () => {
    const p = recordJob(rich(0), 1, 3);
    expect(p.earned).toBe(35);
    expect(p.surge).toBe(1);
  });
  it('multiplies the payout and resets pity; a miss raises it', () => {
    const hit = recordJob(rich(0), 1, 3, false, fixed(0.05));
    expect(hit.earned).toBe(70);
    expect(hit.save.sparks).toBe(70);
    expect(hit.save.luck).toMatchObject({ dry: 0, surges: 1 });
    const miss = recordJob(rich(0), 1, 3, false, fixed(0.99));
    expect(miss.save.sparks).toBe(35);
    expect(miss.save.luck.dry).toBe(1);
  });
  it('old saves without luck migrate', () => {
    const old = { ...structuredClone(NEW_SAVE) } as Record<string, unknown>;
    delete old.luck;
    expect(migrate(old).luck.spins).toBe(0);
  });
});
