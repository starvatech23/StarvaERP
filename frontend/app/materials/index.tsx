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
import { materialsAPI, vendorsAPI, siteInventoryAPI } from '../../services/api';

export default function MaterialsMainScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    materials: 0,
    vendors: 0,
    lowStock: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [materialsRes, vendorsRes, inventoryRes] = await Promise.all([
        materialsAPI.getAll(),
        vendorsAPI.getAll(),
        siteInventoryAPI.getAll(),
      ]);

      const lowStock = (inventoryRes.data || []).filter(
        (item: any) => item.current_stock < item.minimum_stock
      ).length;

      setStats({
        materials: (materialsRes.data || []).length,
        vendors: (vendorsRes.data || []).length,
        lowStock,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      id: 'catalog',
      title: 'Material Catalog',
      description: 'Browse materials inventory',
      icon: 'cube',
      color: '#10B981',
      route: '/materials/catalog',
    },
    {
      id: 'vendors',
      title: 'Vendors',
      description: 'Manage suppliers',
      icon: 'business',
      color: 'Colors.primary',
      route: '/materials/vendors',
    },
    {
      id: 'inventory',
      title: 'Site Inventory',
      description: 'Track stock levels',
      icon: 'layers',
      color: '#F59E0B',
      route: '/materials/inventory',
    },
    {
      id: 'requirements',
      title: 'Requirements',
      description: 'Material needs planning',
      icon: 'clipboard',
      color: '#8B5CF6',
      route: '/materials/requirements',
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
        <Text style={styles.headerTitle}>Materials & Procurement</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="cube" size={24} color="#10B981" />
              <Text style={styles.statValue}>{stats.materials}</Text>
              <Text style={styles.statLabel}>Materials</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="business" size={24} color="Colors.primary" />
              <Text style={styles.statValue}>{stats.vendors}</Text>
              <Text style={styles.statLabel}>Vendors</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.statValue}>{stats.lowStock}</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
          </View>
        </View>

        {/* Modules */}
        <View style={styles.modulesContainer}>
          <Text style={styles.sectionTitle}>Manage</Text>
          {modules.map((module) => (
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  headerTitle: {
    fontSize: 24,
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
});