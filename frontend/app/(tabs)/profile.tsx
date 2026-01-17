import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { userManagementAPI } from '../../services/api';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (user?.id) {
        const userRes = await userManagementAPI.getById(user.id).catch(() => ({ data: null }));
        setUserDetails(userRes.data);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use role_name if available, otherwise format the role code
  const getDisplayRole = () => {
    if (userDetails?.role_name) {
      return userDetails.role_name;
    }
    if (user?.role_name) {
      return user.role_name;
    }
    const role = user?.role || '';
    return role
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => router.push('/profile/edit') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'information-circle-outline', label: 'About', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Profile</Text>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          {userDetails?.profile_photo || user?.profile_photo ? (
            <Image
              source={{ 
                uri: `data:image/jpeg;base64,${userDetails?.profile_photo || user?.profile_photo}` 
              }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={Colors.secondary} />
            </View>
          )}
          <Text style={styles.name}>{user?.full_name || 'User'}</Text>
          <Text style={styles.role}>{getDisplayRole()}</Text>
          
          <View style={styles.infoContainer}>
            {user?.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>
            )}
            {user?.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{user.phone}</Text>
              </View>
            )}
            {userDetails?.team_name && (
              <View style={styles.infoRow}>
                <Ionicons name="people" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>Team: {userDetails.team_name}</Text>
              </View>
            )}
            {userDetails?.reporting_manager_name && (
              <View style={styles.infoRow}>
                <Ionicons name="person-circle" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>Reports to: {userDetails.reporting_manager_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems
            .filter((item) => !item.adminOnly || user?.role === 'admin')
            .map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name={item.icon as any} size={24} color={Colors.textSecondary} />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
              </TouchableOpacity>
            ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoContainer: {
    width: '100%',
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
});
