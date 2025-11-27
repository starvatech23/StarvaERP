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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { siteInventoryAPI, projectsAPI, materialsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';

export default function AddInventoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    project_id: '',
    material_id: '',
    current_stock: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, materialsRes] = await Promise.all([
        projectsAPI.getAll(),
        materialsAPI.getAll(),
      ]);
      setProjects(projectsRes.data || []);
      setMaterials(materialsRes.data || []);
      if (projectsRes.data?.length > 0) {
        setFormData((prev) => ({ ...prev, project_id: projectsRes.data[0].id }));
      }
      if (materialsRes.data?.length > 0) {
        setFormData((prev) => ({ ...prev, material_id: materialsRes.data[0].id }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.project_id || !formData.material_id) {
      Alert.alert('Error', 'Please select site and material');
      return;
    }

    if (!formData.current_stock.trim()) {
      Alert.alert('Error', 'Please enter stock quantity');
      return;
    }

    setSubmitting(true);
    try {
      await siteInventoryAPI.create({
        project_id: formData.project_id,
        material_id: formData.material_id,
        current_stock: parseFloat(formData.current_stock),
        last_updated: moment().toISOString(),
      });
      Alert.alert('Success', 'Inventory added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error adding inventory:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add inventory');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const selectedMaterial = materials.find((m) => m.id === formData.material_id);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Site Inventory</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Site *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  style={styles.picker}
                >
                  {projects.map((project) => (
                    <Picker.Item key={project.id} label={project.name} value={project.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Material *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                  style={styles.picker}
                >
                  {materials.map((material) => (
                    <Picker.Item
                      key={material.id}
                      label={`${material.name} (${material.unit})`}
                      value={material.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {selectedMaterial && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Category:</Text>
                  <Text style={styles.infoValue}>
                    {selectedMaterial.category.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Unit:</Text>
                  <Text style={styles.infoValue}>{selectedMaterial.unit}</Text>
                </View>
                {selectedMaterial.minimum_stock > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Min Stock:</Text>
                    <Text style={styles.infoValue}>
                      {selectedMaterial.minimum_stock} {selectedMaterial.unit}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Current Stock Quantity * {selectedMaterial ? `(${selectedMaterial.unit})` : ''}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.current_stock}
                onChangeText={(text) => setFormData({ ...formData, current_stock: text })}
                placeholder="Enter quantity"
                keyboardType="numeric"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.noteText}>
                This will set the current stock level for this material at the selected site.
                You can update it later as materials are consumed or received.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Adding...' : 'Add Inventory'}
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
    backgroundColor: '#F7FAFC',
  },
  loader: {
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
    color: '#1A202C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A202C',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#1A202C',
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
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
    color: '#FFFFFF',
  },
});
