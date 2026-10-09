import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameProvider } from '../src/ui/game';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <GameProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </GameProvider>
    </GestureHandlerRootView>
  );
}
