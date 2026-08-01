import { getMessaging, requestPermission, getToken, onTokenRefresh as fcmOnTokenRefresh } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const FCM_TOKEN_KEY = 'fcm_token';

export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const messaging = getMessaging();
      const granted = await requestPermission(messaging);
      return granted === 1 || granted === 2;
    }
    return true;
  } catch (e) {
    console.warn('Notification permission error:', e);
    return false;
  }
}

export async function getFcmToken() {
  try {
    const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (cachedToken) {
      return cachedToken;
    }
    const token = await getToken(getMessaging());
    if (token) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    }
    return token;
  } catch (e) {
    console.warn('Get FCM token error:', e);
    return null;
  }
}

export async function sendFcmTokenToServer(token) {
  try {
    const storedToken = await AsyncStorage.getItem('token');
    if (!storedToken) {
      return false;
    }
    await client.post('/save-fcm-token', { fcm_token: token });
    return true;
  } catch (e) {
    console.warn('Send FCM token error:', e);
    return false;
  }
}

export function onTokenRefresh(callback) {
  return fcmOnTokenRefresh(getMessaging(), async (token) => {
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    if (callback) {
      callback(token);
    }
  });
}
