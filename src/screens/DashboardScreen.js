import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dashboardAPI } from '../api/client';
import { colors } from '../theme/colors';

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await dashboardAPI.get();
      setData(res.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load dashboard');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const thisMonth = monthNames[now.getMonth()];
  const prevMonth = monthNames[now.getMonth() === 0 ? 11 : now.getMonth() - 1];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Total All Time */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Expenses</Text>
        <Text style={styles.totalAmount}>₹{data.total_all_time.toFixed(2)}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
          <Text style={styles.statLabel}>This Month ({thisMonth})</Text>
          <Text style={styles.statAmount}>₹{data.this_month_total.toFixed(2)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.statLabel}>Last Month ({prevMonth})</Text>
          <Text style={styles.statAmount}>₹{data.prev_month_total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Create Group Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <Text style={styles.createButtonIcon}>+</Text>
        <Text style={styles.createButtonText}>Create New Group</Text>
      </TouchableOpacity>

      {/* Groups */}
      <Text style={styles.sectionTitle}>Your Groups</Text>
      {data.groups?.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No groups yet</Text>
          <Text style={styles.emptySubtext}>Create your first group to get started</Text>
        </View>
      ) : (
        <View style={styles.groupGrid}>
          {data.groups?.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
            >
              <View style={styles.groupTop}>
                <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                {group.is_closed ? (
                  <View style={styles.closedBadge}><Text style={styles.closedBadgeText}>Closed</Text></View>
                ) : null}
              </View>
              {group.month_year ? <Text style={styles.groupMonth}>{group.month_year}</Text> : null}
              <Text style={styles.groupMeta}>{group.users_count || 0} members</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalCard: {
    backgroundColor: colors.primary,
    margin: 16,
    marginBottom: 0,
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    color: colors.white,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 6,
  },
  statAmount: {
    fontSize: 22,
    color: colors.white,
    fontWeight: 'bold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonIcon: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
    marginRight: 8,
  },
  createButtonText: {
    fontSize: 17,
    color: colors.white,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  groupGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  groupTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  closedBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  closedBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  groupMonth: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  groupMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
  },
});
