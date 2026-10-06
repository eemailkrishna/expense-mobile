import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'expense_shares_map';

export async function loadSharesMap() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveExpenseShares(expenseId, userIds) {
  if (!expenseId || !Array.isArray(userIds)) return;
  try {
    const map = await loadSharesMap();
    map[expenseId] = userIds;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}
