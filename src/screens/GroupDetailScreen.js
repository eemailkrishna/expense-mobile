import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { groupsAPI, expensesAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [membersSectionOpen, setMembersSectionOpen] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);

  const fetchData = async () => {
    try {
      const res = await groupsAPI.show(groupId);
      setData(res.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load group details');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [groupId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const isAdmin = data?.group?.admin_id === user?.id;

  const handleCloseGroup = () => {
    Alert.alert('Close Group', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupsAPI.close(groupId);
            fetchData();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to close group');
          }
        },
      },
    ]);
  };

  const handleDeleteGroup = () => {
    Alert.alert('Delete Group', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupsAPI.destroy(groupId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete group');
          }
        },
      },
    ]);
  };

  const handleDeleteExpense = (expenseId) => {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await expensesAPI.destroy(expenseId);
            fetchData();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const { group, expenses, user_totals, total_amount } = data;
  const memberCount = group.users?.length || 0;
  const avgShare = memberCount > 0 ? total_amount / memberCount : 0;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Group Info */}
      <View style={styles.headerCard}>
        <Text style={styles.groupName}>{group.name}</Text>
        {group.month_year ? <Text style={styles.groupMonth}>{group.month_year}</Text> : null}
        <View style={styles.badgeRow}>
          {group.is_closed ? (
            <View style={styles.closedBadge}><Text style={styles.closedBadgeText}>Closed</Text></View>
          ) : (
            <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
          )}
          <Text style={styles.memberCount}>{memberCount} members</Text>
        </View>
        <Text style={styles.totalAmount}>Total: ₹{total_amount.toFixed(2)}</Text>
      </View>

      {/* Admin Actions */}
      {isAdmin && !group.is_closed ? (
        <TouchableOpacity style={styles.addMemberButton} onPress={() => navigation.navigate('AddMember', { groupId })}>
          <Text style={styles.addMemberButtonText}>+ Add Member</Text>
        </TouchableOpacity>
      ) : null}
      {isAdmin && group.is_closed ? (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteGroup}>
          <Text style={styles.deleteButtonText}>Delete Group</Text>
        </TouchableOpacity>
      ) : null}
      {isAdmin ? (
        <TouchableOpacity style={styles.logsButton} onPress={() => navigation.navigate('NotificationLogs', { groupId })}>
          <Text style={styles.logsButtonText}>Notification Logs</Text>
        </TouchableOpacity>
      ) : null}

      {/* Members & Summary */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setMembersSectionOpen(!membersSectionOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionLeft}>
            <Text style={styles.expandIcon}>{membersSectionOpen ? '▼' : '▶'}</Text>
            <Text style={styles.sectionTitle}>Members & Summary</Text>
          </View>
          {isAdmin && !group.is_closed ? (
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleCloseGroup(); }} style={styles.closeLink}>
              <Text style={styles.closeLinkText}>Close Group</Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        {membersSectionOpen && user_totals?.map((ut) => {
          const balance = ut.total_spent - avgShare;
          const barWidth = total_amount > 0 ? (ut.total_spent / total_amount) * 100 : 0;
          const isExpanded = expandedMember === ut.user?.id;
          const memberExpenses = expenses?.filter((e) => e.user_id === ut.user?.id) || [];
          return (
            <View key={ut.user?.id}>
              <TouchableOpacity
                style={styles.memberRow}
                onPress={() => setExpandedMember(isExpanded ? null : ut.user?.id)}
                activeOpacity={0.7}
              >
                <View style={styles.memberTop}>
                  <View style={styles.memberLeft}>
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    <Text style={styles.memberName}>{ut.user?.name}</Text>
                  </View>
                  <Text style={[styles.memberBalance, balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                    ₹{ut.total_spent.toFixed(2)}
                    {' '}({balance >= 0 ? '+' : ''}₹{balance.toFixed(2)})
                  </Text>
                </View>
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.memberExpanded}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${barWidth}%` }, balance >= 0 ? styles.progressPositive : styles.progressNegative]} />
                  </View>
                  <View style={styles.memberExpenses}>
                  {memberExpenses.length === 0 ? (
                    <Text style={styles.noMemberExpenses}>No expenses</Text>
                  ) : (
                    memberExpenses.map((exp) => (
                      <View key={exp.id} style={styles.memberExpenseRow}>
                        <Text style={styles.memberExpenseTitle}>{exp.title}</Text>
                        <Text style={styles.memberExpenseAmount}>₹{parseFloat(exp.amount).toFixed(2)}</Text>
                      </View>
                    ))
                  )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Expenses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          {!group.is_closed ? (
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddExpense', { groupId })}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {expenses?.length === 0 ? (
          <Text style={styles.noExpenses}>No expenses yet</Text>
        ) : (
          expenses?.map((item) => (
            <View key={item.id} style={styles.expenseCard}>
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseTitle}>{item.title}</Text>
                <Text style={styles.expenseAmount}>₹{parseFloat(item.amount).toFixed(2)}</Text>
              </View>
              {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
              <View style={styles.expenseFooter}>
                <Text style={styles.expenseUser}>by {item.user?.name || 'Unknown'}</Text>
                <View style={styles.expenseActions}>
                  {item.is_paid ? (
                    <View style={styles.paidBadge}><Text style={styles.paidText}>Paid</Text></View>
                  ) : null}
                  {isAdmin ? (
                    <TouchableOpacity onPress={() => handleDeleteExpense(item.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: colors.card,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupName: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  groupMonth: { fontSize: 15, color: '#888', marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  closedBadge: { backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginRight: 10 },
  closedBadgeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  activeBadge: { backgroundColor: colors.success, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginRight: 10 },
  activeBadgeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  memberCount: { fontSize: 14, color: colors.textSecondary },
  totalAmount: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 12 },
  addMemberButton: {
    backgroundColor: colors.accent,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  addMemberButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  closeLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeLinkText: { color: colors.warning, fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: colors.danger, marginHorizontal: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  logsButton: { backgroundColor: colors.primary, marginHorizontal: 16, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  logsButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  section: { margin: 16, marginTop: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  memberRow: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  memberName: { fontSize: 15, fontWeight: '600', color: colors.text },
  memberBalance: { fontSize: 14, fontWeight: '700' },
  memberExpanded: {
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  memberExpenses: {
    marginTop: 8,
  },
  memberExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberExpenseTitle: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  memberExpenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  noMemberExpenses: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  balancePositive: { color: colors.success },
  balanceNegative: { color: colors.danger },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressPositive: { backgroundColor: colors.success },
  progressNegative: { backgroundColor: colors.danger },
  expenseCard: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: colors.danger },
  expenseNote: { fontSize: 13, color: '#888', marginTop: 4 },
  expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  expenseUser: { fontSize: 13, color: colors.textSecondary },
  expenseActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paidBadge: { backgroundColor: colors.success, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  paidText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  noExpenses: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 },
});
