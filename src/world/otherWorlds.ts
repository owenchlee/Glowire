// Native and tests: every world's builder is bundled and ready at once (the web build lazy-loads them, see otherWorlds.web.ts).
import type { WorldMap } from './types';
import { OTHER_BUILDERS } from './otherWorldsData';

export const otherBuilder = (id: string): (() => WorldMap) | undefined => OTHER_BUILDERS[id];
export const otherWorldsLoaded = () => true;
export const loadOtherWorlds = () => Promise.resolve();
