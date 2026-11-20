import { useCallback, useEffect, useState } from 'react';

// setTimeout that is cancelled when the component unmounts, so a game never acts after the player left.
export function useLater() {
  const [timers] = useState<ReturnType<typeof setTimeout>[]>(() => []);
  useEffect(() => () => timers.forEach(clearTimeout), [timers]);
  return useCallback((fn: () => void, ms: number) => void timers.push(setTimeout(fn, ms)), [timers]);
}
