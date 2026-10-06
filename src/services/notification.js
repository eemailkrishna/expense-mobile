import { getMessaging, onMessage, onNotificationOpenedApp as fcmOnNotificationOpenedApp, getInitialNotification as fcmGetInitialNotification, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

let backgroundCallback = null;

export function initializeBackgroundMessageHandler() {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async (remoteMessage) => {
    if (backgroundCallback) {
      backgroundCallback(remoteMessage);
    }
  });
}

export function onForegroundMessage(callback) {
  return onMessage(getMessaging(), async (remoteMessage) => {
    callback(remoteMessage);
  });
}

export function onBackgroundMessage(callback) {
  backgroundCallback = callback;
}

export async function getInitialNotification() {
  try {
    const message = await fcmGetInitialNotification(getMessaging());
    return message;
  } catch (e) {
    return null;
  }
}

export function onNotificationOpenedApp(callback) {
  return fcmOnNotificationOpenedApp(getMessaging(), (remoteMessage) => {
    callback(remoteMessage);
  });
}

export function handleNotificationData(remoteMessage) {
  if (!remoteMessage?.data) {
    return null;
  }
  const data = remoteMessage.data;
  if (data.group_id) {
    return { groupId: data.group_id };
  }
  return null;
}
