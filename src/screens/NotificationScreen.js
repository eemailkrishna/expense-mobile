import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsAPI } from '../api/client';
import { colors } from '../theme/colors';

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsAPI.list();
      setNotifications(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (e) {
    }
  };

  const handlePress = async (notification) => {
    if (!notification.read_at) {
      try {
        await notificationsAPI.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
        );
      } catch (e) {
      }
    }
    const data = notification.data;
    if (data?.group_id) {
      navigation.navigate('GroupDetail', { groupId: data.group_id });
    }
  };

  const renderItem = ({ item }) => {
    const data = item.data;
    const isUnread = !item.read_at;

    const renderContent = () => {
      if (data?.deleted_by) {
        return (
          <>
            <Text style={[styles.title, isUnread && styles.unreadTitle]}>
              {data.deleted_by} deleted "{data.title}"
            </Text>
            <Text style={styles.subtitle}>
              ₹{parseFloat(data?.amount || 0).toFixed(2)} in {data.group_name}
            </Text>
          </>
        );
      }

      if (data?.member_name) {
        return (
          <>
            <Text style={[styles.title, isUnread && styles.unreadTitle]}>
              {data.member_name} joined {data.group_name}
            </Text>
            <Text style={styles.subtitle}>New member added to the group</Text>
          </>
        );
      }

      return (
        <>
          <Text style={[styles.title, isUnread && styles.unreadTitle]}>
            {data?.added_by} added "{data?.title}"
          </Text>
          <Text style={styles.subtitle}>
            ₹{parseFloat(data?.amount || 0).toFixed(2)} in {data?.group_name}
          </Text>
        </>
      );
    };

    return (
      <TouchableOpacity
        style={[styles.item, isUnread && styles.unreadItem]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.itemContent}>
          {renderContent()}
          <Text style={styles.time}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
        {isUnread && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  unreadItem: { backgroundColor: '#fff8f0' },
  itemContent: { flex: 1 },
  title: { fontSize: 14, color: '#333' },
  unreadTitle: { fontWeight: '600', color: '#000' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  time: { fontSize: 11, color: '#999', marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginLeft: 8 },
  markAllBtn: { padding: 12, alignItems: 'flex-end', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  markAllText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  emptyContainer: { flexGrow: 1 },
  emptyText: { color: '#999', fontSize: 16 },
});
