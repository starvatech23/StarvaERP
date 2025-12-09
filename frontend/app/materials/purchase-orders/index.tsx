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
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { purchaseOrdersAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function PurchaseOrdersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      loadOrders();
    }, [selectedProject, selectedStatus])
  );

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const params: any = {};
      if (selectedProject) params.project_id = selectedProject;
      if (selectedStatus) params.status = selectedStatus;
      
      const response = await purchaseOrdersAPI.getAll(params);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: '#6B7280',
      pending: '#F59E0B',
      approved: Colors.primary,
      ordered: '#8B5CF6',
      received: '#10B981',
      cancelled: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.primary" />
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
        <Text style={styles.headerTitle}>Purchase Orders</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/materials/purchase-orders/create' as any)}
        >
          <Ionicons name="add" size={24} color="Colors.surface" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Project:</Text>
          <View style={{ flex: 1 }}>
            <ModalSelector
              options={[
                { label: 'All Projects', value: '' },
                ...projects.map((p) => ({ label: p.name, value: p.id })),
              ]}
              selectedValue={selectedProject}
              onValueChange={setSelectedProject}
              placeholder="All Projects"
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={{ flex: 1 }}>
            <ModalSelector
              options={[
                { label: 'All Status', value: '' },
                { label: 'Draft', value: 'draft' },
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Ordered', value: 'ordered' },
                { label: 'Received', value: 'received' },
              ]}
              selectedValue={selectedStatus}
              onValueChange={setSelectedStatus}
              placeholder="All Status"
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No purchase orders yet</Text>
            <Text style={styles.emptySubtext}>Create orders for material procurement</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/materials/purchase-orders/create' as any)}
            >
              <Text style={styles.emptyButtonText}>Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/materials/purchase-orders/${order.id}` as any)}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNumber}>{order.po_number}</Text>
                  <Text style={styles.vendorName}>{order.vendor_name || 'Unknown Vendor'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="cube-outline" size={16} color="Colors.textSecondary" />
                  <Text style={styles.detailText}>
                    {order.items?.length || 0} items
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color="Colors.textSecondary" />
                  <Text style={styles.detailText}>
                    {formatCurrency(order.total_amount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="Colors.textSecondary" />
                  <Text style={styles.detailText}>
                    {new Date(order.order_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.orderFooter}>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
              </View>
            </TouchableOpacity>
          ))
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    width: 80,
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
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  vendorName: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    color: Colors.surface,
  },
  orderDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#4A5568',
  },
  orderFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
});