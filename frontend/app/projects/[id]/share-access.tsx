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
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { projectsAPI } from '../../../services/api';
import moment from 'moment';

export default function ShareAccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [credentialResult, setCredentialResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // Form state
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [projectRes, historyRes] = await Promise.all([
        projectsAPI.getById(id as string),
        projectsAPI.getClientCredentialsHistory(id as string).catch(() => ({ data: [] })),
      ]);
      
      setProject(projectRes.data);
      setHistory(historyRes.data || []);
      
      // Pre-fill client contact info
      if (projectRes.data) {
        setClientPhone(projectRes.data.client_contact || projectRes.data.client_phone || '');
        setClientEmail(projectRes.data.client_email || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!clientPhone && !clientEmail) {
      Alert.alert('Error', 'Please enter at least a phone number or email');
      return;
    }

    if (!sendWhatsApp && !sendSMS && !sendEmail) {
      Alert.alert('Error', 'Please select at least one channel to send');
      return;
    }

    setSending(true);
    try {
      const response = await projectsAPI.sendClientCredentials(id as string, {
        client_phone: clientPhone,
        client_email: clientEmail,
        send_whatsapp: sendWhatsApp,
        send_sms: sendSMS,
        send_email: sendEmail,
      });
      
      setCredentialResult(response.data);
      
      // If WhatsApp link was generated, offer to open it
      if (response.data?.results?.whatsapp?.link) {
        Alert.alert(
          'Credentials Generated',
          'Would you like to open WhatsApp to send the credentials?',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Open WhatsApp', 
              onPress: () => Linking.openURL(response.data.results.whatsapp.link) 
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Client credentials have been generated');
      }
      
      // Reload history
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send credentials');
    } finally {
      setSending(false);
    }
  };

  const handleShareLink = async () => {
    if (!credentialResult?.portal_link) return;
    
    try {
      await Share.share({
        message: `Access your project portal: ${credentialResult.portal_link}\n\nLogin with your registered phone number: ${clientPhone}`,
        title: `${project?.name} - Client Portal Access`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyLink = () => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Link Copied', credentialResult?.portal_link || '');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Client Access</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Info */}
        <View style={styles.projectCard}>
          <View style={styles.projectIcon}>
            <Ionicons name="business" size={24} color={Colors.secondary} />
          </View>
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project?.name}</Text>
            <Text style={styles.projectClient}>{project?.client_name}</Text>
          </View>
        </View>

        {/* Client Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Contact Details</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="call" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="mail" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={clientEmail}
                onChangeText={setClientEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Send Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Via</Text>
          
          <TouchableOpacity 
            style={[styles.channelOption, sendWhatsApp && styles.channelOptionActive]}
            onPress={() => setSendWhatsApp(!sendWhatsApp)}
          >
            <View style={[styles.channelIcon, { backgroundColor: '#25D36620' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>WhatsApp</Text>
              <Text style={styles.channelDesc}>Send via WhatsApp message</Text>
            </View>
            <View style={[styles.checkbox, sendWhatsApp && styles.checkboxActive]}>
              {sendWhatsApp && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.channelOption, sendSMS && styles.channelOptionActive]}
            onPress={() => setSendSMS(!sendSMS)}
          >
            <View style={[styles.channelIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="chatbubble" size={24} color="#3B82F6" />
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>SMS</Text>
              <Text style={styles.channelDesc}>Send via text message</Text>
            </View>
            <View style={[styles.checkbox, sendSMS && styles.checkboxActive]}>
              {sendSMS && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.channelOption, sendEmail && styles.channelOptionActive]}
            onPress={() => setSendEmail(!sendEmail)}
          >
            <View style={[styles.channelIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="mail" size={24} color="#EF4444" />
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>Email</Text>
              <Text style={styles.channelDesc}>Send via email</Text>
            </View>
            <View style={[styles.checkbox, sendEmail && styles.checkboxActive]}>
              {sendEmail && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Generated Credentials */}
        {credentialResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated Credentials</Text>
            
            <View style={styles.credentialCard}>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Portal Link</Text>
                <Text style={styles.credentialValue} numberOfLines={1}>
                  {credentialResult.portal_link}
                </Text>
              </View>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Login Phone</Text>
                <Text style={styles.credentialValue}>{credentialResult.client_phone}</Text>
              </View>
              
              <View style={styles.credentialActions}>
                <TouchableOpacity style={styles.credentialBtn} onPress={handleCopyLink}>
                  <Ionicons name="copy" size={18} color={Colors.secondary} />
                  <Text style={styles.credentialBtnText}>Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.credentialBtn} onPress={handleShareLink}>
                  <Ionicons name="share-social" size={18} color={Colors.secondary} />
                  <Text style={styles.credentialBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Send History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send History</Text>
            {history.map((item: any, index: number) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Ionicons name="time" size={16} color={Colors.textSecondary} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>
                    {moment(item.created_at).format('DD MMM YYYY, hh:mm A')}
                  </Text>
                  <Text style={styles.historyBy}>Sent by {item.sent_by_name}</Text>
                  <View style={styles.historyChannels}>
                    {item.send_results?.whatsapp?.sent && (
                      <View style={styles.historyBadge}>
                        <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
                      </View>
                    )}
                    {item.send_results?.sms?.sent && (
                      <View style={styles.historyBadge}>
                        <Ionicons name="chatbubble" size={12} color="#3B82F6" />
                      </View>
                    )}
                    {item.send_results?.email?.sent && (
                      <View style={styles.historyBadge}>
                        <Ionicons name="mail" size={12} color="#EF4444" />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Send Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSendCredentials}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.sendBtnText}>Send Client Credentials</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  content: { flex: 1 },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary + '10',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  projectClient: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  section: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 8 },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  channelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  channelOptionActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '08' },
  channelIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  channelInfo: { flex: 1, marginLeft: 12 },
  channelName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  channelDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  credentialCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  credentialRow: { marginBottom: 12 },
  credentialLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  credentialValue: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  credentialActions: { flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  credentialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.secondary + '15' },
  credentialBtnText: { fontSize: 13, fontWeight: '600', color: Colors.secondary },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  historyIcon: { marginTop: 2 },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  historyBy: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyChannels: { flexDirection: 'row', gap: 8, marginTop: 6 },
  historyBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sendBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
