import { Redirect, useLocalSearchParams } from 'expo-router';

import { GAMES, type GameId } from '../../src/game/games';
import { MiniGame } from '../../src/ui/MiniGame';

export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!Object.hasOwn(GAMES, String(id))) return <Redirect href="/" />;
  return <MiniGame key={String(id)} id={String(id) as GameId} />;
}
