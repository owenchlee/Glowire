// Little buzzes for big moments. Never let a failed buzz break the game.

import * as Haptics from 'expo-haptics';

const safely = (fn: () => Promise<void>) => {
  try {
    fn().catch(() => {});
  } catch {
    // No haptics on this device.
  }
};

export const buzz = {
  tap: () => safely(() => Haptics.selectionAsync()),
  win: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  oops: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  thud: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
};
