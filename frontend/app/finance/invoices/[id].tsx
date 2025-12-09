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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { invoicesAPI } from '../../../services/api';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const response = await invoicesAPI.getById(id as string);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      Alert.alert('Error', 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: '#6B7280',
      sent: 'Colors.primary',
      paid: '#10B981',
      overdue: '#EF4444',
      cancelled: '#9CA3AF',
    };
    return colors[status] || '#6B7280';
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await invoicesAPI.update(id as string, { status: newStatus });
      Alert.alert('Success', 'Invoice status updated');
      loadInvoice();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const showStatusOptions = () => {
    Alert.alert(
      'Update Status',
      'Select new invoice status',
      [
        { text: 'Draft', onPress: () => handleStatusUpdate('draft') },
        { text: 'Sent', onPress: () => handleStatusUpdate('sent') },
        { text: 'Paid', onPress: () => handleStatusUpdate('paid') },
        { text: 'Overdue', onPress: () => handleStatusUpdate('overdue') },
        { text: 'Cancelled', onPress: () => handleStatusUpdate('cancelled') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Invoice not found</Text>
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
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <TouchableOpacity style={styles.iconButton} onPress={showStatusOptions}>
          <Ionicons name="ellipsis-horizontal" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Invoice Header */}
        <View style={styles.card}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
              <Text style={styles.invoiceDate}>
                {new Date(invoice.created_at).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={showStatusOptions}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
                <Text style={styles.statusText}>{invoice.status.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="Colors.textSecondary" />
            <Text style={styles.infoText}>{invoice.client_name}</Text>
          </View>
          {invoice.client_address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="Colors.textSecondary" />
              <Text style={styles.infoText}>{invoice.client_address}</Text>
            </View>
          )}
          {invoice.client_phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="Colors.textSecondary" />
              <Text style={styles.infoText}>{invoice.client_phone}</Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Line Items</Text>
          {invoice.line_items && invoice.line_items.map((item: any, index: number) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemDescription}>{item.description}</Text>
              </View>
              <View style={styles.lineItemDetails}>
                <Text style={styles.lineItemQty}>
                  {item.quantity} × ₹{item.rate.toFixed(2)}
                </Text>
                <Text style={styles.lineItemAmount}>₹{item.amount.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Financial Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>₹{invoice.subtotal?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Tax ({invoice.tax_percentage || 0}%):
            </Text>
            <Text style={styles.summaryValue}>₹{invoice.tax_amount?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>₹{invoice.total_amount?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid Amount:</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              ₹{invoice.paid_amount?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>Balance Due:</Text>
            <Text style={styles.balanceValue}>
              ₹{(invoice.balance_due || invoice.total_amount)?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="Colors.textSecondary" />
            <Text style={styles.infoText}>
              Due Date: {new Date(invoice.due_date).toLocaleDateString()}
            </Text>
          </View>
          {invoice.paid_date && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
              <Text style={styles.infoText}>
                Paid on: {new Date(invoice.paid_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Actions */}
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/finance/payments/create?invoice_id=${invoice.id}` as any)}
          >
            <Ionicons name="cash-outline" size={20} color="Colors.surface" />
            <Text style={styles.actionButtonText}>Record Payment</Text>
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'Colors.surface',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'Colors.border',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  invoiceDate: {
    fontSize: 14,
    color: 'Colors.textSecondary',
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
    color: 'Colors.surface',
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
    borderBottomColor: 'Colors.border',
  },
  lineItemHeader: {
    marginBottom: 4,
  },
  lineItemDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  lineItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemQty: {
    fontSize: 13,
    color: 'Colors.textSecondary',
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.primary',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'Colors.textSecondary',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.primary',
  },
  balanceRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#EF4444',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  notesText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: 'Colors.surface',
    fontSize: 16,
    fontWeight: '700',
  },
});