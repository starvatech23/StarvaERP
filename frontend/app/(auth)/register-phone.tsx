import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { rolesAPI } from '../../services/api';

export default function RegisterPhoneScreen() {
  const router = useRouter();
  const { sendOTP } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [roleId, setRoleId] = useState('');
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await rolesAPI.getPublic();
      setAvailableRoles(response.data);
      if (response.data.length > 0) {
        setRoleId(response.data[0].id);
        setRole(response.data[0].code || response.data[0].name.toLowerCase().replace(/ /g, '_'));
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      setAvailableRoles([]);
    }
  };

  const handleSendOTP = async () => {
    if (!fullName || !phone) {
      Alert.alert('Error', 'Please enter your name and phone number');
      return;
    }

    if (!roleId && availableRoles.length > 0) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    setLoading(true);
    try {
      const otpCode = await sendOTP(phone);
      setMockOtp(otpCode);
      Alert.alert(
        'OTP Sent',
        `Your OTP is: ${otpCode} (This is a mock OTP)`,
        [
          {
            text: 'OK',
            onPress: () =>
              router.push({
                pathname: '/(auth)/otp-verify',
                params: { phone, fullName, role, roleId, otp: otpCode },
              }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up with phone number</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="call-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.label}>Select Your Role *</Text>
            <View style={styles.pickerContainer}>
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <Picker
                selectedValue={roleId}
                onValueChange={(value) => {
                  setRoleId(value);
                  const selectedRole = availableRoles.find(r => r.id === value);
                  if (selectedRole) {
                    setRole(selectedRole.code || selectedRole.name.toLowerCase().replace(/ /g, '_'));
                  }
                }}
                style={styles.picker}
                dropdownIconColor={Colors.textPrimary}
              >
                <Picker.Item label="Select your role..." value="" color="#9CA3AF" />
                {availableRoles.map((r: any) => (
                  <Picker.Item key={r.id} label={r.name} value={r.id} color={Colors.textPrimary} />
                ))}
              </Picker>
            </View>

            {availableRoles.length === 0 && (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.warningText}>
                  No roles available. Please contact your administrator.
                </Text>
              </View>
            )}

            {mockOtp && (
              <View style={styles.otpDisplay}>
                <Text style={styles.otpLabel}>Mock OTP (Testing):</Text>
                <Text style={styles.otpValue}>{mockOtp}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.sendButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  picker: {
    flex: 1,
    color: Colors.textPrimary,
  },
  otpDisplay: {
    backgroundColor: '#FFF5F2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  otpLabel: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
  },
  otpValue: {
    fontSize: 20,
    color: Colors.secondary,
    fontWeight: '700',
    letterSpacing: 4,
  },
  sendButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginLeft: 4,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
});