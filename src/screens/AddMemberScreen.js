import React, { useState, useEffect } from 'react';
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
  FlatList,
} from 'react-native';
import { groupsAPI } from '../api/client';
import { colors } from '../theme/colors';

export default function AddMemberScreen({ route, navigation }) {
  const { groupId } = route.params;
  const [knownUsers, setKnownUsers] = useState([]);
  const [groupIdMembers, setGroupIdMembers] = useState([]);
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showMobileInput, setShowMobileInput] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [knownRes, membersRes] = await Promise.all([
        groupsAPI.knownUsers(),
        groupsAPI.members(groupId),
      ]);
      setKnownUsers(knownRes.data);
      setGroupIdMembers(membersRes.data.map((m) => m.id));
    } catch (e) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setPageLoading(false);
    }
  };

  const handleAddUser = async (userId) => {
    setLoading(true);
    try {
      await groupsAPI.addMember(groupId, userId);
      setGroupIdMembers((prev) => [...prev, userId]);
      Alert.alert('Success', 'Member added successfully');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleAddByMobile = async () => {
    if (!mobile) {
      Alert.alert('Error', 'Please enter a mobile number');
      return;
    }
    setLoading(true);
    try {
      await groupsAPI.addMemberByMobile(groupId, mobile);
      Alert.alert('Success', 'Member added successfully');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const availableUsers = knownUsers.filter((u) => !groupIdMembers.includes(u.id));

  const renderUser = ({ item }) => {
    const alreadyInGroup = groupIdMembers.includes(item.id);
    return (
      <View style={[styles.userRow, alreadyInGroup && styles.userRowDisabled]}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userMobile}>{item.mobile}</Text>
          </View>
        </View>
        {alreadyInGroup ? (
          <View style={styles.addedBadge}>
            <Text style={styles.addedText}>Added</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, loading && styles.buttonDisabled]}
            onPress={() => handleAddUser(item.id)}
            disabled={loading}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity
        style={styles.toggleInput}
        onPress={() => setShowMobileInput(!showMobileInput)}
      >
        <Text style={styles.toggleInputText}>
          {showMobileInput ? 'Show known users' : 'Add by mobile number'}
        </Text>
      </TouchableOpacity>

      {showMobileInput ? (
        <View style={styles.form}>
          <Text style={styles.subtext}>
            Enter the registered mobile number of the user
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={setMobile}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAddByMobile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Member</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={availableUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              Select a user to add from your groups
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users available</Text>
              <Text style={styles.emptySubtext}>
                All users from your groups are already in this group
              </Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
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
  toggleInput: {
    padding: 16,
    alignItems: 'center',
  },
  toggleInputText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  subtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
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
  list: {
    padding: 16,
  },
  listHeader: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  userRow: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userRowDisabled: {
    opacity: 0.5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userMobile: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  addedBadge: {
    backgroundColor: colors.success,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addedText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
    textAlign: 'center',
  },
});
