/*
 * Push notifications through the Expo Push Service. The token is saved to the shopper's
 * `notification_settings` row; the `send-push` edge function sends alerts to it.
 * Delivery also needs FCM (Android) and APNs (iPhone) credentials on Expo; without them
 * alerts still appear in the in-app Alerts tab.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export type PushResult = { ok: true; token: string } | { ok: false; reason: 'denied' | 'simulator' | 'error'; message?: string };

/** Asks for permission (if needed) and returns this phone's Expo push token. */
export async function registerForPush(): Promise<PushResult> {
  if (Platform.OS === 'web' || !Device.isDevice) return { ok: false, reason: 'simulator' };
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts', { name: 'Price alerts', importance: Notifications.AndroidImportance.DEFAULT });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { ok: true, token: data };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
