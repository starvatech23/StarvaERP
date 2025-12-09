import React, { useState } from 'react';
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
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { materialsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';

const CATEGORIES = [
  { label: 'Cement', value: 'cement' },
  { label: 'Steel', value: 'steel' },
  { label: 'Sand', value: 'sand' },
  { label: 'Aggregate', value: 'aggregate' },
  { label: 'Bricks', value: 'bricks' },
  { label: 'Blocks', value: 'blocks' },
  { label: 'Tiles', value: 'tiles' },
  { label: 'Paint', value: 'paint' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Hardware', value: 'hardware' },
  { label: 'Wood', value: 'wood' },
  { label: 'Glass', value: 'glass' },
  { label: 'Miscellaneous', value: 'miscellaneous' },
];

export default function AddMaterialScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'cement',
    unit: 'kg',
    description: '',
    minimum_stock: '0',
    hsn_code: '',
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter material name');
      return;
    }

    setLoading(true);
    try {
      await materialsAPI.create({
        ...formData,
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        is_active: true,
      });
      Alert.alert('Success', 'Material added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error adding material:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Material</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Material Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., Portland Cement"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  style={styles.picker}
                >
                  {CATEGORIES.map((cat) => (
                    <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Unit of Measurement *</Text>
              <TextInput
                style={styles.input}
                value={formData.unit}
                onChangeText={(text) => setFormData({ ...formData, unit: text })}
                placeholder="e.g., kg, ton, bag, piece"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Minimum Stock Level</Text>
              <TextInput
                style={styles.input}
                value={formData.minimum_stock}
                onChangeText={(text) => setFormData({ ...formData, minimum_stock: text })}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>HSN Code (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.hsn_code}
                onChangeText={(text) => setFormData({ ...formData, hsn_code: text })}
                placeholder="e.g., 25232990"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter material description"
                placeholderTextColor="#CBD5E0"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding...' : 'Add Material'}
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'Colors.surface,
    borderWidth: 1,
    borderColor: 'Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'Colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  pickerContainer: {
    backgroundColor: 'Colors.surface,
    borderWidth: 1,
    borderColor: 'Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: 'Colors.textPrimary,
  },
  footer: {
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
  },
  submitButton: {
    backgroundColor: 'Colors.secondary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.surface,
  },
});
