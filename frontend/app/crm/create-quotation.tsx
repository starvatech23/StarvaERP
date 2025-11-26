import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { quotationsAPI, leadsAPI } from '../../services/api';

interface QuotationItem {
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  subtotal: number;
  tax_amount: number;
  total: number;
}

export default function CreateQuotationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const [formData, setFormData] = useState({
    lead_id: params.lead_id as string || '',
    project_type: '',
    valid_until: '',
    terms: '',
  });

  const [items, setItems] = useState<QuotationItem[]>([
    {
      description: '',
      quantity: '1',
      unit_price: '0',
      tax_rate: '0',
      subtotal: 0,
      tax_amount: 0,
      total: 0,
    },
  ]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const response = await leadsAPI.getAll();
      setLeads(response.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const calculateItemTotals = (item: QuotationItem) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;

    const subtotal = quantity * unitPrice;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    const { subtotal, taxAmount, total } = calculateItemTotals(newItems[index]);
    newItems[index].subtotal = subtotal;
    newItems[index].tax_amount = taxAmount;
    newItems[index].total = total;
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: '1',
        unit_price: '0',
        tax_rate: '0',
        subtotal: 0,
        tax_amount: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      Alert.alert('Error', 'At least one item is required');
    }
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    if (!formData.lead_id) {
      Alert.alert('Error', 'Please select a lead');
      return;
    }

    if (!formData.project_type.trim()) {
      Alert.alert('Error', 'Please enter project type');
      return;
    }

    if (!formData.valid_until) {
      Alert.alert('Error', 'Please enter valid until date');
      return;
    }

    const hasEmptyItems = items.some(item => !item.description.trim());
    if (hasEmptyItems) {
      Alert.alert('Error', 'All items must have a description');
      return;
    }

    setLoading(true);
    try {
      const quotationData = {
        ...formData,
        items: items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
          subtotal: item.subtotal,
          tax_amount: item.tax_amount,
          total: item.total,
        })),
        total_amount: getTotalAmount(),
        valid_until: new Date(formData.valid_until).toISOString(),
      };

      await quotationsAPI.create(quotationData);
      
      Alert.alert('Success', 'Quotation created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Quotation</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quotation Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Lead *</Text>
              {loadingLeads ? (
                <ActivityIndicator color="#FF6B35" />
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.lead_id}
                    onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a lead" value="" />
                    {leads.map((lead) => (
                      <Picker.Item
                        key={lead.id}
                        label={lead.client_name}
                        value={lead.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Project Type *</Text>
              <TextInput
                style={styles.input}
                value={formData.project_type}
                onChangeText={(text) => setFormData({ ...formData, project_type: text })}
                placeholder="e.g., Residential Construction"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valid Until * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={formData.valid_until}
                onChangeText={(text) => setFormData({ ...formData, valid_until: text })}
                placeholder="2024-12-31"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Terms & Conditions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.terms}
                onChangeText={(text) => setFormData({ ...formData, terms: text })}
                placeholder="Enter terms and conditions"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <TouchableOpacity onPress={addItem} style={styles.addButton}>
                <Ionicons name="add-circle" size={24} color="#FF6B35" />
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={styles.input}
                    value={item.description}
                    onChangeText={(text) => updateItem(index, 'description', text)}
                    placeholder="Item description"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity}
                      onChangeText={(text) => updateItem(index, 'quantity', text)}
                      placeholder="1"
                      placeholderTextColor="#A0AEC0"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.flex1}>
                    <Text style={styles.label}>Unit Price</Text>
                    <TextInput
                      style={styles.input}
                      value={item.unit_price}
                      onChangeText={(text) => updateItem(index, 'unit_price', text)}
                      placeholder="0"
                      placeholderTextColor="#A0AEC0"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.flex1}>
                    <Text style={styles.label}>Tax %</Text>
                    <TextInput
                      style={styles.input}
                      value={item.tax_rate}
                      onChangeText={(text) => updateItem(index, 'tax_rate', text)}
                      placeholder="0"
                      placeholderTextColor="#A0AEC0"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.totalsCard}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>₹{item.subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax:</Text>
                    <Text style={styles.totalValue}>₹{item.tax_amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabelBold}>Total:</Text>
                    <Text style={styles.totalValueBold}>₹{item.total.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Grand Total */}
          <View style={styles.grandTotalCard}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{getTotalAmount().toFixed(2)}</Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Quotation</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  addButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A202C',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  itemCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  totalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#718096',
  },
  totalValue: {
    fontSize: 14,
    color: '#1A202C',
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  totalValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  grandTotalCard: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
