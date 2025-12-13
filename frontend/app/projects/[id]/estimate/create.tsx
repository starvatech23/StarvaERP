import React, { useState } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import Colors from '../../../../constants/Colors';
import { estimationAPI, constructionPresetsAPI } from '../../../../services/api';

interface ConstructionPreset {
  id: string;
  name: string;
  description?: string;
  region: string;
  rate_per_sqft: number;
  status: string;
  spec_groups_count: number;
  spec_items_count: number;
}

export default function CreateEstimateScreen() {
  const router = useRouter();
  const { id: projectId } = useLocalSearchParams();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [constructionPresets, setConstructionPresets] = useState<ConstructionPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  
  // Form data
  const [formData, setFormData] = useState({
    construction_preset_id: '',
    built_up_area_sqft: '',
    package_type: 'standard',
    num_floors: '1',
    floor_to_floor_height: '10',
    foundation_depth: '4',
    contingency_percent: '10',
    labour_percent_of_material: '40',
  });

  React.useEffect(() => {
    loadConstructionPresets();
  }, []);

  const loadConstructionPresets = async () => {
    try {
      const response = await constructionPresetsAPI.list({ status: 'active' });
      const presetList = response.data || [];
      setConstructionPresets(presetList);
      
      // Auto-select first preset if available
      if (presetList.length > 0) {
        updateField('construction_preset_id', presetList[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load construction presets:', error);
      // Fallback: try to load anyway without status filter
      try {
        const response = await constructionPresetsAPI.list();
        const presetList = response.data || [];
        setConstructionPresets(presetList);
        if (presetList.length > 0) {
          updateField('construction_preset_id', presetList[0].id);
        }
      } catch (err) {
        console.error('Failed to load presets:', err);
      }
    } finally {
      setLoadingPresets(false);
    }
  };

  const getSelectedPreset = () => {
    return constructionPresets.find(p => p.id === formData.construction_preset_id);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.construction_preset_id) {
        Alert.alert('Required', 'Please select a Construction Preset');
        return;
      }
      if (!formData.built_up_area_sqft || parseFloat(formData.built_up_area_sqft) <= 0) {
        Alert.alert('Required', 'Please enter built-up area');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      router.replace(`/projects/${projectId}`);
    } else {
      setStep(step - 1);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      console.log('Creating estimate with project ID:', projectId);
      console.log('Selected construction preset ID:', formData.construction_preset_id);
      
      const selectedPreset = getSelectedPreset();
      
      const estimateData = {
        project_id: projectId as string,
        construction_preset_id: formData.construction_preset_id,
        built_up_area_sqft: parseFloat(formData.built_up_area_sqft),
        package_type: formData.package_type,
        num_floors: parseInt(formData.num_floors),
        floor_to_floor_height: parseFloat(formData.floor_to_floor_height),
        foundation_depth: parseFloat(formData.foundation_depth),
        contingency_percent: parseFloat(formData.contingency_percent),
        labour_percent_of_material: parseFloat(formData.labour_percent_of_material),
        // Pass preset rate if available
        base_rate_per_sqft: selectedPreset?.rate_per_sqft || 2500,
      };

      console.log('Estimate data:', estimateData);
      
      const response = await estimationAPI.create(estimateData);
      
      console.log('Estimate created successfully:', response.data);
      console.log('Estimate ID:', response.data.id);
      console.log('Grand Total:', response.data.grand_total);
      
      const estimateId = response.data.id;
      const grandTotal = response.data.grand_total;
      const costPerSqft = response.data.cost_per_sqft;
      
      // Navigate immediately to the estimate detail page
      router.push(`/projects/${projectId}/estimate/${estimateId}`);
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          'Success!',
          `Estimate created successfully!\nTotal Cost: ₹${grandTotal.toLocaleString('en-IN')}\nCost per sqft: ₹${Math.round(costPerSqft)}`
        );
      }, 500);
    } catch (error: any) {
      console.error('Error creating estimate:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create estimate';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quick Estimate</Text>
          <Text style={styles.headerSubtitle}>Step {step} of 3</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
              s === step && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Step 1: Project Basics */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Project Basics</Text>
            <Text style={styles.stepDescription}>
              Enter basic project dimensions to generate estimate
            </Text>

            {/* Construction Preset Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Construction Preset <Text style={styles.required}>*</Text>
              </Text>
              {loadingPresets ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : constructionPresets.length > 0 ? (
                <>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.construction_preset_id}
                      onValueChange={(value) => updateField('construction_preset_id', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="-- Select Preset --" value="" />
                      {constructionPresets.map((preset) => (
                        <Picker.Item 
                          key={preset.id} 
                          label={`${preset.name} (${preset.region})`}
                          value={preset.id} 
                        />
                      ))}
                    </Picker>
                  </View>
                  {formData.construction_preset_id && (
                    <View style={styles.presetInfo}>
                      <View style={styles.presetInfoHeader}>
                        <Ionicons name="construct" size={18} color={Colors.primary} />
                        <Text style={styles.presetInfoTitle}>Selected Preset Details</Text>
                      </View>
                      <View style={styles.presetDetailsGrid}>
                        <View style={styles.presetDetailItem}>
                          <Text style={styles.presetDetailLabel}>Region</Text>
                          <Text style={styles.presetDetailValue}>{getSelectedPreset()?.region}</Text>
                        </View>
                        <View style={styles.presetDetailItem}>
                          <Text style={styles.presetDetailLabel}>Base Rate</Text>
                          <Text style={[styles.presetDetailValue, { color: Colors.success }]}>
                            ₹{getSelectedPreset()?.rate_per_sqft?.toLocaleString('en-IN')}/sqft
                          </Text>
                        </View>
                        <View style={styles.presetDetailItem}>
                          <Text style={styles.presetDetailLabel}>Spec Groups</Text>
                          <Text style={styles.presetDetailValue}>{getSelectedPreset()?.spec_groups_count || 0}</Text>
                        </View>
                        <View style={styles.presetDetailItem}>
                          <Text style={styles.presetDetailLabel}>Spec Items</Text>
                          <Text style={styles.presetDetailValue}>{getSelectedPreset()?.spec_items_count || 0}</Text>
                        </View>
                      </View>
                      {getSelectedPreset()?.description && (
                        <Text style={styles.presetDescription}>{getSelectedPreset()?.description}</Text>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                  <Text style={styles.warningText}>
                    No construction presets available. Please create one in Admin → Construction Presets
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Built-up Area (sqft) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2000"
                keyboardType="numeric"
                value={formData.built_up_area_sqft}
                onChangeText={(value) => updateField('built_up_area_sqft', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Floors</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2"
                keyboardType="numeric"
                value={formData.num_floors}
                onChangeText={(value) => updateField('num_floors', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Floor to Floor Height (feet)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                keyboardType="numeric"
                value={formData.floor_to_floor_height}
                onChangeText={(value) => updateField('floor_to_floor_height', value)}
              />
            </View>
          </View>
        )}

        {/* Step 2: Package Selection */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Construction Package</Text>
            <Text style={styles.stepDescription}>
              Select the quality and specifications level
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Package Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.package_type}
                  onValueChange={(value) => updateField('package_type', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Standard - Basic finishes" value="standard" />
                  <Picker.Item label="Premium - High-quality finishes" value="premium" />
                  <Picker.Item label="Custom - Customized specifications" value="custom" />
                </Picker>
              </View>
            </View>

            <View style={styles.packageInfo}>
              {formData.package_type === 'standard' && (
                <>
                  <Ionicons name="information-circle" size={20} color={Colors.info} />
                  <Text style={styles.packageText}>
                    Standard package includes basic cement blocks, standard tiles, regular fittings
                  </Text>
                </>
              )}
              {formData.package_type === 'premium' && (
                <>
                  <Ionicons name="star" size={20} color={Colors.secondary} />
                  <Text style={styles.packageText}>
                    Premium package includes premium blocks, vitrified tiles, branded fittings
                  </Text>
                </>
              )}
              {formData.package_type === 'custom' && (
                <>
                  <Ionicons name="construct" size={20} color={Colors.primary} />
                  <Text style={styles.packageText}>
                    Custom package allows you to specify materials and finishes
                  </Text>
                </>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Foundation Depth (feet)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 4"
                keyboardType="numeric"
                value={formData.foundation_depth}
                onChangeText={(value) => updateField('foundation_depth', value)}
              />
              <Text style={styles.hint}>Typical: 3-5 feet depending on soil type</Text>
            </View>
          </View>
        )}

        {/* Step 3: Review & Adjustments */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review & Adjustments</Text>
            <Text style={styles.stepDescription}>
              Fine-tune cost assumptions before generating estimate
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Built-up Area:</Text>
                <Text style={styles.summaryValue}>{formData.built_up_area_sqft} sqft</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Floors:</Text>
                <Text style={styles.summaryValue}>{formData.num_floors}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Package:</Text>
                <Text style={styles.summaryValue}>{formData.package_type.toUpperCase()}</Text>
              </View>
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

            <View style={styles.infoBox}>
              <Ionicons name="calculator" size={24} color={Colors.primary} />
              <Text style={styles.infoText}>
                The system will auto-calculate foundation, superstructure, masonry, finishes, and services based on your inputs.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.nextButton, loading && styles.buttonDisabled]} 
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.nextButtonText}>Generate Estimate</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  progressDot: {
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primaryLight,
  },
  progressDotCurrent: {
    backgroundColor: Colors.primary,
    width: 48,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  presetInfo: {
    backgroundColor: Colors.primaryPale,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  presetInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  presetInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  presetDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  presetDetailItem: {
    width: '50%',
    marginBottom: 10,
  },
  presetDetailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  presetDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  presetDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    lineHeight: 18,
  },
  costRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  costText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.warning,
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.infoLight,
    borderRadius: 8,
    marginBottom: 20,
  },
  packageText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.primaryPale,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
