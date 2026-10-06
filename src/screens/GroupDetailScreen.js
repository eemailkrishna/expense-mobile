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
import { loadSharesMap } from '../services/expenseShares';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const fmt = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [membersSectionOpen, setMembersSectionOpen] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);
  const [sharesMap, setSharesMap] = useState({});

  const fetchData = async () => {
    try {
      const res = await groupsAPI.show(groupId);
      setData(res.data);
      const map = await loadSharesMap();
      setSharesMap(map);
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

  const handleEditExpense = (expense) => {
    navigation.navigate('AddExpense', { groupId, expense, members });
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
  const memberCount = group.users?.length || user_totals?.length || 0;
  const members = group.users || [];

  const spentById = {};
  (user_totals || []).forEach((ut) => {
    spentById[ut.user?.id] = ut.total_spent || 0;
  });

  const memberList = [];
  const seenIds = new Set();
  members.forEach((m) => { memberList.push(m); seenIds.add(m.id); });
  (user_totals || []).forEach((ut) => {
    if (ut.user && !seenIds.has(ut.user.id)) memberList.push(ut.user);
  });

  const round2 = (n) => Math.round(n * 100) / 100;

  const allIds = memberList.map((m) => m.id);
  const shareById = {};
  allIds.forEach((id) => {
    shareById[id] = 0;
  });
  (expenses || []).forEach((exp) => {
    let ids = sharesMap[exp.id];
    if (!ids && Array.isArray(exp.shares) && exp.shares.length) {
      ids = exp.shares.map((s) => (typeof s === 'object' ? s.id : s));
    }
    if (!ids || !ids.length) ids = allIds;
    const list = ids.filter((id) => shareById[id] !== undefined);
    const sharers = list.length ? list : allIds;
    const per = parseFloat(exp.amount) / sharers.length;
    sharers.forEach((id) => {
      shareById[id] += per;
    });
  });

  const balances = memberList.map((m) => {
    const paid = spentById[m.id] || 0;
    const share = shareById[m.id] || 0;
    return { id: m.id, name: m.name, paid, share, balance: round2(paid - share) };
  });

  const transfers = [];
  {
    const debtors = balances
      .filter((b) => b.balance < -0.01)
      .map((b) => ({ name: b.name, amount: -b.balance }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = balances
      .filter((b) => b.balance > 0.01)
      .map((b) => ({ name: b.name, amount: b.balance }))
      .sort((a, b) => b.amount - a.amount);
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amt = Math.min(debtors[i].amount, creditors[j].amount);
      transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: round2(amt) });
      debtors[i].amount = round2(debtors[i].amount - amt);
      creditors[j].amount = round2(creditors[j].amount - amt);
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }
  }

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
        {membersSectionOpen && balances.map((b) => {
          const balance = b.balance;
          const isSettled = Math.abs(balance) < 0.005;
          const isExpanded = expandedMember === b.id;
          const memberExpenses = expenses?.filter((e) => e.user_id === b.id) || [];
          return (
            <View key={b.id}>
              <TouchableOpacity
                style={styles.memberRow}
                onPress={() => setExpandedMember(isExpanded ? null : b.id)}
                activeOpacity={0.7}
              >
                <View style={styles.memberTop}>
                  <Text numberOfLines={1} style={styles.memberName}>{b.name}</Text>
                  <View style={styles.memberAmounts}>
                    <Text style={styles.memberPaidText}>{fmt(b.paid)} </Text>
                    <Text style={isSettled ? styles.balanceSettled : balance > 0 ? styles.balancePositive : styles.balanceNegative}>
                      ({isSettled ? 'Settled' : `${balance > 0 ? '+' : '-'}${fmt(Math.abs(balance))}`})
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.memberExpanded}>
                  <View style={styles.memberExpenses}>
                  {memberExpenses.length === 0 ? (
                    <Text style={styles.noMemberExpenses}>No expenses</Text>
                  ) : (
                    memberExpenses.map((exp) => (
                      <View key={exp.id} style={styles.memberExpenseRow}>
                        <View style={styles.memberExpenseLeft}>
                          <Text style={styles.memberExpenseTitle}>{exp.title}</Text>
                          <Text style={styles.memberExpenseDate}>{formatDate(exp.created_at)}</Text>
                        </View>
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
        {membersSectionOpen && (
          <View style={styles.settlementCard}>
            <Text style={styles.settlementTitle}>Who Pays Whom</Text>
            {transfers.length === 0 ? (
              <Text style={styles.settledText}>✓ All settled up — kisi ko kuch dena nahi hai</Text>
            ) : (
              transfers.map((t, idx) => (
                <View key={idx} style={styles.transferRow}>
                  <View style={styles.transferSide}>
                    <Text numberOfLines={1} style={styles.transferName}>{t.from}</Text>
                    <Text style={[styles.transferTag, styles.oweTag]}>Dena hai</Text>
                  </View>
                  <View style={styles.transferCenter}>
                    <Text style={styles.transferArrow}>pays</Text>
                    <Text style={styles.transferAmount}>₹{t.amount.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.transferSide, styles.transferSideRight]}>
                    <Text numberOfLines={1} style={styles.transferName}>{t.to}</Text>
                    <Text style={[styles.transferTag, styles.getTag]}>Lena hai</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Expenses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          {!group.is_closed ? (
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddExpense', { groupId, members })}>
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
              {item.shares && item.shares.length > 0 && item.shares.length < memberCount ? (
                <Text style={styles.splitText}>Split between {item.shares.length} members</Text>
              ) : null}
              <View style={styles.expenseFooter}>
                <View>
                  <Text style={styles.expenseUser}>by {item.user?.name || 'Unknown'}</Text>
                  <Text style={styles.expenseDate}>Added on {formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.expenseActions}>
                  {item.is_paid ? (
                    <View style={styles.paidBadge}><Text style={styles.paidText}>Paid</Text></View>
                  ) : null}
                  {item.user_id === user?.id || isAdmin ? (
                    <>
                      <TouchableOpacity onPress={() => handleEditExpense(item)}>
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteExpense(item.id)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </>
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
  memberName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
  expandIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  memberAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  memberPaidText: { fontSize: 14, fontWeight: '700', color: colors.text },
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
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberExpenseLeft: {
    flex: 1,
  },
  memberExpenseTitle: {
    fontSize: 14,
    color: colors.text,
  },
  memberExpenseDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
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
  balanceSettled: { color: colors.textSecondary },
  settlementCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    marginTop: 4,
  },
  settlementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  settledText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transferSide: {
    flex: 1,
  },
  transferSideRight: {
    alignItems: 'flex-end',
  },
  transferName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  transferTag: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  oweTag: {
    color: colors.danger,
  },
  getTag: {
    color: colors.success,
  },
  transferCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  transferArrow: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  transferAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
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
  splitText: { fontSize: 12, color: colors.accent, marginTop: 4, fontWeight: '600' },
  expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  expenseUser: { fontSize: 13, color: colors.textSecondary },
  expenseDate: { fontSize: 12, color: '#999', marginTop: 2 },
  expenseActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paidBadge: { backgroundColor: colors.success, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  paidText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  editText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  noExpenses: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 },
});
