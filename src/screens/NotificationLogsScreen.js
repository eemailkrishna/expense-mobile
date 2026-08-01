import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import client from '../api/client';
import { colors } from '../theme/colors';

const STATUS_COLORS = {
  sent: '#f0ad4e',
  delivered: '#5bc0de',
  read: '#5cb85c',
  failed: '#d9534f',
};

const STATUS_LABELS = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
};

const TYPE_LABELS = {
  ExpenseAdded: 'Expense Added',
  ExpenseDeleted: 'Expense Deleted',
  MemberJoined: 'Member Joined',
};

export default function NotificationLogsScreen({ route }) {
  const { groupId } = route.params;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await client.get(`/groups/${groupId}/notification-logs`);
      setLogs(res.data.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [groupId])
  );

  const renderItem = ({ item }) => {
    const data = item.data || {};
    const typeLabel = TYPE_LABELS[item.notification_type] || item.notification_type;
    const statusColor = STATUS_COLORS[item.status] || '#999';

    const getMessage = () => {
      if (item.notification_type === 'ExpenseAdded') {
        return `${data.added_by || 'Someone'} added "${data.title || ''}" - ₹${parseFloat(data.amount || 0).toFixed(2)}`;
      }
      if (item.notification_type === 'ExpenseDeleted') {
        return `${data.deleted_by || 'Someone'} deleted "${data.title || ''}"`;
      }
      if (item.notification_type === 'MemberJoined') {
        return `${data.member_name || 'Someone'} joined the group`;
      }
      return typeLabel;
    };

    return (
      <View style={styles.item}>
        <View style={styles.itemLeft}>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
          <Text style={styles.message}>{getMessage()}</Text>
          <View style={styles.recipientRow}>
            <Text style={styles.recipientLabel}>To: </Text>
            <Text style={styles.recipientName}>{item.recipient?.name || 'Unknown'}</Text>
          </View>
          {item.sender && (
            <View style={styles.recipientRow}>
              <Text style={styles.recipientLabel}>By: </Text>
              <Text style={styles.recipientName}>{item.sender.name}</Text>
            </View>
          )}
          <Text style={styles.time}>
            {new Date(item.sent_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[item.status] || item.status}</Text>
        </View>
      </View>
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
      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={logs.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No notification logs yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  itemLeft: { flex: 1, marginRight: 10 },
  typeLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', marginBottom: 2 },
  message: { fontSize: 14, color: '#333', marginBottom: 4 },
  recipientRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  recipientLabel: { fontSize: 12, color: '#999' },
  recipientName: { fontSize: 12, color: '#666', fontWeight: '500' },
  time: { fontSize: 11, color: '#bbb', marginTop: 4 },
  statusBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { flexGrow: 1 },
  emptyText: { color: '#999', fontSize: 16 },
});
