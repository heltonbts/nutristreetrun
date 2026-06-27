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

/**
 * Reage ao toque numa notificação push: encaminha o payload (type/target) pro
 * callback, que decide a rota. Retorna função de cleanup (ou no-op).
 */
export function addNotificationResponseListener(
  onTap: (data: Record<string, unknown>) => void,
): () => void {
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(response.notification.request.content.data ?? {});
  });
  return () => sub.remove();
}

/**
 * Dispara uma notificação local imediata (sem servidor). Aparece como banner e
 * fica na central de notificações — usado pra feedback ao vivo (ex: cada km
 * fechado na corrida). Funciona em foreground (graças ao handler) e background.
 */
export async function presentLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null, // null = imediato
    });
  } catch {
    // silently fail — não atrapalha a corrida
  }
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
