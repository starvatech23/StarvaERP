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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, sendOTP, verifyOTP } = useAuth();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mockOtp, setMockOtp] = useState('');

  const handleEmailLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(identifier, password, 'email');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    setLoading(true);
    try {
      const otpCode = await sendOTP(identifier);
      setMockOtp(otpCode);
      setOtpSent(true);
      Alert.alert('OTP Sent', `Your OTP is: ${otpCode} (This is a mock OTP)`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(identifier, otp);
      router.replace('/(tabs)');
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
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </TouchableOpacity>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.methodToggle}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                authMethod === 'email' && styles.methodButtonActive,
              ]}
              onPress={() => {
                setAuthMethod('email');
                setOtpSent(false);
              }}
            >
              <Ionicons
                name="mail"
                size={20}
                color={authMethod === 'email' ? '#FFFFFF' : '#718096'}
              />
              <Text
                style={[
                  styles.methodText,
                  authMethod === 'email' && styles.methodTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                authMethod === 'phone' && styles.methodButtonActive,
              ]}
              onPress={() => {
                setAuthMethod('phone');
                setOtpSent(false);
              }}
            >
              <Ionicons
                name="call"
                size={20}
                color={authMethod === 'phone' ? '#FFFFFF' : '#718096'}
              />
              <Text
                style={[
                  styles.methodText,
                  authMethod === 'phone' && styles.methodTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons
                name={authMethod === 'email' ? 'mail-outline' : 'call-outline'}
                size={20}
                color="#718096"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={authMethod === 'email' ? 'Email' : 'Phone Number'}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType={authMethod === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
                editable={!otpSent}
              />
            </View>

            {authMethod === 'email' ? (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#718096"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#718096"
                  />
                </TouchableOpacity>
              </View>
            ) : otpSent ? (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="keypad-outline"
                  size={20}
                  color="#718096"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            ) : null}

            {mockOtp && (
              <View style={styles.otpDisplay}>
                <Text style={styles.otpLabel}>Mock OTP (Testing):</Text>
                <Text style={styles.otpValue}>{mockOtp}</Text>
              </View>
            )}

            {authMethod === 'email' ? (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            ) : otpSent ? (
              <View style={styles.otpButtons}>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendOTP}
                  disabled={loading}
                >
                  <Text style={styles.resendButtonText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register-email')}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 32,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#FF6B35',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  methodTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
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
    color: '#1A202C',
  },
  eyeIcon: {
    padding: 8,
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
    color: '#FF6B35',
    fontWeight: '600',
  },
  otpValue: {
    fontSize: 20,
    color: '#FF6B35',
    fontWeight: '700',
    letterSpacing: 4,
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  otpButtons: {
    gap: 12,
  },
  resendButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#FF6B35',
    fontSize: 14,
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
    color: '#718096',
  },
  footerLink: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
});