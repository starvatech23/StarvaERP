import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { vendorsAPI, materialsAPI, siteInventoryAPI } from '../../services/api';

export default function MaterialsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'vendors' | 'materials' | 'inventory' | 'reports'>('vendors');
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [vendorDues, setVendorDues] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab])
  );

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'vendors') {
        const [vendorsRes, duesRes] = await Promise.all([
          vendorsAPI.getAll(),
          vendorsAPI.getAllPaymentDues(),
        ]);
        setVendors(vendorsRes.data || []);
        setVendorDues(duesRes.data || {});
      } else if (activeTab === 'materials') {
        const response = await materialsAPI.getAll();
        setMaterials(response.data || []);
      } else if (activeTab === 'inventory') {
        const response = await siteInventoryAPI.getAll();
        setInventory(response.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [activeTab]);

  const getCategoryColor = (category: string) => {
    const colors: any = {
      cement: '#78716C',
      steel: '#DC2626',
      sand: '#F59E0B',
      aggregate: '#6B7280',
      bricks: '#EF4444',
      blocks: '#94A3B8',
      tiles: '#06B6D4',
      paint: '#8B5CF6',
      plumbing: Colors.primary,
      electrical: '#FBBF24',
      hardware: '#6366F1',
      wood: '#92400E',
      glass: '#38BDF8',
    };
    return colors[category] || '#6B7280';
  };

  const renderVendors = () => {
    if (vendors.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Vendors Yet</Text>
          <Text style={styles.emptyText}>Add vendors to manage materials and procurement</Text>
        </View>
      );
    }

    return vendors.map((vendor: any) => {
      const dues = vendorDues[vendor.id];
      const hasDues = dues && dues.total_dues > 0;
      
      return (
        <TouchableOpacity
          key={vendor.id}
          style={styles.card}
          onPress={() => router.push(`/materials/vendor-details/${vendor.id}` as any)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.vendorInfo}>
              <Ionicons name="business" size={40} color="Colors.secondary" />
              <View style={styles.vendorDetails}>
                <Text style={styles.vendorName}>{vendor.business_name}</Text>
                <Text style={styles.vendorContact}>{vendor.contact_person}</Text>
              </View>
            </View>
            {vendor.gst_number && (
              <View style={styles.gstBadge}>
                <Text style={styles.gstText}>GST</Text>
              </View>
            )}
          </View>
          
          {hasDues && (
            <View style={styles.duesSection}>
              <View style={styles.duesInfo}>
                <Ionicons name="cash-outline" size={18} color="#DC2626" />
                <Text style={styles.duesLabel}>Payment Due:</Text>
                <Text style={styles.duesAmount}>₹{dues.total_dues.toLocaleString()}</Text>
              </View>
              <Text style={styles.duesOrders}>{dues.order_count} pending order(s)</Text>
            </View>
          )}
          
          <View style={styles.cardFooter}>
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={16} color="Colors.textSecondary" />
              <Text style={styles.infoText}>{vendor.phone}</Text>
            </View>
            {vendor.email && (
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={16} color="Colors.textSecondary" />
                <Text style={styles.infoText}>{vendor.email}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    });
  };

  const renderMaterials = () => {
    if (materials.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Materials Yet</Text>
          <Text style={styles.emptyText}>Add materials to track inventory and purchases</Text>
        </View>
      );
    }

    return materials.map((material: any) => (
      <TouchableOpacity
        key={material.id}
        style={styles.card}
        onPress={() => router.push(`/materials/material-details/${material.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.materialInfo}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: getCategoryColor(material.category) + '20' },
              ]}
            >
              <Ionicons
                name="cube"
                size={24}
                color={getCategoryColor(material.category)}
              />
            </View>
            <View style={styles.materialDetails}>
              <Text style={styles.materialName}>{material.name}</Text>
              <Text style={styles.materialCategory}>{material.category.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.unitBadge}>
            <Text style={styles.unitText}>{material.unit}</Text>
          </View>
        </View>
        {material.description && (
          <Text style={styles.materialDescription} numberOfLines={2}>
            {material.description}
          </Text>
        )}
      </TouchableOpacity>
    ));
  };

  const renderInventory = () => {
    if (inventory.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Inventory Records</Text>
          <Text style={styles.emptyText}>Track materials at different sites</Text>
        </View>
      );
    }

    return inventory.map((item: any) => (
      <View key={item.id} style={styles.inventoryCard}>
        <View style={styles.inventoryHeader}>
          <View style={styles.inventoryLeft}>
            <Text style={styles.inventoryMaterial}>{item.material_name}</Text>
            <Text style={styles.inventorySite}>{item.project_name}</Text>
          </View>
          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor:
                  item.current_stock <= item.minimum_stock ? '#FEE2E2' : '#D1FAE5',
              },
            ]}
          >
            <Text
              style={[
                styles.stockText,
                {
                  color: item.current_stock <= item.minimum_stock ? '#DC2626' : '#059669',
                },
              ]}
            >
              {item.current_stock} {item.material_unit}
            </Text>
          </View>
        </View>
        {item.current_stock <= item.minimum_stock && (
          <View style={styles.lowStockWarning}>
            <Ionicons name="warning" size={14} color="#DC2626" />
            <Text style={styles.lowStockText}>Low Stock Alert</Text>
          </View>
        )}
      </View>
    ));
  };

  const renderReports = () => {
    return (
      <View style={styles.reportsContainer}>
        <Ionicons name="stats-chart" size={80} color="Colors.secondary" />
        <Text style={styles.reportsTitle}>Material Reports</Text>
        <Text style={styles.reportsText}>
          View spending analysis, inventory reports, and purchase order summaries
        </Text>
        <TouchableOpacity
          style={styles.viewReportsButton}
          onPress={() => router.push('/materials/reports' as any)}
        >
          <Ionicons name="document-text" size={20} color="Colors.surface" />
          <Text style={styles.viewReportsText}>View Reports</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Materials & Vendors</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => router.push('/materials/scan' as any)}
          >
            <Ionicons name="qr-code" size={24} color="Colors.surface" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (activeTab === 'vendors') {
                router.push('/materials/add-vendor' as any);
              } else if (activeTab === 'materials') {
                router.push('/materials/add-material' as any);
              } else if (activeTab === 'inventory') {
                router.push('/materials/add-inventory' as any);
              }
            }}
          >
            <Ionicons name="add" size={24} color="Colors.surface" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vendors' && styles.activeTab]}
          onPress={() => setActiveTab('vendors')}
        >
          <Ionicons
            name="business"
            size={20}
            color={activeTab === 'vendors' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'vendors' && styles.activeTabText,
            ]}
          >
            Vendors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'materials' && styles.activeTab]}
          onPress={() => setActiveTab('materials')}
        >
          <Ionicons
            name="cube"
            size={20}
            color={activeTab === 'materials' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'materials' && styles.activeTabText,
            ]}
          >
            Materials
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Ionicons
            name="layers"
            size={20}
            color={activeTab === 'inventory' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'inventory' && styles.activeTabText,
            ]}
          >
            Inventory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'reports' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'reports' && styles.activeTabText,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="Colors.secondary" style={styles.loader} />
        ) : (
          <>
            {activeTab === 'vendors' && renderVendors()}
            {activeTab === 'materials' && renderMaterials()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'reports' && renderReports()}
          </>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.secondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  vendorContact: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  gstBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gstText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  materialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialDetails: {
    flex: 1,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  materialCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  unitBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  materialDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  inventoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryLeft: {
    flex: 1,
  },
  inventoryMaterial: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  inventorySite: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '700',
  },
  lowStockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  reportsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  reportsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  reportsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  viewReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  viewReportsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  duesSection: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  duesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  duesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  duesAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 'auto',
  },
  duesOrders: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 26,
  },
});
