import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { systemSettingsAPI } from '../../../services/api';

export default function SystemSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [maxAdmins, setMaxAdmins] = useState('5');
  const [requireApproval, setRequireApproval] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await systemSettingsAPI.getAll();
      const settingsObj: any = {};
      
      response.data.forEach((setting: any) => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });

      setSettings(settingsObj);
      setMaxAdmins(settingsObj.max_admins || '5');
      setRequireApproval(settingsObj.require_approval === 'true');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const maxAdminsNum = parseInt(maxAdmins);
    if (isNaN(maxAdminsNum) || maxAdminsNum < 1) {
      Alert.alert('Error', 'Please enter a valid number for max admins (minimum 1)');
      return;
    }

    if (maxAdminsNum > 100) {
      Alert.alert('Error', 'Maximum admins cannot exceed 100');
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        systemSettingsAPI.createOrUpdate({
          setting_key: 'max_admins',
          setting_value: maxAdmins,
          description: 'Maximum number of admin users allowed in the system',
        }),
        systemSettingsAPI.createOrUpdate({
          setting_key: 'require_approval',
          setting_value: requireApproval.toString(),
          description: 'Whether new user registrations require admin approval',
        }),
      ]);

      Alert.alert('Success', 'Settings updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Admin Limit Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#DC2626" />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Admin User Limit</Text>
              <Text style={styles.sectionSubtitle}>
                Control the maximum number of admin users
              </Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Maximum Admin Users</Text>
            <TextInput
              style={styles.numberInput}
              value={maxAdmins}
              onChangeText={setMaxAdmins}
              keyboardType="numeric"
              placeholder="5"
            />
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Set how many users can have admin privileges. Range: 1-100
            </Text>
          </View>
        </View>

        {/* User Approval Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="checkmark-done" size={24} color={Colors.primary} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>User Registration</Text>
              <Text style={styles.sectionSubtitle}>
                Manage new user approval workflow
              </Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.settingLabel}>Require Admin Approval</Text>
              <Text style={styles.settingHelper}>
                New users must be approved by an admin before accessing the app
              </Text>
            </View>
            <Switch
              value={requireApproval}
              onValueChange={setRequireApproval}
              trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
              thumbColor={requireApproval ? '#10B981' : '#F3F4F6'}
            />
          </View>

          <View style={[styles.infoCard, { backgroundColor: requireApproval ? '#FEF3C7' : '#F3F4F6' }]}>
            <Ionicons 
              name={requireApproval ? 'alert-circle' : 'information-circle'} 
              size={20} 
              color={requireApproval ? '#F59E0B' : '#6B7280'} 
            />
            <Text style={[styles.infoText, { color: requireApproval ? '#92400E' : '#6B7280' }]}>
              {requireApproval
                ? 'Users will see dashboard only until approved by admin'
                : 'Users can access full app immediately after registration'}
            </Text>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="information" size={24} color="#6366F1" />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>App Information</Text>
              <Text style={styles.sectionSubtitle}>System details and version</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>App Version</Text>
            <Text style={styles.infoRowValue}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>Database</Text>
            <Text style={styles.infoRowValue}>MongoDB</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>RBAC Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <>
              <Ionicons name="save" size={20} color={Colors.surface} />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingHelper: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  numberInput: {
    width: 80,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});