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
import { rolesAPI } from '../../../services/api';

export default function RolesListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await rolesAPI.getAll();
      setRoles(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load roles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete "${roleName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await rolesAPI.delete(roleId);
              Alert.alert('Success', 'Role deleted successfully');
              loadRoles();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to delete role'
              );
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
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Role Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/admin/roles/create' as any)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadRoles} />
        }
      >
        {roles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Roles Yet</Text>
            <Text style={styles.emptyText}>
              Create roles to manage user permissions
            </Text>
          </View>
        ) : (
          <View style={styles.rolesList}>
            <Text style={styles.countText}>{roles.length} role(s)</Text>

            {roles.map((role: any) => (
              <TouchableOpacity
                key={role.id}
                style={styles.roleCard}
                onPress={() => router.push(`/admin/roles/edit/${role.id}` as any)}
              >
                <View style={styles.roleHeader}>
                  <View style={styles.roleIcon}>
                    <Ionicons name="shield-checkmark" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.name}</Text>
                    {role.description && (
                      <Text style={styles.roleDescription} numberOfLines={2}>
                        {role.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.roleActions}>
                    {role.is_active ? (
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    ) : (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.roleFooter}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push(`/admin/roles/edit/${role.id}` as any)}
                  >
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(role.id, role.name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.permissionsButton}
                    onPress={() => router.push(`/admin/roles/edit/${role.id}` as any)}
                  >
                    <Text style={styles.permissionsButtonText}>Permissions</Text>
                    <Ionicons name="chevron-forward" size={18} color="#718096" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
    backgroundColor: '#F7FAFC',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#1A202C',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
  },
  rolesList: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 12,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  roleDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
  },
  roleActions: {
    marginLeft: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inactiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleFooter: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  permissionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  permissionsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
});