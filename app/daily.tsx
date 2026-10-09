import { useMemo } from 'react';

import { dailyLevel } from '../src/game/daily';
import { dayKey } from '../src/game/save';
import { LevelScreen } from '../src/ui/LevelScreen';

export default function DailyRoute() {
  // The day is fixed when the screen opens, so midnight doesn't swap the board mid-job.
  const day = useMemo(() => dayKey(new Date()), []);
  const level = useMemo(() => dailyLevel(day), [day]);
  return <LevelScreen key={day} level={level} day={day} />;
}
