import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackToCRM from '../../../components/BackToCRM';
import { crmPermissionsAPI } from '../../../services/api';

// All available CRM permissions
const ALL_PERMISSIONS = [
  { key: 'view_leads', label: 'View Leads', description: 'Can view lead list and details' },
  { key: 'create_leads', label: 'Create Leads', description: 'Can create new leads' },
  { key: 'edit_leads', label: 'Edit Leads', description: 'Can modify lead information' },
  { key: 'delete_leads', label: 'Delete Leads', description: 'Can delete leads' },
  { key: 'move_to_project', label: 'Move to Project', description: 'Can convert leads to projects' },
  { key: 'bypass_required_fields', label: 'Bypass Required Fields', description: 'Can skip mandatory fields' },
  { key: 'manage_funnels', label: 'Manage Funnels', description: 'Can create/edit sales funnels' },
  { key: 'manage_custom_fields', label: 'Manage Custom Fields', description: 'Can add custom fields' },
  { key: 'access_crm_settings', label: 'Access Settings', description: 'Can access CRM settings' },
  { key: 'view_analytics', label: 'View Analytics', description: 'Can view CRM reports' },
  { key: 'export_leads', label: 'Export Leads', description: 'Can export lead data' },
  { key: 'import_leads', label: 'Import Leads', description: 'Can import leads' },
];

export default function PermissionsScreen() {
  const router = useRouter();
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      const res = await crmPermissionsAPI.getMatrix();
      setMatrix(res.data.matrix || []);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only CRM admins can view permissions');
        router.back();
      } else {
        console.error('Error loading permissions:', error);
        Alert.alert('Error', 'Failed to load permissions');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (roleCode: string, permission: string, currentValue: boolean) => {
    // Find the role
    const roleIndex = matrix.findIndex(r => r.role_code === roleCode);
    if (roleIndex === -1) return;

    const role = matrix[roleIndex];
    
    // Don't allow editing admin permissions
    if (role.is_admin) {
      Alert.alert('Cannot Modify', 'CRM Admin permissions cannot be changed');
      return;
    }

    // Update local state optimistically
    const newPermissions = currentValue
      ? role.permissions.filter((p: string) => p !== permission)
      : [...role.permissions, permission];

    const newMatrix = [...matrix];
    newMatrix[roleIndex] = { ...role, permissions: newPermissions };
    setMatrix(newMatrix);

    // Save to backend
    setSaving(roleCode);
    try {
      await crmPermissionsAPI.updateRolePermissions(roleCode, { permissions: newPermissions });
    } catch (error) {
      // Revert on error
      setMatrix(matrix);
      Alert.alert('Error', 'Failed to update permissions');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackToCRM title="Permissions" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackToCRM title="Permissions" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CRM Permissions</Text>
        <Text style={styles.headerSubtitle}>Manage role-based access control</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Permission Management</Text>
            <Text style={styles.infoText}>
              CRM Admin roles have full access. Tap on other roles to expand and customize their permissions.
            </Text>
          </View>
        </View>

        {matrix.map((rolePermission: any, index: number) => (
          <View key={index} style={styles.roleCard}>
            <TouchableOpacity
              style={styles.roleHeader}
              onPress={() => !rolePermission.is_admin && setExpandedRole(
                expandedRole === rolePermission.role_code ? null : rolePermission.role_code
              )}
              disabled={rolePermission.is_admin}
            >
              <View style={[
                styles.roleIconContainer,
                rolePermission.is_admin && styles.adminIconContainer
              ]}>
                <Ionicons 
                  name={rolePermission.is_admin ? "shield" : "person"} 
                  size={20} 
                  color={rolePermission.is_admin ? "#DC2626" : Colors.primary} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.roleNameRow}>
                  <Text style={styles.roleName}>{rolePermission.role}</Text>
                  {rolePermission.is_admin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>ADMIN</Text>
                    </View>
                  )}
                </View>
                {rolePermission.description ? (
                  <Text style={styles.roleDescription}>{rolePermission.description}</Text>
                ) : (
                  <Text style={styles.roleSubtitle}>
                    {rolePermission.permissions.length} permissions
                  </Text>
                )}
              </View>
              {!rolePermission.is_admin && (
                <Ionicons 
                  name={expandedRole === rolePermission.role_code ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={Colors.textSecondary} 
                />
              )}
              {saving === rolePermission.role_code && (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />
              )}
            </TouchableOpacity>

            {/* Admin - Show all permissions as badges */}
            {rolePermission.is_admin && (
              <View style={styles.permissionsList}>
                <Text style={styles.memberRolesLabel}>Member Roles:</Text>
                <View style={styles.memberRolesList}>
                  {rolePermission.member_roles?.map((role: string, rIndex: number) => (
                    <View key={rIndex} style={styles.memberRoleBadge}>
                      <Text style={styles.memberRoleText}>
                        {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.allPermissionsText}>✓ All CRM permissions granted</Text>
              </View>
            )}

            {/* Non-admin - Expandable permissions list */}
            {!rolePermission.is_admin && expandedRole === rolePermission.role_code && (
              <View style={styles.permissionsEditor}>
                {ALL_PERMISSIONS.map((perm, pIndex) => {
                  const hasPermission = rolePermission.permissions.includes(perm.key);
                  return (
                    <View key={pIndex} style={styles.permissionRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.permissionLabel}>{perm.label}</Text>
                        <Text style={styles.permissionDescription}>{perm.description}</Text>
                      </View>
                      <Switch
                        value={hasPermission}
                        onValueChange={() => togglePermission(rolePermission.role_code, perm.key, hasPermission)}
                        trackColor={{ false: Colors.border, true: '#10B981' }}
                        thumbColor={Colors.surface}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {/* Non-admin collapsed - Show permission count */}
            {!rolePermission.is_admin && expandedRole !== rolePermission.role_code && (
              <View style={styles.collapsedPermissions}>
                {rolePermission.permissions.length > 0 ? (
                  <View style={styles.permissionBadgesRow}>
                    {rolePermission.permissions.slice(0, 3).map((permission: string, pIndex: number) => (
                      <View key={pIndex} style={styles.permissionBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={styles.permissionBadgeText}>
                          {permission.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                    {rolePermission.permissions.length > 3 && (
                      <Text style={styles.morePermissions}>
                        +{rolePermission.permissions.length - 3} more
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.noPermissions}>No permissions assigned - Tap to configure</Text>
                )}
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#065F46', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#065F46', lineHeight: 18 },
  roleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  roleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  adminBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  roleDescription: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  roleSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  permissionsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberRolesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  memberRolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  memberRoleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberRoleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
  allPermissionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
  },
  permissionsEditor: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  permissionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  collapsedPermissions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  permissionBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  permissionBadgeText: {
    fontSize: 12,
    color: '#166534',
    textTransform: 'capitalize',
  },
  morePermissions: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  noPermissions: {
    fontSize: 13,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
});
