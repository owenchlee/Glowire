import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { WorldScreen } from '../../src/world-view/WorldScreen';
import { loadOtherWorlds, otherWorldsLoaded } from '../../src/world/otherWorlds';
import { worldMap } from '../../src/world/worlds';

export default function WorldRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // The web build loads Harbour, Mossbell and Deep on demand.
  const [ready, setReady] = useState(otherWorldsLoaded);
  useEffect(() => {
    loadOtherWorlds().then(() => setReady(true));
  }, []);
  if (!ready) return null;
  const map = worldMap(String(id));
  if (!map) return <Redirect href="/" />;
  return <WorldScreen key={map.id} map={map} worldId={map.id} />;
}
