import { loadOtherWorlds } from '../src/world/otherWorlds';
import { lazy, Suspense, useMemo } from 'react';

import { dailyLevel } from '../src/game/daily';
import { dayKey } from '../src/game/save';

// Lazy so the web title screen does not download the puzzle screen code up front.
// The jobs map needs every world, which the web build loads on demand.
const LevelScreen = lazy(() =>
  Promise.all([import('../src/ui/LevelScreen'), loadOtherWorlds()]).then(([m]) => ({ default: m.LevelScreen })),
);

export default function DailyRoute() {
  // The day is fixed when the screen opens, so midnight doesn't swap the board mid-job.
  const day = useMemo(() => dayKey(new Date()), []);
  const level = useMemo(() => dailyLevel(day), [day]);
  return (
    <Suspense fallback={null}>
      <LevelScreen key={day} level={level} day={day} />
    </Suspense>
  );
}
