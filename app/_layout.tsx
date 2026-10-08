import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ProgressProvider } from '../src/ui/progress';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <ProgressProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ProgressProvider>
    </GestureHandlerRootView>
  );
}
