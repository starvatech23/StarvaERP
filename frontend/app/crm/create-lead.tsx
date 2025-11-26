import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { leadsAPI } from '../../services/api';

export default function CreateLeadScreen() {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!clientName || !contact) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await leadsAPI.create({
        client_name: clientName,
        contact,
        email: email || null,
        source: source || null,
        status: 'new',
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        follow_up_date: null,
        notes: notes || null,
      });

      Alert.alert('Success', 'Lead added successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Lead</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>

            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter client name"
              value={clientName}
              onChangeText={setClientName}
            />

            <Text style={styles.label}>Contact Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lead Details</Text>

            <Text style={styles.label}>Source</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={source}
                onValueChange={setSource}
                style={styles.picker}
              >
                <Picker.Item label="Select Source" value="" />
                <Picker.Item label="Website" value="website" />
                <Picker.Item label="Referral" value="referral" />
                <Picker.Item label="Social Media" value="social_media" />
                <Picker.Item label="Cold Call" value="cold_call" />
                <Picker.Item label="Walk-in" value="walk_in" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>

            <Text style={styles.label}>Estimated Value</Text>
            <TextInput
              style={styles.input}
              placeholder="Estimated project value"
              value={estimatedValue}
              onChangeText={setEstimatedValue}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes about the lead"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Add Lead</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: '#1A202C',
  },
  createButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
