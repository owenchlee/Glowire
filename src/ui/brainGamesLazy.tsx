// The four brain games load on demand: both MiniGame and BrainJobScreen use them, and a static import
// from two chunks would hoist the whole file into the up-front shared bundle. Callers sit under Suspense.
import { lazy } from 'react';

export const DeadLampHunt = lazy(() => import('./BrainGames').then((m) => ({ default: m.DeadLampHunt })));
export const DockyardWiring = lazy(() => import('./BrainGames').then((m) => ({ default: m.DockyardWiring })));
export const ClockPanel = lazy(() => import('./BrainGames').then((m) => ({ default: m.ClockPanel })));
export const LanternBudget = lazy(() => import('./BrainGames').then((m) => ({ default: m.LanternBudget })));
