import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI } from '../../services/api';

export default function FinanceMainScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const financialModules = [
    {
      id: 'budgets',
      title: 'Budgets',
      description: 'Manage project budgets',
      icon: 'wallet',
      color: '#10B981',
      route: '/finance/budgets',
    },
    {
      id: 'expenses',
      title: 'Expenses',
      description: 'Track expenses & receipts',
      icon: 'receipt',
      color: '#F59E0B',
      route: '/finance/expenses',
    },
    {
      id: 'invoices',
      title: 'Invoices',
      description: 'Generate client invoices',
      icon: 'document-text',
      color: 'Colors.primary',
      route: '/finance/invoices',
    },
    {
      id: 'payments',
      title: 'Payments',
      description: 'Record payments received',
      icon: 'cash',
      color: '#8B5CF6',
      route: '/finance/payments',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)' as any)}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="briefcase" size={24} color="#10B981" />
              <Text style={styles.statValue}>{projects.length}</Text>
              <Text style={styles.statLabel}>Active Projects</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trending-up" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>Total Budget</Text>
            </View>
          </View>
        </View>

        {/* Financial Modules */}
        <View style={styles.modulesContainer}>
          <Text style={styles.sectionTitle}>Manage</Text>
          {financialModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => router.push(module.route as any)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: module.color + '20' }]}>
                <Ionicons name={module.icon as any} size={28} color={module.color} />
              </View>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Financial Reports */}
        <View style={styles.modulesContainer}>
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/finance/reports' as any)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: 'Colors.primary20' }]}>
              <Ionicons name="bar-chart" size={28} color="Colors.primary" />
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Financial Reports</Text>
              <Text style={styles.moduleDescription}>View comprehensive financial analysis</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background',
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
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
    backgroundColor: 'Colors.surface',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#4A5568',
    marginTop: 4,
  },
  modulesContainer: {
    padding: 16,
    backgroundColor: 'Colors.surface',
    marginBottom: 8,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'Colors.background',
    borderRadius: 12,
    marginBottom: 12,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.textPrimary',
    marginBottom: 2,
  },
  moduleDescription: {
    fontSize: 13,
    color: 'Colors.textSecondary',
  },
  projectsContainer: {
    padding: 16,
    backgroundColor: 'Colors.surface',
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'Colors.background',
    borderRadius: 8,
    marginBottom: 8,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  projectLocation: {
    fontSize: 12,
    color: 'Colors.textSecondary',
    marginTop: 2,
  },
  projectAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewReportText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.primary',
    marginRight: 4,
  },
});