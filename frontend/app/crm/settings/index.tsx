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
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { crmConfigAPI, crmCategoriesAPI, userManagementAPI } from '../../../services/api';
import DropdownPicker from '../../../components/DropdownPicker';

const SYNC_FREQUENCY_OPTIONS = [
  { label: 'Real-time', value: 'realtime' },
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
];

const TELEPHONY_PROVIDERS = [
  { label: 'None', value: 'none' },
  { label: 'Twilio', value: 'twilio' },
  { label: 'Exotel', value: 'exotel' },
  { label: 'Knowlarity', value: 'knowlarity' },
  { label: 'Other', value: 'other' },
];

export default function CRMSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('meta');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configRes, categoriesRes, usersRes] = await Promise.all([
        crmConfigAPI.get(),
        crmCategoriesAPI.getAll(),
        userManagementAPI.getActive(),
      ]);
      setConfig(configRes.data);
      setCategories(categoriesRes.data);
      setUsers(usersRes.data);
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

  const categoryOptions = categories.map((cat: any) => ({
    label: cat.name,
    value: cat.id,
  }));

  const userOptions = users.map((user: any) => ({
    label: user.full_name,
    value: user.id,
  }));

  const tabs = [
    { key: 'meta', label: 'Meta Leads', icon: 'logo-facebook' },
    { key: 'google', label: 'Google Ads', icon: 'logo-google' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
    { key: 'telephony', label: 'Telephony', icon: 'call' },
    { key: 'assignment', label: 'Auto-Assign', icon: 'person-add' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderMetaLeadsSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#1877F220' }]}>
          <Ionicons name="logo-facebook" size={24} color="#1877F2" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Meta (Facebook/Instagram) Leads</Text>
          <Text style={styles.sectionSubtitle}>Import leads from Facebook Lead Ads</Text>
        </View>
      </View>

      <View style={styles.switchCard}>
        <Text style={styles.switchLabel}>Enable Meta Leads Integration</Text>
        <Switch
          value={config?.meta_leads_enabled}
          onValueChange={(value) => setConfig({ ...config, meta_leads_enabled: value })}
          trackColor={{ false: Colors.border, true: '#1877F2' }}
          thumbColor={Colors.surface}
        />
      </View>

      {config?.meta_leads_enabled && (
        <>
          <Text style={styles.label}>Page ID <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={config?.meta_page_id || ''}
            onChangeText={(text) => setConfig({ ...config, meta_page_id: text })}
            placeholder="Your Facebook Page ID"
            placeholderTextColor="#A0AEC0"
          />

          <Text style={styles.label}>Access Token <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={config?.meta_access_token || ''}
            onChangeText={(text) => setConfig({ ...config, meta_access_token: text })}
            placeholder="Long-lived Page Access Token"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
          />

          <Text style={styles.label}>Form ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={config?.meta_form_id || ''}
            onChangeText={(text) => setConfig({ ...config, meta_form_id: text })}
            placeholder="Specific Lead Form ID (leave blank for all)"
            placeholderTextColor="#A0AEC0"
          />

          <Text style={styles.label}>Webhook URL</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>
              {config?.meta_webhook_url || 'Will be generated after saving'}
            </Text>
            <TouchableOpacity onPress={() => {/* Copy to clipboard */}}>
              <Ionicons name="copy-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Add this URL to your Meta App's webhook settings</Text>

          <Text style={styles.label}>Sync Frequency</Text>
          <DropdownPicker
            label="Sync Frequency"
            value={config?.meta_sync_frequency || 'realtime'}
            options={SYNC_FREQUENCY_OPTIONS}
            onSelect={(value) => setConfig({ ...config, meta_sync_frequency: value })}
          />

          <Text style={styles.label}>Default Category</Text>
          <DropdownPicker
            label="Default Category"
            value={config?.meta_default_category_id || ''}
            options={[{ label: 'Select Category', value: '' }, ...categoryOptions]}
            onSelect={(value) => setConfig({ ...config, meta_default_category_id: value })}
          />

          <Text style={styles.label}>Auto-Assign To</Text>
          <DropdownPicker
            label="Auto-Assign To"
            value={config?.meta_auto_assign_user_id || ''}
            options={[{ label: 'No Auto-Assignment', value: '' }, ...userOptions]}
            onSelect={(value) => setConfig({ ...config, meta_auto_assign_user_id: value })}
          />

          {config?.meta_last_sync && (
            <View style={styles.syncInfo}>
              <Ionicons name="sync" size={16} color={Colors.textSecondary} />
              <Text style={styles.syncText}>Last synced: {new Date(config.meta_last_sync).toLocaleString()}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderGoogleAdsSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#4285F420' }]}>
          <Ionicons name="logo-google" size={24} color="#4285F4" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Google Ads Lead Import</Text>
          <Text style={styles.sectionSubtitle}>Import leads from Google Ads Lead Form Extensions</Text>
        </View>
      </View>

      <View style={styles.switchCard}>
        <Text style={styles.switchLabel}>Enable Google Ads Integration</Text>
        <Switch
          value={config?.google_ads_enabled}
          onValueChange={(value) => setConfig({ ...config, google_ads_enabled: value })}
          trackColor={{ false: Colors.border, true: '#4285F4' }}
          thumbColor={Colors.surface}
        />
      </View>

      {config?.google_ads_enabled && (
        <>
          <Text style={styles.label}>Customer ID <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={config?.google_ads_customer_id || ''}
            onChangeText={(text) => setConfig({ ...config, google_ads_customer_id: text })}
            placeholder="123-456-7890"
            placeholderTextColor="#A0AEC0"
          />

          <Text style={styles.label}>Developer Token <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={config?.google_ads_developer_token || ''}
            onChangeText={(text) => setConfig({ ...config, google_ads_developer_token: text })}
            placeholder="Your Google Ads Developer Token"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
          />

          <Text style={styles.label}>OAuth Client ID</Text>
          <TextInput
            style={styles.input}
            value={config?.google_ads_client_id || ''}
            onChangeText={(text) => setConfig({ ...config, google_ads_client_id: text })}
            placeholder="OAuth 2.0 Client ID"
            placeholderTextColor="#A0AEC0"
          />

          <Text style={styles.label}>OAuth Client Secret</Text>
          <TextInput
            style={styles.input}
            value={config?.google_ads_client_secret || ''}
            onChangeText={(text) => setConfig({ ...config, google_ads_client_secret: text })}
            placeholder="OAuth 2.0 Client Secret"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
          />

          <Text style={styles.label}>Refresh Token</Text>
          <TextInput
            style={styles.input}
            value={config?.google_ads_refresh_token || ''}
            onChangeText={(text) => setConfig({ ...config, google_ads_refresh_token: text })}
            placeholder="OAuth Refresh Token"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
          />

          <Text style={styles.label}>Campaign ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={config?.google_ads_campaign_id || ''}
            onChangeText={(text) => setConfig({ ...config, google_ads_campaign_id: text })}
            placeholder="Filter by specific campaign"
            placeholderTextColor="#A0AEC0"
          />

          <Text style={styles.label}>Sync Frequency</Text>
          <DropdownPicker
            label="Sync Frequency"
            value={config?.google_ads_sync_frequency || 'hourly'}
            options={SYNC_FREQUENCY_OPTIONS}
            onSelect={(value) => setConfig({ ...config, google_ads_sync_frequency: value })}
          />

          <Text style={styles.label}>Default Category</Text>
          <DropdownPicker
            label="Default Category"
            value={config?.google_ads_default_category_id || ''}
            options={[{ label: 'Select Category', value: '' }, ...categoryOptions]}
            onSelect={(value) => setConfig({ ...config, google_ads_default_category_id: value })}
          />

          <Text style={styles.label}>Auto-Assign To</Text>
          <DropdownPicker
            label="Auto-Assign To"
            value={config?.google_ads_auto_assign_user_id || ''}
            options={[{ label: 'No Auto-Assignment', value: '' }, ...userOptions]}
            onSelect={(value) => setConfig({ ...config, google_ads_auto_assign_user_id: value })}
          />

          {config?.google_ads_last_sync && (
            <View style={styles.syncInfo}>
              <Ionicons name="sync" size={16} color={Colors.textSecondary} />
              <Text style={styles.syncText}>Last synced: {new Date(config.google_ads_last_sync).toLocaleString()}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderWhatsAppSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#25D36620' }]}>
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>WhatsApp Business Integration</Text>
          <Text style={styles.sectionSubtitle}>Send automated messages to leads</Text>
        </View>
      </View>

      <View style={styles.switchCard}>
        <Text style={styles.switchLabel}>Enable WhatsApp Integration</Text>
        <Switch
          value={config?.whatsapp_enabled}
          onValueChange={(value) => setConfig({ ...config, whatsapp_enabled: value })}
          trackColor={{ false: Colors.border, true: '#25D366' }}
          thumbColor={Colors.surface}
        />
      </View>

      {config?.whatsapp_enabled && (
        <>
          <Text style={styles.label}>Access Token <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={config?.whatsapp_api_key || ''}
            onChangeText={(text) => setConfig({ ...config, whatsapp_api_key: text })}
            placeholder="WhatsApp Business API Access Token"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
          />

          <Text style={styles.label}>Phone Number ID <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={config?.whatsapp_phone_number_id || ''}
            onChangeText={(text) => setConfig({ ...config, whatsapp_phone_number_id: text })}
            placeholder="WhatsApp Phone Number ID"
            placeholderTextColor="#A0AEC0"
          />

          <Text style={styles.label}>Business Account ID</Text>
          <TextInput
            style={styles.input}
            value={config?.whatsapp_business_account_id || ''}
            onChangeText={(text) => setConfig({ ...config, whatsapp_business_account_id: text })}
            placeholder="WhatsApp Business Account ID"
            placeholderTextColor="#A0AEC0"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchRowLabel}>Auto-send welcome message on new lead</Text>
            <Switch
              value={config?.whatsapp_auto_send_on_lead}
              onValueChange={(value) => setConfig({ ...config, whatsapp_auto_send_on_lead: value })}
              trackColor={{ false: Colors.border, true: '#25D366' }}
              thumbColor={Colors.surface}
            />
          </View>

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
          <Text style={styles.helperText}>Use {'{name}'} for lead name placeholder</Text>
        </>
      )}
    </View>
  );

  const renderTelephonySection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#6366F120' }]}>
          <Ionicons name="call" size={24} color="#6366F1" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Telephony Integration</Text>
          <Text style={styles.sectionSubtitle}>Click-to-call and call tracking</Text>
        </View>
      </View>

      <View style={styles.switchCard}>
        <Text style={styles.switchLabel}>Enable Telephony Integration</Text>
        <Switch
          value={config?.telephony_enabled}
          onValueChange={(value) => setConfig({ ...config, telephony_enabled: value })}
          trackColor={{ false: Colors.border, true: '#6366F1' }}
          thumbColor={Colors.surface}
        />
      </View>

      {config?.telephony_enabled && (
        <>
          <Text style={styles.label}>Provider</Text>
          <DropdownPicker
            label="Provider"
            value={config?.telephony_provider || 'none'}
            options={TELEPHONY_PROVIDERS}
            onSelect={(value) => setConfig({ ...config, telephony_provider: value })}
          />

          {config?.telephony_provider && config?.telephony_provider !== 'none' && (
            <>
              <Text style={styles.label}>API Key / Account SID <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={config?.telephony_api_key || ''}
                onChangeText={(text) => setConfig({ ...config, telephony_api_key: text })}
                placeholder="API Key or Account SID"
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>API Secret / Auth Token</Text>
              <TextInput
                style={styles.input}
                value={config?.telephony_api_secret || ''}
                onChangeText={(text) => setConfig({ ...config, telephony_api_secret: text })}
                placeholder="API Secret or Auth Token"
                placeholderTextColor="#A0AEC0"
                secureTextEntry
              />

              <Text style={styles.label}>Caller ID / From Number <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={config?.telephony_caller_id || ''}
                onChangeText={(text) => setConfig({ ...config, telephony_caller_id: text })}
                placeholder="+919876543210"
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>Webhook URL (for call tracking)</Text>
              <TextInput
                style={styles.input}
                value={config?.telephony_webhook_url || ''}
                onChangeText={(text) => setConfig({ ...config, telephony_webhook_url: text })}
                placeholder="https://your-app.com/webhooks/telephony"
                placeholderTextColor="#A0AEC0"
              />
            </>
          )}
        </>
      )}
    </View>
  );

  const renderAutoAssignSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#8B5CF620' }]}>
          <Ionicons name="person-add" size={24} color="#8B5CF6" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Lead Auto-Assignment</Text>
          <Text style={styles.sectionSubtitle}>Automatically assign incoming leads to team members</Text>
        </View>
      </View>

      <View style={styles.switchCard}>
        <Text style={styles.switchLabel}>Enable Auto-Assignment</Text>
        <Switch
          value={config?.auto_assign_enabled}
          onValueChange={(value) => setConfig({ ...config, auto_assign_enabled: value })}
          trackColor={{ false: Colors.border, true: '#8B5CF6' }}
          thumbColor={Colors.surface}
        />
      </View>

      {config?.auto_assign_enabled && (
        <>
          <Text style={styles.label}>Assignment Strategy</Text>
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
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRM Integrations</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? Colors.secondary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'meta' && renderMetaLeadsSection()}
        {activeTab === 'google' && renderGoogleAdsSection()}
        {activeTab === 'whatsapp' && renderWhatsAppSection()}
        {activeTab === 'telephony' && renderTelephonySection()}
        {activeTab === 'assignment' && renderAutoAssignSection()}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.surface} />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  tabsContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.background,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.secondary + '20',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  switchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  switchRowLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 8,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
  },
  syncText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  strategyCard: { gap: 12 },
  strategyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
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
    color: Colors.textPrimary,
  },
  strategyDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
