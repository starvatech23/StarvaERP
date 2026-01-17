import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BackToCRM from '../../../../components/BackToCRM';
import { crmLeadsAPI, crmMoveToProjectAPI } from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';

export default function MoveToProjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canBypass, setCanBypass] = useState(false);
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    project_description: '',
    bank_name: '',
    account_number: '',
    transaction_id: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    receipt_attachment: '',
    notes: '',
    bypass_reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leadRes, eligibilityRes] = await Promise.all([
        crmLeadsAPI.getById(id as string),
        crmMoveToProjectAPI.checkEligibility(id as string),
      ]);
      setLead(leadRes.data);
      setCanBypass(eligibilityRes.data.can_bypass_transaction);
      
      // Pre-fill project name from lead
      setFormData(prev => ({
        ...prev,
        project_name: `${leadRes.data.name} - Project`,
        project_description: leadRes.data.requirement || '',
      }));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load lead');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.project_name.trim()) {
      Alert.alert('Validation Error', 'Project name is required');
      return false;
    }

    if (bypassEnabled) {
      if (!formData.bypass_reason.trim()) {
        Alert.alert('Validation Error', 'Bypass reason is required');
        return false;
      }
    } else {
      if (!formData.bank_name.trim()) {
        Alert.alert('Validation Error', 'Bank name is required');
        return false;
      }
      if (!formData.account_number.trim()) {
        Alert.alert('Validation Error', 'Account number is required');
        return false;
      }
      if (!formData.transaction_id.trim()) {
        Alert.alert('Validation Error', 'Transaction ID is required');
        return false;
      }
      if (!formData.amount.trim() || parseFloat(formData.amount) <= 0) {
        Alert.alert('Validation Error', 'Valid transaction amount is required');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload: any = {
        lead_id: id,
        project_name: formData.project_name,
        project_description: formData.project_description,
      };

      if (bypassEnabled) {
        payload.bypass_transaction = true;
        payload.bypass_reason = formData.bypass_reason;
      } else {
        payload.bank_transaction = {
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          transaction_id: formData.transaction_id,
          amount: parseFloat(formData.amount),
          transaction_date: new Date(formData.transaction_date).toISOString(),
          notes: formData.notes,
        };
      }

      const response = await crmMoveToProjectAPI.moveLeadToProject(payload);
      
      Alert.alert(
        'Success',
        response.data.message,
        [
          {
            text: 'View Project',
            onPress: () => router.push(`/projects/${response.data.project_id}` as any),
          },
          {
            text: 'Back to Lead',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to convert lead to project'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackToCRM title="Move to Project" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackToCRM title="Move to Project" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Convert to Project</Text>
          <Text style={styles.headerSubtitle}>{lead?.name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {/* Admin Bypass Toggle */}
          {canBypass && (
            <View style={styles.bypassCard}>
              <View style={styles.bypassHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#EF4444" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bypassTitle}>Admin Bypass</Text>
                  <Text style={styles.bypassSubtitle}>Skip bank transaction requirement</Text>
                </View>
                <Switch
                  value={bypassEnabled}
                  onValueChange={setBypassEnabled}
                  trackColor={{ false: Colors.border, true: '#EF4444' }}
                />
              </View>
            </View>
          )}

          {/* Project Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Details</Text>
            
            <Text style={styles.label}>Project Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.project_name}
              onChangeText={(text) => setFormData({ ...formData, project_name: text })}
              placeholder="Enter project name"
              placeholderTextColor="#A0AEC0"
            />

            <Text style={styles.label}>Project Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.project_description}
              onChangeText={(text) => setFormData({ ...formData, project_description: text })}
              placeholder="Enter project description"
              placeholderTextColor="#A0AEC0"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Bank Transaction Section */}
          {bypassEnabled ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bypass Reason</Text>
              
              <View style={styles.warningCard}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Bank transaction will be skipped. Please provide a detailed reason.
                </Text>
              </View>

              <Text style={styles.label}>Reason for Bypass *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bypass_reason}
                onChangeText={(text) => setFormData({ ...formData, bypass_reason: text })}
                placeholder="E.g., Government project with advance payment pending"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={4}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bank Transaction Details</Text>
              
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                <Text style={styles.infoText}>
                  All bank transaction fields are mandatory to proceed
                </Text>
              </View>

              <Text style={styles.label}>Bank Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.bank_name}
                onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                placeholder="E.g., HDFC Bank, SBI"
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>Account Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.account_number}
                onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                placeholder="Account number"
                placeholderTextColor="#A0AEC0"
                keyboardType="number-pad"
                secureTextEntry
              />

              <Text style={styles.label}>Transaction ID *</Text>
              <TextInput
                style={styles.input}
                value={formData.transaction_id}
                onChangeText={(text) => setFormData({ ...formData, transaction_id: text })}
                placeholder="Bank transaction reference number"
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="Transaction amount"
                placeholderTextColor="#A0AEC0"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Transaction Date *</Text>
              <TextInput
                style={styles.input}
                value={formData.transaction_date}
                onChangeText={(text) => setFormData({ ...formData, transaction_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Additional transaction notes"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle" size={20} color={Colors.surface} />
                <Text style={styles.submitButtonText}>Convert to Project</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { width: 40 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bypassCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bypassHeader: { flexDirection: 'row', alignItems: 'center' },
  bypassTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  bypassSubtitle: { fontSize: 13, color: '#991B1B', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: '#2C5282', lineHeight: 18 },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
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
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});