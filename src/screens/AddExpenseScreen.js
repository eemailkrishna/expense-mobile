import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { expensesAPI, groupsAPI } from '../api/client';
import { loadSharesMap, saveExpenseShares } from '../services/expenseShares';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function AddExpenseScreen({ route, navigation }) {
  const { groupId, expense } = route.params || {};
  const { user } = useAuth();
  const isEditing = !!expense;
  const payerId = user?.id;
  const [title, setTitle] = useState(expense?.title || '');
  const [amountInput, setAmountInput] = useState(expense ? String(parseFloat(expense.amount)) : '');
  const [note, setNote] = useState(expense?.note || '');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState(route.params?.members || []);
  const [selectedShares, setSelectedShares] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(members.length === 0);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Expense' : 'Add Expense' });
  }, [navigation, isEditing]);

  useEffect(() => {
    const applyShares = (list) => {
      if (!isEditing) {
        setSelectedShares(list.map((m) => m.id));
        return;
      }
      (async () => {
        let ids =
          Array.isArray(expense?.shares) && expense.shares.length
            ? expense.shares.map((s) => (typeof s === 'object' ? s.id : s))
            : null;
        if (!ids) {
          const map = await loadSharesMap();
          ids = map[expense?.id] || null;
        }
        setSelectedShares(ids && ids.length ? ids : list.map((m) => m.id));
      })();
    };

    if (members.length > 0) {
      applyShares(members);
      return;
    }
    (async () => {
      try {
        const res = await groupsAPI.members(groupId);
        const fetched = res.data || [];
        setMembers(fetched);
        applyShares(fetched);
      } catch (e) {
        Alert.alert('Error', 'Failed to load members');
      } finally {
        setLoadingMembers(false);
      }
    })();
  }, []);

  const toggleShare = (id) => {
    if (id === payerId) return;
    setSelectedShares((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const calculateTotal = (input) => {
    if (!input.trim()) return 0;
    try {
      const sanitized = input.replace(/×/g, '*').replace(/÷/g, '/');
      const tokens = sanitized.match(/(\d+\.?\d*|[+\-*/])/g) || [];
      if (tokens.length === 0) return 0;

      let values = [];
      let ops = [];

      let current = parseFloat(tokens[0]);
      values.push(current);

      for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i];
        const num = parseFloat(tokens[i + 1]);
        if (num === undefined) break;

        if (op === '*' || op === '/') {
          const last = values.pop();
          if (op === '*') values.push(last * num);
          else values.push(last / num);
        } else {
          ops.push(op);
          values.push(num);
        }
      }

      let total = values[0];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] === '+') total += values[i + 1];
        else if (ops[i] === '-') total -= values[i + 1];
      }

      return isNaN(total) ? 0 : total;
    } catch {
      return 0;
    }
  };

  const totalAmount = calculateTotal(amountInput);

  const handleAdd = async () => {
    if (!title || !amountInput.trim()) {
      Alert.alert('Error', 'Title and amount are required');
      return;
    }
    if (totalAmount < 1) {
      Alert.alert('Error', 'Total amount must be at least 1');
      return;
    }
    setLoading(true);
    try {
      const allIds = members.map((m) => m.id);
      const nobodyElseSelected =
        selectedShares.length === 0 ||
        (selectedShares.length === 1 && selectedShares.includes(payerId));
      const shares = nobodyElseSelected
        ? allIds
        : selectedShares.includes(payerId)
        ? selectedShares
        : [...selectedShares, payerId];
      const payload = { title, amount: totalAmount, note, shared_with: shares };
      let expId = expense?.id;
      if (isEditing) {
        await expensesAPI.update(expense.id, payload);
      } else {
        const res = await expensesAPI.create(groupId, payload);
        expId = res.data?.expense?.id ?? res.data?.id;
      }
      await saveExpenseShares(expId, shares);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || (isEditing ? 'Failed to update expense' : 'Failed to add expense'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dinner, Petrol"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. 12+23-5*2/4'
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          value={amountInput}
          onChangeText={setAmountInput}
        />
        {amountInput.trim() ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total =</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any details..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          value={note}
          onChangeText={setNote}
        />

        <Text style={styles.label}>Split between</Text>
        {loadingMembers ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 8 }} />
        ) : (
          <>
            {members.map((m) => {
              const selected = selectedShares.includes(m.id);
              const isPayer = m.id === payerId;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberCheck, selected && styles.memberCheckSelected]}
                  onPress={() => toggleShare(m.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                    {selected ? <Text style={styles.checkboxTick}>✓</Text> : null}
                  </View>
                  <Text style={styles.memberCheckName}>
                    {m.name}{isPayer ? ' (You)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.splitHint}>
              Selected {selectedShares.length} of {members.length} members
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isEditing ? 'Update Expense' : 'Add Expense'} — ₹{totalAmount.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  memberCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  memberCheckSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  memberCheckName: {
    fontSize: 15,
    color: colors.text,
  },
  splitHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    marginRight: 8,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
