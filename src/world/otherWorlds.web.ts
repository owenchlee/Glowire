// Web: Harbour, Mossbell and Deep load on demand so the title screen does not download their maps.
import type { WorldMap } from './types';

let builders: Record<string, () => WorldMap> | null = null;

export const otherBuilder = (id: string): (() => WorldMap) | undefined => builders?.[id];
export const otherWorldsLoaded = () => builders !== null;
export const loadOtherWorlds = (): Promise<void> =>
  import('./otherWorldsData').then((m) => {
    builders = m.OTHER_BUILDERS;
  });
