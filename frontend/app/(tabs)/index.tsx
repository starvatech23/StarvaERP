import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI, tasksAPI } from '../../services/api';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [projectsRes, tasksRes, myTasksRes] = await Promise.all([
        projectsAPI.getAll(),
        tasksAPI.getAll(),
        tasksAPI.getAll(undefined, undefined, true),
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      setMyTasks(myTasksRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#10B981';
      case 'project_manager':
        return '#3B82F6';
      case 'engineer':
        return '#8B5CF6';
      case 'worker':
        return '#F59E0B';
      case 'vendor':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'project_manager':
        return 'Project Manager';
      case 'admin':
        return 'Admin';
      case 'engineer':
        return 'Engineer';
      case 'worker':
        return 'Worker';
      case 'vendor':
        return 'Vendor';
      default:
        return role;
    }
  };

  const activeProjects = projects.filter((p: any) => p.status === 'in_progress').length;
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
  const myPendingTasks = myTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length;

  const quickActions = [
    { icon: 'add-circle', label: 'New Project', color: '#FF6B35', action: () => router.push('/projects/create' as any) },
    { icon: 'list', label: 'My Tasks', color: '#3B82F6', action: () => {} },
    { icon: 'cube', label: 'Materials', color: '#8B5CF6', action: () => router.push('/(tabs)/materials' as any) },
    { icon: 'business', label: 'Projects', color: '#F59E0B', action: () => router.push('/(tabs)/projects' as any) },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.full_name || 'User'}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role || '') + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(user?.role || '') }]}>
              {getRoleLabel(user?.role || '')}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="business" size={32} color="#FF6B35" />
            <Text style={styles.statValue}>{activeProjects}</Text>
            <Text style={styles.statLabel}>Active Projects</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            <Text style={styles.statValue}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
        </View>

        {myPendingTasks > 0 && (
          <TouchableOpacity style={styles.myTasksCard}>
            <View style={styles.myTasksContent}>
              <Ionicons name="alert-circle" size={24} color="#F59E0B" />
              <View style={styles.myTasksText}>
                <Text style={styles.myTasksTitle}>You have {myPendingTasks} pending tasks</Text>
                <Text style={styles.myTasksSubtitle}>Tap to view your tasks</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={action.action}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon as any} size={28} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Ionicons name="time" size={20} color="#718096" />
            <Text style={styles.activityText}>No recent activity</Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Ionicons name="information-circle" size={24} color="#FF6B35" />
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome to Construction Manager!</Text>
            <Text style={styles.welcomeText}>
              Your all-in-one solution for managing construction projects, teams, and materials.
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
    backgroundColor: '#F7FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#718096',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#718096',
  },
  welcomeCard: {
    backgroundColor: '#FFF5F2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
});