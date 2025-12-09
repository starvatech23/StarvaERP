import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI, invoicesAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function CreatePaymentScreen() {
  const router = useRouter();
  const { invoice_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // Form state
  const [invoiceId, setInvoiceId] = useState(invoice_id as string || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await invoicesAPI.getAll();
      // Filter to show only unpaid or partially paid invoices
      const unpaidInvoices = (response.data || []).filter(
        (inv: any) => inv.status !== 'paid' && inv.status !== 'cancelled'
      );
      setInvoices(unpaidInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const getSelectedInvoice = () => {
    return invoices.find(inv => inv.id === invoiceId);
  };

  const handleSubmit = async () => {
    // Validation
    if (!invoiceId || !amount || !paymentDate || !paymentMethod) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const invoice = getSelectedInvoice();
    if (invoice) {
      const balanceDue = invoice.balance_due || invoice.total_amount;
      if (amountNum > balanceDue) {
        Alert.alert('Error', `Payment amount cannot exceed balance due of ₹${balanceDue.toFixed(2)}`);
        return;
      }
    }

    setLoading(true);
    try {
      await paymentsAPI.create({
        invoice_id: invoiceId,
        amount: amountNum,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      });
      
      Alert.alert('Success', 'Payment recorded successfully');
      router.back();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const selectedInvoice = getSelectedInvoice();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {/* Invoice Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Invoice *</Text>
              <ModalSelector
                options={invoices.map(inv => ({
                  label: `${inv.invoice_number} - ${inv.client_name} (₹${inv.balance_due?.toFixed(2) || inv.total_amount?.toFixed(2)})`,
                  value: inv.id,
                }))}
                selectedValue={invoiceId}
                onValueChange={setInvoiceId}
                placeholder="Select Invoice"
              />
            </View>

            {/* Invoice Summary */}
            {selectedInvoice && (
              <View style={styles.invoiceSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Invoice Number:</Text>
                  <Text style={styles.summaryValue}>{selectedInvoice.invoice_number}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Client:</Text>
                  <Text style={styles.summaryValue}>{selectedInvoice.client_name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount:</Text>
                  <Text style={styles.summaryValue}>
                    ₹{selectedInvoice.total_amount?.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Already Paid:</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                    ₹{selectedInvoice.paid_amount?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.balanceRow]}>
                  <Text style={styles.balanceLabel}>Balance Due:</Text>
                  <Text style={styles.balanceValue}>
                    ₹{(selectedInvoice.balance_due || selectedInvoice.total_amount)?.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Payment Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <View style={styles.amountInput}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Date *</Text>
              <TextInput
                style={styles.input}
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method *</Text>
              <ModalSelector
                options={[
                  { label: 'Cash', value: 'cash' },
                  { label: 'Cheque', value: 'cheque' },
                  { label: 'Bank Transfer', value: 'bank_transfer' },
                  { label: 'UPI', value: 'upi' },
                  { label: 'Card', value: 'card' },
                ]}
                selectedValue={paymentMethod}
                onValueChange={setPaymentMethod}
                placeholder="Select Payment Method"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reference Number</Text>
              <TextInput
                style={styles.input}
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                placeholder="Transaction/Cheque number"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes (optional)"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="Colors.surface" />
            <Text style={styles.submitButtonText}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'Colors.surface,
    borderWidth: 1,
    borderColor: 'Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: 'Colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'Colors.surface,
    borderWidth: 1,
    borderColor: 'Colors.border,
    borderRadius: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    paddingLeft: 12,
  },
  invoiceSummary: {
    backgroundColor: 'Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
  balanceRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#EF4444',
    marginBottom: 0,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  submitButtonText: {
    color: 'Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});