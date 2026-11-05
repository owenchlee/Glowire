import { Redirect, useLocalSearchParams } from 'expo-router';

import { getLevel } from '../../src/levels/levels';
import { BrainJobScreen } from '../../src/ui/BrainJobScreen';
import { LevelScreen } from '../../src/ui/LevelScreen';

export default function LevelRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const level = getLevel(Number(id));
  if (!level) return <Redirect href="/" />;
  if (level.brain) return <BrainJobScreen key={level.id} level={level} brain={level.brain} />;
  // Keyed by id so moving to the next level starts with fresh state.
  return <LevelScreen key={level.id} level={level} />;
}
