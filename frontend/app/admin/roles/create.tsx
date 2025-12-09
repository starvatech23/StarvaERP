import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { rolesAPI, permissionsAPI } from '../../../services/api';

const MODULES = [
  { key: 'projects', label: 'Projects', icon: 'business', color: 'Colors.secondary' },
  { key: 'tasks', label: 'Tasks', icon: 'checkbox', color: 'Colors.primary' },
  { key: 'labor', label: 'Labor', icon: 'people', color: '#10B981' },
  { key: 'materials', label: 'Materials', icon: 'cube', color: '#8B5CF6' },
  { key: 'vendors', label: 'Vendors', icon: 'storefront', color: '#F59E0B' },
  { key: 'reports', label: 'Reports', icon: 'stats-chart', color: '#06B6D4' },
  { key: 'users', label: 'Users', icon: 'person', color: '#EC4899' },
];

const PERMISSION_TYPES = [
  { key: 'can_view', label: 'View' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
];

export default function CreateRoleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<any>({});

  // Initialize permissions for each module
  React.useEffect(() => {
    const initialPermissions: any = {};
    MODULES.forEach((module) => {
      initialPermissions[module.key] = {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });
    setPermissions(initialPermissions);
  }, []);

  const togglePermission = (moduleKey: string, permissionKey: string) => {
    setPermissions({
      ...permissions,
      [moduleKey]: {
        ...permissions[moduleKey],
        [permissionKey]: !permissions[moduleKey]?.[permissionKey],
      },
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a role name');
      return;
    }

    setLoading(true);
    try {
      // Create the role
      const roleResponse = await rolesAPI.create({
        name: name.trim(),
        description: description.trim() || null,
        is_active: isActive,
      });

      const roleId = roleResponse.data.id;

      // Create permissions for each module
      const permissionPromises = Object.keys(permissions).map((moduleKey) => {
        return permissionsAPI.create({
          role_id: roleId,
          module: moduleKey,
          ...permissions[moduleKey],
        });
      });

      await Promise.all(permissionPromises);

      Alert.alert('Success', 'Role created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Role</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Role Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Site Supervisor"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe this role's responsibilities..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>Active Status</Text>
                <Text style={styles.switchHelper}>
                  Inactive roles cannot be assigned to users
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={isActive ? '#10B981' : '#F3F4F6'}
              />
            </View>
          </View>

          {/* Permissions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Module Permissions</Text>
            <Text style={styles.sectionSubtitle}>
              Set what this role can do in each module
            </Text>

            {MODULES.map((module) => (
              <View key={module.key} style={styles.moduleCard}>
                <View style={styles.moduleHeader}>
                  <View style={[styles.moduleIcon, { backgroundColor: `${module.color}20` }]}>
                    <Ionicons name={module.icon as any} size={20} color={module.color} />
                  </View>
                  <Text style={styles.moduleName}>{module.label}</Text>
                </View>

                <View style={styles.permissionsGrid}>
                  {PERMISSION_TYPES.map((permission) => (
                    <TouchableOpacity
                      key={permission.key}
                      style={[
                        styles.permissionChip,
                        permissions[module.key]?.[permission.key] &&
                          styles.permissionChipActive,
                      ]}
                      onPress={() => togglePermission(module.key, permission.key)}
                    >
                      <Ionicons
                        name={
                          permissions[module.key]?.[permission.key]
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={16}
                        color={
                          permissions[module.key]?.[permission.key]
                            ? '#10B981'
                            : '#9CA3AF'
                        }
                      />
                      <Text
                        style={[
                          styles.permissionText,
                          permissions[module.key]?.[permission.key] &&
                            styles.permissionTextActive,
                        ]}
                      >
                        {permission.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="Colors.surface" />
                <Text style={styles.createButtonText}>Create Role</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background',
  },
  keyboardView: {
    flex: 1,
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
  section: {
    padding: 16,
    backgroundColor: 'Colors.surface',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'Colors.textSecondary',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'Colors.background',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: 'Colors.textPrimary',
    borderWidth: 1,
    borderColor: 'Colors.border',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border',
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchHelper: {
    fontSize: 12,
    color: 'Colors.textSecondary',
    marginTop: 4,
  },
  moduleCard: {
    backgroundColor: 'Colors.background',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'Colors.border',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'Colors.textPrimary',
    marginLeft: 10,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'Colors.surface',
    borderWidth: 1,
    borderColor: 'Colors.border',
    gap: 6,
  },
  permissionChipActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  permissionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  permissionTextActive: {
    color: '#059669',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'Colors.secondary',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.surface',
  },
});
