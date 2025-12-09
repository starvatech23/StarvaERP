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
import { materialRequirementsAPI, materialsAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function CreateMaterialRequirementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Form state
  const [projectId, setProjectId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materialsRes, projectsRes] = await Promise.all([
        materialsAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setMaterials(materialsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getSelectedMaterial = () => {
    return materials.find(m => m.id === materialId);
  };

  const handleSubmit = async () => {
    // Validation
    if (!projectId || !materialId || !requiredQuantity || !requiredByDate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const qty = parseFloat(requiredQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const material = getSelectedMaterial();
      
      await materialRequirementsAPI.create({
        project_id: projectId,
        material_id: materialId,
        material_name: material?.name,
        required_quantity: qty,
        unit: material?.unit,
        required_by_date: requiredByDate,
        priority,
        fulfillment_status: 'pending',
        fulfilled_quantity: 0,
        notes: notes || undefined,
      });
      
      Alert.alert('Success', 'Material requirement created successfully');
      router.back();
    } catch (error: any) {
      console.error('Error creating requirement:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create requirement');
    } finally {
      setLoading(false);
    }
  };

  const selectedMaterial = getSelectedMaterial();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Requirement</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {/* Basic Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirement Details</Text>
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
              <Text style={styles.label}>Material *</Text>
              <ModalSelector
                options={materials.map(m => ({ label: `${m.name} (${m.category})`, value: m.id }))}
                selectedValue={materialId}
                onValueChange={setMaterialId}
                placeholder="Select Material"
              />
            </View>

            {/* Material Info Card */}
            {selectedMaterial && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="cube-outline" size={20} color="#F59E0B" />
                  <Text style={styles.infoText}>{selectedMaterial.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="pricetag-outline" size={20} color="Colors.textSecondary" />
                  <Text style={styles.infoText}>Category: {selectedMaterial.category}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="resize-outline" size={20} color="Colors.textSecondary" />
                  <Text style={styles.infoText}>Unit: {selectedMaterial.unit}</Text>
                </View>
                {selectedMaterial.minimum_stock && (
                  <View style={styles.infoRow}>
                    <Ionicons name="warning-outline" size={20} color="#EF4444" />
                    <Text style={styles.infoText}>Min Stock: {selectedMaterial.minimum_stock}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Quantity & Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity & Timeline</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Required Quantity *</Text>
              <View style={styles.quantityInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={requiredQuantity}
                  onChangeText={setRequiredQuantity}
                  placeholder="0"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="numeric"
                />
                {selectedMaterial && (
                  <Text style={styles.unitText}>{selectedMaterial.unit}</Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Required By Date *</Text>
              <TextInput
                style={styles.input}
                value={requiredByDate}
                onChangeText={setRequiredByDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority *</Text>
              <View style={styles.priorityButtons}>
                {['low', 'medium', 'high', 'urgent'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.priorityButton,
                      priority === level && styles.priorityButtonActive,
                      { backgroundColor: getPriorityColor(level, priority === level) },
                    ]}
                    onPress={() => setPriority(level)}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        priority === level && styles.priorityButtonTextActive,
                      ]}
                    >
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about usage, specifications, or special requirements..."
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
            <Ionicons name="checkmark-circle-outline" size={20} color="Colors.surface" />
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating...' : 'Create Requirement'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getPriorityColor = (level: string, isActive: boolean) => {
  const colors: any = {
    low: isActive ? '#10B981' : '#D1FAE5',
    medium: isActive ? '#F59E0B' : '#FEF3C7',
    high: isActive ? '#EF4444' : '#FEE2E2',
    urgent: isActive ? '#DC2626' : '#FEE2E2',
  };
  return colors[level] || '#E5E7EB';
};

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
  quantityInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'Colors.surface,
    borderWidth: 1,
    borderColor: 'Colors.border,
    borderRadius: 8,
    paddingRight: 12,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textSecondary,
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#78350F',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  priorityButtonActive: {
    borderWidth: 2,
    borderColor: 'Colors.textPrimary,
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  priorityButtonTextActive: {
    color: 'Colors.surface,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
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
