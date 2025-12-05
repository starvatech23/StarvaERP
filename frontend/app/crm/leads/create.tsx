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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { crmLeadsAPI, crmCategoriesAPI } from '../../../services/api';
import { Picker } from '@react-native-picker/picker';

export default function CreateLeadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
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
        payload.budget = parseFloat(formData.budget);
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
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Lead</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Text style={styles.label}>Lead Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter client/company name"
              placeholderTextColor="#A0AEC0"
            />

            <Text style={styles.label}>Primary Phone *</Text>
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

            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="Enter city"
              placeholderTextColor="#A0AEC0"
            />

            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
              placeholder="Enter state"
              placeholderTextColor="#A0AEC0"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Details</Text>
            
            <Text style={styles.label}>Budget</Text>
            <View style={styles.budgetRow}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.budget_currency}
                  onValueChange={(value) => setFormData({ ...formData, budget_currency: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="INR" value="INR" />
                  <Picker.Item label="USD" value="USD" />
                  <Picker.Item label="EUR" value="EUR" />
                  <Picker.Item label="GBP" value="GBP" />
                </Picker>
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
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
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lead Classification</Text>
            
            <Text style={styles.label}>Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                style={styles.picker}
              >
                {categories.map((cat: any) => (
                  <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Source</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
                style={styles.picker}
              >
                <Picker.Item label="Website" value="website" />
                <Picker.Item label="Referral" value="referral" />
                <Picker.Item label="Social Media" value="social_media" />
                <Picker.Item label="Cold Call" value="cold_call" />
                <Picker.Item label="Walk In" value="walk_in" />
                <Picker.Item label="Advertisement" value="advertisement" />
                <Picker.Item label="Partner" value="partner" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                style={styles.picker}
              >
                <Picker.Item label="Low" value="low" />
                <Picker.Item label="Medium" value="medium" />
                <Picker.Item label="High" value="high" />
                <Picker.Item label="Urgent" value="urgent" />
              </Picker>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication Preferences</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.label}>WhatsApp Consent</Text>
              <Switch
                value={formData.whatsapp_consent}
                onValueChange={(value) => setFormData({ ...formData, whatsapp_consent: value })}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {formData.whatsapp_consent && (
              <View style={styles.switchRow}>
                <Text style={styles.label}>Send Welcome Message</Text>
                <Switch
                  value={formData.send_whatsapp}
                  onValueChange={(value) => setFormData({ ...formData, send_whatsapp: value })}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
          </View>

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
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Lead</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
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
  budgetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});