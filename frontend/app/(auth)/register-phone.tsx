import React, { useState } from 'react';
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

export default function RegisterPhoneScreen() {
  const router = useRouter();
  const { sendOTP } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');

  const handleSendOTP = async () => {
    if (!fullName || !phone) {
      Alert.alert('Error', 'Please enter your name and phone number');
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
                params: { phone, fullName, role, otp: otpCode },
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
            <Ionicons name="arrow-back" size={24} color=Colors.textPrimary />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up with phone number</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color=Colors.textSecondary
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
                color=Colors.textSecondary
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

            <View style={styles.pickerContainer}>
              <Ionicons
                name="briefcase-outline"
                size={20}
                color=Colors.textSecondary
                style={styles.inputIcon}
              />
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={styles.picker}
              >
                <Picker.Item label="Worker" value="worker" />
                <Picker.Item label="Engineer" value="engineer" />
                <Picker.Item label="Project Manager" value="project_manager" />
                <Picker.Item label="Admin" value="admin" />
                <Picker.Item label="Vendor" value="vendor" />
              </Picker>
            </View>

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
                <ActivityIndicator color=Colors.surface />
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
});