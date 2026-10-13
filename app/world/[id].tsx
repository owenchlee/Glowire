import { Redirect, useLocalSearchParams } from 'expo-router';

import { WorldScreen } from '../../src/world-view/WorldScreen';
import { worldMap } from '../../src/world/worlds';

export default function WorldRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const map = worldMap(String(id));
  if (!map) return <Redirect href="/" />;
  return <WorldScreen key={map.id} map={map} worldId={map.id} />;
}
