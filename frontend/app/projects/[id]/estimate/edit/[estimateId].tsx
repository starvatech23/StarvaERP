import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../../../constants/Colors';
import { estimationAPI } from '../../../../../services/api';

export default function EditEstimateScreen() {
  const router = useRouter();
  const { id: projectId, estimateId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    version_name: '',
    contingency_percent: '',
    labour_percent_of_material: '',
    notes: '',
  });

  useEffect(() => {
    loadEstimate();
  }, [estimateId]);

  const loadEstimate = async () => {
    try {
      const response = await estimationAPI.getById(estimateId as string);
      setEstimate(response.data);
      
      // Pre-fill form data
      setFormData({
        version_name: response.data.version_name || `Version ${response.data.version}`,
        contingency_percent: response.data.contingency_percent?.toString() || '10',
        labour_percent_of_material: response.data.labour_percent_of_material?.toString() || '40',
        notes: response.data.notes || '',
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load estimate');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        version_name: formData.version_name,
        contingency_percent: parseFloat(formData.contingency_percent),
        labour_percent_of_material: parseFloat(formData.labour_percent_of_material),
      };
      
      if (formData.notes) {
        updateData.notes = formData.notes;
      }

      await estimationAPI.update(estimateId as string, updateData);
      
      Alert.alert('Success', 'Estimate updated successfully', [
        {
          text: 'OK',
          onPress: () => router.replace(`/projects/${projectId}`),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update estimate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Estimate</Text>
          <Text style={styles.headerSubtitle}>Update estimate parameters</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Info */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Current Total:</Text>
            <Text style={styles.summaryValue}>₹{estimate?.grand_total.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cost per sqft:</Text>
            <Text style={styles.summaryValue}>₹{Math.round(estimate?.cost_per_sqft)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Built-up Area:</Text>
            <Text style={styles.summaryValue}>{estimate?.built_up_area_sqft} sqft</Text>
          </View>
        </View>

        {/* Editable Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Version Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Final Estimate"
              value={formData.version_name}
              onChangeText={(value) => updateField('version_name', value)}
            />
            <Text style={styles.hint}>Give this estimate a descriptive name</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contingency (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10"
              keyboardType="numeric"
              value={formData.contingency_percent}
              onChangeText={(value) => updateField('contingency_percent', value)}
            />
            <Text style={styles.hint}>Buffer for unexpected costs (typically 5-15%)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Labour % of Material Cost</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 40"
              keyboardType="numeric"
              value={formData.labour_percent_of_material}
              onChangeText={(value) => updateField('labour_percent_of_material', value)}
            />
            <Text style={styles.hint}>Labour cost as percentage of material (typically 30-50%)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes or comments about this estimate"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color={Colors.secondary} />
            <Text style={styles.infoText}>
              Changing contingency or labour percentages will recalculate the total estimate cost.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.primaryPale,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  formSection: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.secondaryPale,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    padding: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
