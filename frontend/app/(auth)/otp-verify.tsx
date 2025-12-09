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
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function OTPVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyOTP, sendOTP } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState(params.otp as string || '');

  const phone = params.phone as string;
  const fullName = params.fullName as string;
  const role = params.role as string;

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(phone, otp, { full_name: fullName, role });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const newOtp = await sendOTP(phone);
      setMockOtp(newOtp);
      Alert.alert('OTP Resent', `Your new OTP is: ${newOtp}`);
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
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color=Colors.textPrimary />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="mail-open" size={64} color=Colors.secondary />
          </View>

          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{' '}\n
            <Text style={styles.phone}>{phone}</Text>
          </Text>

          {mockOtp && (
            <View style={styles.otpDisplay}>
              <Text style={styles.otpLabel}>Mock OTP (Testing):</Text>
              <Text style={styles.otpValue}>{mockOtp}</Text>
            </View>
          )}

          <View style={styles.otpInputContainer}>
            <Ionicons
              name="keypad-outline"
              size={20}
              color=Colors.textSecondary
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color=Colors.surface />
            ) : (
              <Text style={styles.verifyButtonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={loading}
          >
            <Text style={styles.resendButtonText}>Resend OTP</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  phone: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  otpDisplay: {
    backgroundColor: '#FFF5F2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  otpInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  otpInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 8,
  },
  verifyButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});