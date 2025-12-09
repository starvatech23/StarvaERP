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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { purchaseOrdersAPI, vendorsAPI, materialsAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function CreatePurchaseOrderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Form state
  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([
    { material_id: '', material_name: '', quantity: '', unit: '', rate: '', amount: 0 }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vendorsRes, materialsRes, projectsRes] = await Promise.all([
        vendorsAPI.getAll(),
        materialsAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setVendors(vendorsRes.data || []);
      setMaterials(materialsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { material_id: '', material_name: '', quantity: '', unit: '', rate: '', amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
    }
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index][field] = value;
    
    // Auto-populate material details when material is selected
    if (field === 'material_id') {
      const material = materials.find(m => m.id === value);
      if (material) {
        updated[index].material_name = material.name;
        updated[index].unit = material.unit;
      }
    }
    
    // Calculate amount for this item
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const rate = parseFloat(updated[index].rate) || 0;
      updated[index].amount = qty * rate;
    }
    
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!projectId || !vendorId || !orderDate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (items.some(item => !item.material_id || !item.quantity || !item.rate)) {
      Alert.alert('Error', 'Please fill all item details');
      return;
    }

    setLoading(true);
    try {
      const total = calculateTotal();
      
      await purchaseOrdersAPI.create({
        project_id: projectId,
        vendor_id: vendorId,
        order_date: orderDate,
        expected_delivery_date: deliveryDate || undefined,
        items: items.map(item => ({
          material_id: item.material_id,
          material_name: item.material_name,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          rate: parseFloat(item.rate),
          amount: item.amount,
        })),
        total_amount: total,
        status: 'draft',
        notes,
      });
      
      Alert.alert('Success', 'Purchase order created successfully');
      router.back();
    } catch (error: any) {
      console.error('Error creating PO:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Purchase Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {/* Basic Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Project *</Text>
              <ModalSelector
                options={projects.map(p => ({ label: p.name, value: p.id }))}
                selectedValue={projectId}
                onValueChange={setProjectId}
                placeholder="Select Project"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vendor *</Text>
              <ModalSelector
                options={vendors.map(v => ({ label: v.business_name || v.contact_name, value: v.id }))}
                selectedValue={vendorId}
                onValueChange={setVendorId}
                placeholder="Select Vendor"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Order Date *</Text>
              <TextInput
                style={styles.input}
                value={orderDate}
                onChangeText={setOrderDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Delivery Date</Text>
              <TextInput
                style={styles.input}
                value={deliveryDate}
                onChangeText={setDeliveryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
              />
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                <Ionicons name="add-circle" size={24} color="#8B5CF6" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Material *</Text>
                  <ModalSelector
                    options={materials.map(m => ({ label: `${m.name} (${m.unit})`, value: m.id }))}
                    selectedValue={item.material_id}
                    onValueChange={(value) => updateItem(index, 'material_id', value)}
                    placeholder="Select Material"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Quantity *</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity}
                      onChangeText={(text) => updateItem(index, 'quantity', text)}
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
                      onChangeText={(text) => updateItem(index, 'rate', text)}
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

          {/* Total */}
          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
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
              {loading ? 'Creating...' : 'Create Purchase Order'}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
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
    color: '#8B5CF6',
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
  row: {
    flexDirection: 'row',
  },
  itemCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  amountDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  totalCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
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
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
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
