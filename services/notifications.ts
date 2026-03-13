import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { upsertNotificationSubscription } from '@/services/authApi';
import { AUTH_TOKEN_STORAGE_KEY, DEVICE_ID_STORAGE_KEY } from '@/services/authStorage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0E4A72',
    });
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.log('EAS projectId not found. Push token not created.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  console.log('Expo push token:', token.data);
  return token.data;
}

async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

export async function syncNotificationSubscriptionOnLaunch() {
  const authToken = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!authToken) return;

  const pushToken = await registerForPushNotificationsAsync();
  const isEnabled = Boolean(pushToken);
  const deviceId = await getOrCreateDeviceId();

  try {
    await upsertNotificationSubscription(authToken, {
      device_id: deviceId,
      platform: Platform.OS,
      push_token: pushToken,
      is_enabled: isEnabled,
    });
  } catch (error) {
    console.log('Notification subscription sync failed:', error);
  }
}
