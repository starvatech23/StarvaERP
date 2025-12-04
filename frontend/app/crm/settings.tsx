import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { integrationSettingsAPI } from '../../services/crm-api';

export default function CRMSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await integrationSettingsAPI.list();
      setSettings(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await integrationSettingsAPI.update(editingId, formData);
      } else {
        await integrationSettingsAPI.create(formData);
      }
      setEditingId(null);
      setFormData({});
      loadSettings();
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save settings');
    }
  };

  const startEdit = (setting: any) => {
    setEditingId(setting.id);
    setFormData(setting);
  };

  const startNew = (providerName: string) => {
    setEditingId(null);
    setFormData({
      provider_name: providerName,
      is_active: false,
      test_mode: true,
      default_provider: false,
      config: {},
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRM Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integration Settings</Text>
          <Text style={styles.sectionDesc}>
            Configure API keys for telephony and WhatsApp integrations. Keep test mode enabled to use mock services.
          </Text>
        </View>

        {/* Existing Settings */}
        {settings.map((setting: any) => (
          <View key={setting.id} style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingName}>{setting.provider_name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {setting.is_active && (
                    <View style={[styles.badge, styles.badgeActive]}>
                      <Text style={styles.badgeText}>Active</Text>
                    </View>
                  )}
                  {setting.test_mode && (
                    <View style={[styles.badge, styles.badgeTest]}>
                      <Text style={styles.badgeText}>Test Mode</Text>
                    </View>
                  )}
                  {setting.default_provider && (
                    <View style={[styles.badge, styles.badgeDefault]}>
                      <Text style={styles.badgeText}>Default</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => startEdit(setting)}>
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add New Integration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Integration</Text>
          <View style={styles.providerButtons}>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => startNew('twilio')}
            >
              <Ionicons name="call" size={20} color="#3B82F6" />
              <Text style={styles.providerButtonText}>Twilio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => startNew('plivo')}
            >
              <Ionicons name="call-outline" size={20} color="#3B82F6" />
              <Text style={styles.providerButtonText}>Plivo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => startNew('whatsapp_business')}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.providerButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Form */}
        {(editingId !== null || Object.keys(formData).length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {editingId ? 'Edit Integration' : 'Configure Integration'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Provider Name</Text>
              <TextInput
                style={styles.input}
                value={formData.provider_name}
                editable={!editingId}
                placeholder="Provider name"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account SID / Auth ID</Text>
              <TextInput
                style={styles.input}
                value={formData.account_sid}
                onChangeText={(text) => setFormData({ ...formData, account_sid: text })}
                placeholder="Enter account SID"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Auth Token</Text>
              <TextInput
                style={styles.input}
                value={formData.auth_token}
                onChangeText={(text) => setFormData({ ...formData, auth_token: text })}
                placeholder="Enter auth token"
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone_number}
                onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                placeholder="+1234567890"
              />
            </View>

            {formData.provider_name?.includes('whatsapp') && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>WhatsApp Phone Number ID</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.whatsapp_phone_number_id}
                    onChangeText={(text) => setFormData({ ...formData, whatsapp_phone_number_id: text })}
                    placeholder="Phone number ID"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>WhatsApp Access Token</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.whatsapp_access_token}
                    onChangeText={(text) => setFormData({ ...formData, whatsapp_access_token: text })}
                    placeholder="Access token"
                    secureTextEntry
                  />
                </View>
              </>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.label}>Active</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Test Mode (Mock Responses)</Text>
              <Switch
                value={formData.test_mode}
                onValueChange={(value) => setFormData({ ...formData, test_mode: value })}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Default Provider</Text>
              <Switch
                value={formData.default_provider}
                onValueChange={(value) => setFormData({ ...formData, default_provider: value })}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => { setEditingId(null); setFormData({}); }}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSave}
              >
                <Text style={styles.buttonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A202C', flex: 1, marginLeft: 16 },
  content: { flex: 1 },
  section: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 8 },
  sectionDesc: { fontSize: 14, color: '#718096', lineHeight: 20 },
  settingCard: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 1, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  settingHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  settingName: { fontSize: 16, fontWeight: '600', color: '#1A202C', textTransform: 'capitalize' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeTest: { backgroundColor: '#FEF3C7' },
  badgeDefault: { backgroundColor: '#DBEAFE' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#1A202C' },
  providerButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  providerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#F7FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  providerButtonText: { fontSize: 14, fontWeight: '600', color: '#4A5568' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1A202C' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#3B82F6' },
  buttonSecondary: { backgroundColor: '#E2E8F0' },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondaryText: { color: '#4A5568', fontSize: 16, fontWeight: '600' },
});