import React, { useState, useCallback } from 'react';
import { ActivityIndicator, View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useFocusEffect, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { notificationsAPI } from '../api/client';
import useFirebaseMessaging from '../hooks/useFirebaseMessaging';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import GroupsScreen from '../screens/GroupsScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotificationLogsScreen from '../screens/NotificationLogsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function NotificationBell() {
  const [count, setCount] = useState(0);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const fetch = async () => {
        try {
          const res = await notificationsAPI.unreadCount();
          if (mounted) setCount(res.data.count);
        } catch (e) {
        }
      };
      fetch();
      const interval = setInterval(fetch, 30000);
      return () => { mounted = false; clearInterval(interval); };
    }, [])
  );

  return (
    <TouchableOpacity
      style={{ marginRight: 12, position: 'relative', padding: 4 }}
      onPress={() => navigation.navigate('Notifications')}
    >
      <Icon name="notifications-outline" size={24} color={colors.textLight} />
      {count > 0 && (
        <View style={bellStyles.badge}>
          <Text style={bellStyles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const bellStyles = StyleSheet.create({
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: colors.accent,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: color + '30', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Groups" component={GroupsStack}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: color + '30', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color + '30', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function DashboardStack({ navigation }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textLight,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen}
        options={{
          title: 'Kharch Pani',
          headerRight: () => <NotificationBell />,
        }}
      />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Group Details' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ title: 'Add Member' }} />
      <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="NotificationLogs" component={NotificationLogsScreen} options={{ title: 'Notification Logs' }} />
    </Stack.Navigator>
  );
}

function GroupsStack({ navigation }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textLight,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="GroupsList" component={GroupsScreen}
        options={{
          title: 'My Groups',
          headerRight: () => <NotificationBell />,
        }}
      />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Group Details' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ title: 'Add Member' }} />
      <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="NotificationLogs" component={NotificationLogsScreen} options={{ title: 'Notification Logs' }} />
    </Stack.Navigator>
  );
}

function NotificationHandler({ children }) {
  const navigation = useNavigation();
  useFirebaseMessaging(navigation);
  return children;
}

function HomeTabsWithNotifications() {
  return (
    <NotificationHandler>
      <HomeTabs />
    </NotificationHandler>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 120, height: 120, marginBottom: 20 }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Home" component={HomeTabsWithNotifications} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
