import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { vendorsAPI } from '../../services/api';

export default function AddVendorScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    payment_terms: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.business_name.trim() || !formData.contact_person.trim() || !formData.phone.trim()) {
      Alert.alert('Error', 'Please fill in required fields (Business Name, Contact Person, Phone)');
      return;
    }

    setLoading(true);
    try {
      await vendorsAPI.create({
        ...formData,
        is_active: true,
      });
      Alert.alert('Success', 'Vendor added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Vendor</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.business_name}
                onChangeText={(text) => setFormData({ ...formData, business_name: text })}
                placeholder="Enter business name"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contact Person *</Text>
              <TextInput
                style={styles.input}
                value={formData.contact_person}
                onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
                placeholder="Enter contact person name"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Address Details</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Enter address"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder="City"
                  placeholderTextColor="#CBD5E0"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(text) => setFormData({ ...formData, state: text })}
                  placeholder="State"
                  placeholderTextColor="#CBD5E0"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                value={formData.pincode}
                onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                placeholder="Enter pincode"
                keyboardType="numeric"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Tax & Payment Details</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>GST Number</Text>
              <TextInput
                style={styles.input}
                value={formData.gst_number}
                onChangeText={(text) => setFormData({ ...formData, gst_number: text.toUpperCase() })}
                placeholder="e.g., 22AAAAA0000A1Z5"
                autoCapitalize="characters"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>PAN Number</Text>
              <TextInput
                style={styles.input}
                value={formData.pan_number}
                onChangeText={(text) => setFormData({ ...formData, pan_number: text.toUpperCase() })}
                placeholder="e.g., AAAAA0000A"
                autoCapitalize="characters"
                maxLength={10}
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Terms</Text>
              <TextInput
                style={styles.input}
                value={formData.payment_terms}
                onChangeText={(text) => setFormData({ ...formData, payment_terms: text })}
                placeholder="e.g., Net 30, Cash on Delivery"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Bank Details</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={formData.bank_name}
                onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                placeholder="Enter bank name"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                value={formData.account_holder_name}
                onChangeText={(text) => setFormData({ ...formData, account_holder_name: text })}
                placeholder="Enter account holder name"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={formData.account_number}
                onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                placeholder="Enter account number"
                keyboardType="numeric"
                secureTextEntry
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                value={formData.ifsc_code}
                onChangeText={(text) => setFormData({ ...formData, ifsc_code: text.toUpperCase() })}
                placeholder="e.g., SBIN0001234"
                autoCapitalize="characters"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Additional notes or comments"
                placeholderTextColor="#CBD5E0"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding...' : 'Add Vendor'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'Colors.surface,
    borderWidth: 1,
    borderColor: 'Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'Colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
  },
  submitButton: {
    backgroundColor: 'Colors.secondary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.surface,
  },
});
