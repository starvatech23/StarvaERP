import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { userManagementAPI, rolesAPI, systemSettingsAPI, teamsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    totalTeams: 0,
    maxAdmins: 5,
  });

  useEffect(() => {
    // Check if user is admin - defer navigation to avoid mount issues
    if (user?.role !== 'admin') {
      Alert.alert('Access Denied', 'Only admins can access this page', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [pendingRes, activeRes, rolesRes, teamsRes, settingsRes] = await Promise.all([
        userManagementAPI.getPending(),
        userManagementAPI.getActive(),
        rolesAPI.getAll(),
        teamsAPI.getAll(),
        systemSettingsAPI.getAll(),
      ]);

      const maxAdminsSetting = settingsRes.data.find(
        (s: any) => s.setting_key === 'max_admins'
      );

      setStats({
        pendingUsers: pendingRes.data.length,
        activeUsers: activeRes.data.length,
        totalRoles: rolesRes.data.length,
        totalTeams: teamsRes.data.length,
        maxAdmins: maxAdminsSetting ? parseInt(maxAdminsSetting.setting_value) : 5,
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: 'Add User',
      icon: 'person-add-outline',
      color: '#10B981',
      count: null,
      route: '/admin/users/create',
    },
    {
      title: 'Pending Approvals',
      icon: 'person-add',
      color: Colors.secondary,
      count: stats.pendingUsers,
      route: '/admin/users/pending',
    },
    {
      title: 'Active Users',
      icon: 'people',
      color: Colors.primary,
      count: stats.activeUsers,
      route: '/admin/users/active',
    },
    {
      title: 'Team Management',
      icon: 'people-circle',
      color: '#8B5CF6',
      count: stats.totalTeams,
      route: '/admin/teams',
    },
    {
      title: 'Role Management',
      icon: 'shield-checkmark',
      color: '#F59E0B',
      count: stats.totalRoles,
      route: '/admin/roles',
    },
    {
      title: 'System Settings',
      icon: 'settings',
      color: '#6B7280',
      count: null,
      route: '/admin/settings',
    },
    {
      title: 'Construction Presets',
      icon: 'construct',
      color: Colors.secondary,
      count: null,
      route: '/admin/construction-presets',
      description: 'Manage estimation & construction presets',
    },
    {
      title: 'Import & Export',
      icon: 'swap-horizontal',
      color: '#14B8A6',
      count: null,
      route: '/admin/import-export',
      description: 'Bulk import/export data',
    },
    {
      title: 'Company Settings',
      icon: 'business',
      color: '#F97316',
      count: null,
      route: '/admin/company-settings',
      description: 'Logo, address & branding',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Ionicons name="shield-checkmark-outline" size={48} color={Colors.secondary} />
          <Text style={styles.welcomeTitle}>Admin Control Panel</Text>
          <Text style={styles.welcomeText}>
            Manage users, roles, permissions, and system settings
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="person-add" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{stats.pendingUsers}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="people" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.activeUsers}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Management</Text>
          
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.count !== null && (
                    <Text style={styles.menuSubtitle}>{item.count} items</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={Colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Admin Limit</Text>
            <Text style={styles.infoText}>
              Maximum {stats.maxAdmins} admin users allowed. Configure in settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  infoText: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 4,
  },
});
