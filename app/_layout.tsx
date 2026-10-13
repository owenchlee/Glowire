import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameProvider } from '../src/ui/game';
import { INK, PIXEL_FONT } from '../src/ui/pixel';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [PIXEL_FONT]: require('../assets/fonts/PixelNormal.ttf'),
  });

  // The game is played with the phone held sideways.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    }
  }, []);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: INK }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden />
      <GameProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </GameProvider>
    </GestureHandlerRootView>
  );
}
