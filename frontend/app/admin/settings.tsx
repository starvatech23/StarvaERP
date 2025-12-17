import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Colors from '../../constants/Colors';
import { adminConfigAPI } from '../../services/api';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'sms' | 'whatsapp' | 'domain'>('sms');

  // SMS Config
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState('twilio');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsApiSecret, setSmsApiSecret] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('');
  const [smsTemplateId, setSmsTemplateId] = useState('');

  // WhatsApp Config
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappProvider, setWhatsappProvider] = useState('meta');
  const [whatsappBusinessId, setWhatsappBusinessId] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [whatsappWebhookToken, setWhatsappWebhookToken] = useState('');

  // Domain Restriction Config
  const [domainEnabled, setDomainEnabled] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState('');
  const [adminBypass, setAdminBypass] = useState(true);
  const [domainErrorMessage, setDomainErrorMessage] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const [smsRes, whatsappRes, domainRes] = await Promise.all([
        adminConfigAPI.getSMSConfig(),
        adminConfigAPI.getWhatsAppConfig(),
        adminConfigAPI.getDomainRestriction()
      ]);

      // SMS
      const sms = smsRes.data;
      setSmsEnabled(sms.is_enabled || false);
      setSmsProvider(sms.provider || 'twilio');
      setSmsApiKey(sms.api_key || '');
      setSmsApiSecret(sms.api_secret || '');
      setSmsSenderId(sms.sender_id || '');
      setSmsTemplateId(sms.template_id || '');

      // WhatsApp
      const wa = whatsappRes.data;
      setWhatsappEnabled(wa.is_enabled || false);
      setWhatsappProvider(wa.provider || 'meta');
      setWhatsappBusinessId(wa.business_account_id || '');
      setWhatsappPhoneId(wa.phone_number_id || '');
      setWhatsappAccessToken(wa.access_token || '');
      setWhatsappWebhookToken(wa.webhook_verify_token || '');

      // Domain
      const domain = domainRes.data;
      setDomainEnabled(domain.is_enabled || false);
      setAllowedDomains((domain.allowed_domains || []).join(', '));
      setAdminBypass(domain.admin_bypass_enabled !== false);
      setDomainErrorMessage(domain.error_message || 'Only corporate email addresses are allowed.');
    } catch (error) {
      console.error('Error loading configs:', error);
      Alert.alert('Error', 'Failed to load configuration settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSMSConfig = async () => {
    setSaving(true);
    try {
      await adminConfigAPI.updateSMSConfig({
        provider: smsProvider,
        is_enabled: smsEnabled,
        api_key: smsApiKey,
        api_secret: smsApiSecret,
        sender_id: smsSenderId,
        template_id: smsTemplateId,
      });
      Alert.alert('Success', 'SMS configuration saved');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save SMS config');
    } finally {
      setSaving(false);
    }
  };

  const saveWhatsAppConfig = async () => {
    setSaving(true);
    try {
      await adminConfigAPI.updateWhatsAppConfig({
        provider: whatsappProvider,
        is_enabled: whatsappEnabled,
        business_account_id: whatsappBusinessId,
        phone_number_id: whatsappPhoneId,
        access_token: whatsappAccessToken,
        webhook_verify_token: whatsappWebhookToken,
      });
      Alert.alert('Success', 'WhatsApp configuration saved');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save WhatsApp config');
    } finally {
      setSaving(false);
    }
  };

  const saveDomainConfig = async () => {
    setSaving(true);
    try {
      const domains = allowedDomains
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);

      await adminConfigAPI.updateDomainRestriction({
        is_enabled: domainEnabled,
        allowed_domains: domains,
        admin_bypass_enabled: adminBypass,
        error_message: domainErrorMessage,
      });
      Alert.alert('Success', 'Domain restriction settings saved');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save domain config');
    } finally {
      setSaving(false);
    }
  };

  const testSMS = async () => {
    Alert.prompt(
      'Test SMS',
      'Enter phone number to send test SMS:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (phone) => {
            if (!phone) return;
            try {
              const res = await adminConfigAPI.testSMS(phone);
              Alert.alert('Success', res.data?.message || 'Test SMS sent');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to send test SMS');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Section Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'sms' && styles.activeTab]}
          onPress={() => setActiveSection('sms')}
        >
          <Ionicons name="chatbubble" size={18} color={activeSection === 'sms' ? Colors.surface : Colors.textSecondary} />
          <Text style={[styles.tabText, activeSection === 'sms' && styles.activeTabText]}>SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'whatsapp' && styles.activeTab]}
          onPress={() => setActiveSection('whatsapp')}
        >
          <Ionicons name="logo-whatsapp" size={18} color={activeSection === 'whatsapp' ? Colors.surface : Colors.textSecondary} />
          <Text style={[styles.tabText, activeSection === 'whatsapp' && styles.activeTabText]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'domain' && styles.activeTab]}
          onPress={() => setActiveSection('domain')}
        >
          <Ionicons name="globe" size={18} color={activeSection === 'domain' ? Colors.surface : Colors.textSecondary} />
          <Text style={[styles.tabText, activeSection === 'domain' && styles.activeTabText]}>Domain</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* SMS Configuration */}
        {activeSection === 'sms' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-ellipses" size={24} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>SMS OTP Configuration</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Configure SMS provider for OTP delivery to labourers during payment verification.
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable SMS OTP</Text>
              <Switch
                value={smsEnabled}
                onValueChange={setSmsEnabled}
                trackColor={{ false: '#E5E7EB', true: Colors.secondary + '50' }}
                thumbColor={smsEnabled ? Colors.secondary : '#9CA3AF'}
              />
            </View>

            <Text style={styles.label}>SMS Provider</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={smsProvider}
                onValueChange={setSmsProvider}
                style={styles.picker}
              >
                <Picker.Item label="Twilio" value="twilio" />
                <Picker.Item label="MSG91" value="msg91" />
                <Picker.Item label="TextLocal" value="textlocal" />
                <Picker.Item label="Custom" value="custom" />
              </Picker>
            </View>

            <Text style={styles.label}>API Key / Account SID</Text>
            <TextInput
              style={styles.input}
              value={smsApiKey}
              onChangeText={setSmsApiKey}
              placeholder="Enter API Key"
              secureTextEntry
            />

            <Text style={styles.label}>API Secret / Auth Token</Text>
            <TextInput
              style={styles.input}
              value={smsApiSecret}
              onChangeText={setSmsApiSecret}
              placeholder="Enter API Secret"
              secureTextEntry
            />

            <Text style={styles.label}>Sender ID / From Number</Text>
            <TextInput
              style={styles.input}
              value={smsSenderId}
              onChangeText={setSmsSenderId}
              placeholder="e.g., +1234567890 or COMPNY"
            />

            <Text style={styles.label}>Template ID (if required)</Text>
            <TextInput
              style={styles.input}
              value={smsTemplateId}
              onChangeText={setSmsTemplateId}
              placeholder="DLT Template ID"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.testButton} onPress={testSMS}>
                <Ionicons name="paper-plane" size={18} color={Colors.secondary} />
                <Text style={styles.testButtonText}>Test SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={saveSMSConfig}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save SMS Config</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* WhatsApp Configuration */}
        {activeSection === 'whatsapp' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.sectionTitle}>WhatsApp Configuration</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Configure WhatsApp Business API for notifications and OTP delivery.
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable WhatsApp</Text>
              <Switch
                value={whatsappEnabled}
                onValueChange={setWhatsappEnabled}
                trackColor={{ false: '#E5E7EB', true: '#25D36650' }}
                thumbColor={whatsappEnabled ? '#25D366' : '#9CA3AF'}
              />
            </View>

            <Text style={styles.label}>Provider</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={whatsappProvider}
                onValueChange={setWhatsappProvider}
                style={styles.picker}
              >
                <Picker.Item label="Meta (Official)" value="meta" />
                <Picker.Item label="Twilio" value="twilio" />
                <Picker.Item label="360dialog" value="360dialog" />
              </Picker>
            </View>

            <Text style={styles.label}>Business Account ID</Text>
            <TextInput
              style={styles.input}
              value={whatsappBusinessId}
              onChangeText={setWhatsappBusinessId}
              placeholder="WhatsApp Business Account ID"
            />

            <Text style={styles.label}>Phone Number ID</Text>
            <TextInput
              style={styles.input}
              value={whatsappPhoneId}
              onChangeText={setWhatsappPhoneId}
              placeholder="Phone Number ID"
            />

            <Text style={styles.label}>Access Token</Text>
            <TextInput
              style={styles.input}
              value={whatsappAccessToken}
              onChangeText={setWhatsappAccessToken}
              placeholder="Permanent Access Token"
              secureTextEntry
            />

            <Text style={styles.label}>Webhook Verify Token</Text>
            <TextInput
              style={styles.input}
              value={whatsappWebhookToken}
              onChangeText={setWhatsappWebhookToken}
              placeholder="Custom verification token"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled, { marginTop: 20 }]}
              onPress={saveWhatsAppConfig}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save WhatsApp Config</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Domain Restriction */}
        {activeSection === 'domain' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Corporate Domain Restriction</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Restrict application access to users with specific email domains. Only admin panel can be accessed with any email.
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable Domain Restriction</Text>
              <Switch
                value={domainEnabled}
                onValueChange={setDomainEnabled}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF650' }}
                thumbColor={domainEnabled ? '#8B5CF6' : '#9CA3AF'}
              />
            </View>

            <Text style={styles.label}>Allowed Domains</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={allowedDomains}
              onChangeText={setAllowedDomains}
              placeholder="company.com, corp.company.com"
              multiline
              numberOfLines={3}
            />
            <Text style={styles.helpText}>
              Enter comma-separated domain names (e.g., company.com, corp.company.com)
            </Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Admin Bypass</Text>
                <Text style={styles.switchDescription}>
                  Allow admin users to login with any email domain
                </Text>
              </View>
              <Switch
                value={adminBypass}
                onValueChange={setAdminBypass}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF650' }}
                thumbColor={adminBypass ? '#8B5CF6' : '#9CA3AF'}
              />
            </View>

            <Text style={styles.label}>Error Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={domainErrorMessage}
              onChangeText={setDomainErrorMessage}
              placeholder="Custom error message for unauthorized domains"
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled, { marginTop: 20, backgroundColor: '#8B5CF6' }]}
              onPress={saveDomainConfig}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Domain Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    backgroundColor: Colors.background,
  },
  activeTab: {
    backgroundColor: Colors.secondary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.surface,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary + '15',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
