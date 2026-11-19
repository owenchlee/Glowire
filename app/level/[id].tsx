import { Redirect, useLocalSearchParams } from 'expo-router';
import { loadOtherWorlds } from '../../src/world/otherWorlds';
import { lazy, Suspense } from 'react';

import { getLevel } from '../../src/levels/levels';

// Lazy so the web title screen does not download the puzzle screens up front.
const BrainJobScreen = lazy(() =>
  import('../../src/ui/BrainJobScreen').then((m) => ({ default: m.BrainJobScreen })),
);
// The jobs map needs every world, which the web build loads on demand.
const LevelScreen = lazy(() =>
  Promise.all([import('../../src/ui/LevelScreen'), loadOtherWorlds()]).then(([m]) => ({ default: m.LevelScreen })),
);

export default function LevelRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const level = getLevel(Number(id));
  if (!level) return <Redirect href="/" />;
  return (
    <Suspense fallback={null}>
      {level.brain ? (
        <BrainJobScreen key={level.id} level={level} brain={level.brain} />
      ) : (
        // Keyed by id so moving to the next level starts with fresh state.
        <LevelScreen key={level.id} level={level} />
      )}
    </Suspense>
  );
}
