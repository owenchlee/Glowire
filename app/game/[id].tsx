import { Redirect, useLocalSearchParams } from 'expo-router';

import { GAMES, type GameId } from '../../src/game/games';
import { MiniGame } from '../../src/ui/MiniGame';

export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!(String(id) in GAMES)) return <Redirect href="/" />;
  return <MiniGame key={String(id)} id={String(id) as GameId} />;
}
