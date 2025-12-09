import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { expensesAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function AddExpenseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('materials');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setReceiptImage(base64Image);
    }
  };

  const handleAdd = async () => {
    if (!projectId) {
      Alert.alert('Error', 'Please select a project');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);
    try {
      await expensesAPI.create({
        project_id: projectId,
        category,
        amount: parseFloat(amount),
        description: description.trim(),
        expense_date: expenseDate.toISOString(),
        vendor_name: vendorName.trim() || null,
        receipt_image: receiptImage,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      });

      Alert.alert('Success', 'Expense added successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add expense');
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Project *</Text>
            <ModalSelector
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
              selectedValue={projectId}
              onValueChange={setProjectId}
              placeholder="Select Project"
            />

            <Text style={styles.label}>Category *</Text>
            <ModalSelector
              options={[
                { label: 'Labor', value: 'labor' },
                { label: 'Materials', value: 'materials' },
                { label: 'Equipment', value: 'equipment' },
                { label: 'Subcontractors', value: 'subcontractors' },
                { label: 'Permits', value: 'permits' },
                { label: 'Overhead', value: 'overhead' },
                { label: 'Other', value: 'other' },
              ]}
              selectedValue={category}
              onValueChange={setCategory}
              placeholder="Select Category"
            />

            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What was this expense for?"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Vendor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vendor name"
              value={vendorName}
              onChangeText={setVendorName}
            />

            <Text style={styles.label}>Expense Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="Colors.textSecondary" />
              <Text style={styles.dateText}>{expenseDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={expenseDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setExpenseDate(selectedDate);
                }}
              />
            )}

            <Text style={styles.label}>Payment Method</Text>
            <ModalSelector
              options={[
                { label: 'Cash', value: 'cash' },
                { label: 'Check', value: 'check' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Credit Card', value: 'credit_card' },
                { label: 'Online', value: 'online' },
              ]}
              selectedValue={paymentMethod}
              onValueChange={setPaymentMethod}
              placeholder="Select Payment Method"
            />

            <Text style={styles.label}>Reference Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Check number, transaction ID, etc."
              value={referenceNumber}
              onChangeText={setReferenceNumber}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Receipt</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="camera" size={32} color="#F59E0B" />
              <Text style={styles.imageButtonText}>
                {receiptImage ? 'Change Receipt' : 'Upload Receipt'}
              </Text>
            </TouchableOpacity>

            {receiptImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: receiptImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setReceiptImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAdd}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <Text style={styles.addButtonText}>Add Expense</Text>
            )}
          </TouchableOpacity>
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
  keyboardView: {
    flex: 1,
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
  },
  section: {
    padding: 16,
    backgroundColor: 'Colors.surface,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: 'Colors.textPrimary,
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  dateText: {
    fontSize: 16,
    color: 'Colors.textPrimary,
    marginLeft: 8,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#FDE68A',
    borderStyle: 'dashed',
    gap: 12,
  },
  imageButtonText: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: 12,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
  },
  addButton: {
    backgroundColor: '#F59E0B',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.surface,
  },
});