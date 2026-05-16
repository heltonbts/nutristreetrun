import { Platform } from 'react-native';

import { api } from './api';

// expo-notifications remote push was removed from Expo Go in SDK 53; guard to avoid crash
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {}

export function setupNotificationHandlers() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    status = asked;
  }

  if (status !== 'granted') return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.patch('/profile/push-token', { token });
  } catch {
    // silently fail — app still works without push
  }
}
