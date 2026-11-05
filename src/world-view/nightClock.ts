// How long ago night fell, on the shared clock (pure; used so residents walk to their lamp).

import { DAY_SECONDS, daylight, wrapPhase } from './daylight';

const STEP = 0.004;

/** Seconds since the night began at this phase, or Infinity when it is day (or has lasted all night). */
export function secondsSinceNightFell(phase: number): number {
  const p = wrapPhase(phase);
  if (!daylight(p).night) return Infinity;
  let back = 0;
  while (back < 0.5 && daylight(wrapPhase(p - back)).night) back += STEP;
  return back * DAY_SECONDS;
}
