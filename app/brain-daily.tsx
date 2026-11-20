import { lazy, Suspense, useMemo } from 'react';

import { brainDaily } from '../src/game/dailyBrain';
import { dayKey } from '../src/game/save';

// Lazy so the web title screen does not download the mini-games up front.
const MiniGame = lazy(() => import('../src/ui/MiniGame').then((m) => ({ default: m.MiniGame })));

export default function BrainDailyRoute() {
  // The day is fixed when the screen opens, so midnight doesn't swap the puzzle mid-game.
  const day = useMemo(() => dayKey(new Date()), []);
  const today = useMemo(() => brainDaily(day), [day]);
  return (
    <Suspense fallback={null}>
      <MiniGame key={day} id={today.game} day={day} />
    </Suspense>
  );
}
