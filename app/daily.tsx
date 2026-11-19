import { lazy, Suspense, useMemo } from 'react';

import { dailyLevel } from '../src/game/daily';
import { dayKey } from '../src/game/save';

// Lazy so the web title screen does not download the puzzle screen code up front.
const LevelScreen = lazy(() => import('../src/ui/LevelScreen').then((m) => ({ default: m.LevelScreen })));

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
