import { useMemo } from 'react';

import { brainDaily } from '../src/game/dailyBrain';
import { dayKey } from '../src/game/save';
import { MiniGame } from '../src/ui/MiniGame';

export default function BrainDailyRoute() {
  // The day is fixed when the screen opens, so midnight doesn't swap the puzzle mid-game.
  const day = useMemo(() => dayKey(new Date()), []);
  const today = useMemo(() => brainDaily(day), [day]);
  return <MiniGame key={day} id={today.game} day={day} />;
}
