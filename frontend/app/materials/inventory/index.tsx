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
import Colors from '../../../constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { siteInventoryAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function InventoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      loadInventory();
    }, [selectedProject])
  );

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const params = selectedProject ? { project_id: selectedProject } : {};
      const response = await siteInventoryAPI.getAll(params);
      setInventory(response.data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = (item: any) => {
    return item.current_stock < item.minimum_stock;
  };

  const getStockStatus = (item: any) => {
    if (item.current_stock === 0) return { label: 'OUT OF STOCK', color: '#EF4444' };
    if (isLowStock(item)) return { label: 'LOW STOCK', color: '#F59E0B' };
    return { label: 'IN STOCK', color: '#10B981' };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Inventory</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/materials/inventory/add' as any)}
        >
          <Ionicons name="add" size={24} color="Colors.surface" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Site:</Text>
        <View style={{ flex: 1 }}>
          <ModalSelector
            options={[
              { label: 'All Sites', value: '' },
              ...projects.map((p) => ({ label: p.name, value: p.id })),
            ]}
            selectedValue={selectedProject}
            onValueChange={setSelectedProject}
            placeholder="All Sites"
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {inventory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No inventory yet</Text>
            <Text style={styles.emptySubtext}>Add materials to track inventory</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/materials/inventory/add' as any)}
            >
              <Text style={styles.emptyButtonText}>Add Inventory</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Low Stock Alert */}
            {inventory.filter(isLowStock).length > 0 && (
              <View style={styles.alertCard}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>Low Stock Alert</Text>
                  <Text style={styles.alertText}>
                    {inventory.filter(isLowStock).length} items below minimum stock
                  </Text>
                </View>
              </View>
            )}

            {/* Inventory Items */}
            {inventory.map((item) => {
              const status = getStockStatus(item);
              return (
                <View key={item.id} style={styles.inventoryCard}>
                  <View style={styles.inventoryHeader}>
                    <View style={styles.inventoryLeft}>
                      <Text style={styles.materialName}>{item.material_name || 'Material'}</Text>
                      <Text style={styles.siteName}>{item.site_name || 'Site'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stockInfo}>
                    <View style={styles.stockRow}>
                      <Text style={styles.stockLabel}>Current Stock:</Text>
                      <Text style={[styles.stockValue, { color: status.color }]}>
                        {item.current_stock} {item.unit}
                      </Text>
                    </View>
                    <View style={styles.stockRow}>
                      <Text style={styles.stockLabel}>Minimum Stock:</Text>
                      <Text style={styles.stockValue}>
                        {item.minimum_stock} {item.unit}
                      </Text>
                    </View>
                    {item.location && (
                      <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Location:</Text>
                        <Text style={styles.stockValue}>{item.location}</Text>
                      </View>
                    )}
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min((item.current_stock / item.minimum_stock) * 100, 100)}%`,
                            backgroundColor: status.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {((item.current_stock / item.minimum_stock) * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
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
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginRight: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'Colors.textSecondary,
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  alertText: {
    fontSize: 13,
    color: '#7F1D1D',
    marginTop: 2,
  },
  inventoryCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  inventoryLeft: {
    flex: 1,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
  siteName: {
    fontSize: 13,
    color: 'Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stockInfo: {
    gap: 6,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockLabel: {
    fontSize: 13,
    color: 'Colors.textSecondary,
  },
  stockValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    width: 40,
    textAlign: 'right',
  },
});