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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { invoicesAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Form state
  const [projectId, setProjectId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('18');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<any[]>([
    { description: '', quantity: '', rate: '', amount: 0 }
  ]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '', rate: '', amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const updated = lineItems.filter((_, i) => i !== index);
      setLineItems(updated);
    }
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    
    // Calculate amount for this line item
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const rate = parseFloat(updated[index].rate) || 0;
      updated[index].amount = qty * rate;
    }
    
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = (subtotal * parseFloat(taxPercentage || '0')) / 100;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async () => {
    // Validation
    if (!projectId || !clientName || !dueDate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (lineItems.some(item => !item.description || !item.quantity || !item.rate)) {
      Alert.alert('Error', 'Please fill all line item details');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, tax, total } = calculateTotals();
      
      await invoicesAPI.create({
        project_id: projectId,
        client_name: clientName,
        client_address: clientAddress,
        client_phone: clientPhone,
        due_date: dueDate,
        line_items: lineItems.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: item.amount,
        })),
        subtotal,
        tax_percentage: parseFloat(taxPercentage),
        tax_amount: tax,
        total_amount: total,
        notes,
        status: 'draft',
      });
      
      Alert.alert('Success', 'Invoice created successfully');
      router.back();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {/* Project Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Project *</Text>
              <ModalSelector
                options={projects.map(p => ({ label: p.name, value: p.id }))}
                selectedValue={projectId}
                onValueChange={setProjectId}
                placeholder="Select Project"
              />
            </View>
          </View>

          {/* Client Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Name *</Text>
              <TextInput
                style={styles.input}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Enter client name"
                placeholderTextColor="#A0AEC0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={clientAddress}
                onChangeText={setClientAddress}
                placeholder="Enter client address"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Phone</Text>
              <TextInput
                style={styles.input}
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Due Date *</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
              />
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <TouchableOpacity onPress={addLineItem} style={styles.addItemButton}>
                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {lineItems.map((item, index) => (
              <View key={index} style={styles.lineItemCard}>
                <View style={styles.lineItemHeader}>
                  <Text style={styles.lineItemTitle}>Item {index + 1}</Text>
                  {lineItems.length > 1 && (
                    <TouchableOpacity onPress={() => removeLineItem(index)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={styles.input}
                    value={item.description}
                    onChangeText={(text) => updateLineItem(index, 'description', text)}
                    placeholder="Item description"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Quantity *</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity}
                      onChangeText={(text) => updateLineItem(index, 'quantity', text)}
                      placeholder="0"
                      placeholderTextColor="#A0AEC0"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Rate *</Text>
                    <TextInput
                      style={styles.input}
                      value={item.rate}
                      onChangeText={(text) => updateLineItem(index, 'rate', text)}
                      placeholder="0"
                      placeholderTextColor="#A0AEC0"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.amountDisplay}>
                  <Text style={styles.amountLabel}>Amount:</Text>
                  <Text style={styles.amountValue}>₹{item.amount.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Tax and Total */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax & Total</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax Percentage (%)</Text>
              <TextInput
                style={styles.input}
                value={taxPercentage}
                onChangeText={setTaxPercentage}
                placeholder="18"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({taxPercentage}%):</Text>
                <Text style={styles.totalValue}>₹{tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>Total Amount:</Text>
                <Text style={styles.grandTotalValue}>₹{total.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
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

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating...' : 'Create Invoice'}
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
    backgroundColor: '#F7FAFC',
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A202C',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  lineItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  amountDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#718096',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});