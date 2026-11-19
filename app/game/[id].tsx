import { Redirect, useLocalSearchParams } from 'expo-router';
import { lazy, Suspense } from 'react';

import { GAMES, type GameId } from '../../src/game/games';

// Lazy so the web title screen does not download the mini-games up front.
const MiniGame = lazy(() => import('../../src/ui/MiniGame').then((m) => ({ default: m.MiniGame })));

export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!Object.hasOwn(GAMES, String(id))) return <Redirect href="/" />;
  return (
    <Suspense fallback={null}>
      <MiniGame key={String(id)} id={String(id) as GameId} />
    </Suspense>
  );
}
