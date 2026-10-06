import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import {
  requestNotificationPermission,
  getFcmToken,
  sendFcmTokenToServer,
  onTokenRefresh,
} from '../services/firebase';
import {
  onForegroundMessage,
  onBackgroundMessage,
  getInitialNotification,
  onNotificationOpenedApp,
  handleNotificationData,
  initializeBackgroundMessageHandler,
} from '../services/notification';

export default function useFirebaseMessaging(navigation) {
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const setup = async () => {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        return;
      }

      initializeBackgroundMessageHandler();

      onBackgroundMessage(async (remoteMessage) => {
        const navData = handleNotificationData(remoteMessage);
        if (navData && navigation) {
          setTimeout(() => {
            navigation.navigate('GroupDetail', { groupId: navData.groupId });
          }, 500);
        }
      });

      const unsubscribeForeground = onForegroundMessage((remoteMessage) => {
        const { notification, data } = remoteMessage;
        if (notification) {
          Alert.alert(
            notification.title || 'New Notification',
            notification.body || '',
            data?.group_id
              ? [
                  { text: 'OK', style: 'cancel' },
                  {
                    text: 'View Group',
                    onPress: () => {
                      if (navigation) {
                        navigation.navigate('GroupDetail', { groupId: data.group_id });
                      }
                    },
                  },
                ]
              : [{ text: 'OK', style: 'cancel' }]
          );
        }
      });

      const token = await getFcmToken();
      if (token) {
        sendFcmTokenToServer(token);
      }

      const unsubscribeTokenRefresh = onTokenRefresh((newToken) => {
        sendFcmTokenToServer(newToken);
      });

      const initialNotification = await getInitialNotification();
      if (initialNotification) {
        const navData = handleNotificationData(initialNotification);
        if (navData && navigation) {
          setTimeout(() => {
            navigation.navigate('GroupDetail', { groupId: navData.groupId });
          }, 1000);
        }
      }

      const unsubscribeOpenedApp = onNotificationOpenedApp((remoteMessage) => {
        const navData = handleNotificationData(remoteMessage);
        if (navData && navigation) {
          navigation.navigate('GroupDetail', { groupId: navData.groupId });
        }
      });

      return () => {
        unsubscribeForeground();
        unsubscribeTokenRefresh();
        unsubscribeOpenedApp();
      };
    };

    setup();
  }, [navigation]);
}
