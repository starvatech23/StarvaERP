import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CRMScreen() {
  const router = useRouter();

  const menuItems = [
    { icon: 'analytics', title: 'Dashboard', description: 'Analytics & insights with filters', route: '/crm/dashboard' as any, color: '#10B981' },
    { icon: 'people', title: 'Leads', description: 'Manage and track leads', route: '/crm/leads' as any, color: Colors.primary },
    { icon: 'list', title: 'Categories', description: 'Manage lead funnel stages', route: '/crm/categories' as any, color: '#8B5CF6' },
    { icon: 'construct', title: 'Admin Panel', description: 'CRM configuration & customization', route: '/crm/admin' as any, color: '#EF4444' },
    { icon: 'settings', title: 'Settings', description: 'Configure CRM options', route: '/crm/settings' as any, color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="home" size={24} color={Colors.secondary} />
          <Text style={styles.backButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRM</Text>
        <Text style={styles.headerSubtitle}>Lead Management System</Text>
      </View>

      <ScrollView style={styles.content}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuCard}
            onPress={() => router.push(item.route)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={32} color={item.color} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  menuDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
});