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
  Linking,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { userManagementAPI } from '../../../services/api';

export default function ActiveUsersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userManagementAPI.getActive();
      setUsers(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load active users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCall = (phone: string, name: string) => {
    Alert.alert(
      'Call User',
      `Call ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${phone}`).catch(() => {
              Alert.alert('Error', 'Unable to make call');
            });
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (roleName: string) => {
    const roleColors: { [key: string]: { bg: string; text: string } } = {
      'Admin': { bg: '#FEE2E2', text: '#DC2626' },
      'Project Manager': { bg: '#DBEAFE', text: '#2563EB' },
      'Project Engineer': { bg: '#D1FAE5', text: '#059669' },
    };
    return roleColors[roleName] || { bg: '#F3F4F6', text: '#6B7280' };
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
        <Text style={styles.headerTitle}>Active Users</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadUsers} />
        }
      >
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Active Users</Text>
            <Text style={styles.emptyText}>
              Approved users will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            <Text style={styles.countText}>{users.length} active user(s)</Text>
            
            {users.map((user: any) => {
              const roleColors = getRoleBadgeColor(user.role_name);
              
              return (
                <View key={user.id} style={styles.userCard}>
                  {/* User Header */}
                  <View style={styles.userHeader}>
                    <View style={styles.avatarContainer}>
                      <Ionicons name="person" size={24} color="Colors.primary" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name}</Text>
                      {user.role_name && (
                        <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
                          <Text style={[styles.roleText, { color: roleColors.text }]}>
                            {user.role_name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Contact Info */}
                  <View style={styles.contactSection}>
                    {user.email && (
                      <View style={styles.contactRow}>
                        <Ionicons name="mail" size={16} color="Colors.textSecondary" />
                        <Text style={styles.contactText}>{user.email}</Text>
                      </View>
                    )}
                    
                    {user.phone && (
                      <View style={styles.contactRow}>
                        <Ionicons name="call" size={16} color="Colors.textSecondary" />
                        <Text style={styles.contactText}>{user.phone}</Text>
                        <TouchableOpacity
                          style={styles.callButton}
                          onPress={() => handleCall(user.phone, user.full_name)}
                        >
                          <Ionicons name="call" size={16} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {user.address && (
                      <View style={styles.contactRow}>
                        <Ionicons name="location" size={16} color="Colors.textSecondary" />
                        <Text style={styles.contactText} numberOfLines={2}>
                          {user.address}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Metadata */}
                  <View style={styles.metadataSection}>
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Joined</Text>
                      <Text style={styles.metadataValue}>
                        {new Date(user.date_joined).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    {user.approved_at && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Approved</Text>
                        <Text style={styles.metadataValue}>
                          {new Date(user.approved_at).toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
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
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
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
    color: 'Colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: 'Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  usersList: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textSecondary,
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'Colors.border,
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
    backgroundColor: '#DBEAFE',
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
    color: 'Colors.textPrimary,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  contactSection: {
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 13,
    color: 'Colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  metadataSection: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
    gap: 16,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 11,
    color: 'Colors.textSecondary,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
});
