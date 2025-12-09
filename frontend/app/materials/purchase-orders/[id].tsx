import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { purchaseOrdersAPI } from '../../../services/api';

export default function PurchaseOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      const response = await purchaseOrdersAPI.getById(id as string);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading PO:', error);
      Alert.alert('Error', 'Failed to load purchase order details');
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

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await purchaseOrdersAPI.update(id as string, { status: newStatus });
      Alert.alert('Success', 'Purchase order status updated');
      loadOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const showStatusOptions = () => {
    Alert.alert(
      'Update Status',
      'Select new status',
      [
        { text: 'Draft', onPress: () => handleStatusUpdate('draft') },
        { text: 'Pending', onPress: () => handleStatusUpdate('pending') },
        { text: 'Approved', onPress: () => handleStatusUpdate('approved') },
        { text: 'Ordered', onPress: () => handleStatusUpdate('ordered') },
        { text: 'Received', onPress: () => handleStatusUpdate('received') },
        { text: 'Cancelled', onPress: () => handleStatusUpdate('cancelled'), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Purchase order not found</Text>
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
        <Text style={styles.headerTitle}>PO Details</Text>
        <TouchableOpacity style={styles.iconButton} onPress={showStatusOptions}>
          <Ionicons name="ellipsis-horizontal" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* PO Header */}
        <View style={styles.card}>
          <View style={styles.poHeader}>
            <View>
              <Text style={styles.poNumber}>{order.po_number}</Text>
              <Text style={styles.poDate}>
                Order Date: {new Date(order.order_date).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={showStatusOptions}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vendor Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vendor Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color="Colors.textSecondary" />
            <Text style={styles.infoText}>{order.vendor_name || 'Unknown Vendor'}</Text>
          </View>
          {order.expected_delivery_date && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="Colors.textSecondary" />
              <Text style={styles.infoText}>
                Expected Delivery: {new Date(order.expected_delivery_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items ({order.items?.length || 0})</Text>
          {order.items && order.items.map((item: any, index: number) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemName}>{item.material_name}</Text>
                <Text style={styles.lineItemAmount}>₹{item.amount?.toFixed(2)}</Text>
              </View>
              <View style={styles.lineItemDetails}>
                <Text style={styles.lineItemQty}>
                  {item.quantity} {item.unit} × ₹{item.rate?.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total Amount */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>₹{order.total_amount?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Actions */}
        {order.status === 'draft' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleStatusUpdate('pending')}
          >
            <Ionicons name="send-outline" size={20} color="Colors.surface" />
            <Text style={styles.actionButtonText}>Submit for Approval</Text>
          </TouchableOpacity>
        )}

        {order.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleStatusUpdate('approved')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="Colors.surface" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
        )}

        {order.status === 'approved' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => handleStatusUpdate('ordered')}
          >
            <Ionicons name="cart-outline" size={20} color="Colors.surface" />
            <Text style={styles.actionButtonText}>Mark as Ordered</Text>
          </TouchableOpacity>
        )}

        {order.status === 'ordered' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleStatusUpdate('received')}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="Colors.surface" />
            <Text style={styles.actionButtonText}>Mark as Received</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
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
  iconButton: {
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 12,
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  poNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  poDate: {
    fontSize: 14,
    color: 'Colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'Colors.surface,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  lineItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lineItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary,
    flex: 1,
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  lineItemDetails: {
    marginTop: 2,
  },
  lineItemQty: {
    fontSize: 13,
    color: 'Colors.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  notesText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: 'Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: 'Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
