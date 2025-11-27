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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { workersAPI } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

export default function AddWorkerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
    skill_group: 'helper',
    pay_scale: 'daily',
    base_rate: '',
    aadhaar_number: '',
    aadhaar_photo: '',
    pan_number: '',
    pan_photo: '',
    photo: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    notes: '',
  });

  const pickImage = async (type: 'photo' | 'aadhaar' | 'pan') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (type === 'photo') {
        setFormData({ ...formData, photo: base64Image });
      } else if (type === 'aadhaar') {
        setFormData({ ...formData, aadhaar_photo: base64Image });
      } else {
        setFormData({ ...formData, pan_photo: base64Image });
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      Alert.alert('Error', 'Full name and phone are required');
      return;
    }

    if (!formData.base_rate) {
      Alert.alert('Error', 'Base rate is required');
      return;
    }

    setLoading(true);
    try {
      const response = await workersAPI.create({
        ...formData,
        base_rate: parseFloat(formData.base_rate),
      });

      Alert.alert(
        '✅ Success!', 
        `Labourer "${formData.full_name}" has been successfully added to the system.\n\nSkill: ${formData.skill_group}\nPay Rate: ₹${formData.base_rate}/${formData.pay_scale}`,
        [
          { text: 'Add Another', onPress: () => {
            setFormData({
              full_name: '',
              phone: '',
              email: '',
              date_of_birth: '',
              address: '',
              emergency_contact: '',
              skill_group: 'helper',
              pay_scale: 'daily',
              base_rate: '',
              aadhaar_number: '',
              aadhaar_photo: '',
              pan_number: '',
              pan_photo: '',
              photo: '',
              bank_name: '',
              account_number: '',
              ifsc_code: '',
              account_holder_name: '',
              notes: '',
            });
          }},
          { text: 'Done', onPress: () => router.back(), style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add worker');
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Labourer</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.photoSection}>
              <TouchableOpacity
                style={styles.photoPlaceholder}
                onPress={() => pickImage('photo')}
              >
                {formData.photo ? (
                  <Text style={styles.photoText}>Photo Selected ✓</Text>
                ) : (
                  <Ionicons name="camera" size={40} color="#CBD5E0" />
                )}
              </TouchableOpacity>
              <Text style={styles.photoLabel}>Worker Photo (Optional)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Enter full name"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+91 XXXXXXXXXX"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={formData.date_of_birth}
                onChangeText={(text) => setFormData({ ...formData, date_of_birth: text })}
                placeholder="1990-01-01"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Enter address"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency Contact</Text>
              <TextInput
                style={styles.input}
                value={formData.emergency_contact}
                onChangeText={(text) => setFormData({ ...formData, emergency_contact: text })}
                placeholder="Emergency phone number"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Skill & Pay */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skill & Pay</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Skill Group *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.skill_group}
                  onValueChange={(value) => setFormData({ ...formData, skill_group: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Helper" value="helper" />
                  <Picker.Item label="Mason" value="mason" />
                  <Picker.Item label="Carpenter" value="carpenter" />
                  <Picker.Item label="Electrician" value="electrician" />
                  <Picker.Item label="Plumber" value="plumber" />
                  <Picker.Item label="Painter" value="painter" />
                  <Picker.Item label="Welder" value="welder" />
                  <Picker.Item label="Machine Operator" value="machine_operator" />
                  <Picker.Item label="Supervisor" value="supervisor" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pay Scale *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.pay_scale}
                  onValueChange={(value) => setFormData({ ...formData, pay_scale: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Daily" value="daily" />
                  <Picker.Item label="Hourly" value="hourly" />
                  <Picker.Item label="Weekly" value="weekly" />
                  <Picker.Item label="Monthly" value="monthly" />
                  <Picker.Item label="Contract" value="contract" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Base Rate (₹) *</Text>
              <TextInput
                style={styles.input}
                value={formData.base_rate}
                onChangeText={(text) => setFormData({ ...formData, base_rate: text })}
                placeholder="800"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Aadhaar Number</Text>
              <TextInput
                style={styles.input}
                value={formData.aadhaar_number}
                onChangeText={(text) => setFormData({ ...formData, aadhaar_number: text })}
                placeholder="1234-5678-9012"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage('aadhaar')}
            >
              <Ionicons name="cloud-upload" size={20} color="#FF6B35" />
              <Text style={styles.uploadText}>
                {formData.aadhaar_photo ? 'Aadhaar Photo Selected ✓' : 'Upload Aadhaar Photo'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PAN Number</Text>
              <TextInput
                style={styles.input}
                value={formData.pan_number}
                onChangeText={(text) => setFormData({ ...formData, pan_number: text })}
                placeholder="ABCDE1234F"
                placeholderTextColor="#A0AEC0"
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage('pan')}
            >
              <Ionicons name="cloud-upload" size={20} color="#FF6B35" />
              <Text style={styles.uploadText}>
                {formData.pan_photo ? 'PAN Photo Selected ✓' : 'Upload PAN Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bank Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={formData.bank_name}
                onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                placeholder="HDFC Bank"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={formData.account_number}
                onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                placeholder="12345678901234"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                value={formData.ifsc_code}
                onChangeText={(text) => setFormData({ ...formData, ifsc_code: text })}
                placeholder="HDFC0001234"
                placeholderTextColor="#A0AEC0"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                value={formData.account_holder_name}
                onChangeText={(text) => setFormData({ ...formData, account_holder_name: text })}
                placeholder="As per bank records"
                placeholderTextColor="#A0AEC0"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Any additional information..."
              placeholderTextColor="#A0AEC0"
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Add Worker</Text>
            )}
          </TouchableOpacity>
        </View>
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  photoLabel: {
    fontSize: 12,
    color: '#718096',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A202C',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#1A202C',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F2',
    borderWidth: 2,
    borderColor: '#FFE5DC',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});