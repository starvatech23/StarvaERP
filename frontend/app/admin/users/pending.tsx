import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { userManagementAPI, rolesAPI } from '../../../services/api';

export default function PendingUsersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        userManagementAPI.getPending(),
        rolesAPI.getAll(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load pending users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (userId: string) => {
    const roleId = selectedRoles[userId];
    if (!roleId) {
      Alert.alert('Error', 'Please select a role for this user');
      return;
    }

    Alert.alert(
      'Approve User',
      'Are you sure you want to approve this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await userManagementAPI.approve(userId, 'approve', roleId);
              Alert.alert('Success', 'User approved successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to approve user');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (userId: string) => {
    Alert.alert(
      'Reject User',
      'Are you sure you want to reject this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await userManagementAPI.approve(userId, 'reject');
              Alert.alert('Success', 'User rejected');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to reject user');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              No pending user approvals at the moment
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            <Text style={styles.countText}>{users.length} pending approval(s)</Text>
            
            {users.map((user: any) => (
              <View key={user.id} style={styles.userCard}>
                {/* User Info */}
                <View style={styles.userHeader}>
                  <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={24} color="Colors.secondary" />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    <Text style={styles.userContact}>
                      {user.email || user.phone}
                    </Text>
                  </View>
                </View>

                {/* User Details */}
                {user.address && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={16} color="Colors.textSecondary" />
                    <Text style={styles.detailText}>{user.address}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="Colors.textSecondary" />
                  <Text style={styles.detailText}>
                    Requested: {new Date(user.date_joined).toLocaleDateString()}
                  </Text>
                </View>

                {/* Role Selection */}
                <View style={styles.roleSection}>
                  <Text style={styles.roleLabel}>Assign Role *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedRoles[user.id] || ''}
                      onValueChange={(value) =>
                        setSelectedRoles({ ...selectedRoles, [user.id]: value })
                      }
                      style={styles.picker}
                      dropdownIconColor="Colors.textPrimary"
                    >
                      <Picker.Item label="Select a role" value="" color="Colors.textSecondary" />
                      {roles.map((role: any) => (
                        <Picker.Item
                          key={role.id}
                          label={role.name}
                          value={role.id}
                          color="Colors.textPrimary"
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(user.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(user.id)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="Colors.surface" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: 'Colors.textSecondary',
    textAlign: 'center',
    marginTop: 8,
  },
  usersList: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textSecondary',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: 'Colors.surface',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'Colors.border',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  userContact: {
    fontSize: 13,
    color: 'Colors.textSecondary',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: 'Colors.textSecondary',
    marginLeft: 8,
  },
  roleSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: 'Colors.background',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'Colors.border',
    overflow: 'hidden',
  },
  picker: {
    color: 'Colors.textPrimary',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.surface',
  },
});
