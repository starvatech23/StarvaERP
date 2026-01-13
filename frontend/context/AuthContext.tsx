import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email?: string;
  phone?: string;
  full_name: string;
  role: string;
  role_name?: string;
  role_id?: string;
  team_name?: string;
  address?: string;
  profile_photo?: string;
  is_active: boolean;
  approval_status?: string;
  date_joined: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (identifier: string, password: string, authType: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  sendOTP: (phone: string) => Promise<string>;
  verifyOTP: (phone: string, otp: string, userData?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from storage on app start
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (identifier: string, password: string, authType: string) => {
    try {
      console.log('[Auth] Login attempt:', { identifier, authType, passwordLength: password?.length });
      
      const response = await authAPI.login({
        identifier,
        password: authType === 'email' ? password : undefined,
        auth_type: authType,
      });

      console.log('[Auth] Login successful:', response.data?.user?.email);
      
      const { access_token, user: userData } = response.data;

      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
    } catch (error: any) {
      console.log('[Auth] Login error:', {
        status: error.response?.status,
        detail: error.response?.data?.detail,
        message: error.message,
      });
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const signUp = async (data: any) => {
    try {
      const response = await authAPI.register(data);
      const { access_token, user: userData } = response.data;

      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sendOTP = async (phone: string): Promise<string> => {
    try {
      const response = await authAPI.sendOTP(phone);
      return response.data.otp; // Return OTP for testing (mock)
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to send OTP');
    }
  };

  const verifyOTP = async (phone: string, otp: string, userData?: any) => {
    try {
      const response = await authAPI.verifyOTP({
        phone,
        otp,
        full_name: userData?.full_name,
        role: userData?.role,
        role_id: userData?.role_id,
      });

      const { access_token, user: userResponse } = response.data;

      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userResponse));

      setToken(access_token);
      setUser(userResponse);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'OTP verification failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        signUp,
        signOut,
        sendOTP,
        verifyOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
