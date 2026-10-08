import { Redirect, useLocalSearchParams } from 'expo-router';

import { getLevel } from '../../src/levels/levels';
import { LevelScreen } from '../../src/ui/LevelScreen';

export default function LevelRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const level = getLevel(Number(id));
  if (!level) return <Redirect href="/" />;
  // Keyed by id so moving to the next level starts with fresh state.
  return <LevelScreen key={level.id} level={level} />;
}
