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
import { paymentsAPI, invoicesAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function PaymentsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadInvoices();
      loadPayments();
    }, [selectedInvoice])
  );

  const loadInvoices = async () => {
    try {
      const response = await invoicesAPI.getAll();
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await paymentsAPI.getAll(selectedInvoice || undefined);
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: any = {
      cash: 'cash-outline',
      cheque: 'document-text-outline',
      bank_transfer: 'swap-horizontal-outline',
      upi: 'phone-portrait-outline',
      card: 'card-outline',
    };
    return icons[method] || 'wallet-outline';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/finance/payments/create' as any)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Invoice:</Text>
          <View style={{ flex: 1 }}>
            <ModalSelector
              options={[
                { label: 'All Invoices', value: '' },
                ...invoices.map((inv) => ({
                  label: `${inv.invoice_number} - ${inv.client_name}`,
                  value: inv.id,
                })),
              ]}
              selectedValue={selectedInvoice}
              onValueChange={setSelectedInvoice}
              placeholder="All Invoices"
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No payments yet</Text>
            <Text style={styles.emptySubtext}>Record payments received from clients</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/finance/payments/create' as any)}
            >
              <Text style={styles.emptyButtonText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          payments.map((payment) => (
            <TouchableOpacity
              key={payment.id}
              style={styles.paymentCard}
            >
              <View style={styles.paymentHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={getPaymentMethodIcon(payment.payment_method)}
                    size={24}
                    color="#10B981"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  <Text style={styles.paymentMethod}>
                    {payment.payment_method.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              </View>

              <View style={styles.paymentDetails}>
                {payment.invoice_number && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={16} color="#718096" />
                    <Text style={styles.detailText}>Invoice: {payment.invoice_number}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#718096" />
                  <Text style={styles.detailText}>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </Text>
                </View>
                {payment.reference_number && (
                  <View style={styles.detailRow}>
                    <Ionicons name="pricetag-outline" size={16} color="#718096" />
                    <Text style={styles.detailText}>Ref: {payment.reference_number}</Text>
                  </View>
                )}
                {payment.notes && (
                  <View style={styles.detailRow}>
                    <Ionicons name="create-outline" size={16} color="#718096" />
                    <Text style={styles.detailText} numberOfLines={2}>
                      {payment.notes}
                    </Text>
                  </View>
                )}
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
    backgroundColor: '#F7FAFC',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#718096',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  statusBadge: {
    marginLeft: 8,
  },
  paymentDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#4A5568',
    flex: 1,
  },
});