import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leadsAPI, leadCategoriesAPI } from '../../../services/crm-api';

export default function CreateLeadScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    primary_phone: '',
    alternate_phone: '',
    email: '',
    city: '',
    budget: '',
    requirement: '',
    lead_category_id: '',
    status: 'new',
    priority: 'medium',
    source: 'website',
    whatsapp_consent: false,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await leadCategoriesAPI.list();
      setCategories(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, lead_category_id: res.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.primary_phone || !formData.lead_category_id) {
      Alert.alert('Validation Error', 'Please fill in all required fields (Name, Phone, Category)');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
      };
      await leadsAPI.create(payload);
      Alert.alert('Success', 'Lead created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Lead</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter lead name"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Primary Phone *</Text>
              <TextInput
                style={styles.input}
                value={formData.primary_phone}
                onChangeText={(text) => setFormData({ ...formData, primary_phone: text })}
                placeholder="+91XXXXXXXXXX"
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>Format: +91 followed by 10 digits</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Alternate Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.alternate_phone}
                onChangeText={(text) => setFormData({ ...formData, alternate_phone: text })}
                placeholder="+91XXXXXXXXXX"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter city"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Budget (INR)</Text>
              <TextInput
                style={styles.input}
                value={formData.budget}
                onChangeText={(text) => setFormData({ ...formData, budget: text })}
                placeholder="Enter budget amount"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Requirement</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.requirement}
                onChangeText={(text) => setFormData({ ...formData, requirement: text })}
                placeholder="Describe project requirements"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.chipContainer}>
                {categories.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      formData.lead_category_id === cat.id && styles.chipActive
                    ]}
                    onPress={() => setFormData({ ...formData, lead_category_id: cat.id })}
                  >
                    <Text style={[
                      styles.chipText,
                      formData.lead_category_id === cat.id && styles.chipTextActive
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipContainer}>
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.chip,
                      formData.priority === priority && styles.chipActive
                    ]}
                    onPress={() => setFormData({ ...formData, priority })}
                  >
                    <Text style={[
                      styles.chipText,
                      formData.priority === priority && styles.chipTextActive
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Source</Text>
              <View style={styles.chipContainer}>
                {['website', 'referral', 'social_media', 'cold_call', 'walk_in'].map((source) => (
                  <TouchableOpacity
                    key={source}
                    style={[
                      styles.chip,
                      formData.source === source && styles.chipActive
                    ]}
                    onPress={() => setFormData({ ...formData, source })}
                  >
                    <Text style={[
                      styles.chipText,
                      formData.source === source && styles.chipTextActive
                    ]}>
                      {source.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <View style={styles.switchContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>WhatsApp Consent</Text>
                <Text style={styles.hint}>Allow sending WhatsApp messages</Text>
              </View>
              <Switch
                value={formData.whatsapp_consent}
                onValueChange={(value) => setFormData({ ...formData, whatsapp_consent: value })}
                trackColor={{ false: '#CBD5E0', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A202C', flex: 1, marginLeft: 16 },
  saveButton: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  saveButtonDisabled: { color: '#CBD5E0' },
  content: { flex: 1 },
  section: { backgroundColor: '#FFFFFF', marginBottom: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1A202C' },
  textArea: { height: 100, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: '#A0AEC0', marginTop: 4 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { fontSize: 14, color: '#718096', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});