import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { crmLeadsAPI, crmCategoriesAPI } from '../../../services/api';
import DropdownPicker from '../../../components/DropdownPicker';

const SOURCE_OPTIONS = [
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
  { label: 'Social Media', value: 'social_media' },
  { label: 'Cold Call', value: 'cold_call' },
  { label: 'Walk In', value: 'walk_in' },
  { label: 'Advertisement', value: 'advertisement' },
  { label: 'Partner', value: 'partner' },
  { label: 'Other', value: 'other' },
];

const PRIORITY_OPTIONS = [
  { label: '🟢 Low', value: 'low', color: '#10B981' },
  { label: '🟡 Medium', value: 'medium', color: '#F59E0B' },
  { label: '🟠 High', value: 'high', color: '#F97316' },
  { label: '🔴 Urgent', value: 'urgent', color: '#DC2626' },
];

const CURRENCY_OPTIONS = [
  { label: '₹ INR', value: 'INR' },
  { label: '$ USD', value: 'USD' },
  { label: '€ EUR', value: 'EUR' },
  { label: '£ GBP', value: 'GBP' },
];

export default function CreateLeadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    primary_phone: '',
    alternate_phone: '',
    email: '',
    city: '',
    state: '',
    budget: '',
    budget_currency: 'INR',
    requirement: '',
    category_id: '',
    source: 'other',
    priority: 'medium',
    tags: [],
    whatsapp_consent: false,
    send_whatsapp: false,
    notes: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await crmCategoriesAPI.getAll();
      setCategories(res.data);
      
      // Convert to dropdown options
      const options = res.data.map((cat: any) => ({
        label: cat.name,
        value: cat.id,
      }));
      setCategoryOptions(options);
      
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, category_id: res.data[0].id }));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Lead name is required');
      return;
    }
    if (!formData.primary_phone.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return;
    }
    if (!formData.category_id) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (formData.budget) {
        payload.budget = parseFloat(formData.budget) as any;
      }
      await crmLeadsAPI.create(payload);
      Alert.alert('Success', 'Lead created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Lead</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Text style={styles.label}>Lead Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter client/company name"
              placeholderTextColor="#A0AEC0"
            />

            <Text style={styles.label}>Primary Phone <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.primary_phone}
              onChangeText={(text) => setFormData({ ...formData, primary_phone: text })}
              placeholder="+91 1234567890"
              placeholderTextColor="#A0AEC0"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Alternate Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.alternate_phone}
              onChangeText={(text) => setFormData({ ...formData, alternate_phone: text })}
              placeholder="Optional"
              placeholderTextColor="#A0AEC0"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="email@example.com"
              placeholderTextColor="#A0AEC0"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder="Enter city"
                  placeholderTextColor="#A0AEC0"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(text) => setFormData({ ...formData, state: text })}
                  placeholder="Enter state"
                  placeholderTextColor="#A0AEC0"
                />
              </View>
            </View>
          </View>

          {/* Project Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Details</Text>
            
            <Text style={styles.label}>Budget</Text>
            <View style={styles.budgetRow}>
              <View style={{ width: 120 }}>
                <DropdownPicker
                  options={CURRENCY_OPTIONS}
                  selectedValue={formData.budget_currency}
                  onValueChange={(value) => setFormData({ ...formData, budget_currency: value })}
                />
              </View>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={formData.budget}
                onChangeText={(text) => setFormData({ ...formData, budget: text })}
                placeholder="Enter amount"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Requirement</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.requirement}
              onChangeText={(text) => setFormData({ ...formData, requirement: text })}
              placeholder="Describe the project requirements"
              placeholderTextColor="#A0AEC0"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Lead Classification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lead Classification</Text>
            
            <DropdownPicker
              label="Category"
              required
              placeholder="Select a category"
              options={categoryOptions}
              selectedValue={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            />

            <DropdownPicker
              label="Source"
              placeholder="Select lead source"
              options={SOURCE_OPTIONS}
              selectedValue={formData.source}
              onValueChange={(value) => setFormData({ ...formData, source: value })}
            />

            <DropdownPicker
              label="Priority"
              placeholder="Select priority"
              options={PRIORITY_OPTIONS}
              selectedValue={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            />
          </View>

          {/* Communication Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication Preferences</Text>
            
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>WhatsApp Consent</Text>
                <Text style={styles.switchDescription}>Allow sending WhatsApp messages</Text>
              </View>
              <Switch
                value={formData.whatsapp_consent}
                onValueChange={(value) => setFormData({ ...formData, whatsapp_consent: value })}
                trackColor={{ false: Colors.border, true: '#10B981' }}
                thumbColor={Colors.surface}
              />
            </View>

            {formData.whatsapp_consent && (
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Send Welcome Message</Text>
                  <Text style={styles.switchDescription}>Send welcome message on WhatsApp</Text>
                </View>
                <Switch
                  value={formData.send_whatsapp}
                  onValueChange={(value) => setFormData({ ...formData, send_whatsapp: value })}
                  trackColor={{ false: Colors.border, true: '#10B981' }}
                  thumbColor={Colors.surface}
                />
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Add any additional notes"
              placeholderTextColor="#A0AEC0"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color={Colors.surface} />
                <Text style={styles.submitButtonText}>Create Lead</Text>
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
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
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
  backButton: { 
    width: 40 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.textPrimary 
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  section: { 
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#F7FAFC',
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
