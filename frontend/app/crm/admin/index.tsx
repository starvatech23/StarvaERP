import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackToHome from '../../../components/BackToHome';

export default function AdminPanelScreen() {
  const router = useRouter();

  const adminOptions = [
    {
      icon: 'construct',
      title: 'Custom Fields',
      description: 'Manage custom lead fields',
      route: '/crm/admin/custom-fields' as any,
      color: '#3B82F6',
    },
    {
      icon: 'stats-chart',
      title: 'Funnels',
      description: 'Build and manage sales funnels',
      route: '/crm/admin/funnels' as any,
      color: '#8B5CF6',
    },
    {
      icon: 'shield-checkmark',
      title: 'Permissions',
      description: 'View role-based permissions',
      route: '/crm/admin/permissions' as any,
      color: '#10B981',
    },
    {
      icon: 'pricetag',
      title: 'System Labels',
      description: 'Customize UI terminology',
      route: '/crm/admin/labels-settings' as any,
      color: '#F59E0B',
    },
    {
      icon: 'swap-horizontal',
      title: 'Import & Export',
      description: 'Import from CSV/Meta, export to CSV/JSON',
      route: '/crm/admin/import-export' as any,
      color: '#EC4899',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BackToHome />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>CRM Configuration & Management</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Admin-only area for CRM configuration. Changes here affect all users.
          </Text>
        </View>

        {adminOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionCard}
            onPress={() => router.push(option.route)}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
              <Ionicons name={option.icon as any} size={28} color={option.color} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1A202C' },
  headerSubtitle: { fontSize: 14, color: '#718096', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#2C5282', lineHeight: 20 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: '#1A202C' },
  optionDescription: { fontSize: 13, color: '#718096', marginTop: 2 },
});