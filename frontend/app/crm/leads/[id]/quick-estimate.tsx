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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../../constants/Colors';
import { estimationAPI, constructionPresetsAPI, crmLeadsAPI } from '../../../../services/api';

interface ConstructionPreset {
  id: string;
  name: string;
  region: string;
  rate_per_sqft: number;
  description?: string;
  spec_groups_count?: number;
  spec_items_count?: number;
}

export default function LeadQuickEstimateScreen() {
  const router = useRouter();
  const { id: leadId } = useLocalSearchParams();
  
  const [lead, setLead] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(true);
  const [constructionPresets, setConstructionPresets] = useState<ConstructionPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [estimateResult, setEstimateResult] = useState<any>(null);
  
  // Modal pickers state
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPackagePicker, setShowPackagePicker] = useState(false);
  
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

  const packageOptions = [
    { value: 'standard', label: 'Standard', description: 'Basic cement blocks, standard tiles, regular fittings' },
    { value: 'premium', label: 'Premium', description: 'Premium blocks, vitrified tiles, branded fittings' },
    { value: 'custom', label: 'Custom', description: 'Customized specifications' },
  ];

  useEffect(() => {
    loadLead();
    loadConstructionPresets();
  }, []);

  const loadLead = async () => {
    try {
      const response = await crmLeadsAPI.getById(String(leadId));
      setLead(response.data);
    } catch (error) {
      console.error('Error loading lead:', error);
    } finally {
      setLoadingLead(false);
    }
  };

  const loadConstructionPresets = async () => {
    try {
      const response = await constructionPresetsAPI.list({ status: 'active' });
      setConstructionPresets(response.data || []);
      if (response.data?.length > 0) {
        setFormData(prev => ({ ...prev, construction_preset_id: response.data[0].id }));
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoadingPresets(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getSelectedPreset = () => {
    return constructionPresets.find(p => p.id === formData.construction_preset_id);
  };

  const handleGenerateEstimate = async () => {
    if (!formData.construction_preset_id) {
      Alert.alert('Error', 'Please select a construction preset');
      return;
    }
    if (!formData.built_up_area_sqft || parseInt(formData.built_up_area_sqft) <= 0) {
      Alert.alert('Error', 'Please enter a valid built-up area');
      return;
    }

    setLoading(true);
    try {
      const preset = getSelectedPreset();
      const estimateData = {
        lead_id: leadId,
        construction_preset_id: formData.construction_preset_id,
        built_up_area_sqft: parseInt(formData.built_up_area_sqft),
        package_type: formData.package_type,
        num_floors: parseInt(formData.num_floors),
        floor_to_floor_height: parseFloat(formData.floor_to_floor_height),
        foundation_depth: parseFloat(formData.foundation_depth),
        contingency_percent: parseFloat(formData.contingency_percent),
        labour_percent_of_material: parseFloat(formData.labour_percent_of_material),
        base_rate_per_sqft: preset?.rate_per_sqft || 2000,
      };

      const response = await estimationAPI.create(estimateData);
      setEstimateResult(response.data);
      setStep(4); // Show results
    } catch (error: any) {
      console.error('Error creating estimate:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate estimate');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loadingLead) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Quick Estimate</Text>
          <Text style={styles.headerSubtitle}>{lead?.name || 'Lead'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      {step < 4 && (
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
              </View>
              <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
                {s === 1 ? 'Preset' : s === 2 ? 'Package' : 'Details'}
              </Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Preset Selection */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Construction Preset</Text>
            <Text style={styles.stepDescription}>
              Choose a preset that matches the project location and requirements
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Construction Preset <Text style={styles.required}>*</Text></Text>
              {loadingPresets ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : constructionPresets.length > 0 ? (
                <TouchableOpacity 
                  style={styles.selectorButton}
                  onPress={() => setShowPresetPicker(true)}
                >
                  <Ionicons name="construct" size={20} color={Colors.primary} />
                  <Text style={styles.selectorButtonText}>
                    {formData.construction_preset_id 
                      ? constructionPresets.find(p => p.id === formData.construction_preset_id)?.name 
                      : 'Select Construction Preset'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                  <Text style={styles.warningText}>No active presets available</Text>
                </View>
              )}
            </View>

            {formData.construction_preset_id && getSelectedPreset() && (
              <View style={styles.presetInfo}>
                <View style={styles.presetInfoHeader}>
                  <Ionicons name="construct" size={18} color={Colors.primary} />
                  <Text style={styles.presetInfoTitle}>Preset Details</Text>
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
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Built-up Area (sqft) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1500"
                keyboardType="numeric"
                value={formData.built_up_area_sqft}
                onChangeText={(value) => updateField('built_up_area_sqft', value)}
              />
            </View>
          </View>
        )}

        {/* Step 2: Package Selection */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Construction Package</Text>
            <Text style={styles.stepDescription}>Select the quality level</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Package Type</Text>
              <TouchableOpacity 
                style={styles.selectorButton}
                onPress={() => setShowPackagePicker(true)}
              >
                <Ionicons 
                  name={formData.package_type === 'premium' ? 'star' : 'apps'} 
                  size={20} 
                  color={Colors.primary} 
                />
                <Text style={styles.selectorButtonText}>
                  {packageOptions.find(p => p.value === formData.package_type)?.label || 'Select Package'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
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
          </View>
        )}

        {/* Step 3: Additional Details */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Additional Details</Text>
            <Text style={styles.stepDescription}>Fine-tune the estimate parameters</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Floor-to-Floor Height (feet)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                keyboardType="numeric"
                value={formData.floor_to_floor_height}
                onChangeText={(value) => updateField('floor_to_floor_height', value)}
              />
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
            </View>
          </View>
        )}

        {/* Step 4: Results */}
        {step === 4 && estimateResult && (
          <View style={styles.stepContainer}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                <Text style={styles.resultTitle}>Estimate Generated!</Text>
              </View>
              
              <View style={styles.resultTotal}>
                <Text style={styles.resultTotalLabel}>Total Estimated Cost</Text>
                <Text style={styles.resultTotalValue}>
                  {formatCurrency(estimateResult.grand_total)}
                </Text>
                <Text style={styles.resultCostPerSqft}>
                  ₹{Math.round(estimateResult.cost_per_sqft).toLocaleString('en-IN')}/sqft
                </Text>
              </View>

              <View style={styles.resultBreakdown}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Material Cost</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(estimateResult.total_material_cost)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Labour Cost</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(estimateResult.total_labour_cost)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Services</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(estimateResult.total_services_cost)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Contingency</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(estimateResult.contingency_cost)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => router.push(`/projects/0/estimate/${estimateResult.id}`)}
            >
              <Text style={styles.viewDetailsText}>View Full Estimate Details</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.goBackButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
              <Text style={styles.goBackText}>Back to Lead</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      {step < 4 && (
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          
          {step < 3 ? (
            <TouchableOpacity 
              style={[styles.nextButton, step === 1 && { flex: 1 }]} 
              onPress={() => {
                if (step === 1 && (!formData.construction_preset_id || !formData.built_up_area_sqft)) {
                  Alert.alert('Required', 'Please select a preset and enter built-up area');
                  return;
                }
                setStep(step + 1);
              }}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, styles.generateButton]}
              onPress={handleGenerateEstimate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="calculator" size={20} color={Colors.white} />
                  <Text style={styles.nextButtonText}>Generate Estimate</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Preset Picker Modal */}
      <Modal
        visible={showPresetPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPresetPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowPresetPicker(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Construction Preset</Text>
              <TouchableOpacity onPress={() => setShowPresetPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {constructionPresets.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No active presets available</Text>
              </View>
            ) : (
              <FlatList
                data={constructionPresets}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalOption, formData.construction_preset_id === item.id && styles.modalOptionSelected]}
                    onPress={() => {
                      updateField('construction_preset_id', item.id);
                      setShowPresetPicker(false);
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      <Text style={styles.modalOptionTitle}>{item.name}</Text>
                      <Text style={styles.modalOptionSubtitle}>
                        {item.region} • ₹{item.rate_per_sqft?.toLocaleString('en-IN')}/sqft
                      </Text>
                    </View>
                    {formData.construction_preset_id === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalList}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Package Picker Modal */}
      <Modal
        visible={showPackagePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPackagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Package</Text>
              <TouchableOpacity onPress={() => setShowPackagePicker(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={packageOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, formData.package_type === item.value && styles.modalOptionSelected]}
                  onPress={() => {
                    updateField('package_type', item.value);
                    setShowPackagePicker(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionTitle}>{item.label}</Text>
                    <Text style={styles.modalOptionSubtitle}>{item.description}</Text>
                  </View>
                  {formData.package_type === item.value && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { width: 40 },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    gap: 40,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  stepCircleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepNumber: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  stepNumberActive: { color: Colors.white },
  stepLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  stepLabelActive: { color: Colors.primary, fontWeight: '600' },
  content: { flex: 1 },
  stepContainer: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  stepDescription: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  required: { color: Colors.danger },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  selectorButtonText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  warningText: { fontSize: 13, color: '#92400E' },
  presetInfo: {
    backgroundColor: Colors.primaryPale,
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  presetInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  presetInfoTitle: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  presetDetailsGrid: { flexDirection: 'row', gap: 16 },
  presetDetailItem: { flex: 1 },
  presetDetailLabel: { fontSize: 12, color: Colors.textSecondary },
  presetDetailValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    gap: 8,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  generateButton: { backgroundColor: Colors.success },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  resultHeader: { alignItems: 'center', marginBottom: 20 },
  resultTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 12 },
  resultTotal: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultTotalLabel: { fontSize: 14, color: Colors.textSecondary },
  resultTotalValue: { fontSize: 32, fontWeight: '700', color: Colors.success, marginTop: 4 },
  resultCostPerSqft: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  resultBreakdown: { marginTop: 16 },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  breakdownLabel: { fontSize: 14, color: Colors.textSecondary },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryPale,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 12,
  },
  viewDetailsText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  goBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  goBackText: { fontSize: 15, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalList: { padding: 8 },
  modalEmpty: { padding: 20, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: Colors.textSecondary },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  modalOptionContent: { flex: 1 },
  modalOptionTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  modalOptionSubtitle: { fontSize: 13, color: Colors.textSecondary },
});
