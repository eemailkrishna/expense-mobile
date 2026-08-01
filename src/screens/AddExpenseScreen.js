import React, { useState } from 'react';
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
import { expensesAPI } from '../api/client';
import { colors } from '../theme/colors';

export default function AddExpenseScreen({ route, navigation }) {
  const { groupId } = route.params;
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateTotal = (input) => {
    if (!input.trim()) return 0;
    try {
      const sanitized = input.replace(/×/g, '*').replace(/÷/g, '/');
      const tokens = sanitized.match(/(\d+\.?\d*|[+\-*/])/g) || [];
      if (tokens.length === 0) return 0;
      let total = parseFloat(tokens[0]);
      for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i];
        const num = parseFloat(tokens[i + 1]);
        if (num === undefined) return total;
        if (op === '+') total += num;
        else if (op === '-') total -= num;
        else if (op === '*') total *= num;
        else if (op === '/') total /= num;
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
      await expensesAPI.create(groupId, { title, amount: totalAmount, note });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add expense');
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

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Expense — ₹{totalAmount.toFixed(2)}</Text>
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
