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
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { crmConfigAPI } from '../../../services/api';

export default function CRMSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await crmConfigAPI.get();
      setConfig(res.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only admins can access CRM settings');
        router.back();
      } else {
        console.error('Error loading config:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await crmConfigAPI.update(config);
      Alert.alert('Success', 'CRM settings updated successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRM Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#F59E0B" />
          <Text style={styles.infoText}>
            These are mock integrations for demonstration. Real API keys will be required for production.
          </Text>
        </View>

        {/* WhatsApp Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WhatsApp Integration (Mock)</Text>
          
          <View style={styles.switchCard}>
            <View style={styles.switchLeft}>
              <Ionicons name="logo-whatsapp" size={24} color="#10B981" />
              <Text style={styles.switchLabel}>Enable WhatsApp</Text>
            </View>
            <Switch
              value={config?.whatsapp_enabled}
              onValueChange={(value) => setConfig({ ...config, whatsapp_enabled: value })}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {config?.whatsapp_enabled && (
            <>
              <Text style={styles.label}>API Key (Mock)</Text>
              <TextInput
                style={styles.input}
                value={config?.whatsapp_api_key || ''}
                onChangeText={(text) => setConfig({ ...config, whatsapp_api_key: text })}
                placeholder="Enter mock API key"
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>Welcome Message Template</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={config?.whatsapp_template_on_create || ''}
                onChangeText={(text) => setConfig({ ...config, whatsapp_template_on_create: text })}
                placeholder="Hello {name}, thank you for your interest!"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={4}
              />
              <Text style={styles.helperText}>
                Use {'{name}'} as placeholder for lead name
              </Text>
            </>
          )}
        </View>

        {/* Telephony Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Telephony Integration (Mock)</Text>
          
          <View style={styles.switchCard}>
            <View style={styles.switchLeft}>
              <Ionicons name="call" size={24} color="#3B82F6" />
              <Text style={styles.switchLabel}>Enable Telephony</Text>
            </View>
            <Switch
              value={config?.telephony_enabled}
              onValueChange={(value) => setConfig({ ...config, telephony_enabled: value })}
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {config?.telephony_enabled && (
            <>
              <Text style={styles.label}>Provider</Text>
              <TextInput
                style={styles.input}
                value={config?.telephony_provider || ''}
                onChangeText={(text) => setConfig({ ...config, telephony_provider: text })}
                placeholder="mock"
                placeholderTextColor="#A0AEC0"
              />
            </>
          )}
        </View>

        {/* Auto-Assignment Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Auto-Assignment</Text>
          
          <View style={styles.switchCard}>
            <View style={styles.switchLeft}>
              <Ionicons name="person-add" size={24} color="#8B5CF6" />
              <Text style={styles.switchLabel}>Enable Auto-Assignment</Text>
            </View>
            <Switch
              value={config?.auto_assign_enabled}
              onValueChange={(value) => setConfig({ ...config, auto_assign_enabled: value })}
              trackColor={{ false: '#E2E8F0', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {config?.auto_assign_enabled && (
            <View style={styles.strategyCard}>
              <TouchableOpacity
                style={[
                  styles.strategyOption,
                  config?.auto_assign_strategy === 'round_robin' && styles.strategyOptionActive,
                ]}
                onPress={() => setConfig({ ...config, auto_assign_strategy: 'round_robin' })}
              >
                <Ionicons
                  name={config?.auto_assign_strategy === 'round_robin' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={config?.auto_assign_strategy === 'round_robin' ? '#8B5CF6' : '#CBD5E0'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.strategyTitle}>Round Robin</Text>
                  <Text style={styles.strategyDescription}>Distribute leads evenly among team members</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.strategyOption,
                  config?.auto_assign_strategy === 'least_assigned' && styles.strategyOptionActive,
                ]}
                onPress={() => setConfig({ ...config, auto_assign_strategy: 'least_assigned' })}
              >
                <Ionicons
                  name={config?.auto_assign_strategy === 'least_assigned' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={config?.auto_assign_strategy === 'least_assigned' ? '#8B5CF6' : '#CBD5E0'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.strategyTitle}>Least Assigned</Text>
                  <Text style={styles.strategyDescription}>Assign to team member with fewest active leads</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { width: 40 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C', flex: 1 },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFAF0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#744210',
    lineHeight: 20,
  },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  switchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: '#718096',
    marginTop: -12,
    marginBottom: 16,
  },
  strategyCard: {
    gap: 12,
  },
  strategyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strategyOptionActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  strategyDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});