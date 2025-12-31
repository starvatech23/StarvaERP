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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { estimateV2API } from '../../services/api';

type FinishingGrade = 'economy' | 'standard' | 'premium' | 'luxury';

interface EstimateResult {
  specifications: {
    total_area_sqft: number;
    num_floors: number;
    finishing_grade: string;
    project_type: string;
  };
  summary: {
    subtotal: number;
    overhead_amount: number;
    profit_amount: number;
    total_before_tax: number;
    gst_amount: number;
    grand_total: number;
    cost_per_sqft: number;
    payment_schedule: Array<{
      milestone_name: string;
      percentage: number;
      amount: number;
    }>;
  };
  boq_by_category: Record<string, any[]>;
  calculation_inputs: Record<string, number>;
  total_boq_items: number;
}

export default function QuickEstimateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string | undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Input, 2: Results
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [estimateName, setEstimateName] = useState('');
  const [syncToBudget, setSyncToBudget] = useState(true);

  // Form state
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [numFloors, setNumFloors] = useState('1');
  const [finishingGrade, setFinishingGrade] = useState<FinishingGrade>('standard');

  const gradeOptions: { value: FinishingGrade; label: string; description: string; rate: string }[] = [
    { value: 'economy', label: 'Economy', description: 'Basic materials, functional design', rate: '₹1,600/sqft' },
    { value: 'standard', label: 'Standard', description: 'Good quality materials, comfortable living', rate: '₹2,000/sqft' },
    { value: 'premium', label: 'Premium', description: 'High-end materials, elegant finish', rate: '₹2,800/sqft' },
    { value: 'luxury', label: 'Luxury', description: 'Top-tier materials, designer quality', rate: '₹4,000/sqft' },
  ];

  const handleCalculate = async () => {
    const area = parseFloat(builtUpArea);
    const floors = parseInt(numFloors) || 1;

    if (!area || area < 100) {
      Alert.alert('Invalid Input', 'Please enter a valid built-up area (minimum 100 sqft)');
      return;
    }

    if (floors < 1 || floors > 10) {
      Alert.alert('Invalid Input', 'Number of floors must be between 1 and 10');
      return;
    }

    setLoading(true);
    try {
      const response = await estimateV2API.quickCalculate({
        total_area_sqft: area,
        num_floors: floors,
        finishing_grade: finishingGrade,
        project_type: 'residential_individual',
      });

      if (response.data?.success) {
        setResult(response.data);
        setStep(2);
      } else {
        throw new Error(response.data?.detail || 'Calculation failed');
      }
    } catch (error: any) {
      console.error('Estimate calculation error:', error);
      Alert.alert(
        'Calculation Error',
        error.response?.data?.detail || error.message || 'Failed to calculate estimate'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToProject = async () => {
    if (!projectId) {
      Alert.alert('No Project', 'Please open this from a project to save the estimate.');
      return;
    }

    setSaving(true);
    try {
      const response = await estimateV2API.saveToProject({
        project_id: projectId,
        total_area_sqft: parseFloat(builtUpArea),
        num_floors: parseInt(numFloors) || 1,
        finishing_grade: finishingGrade,
        project_type: 'residential_individual',
        estimate_name: estimateName || undefined,
        sync_to_budget: syncToBudget,
      });

      if (response.data?.success) {
        setShowSaveModal(false);
        Alert.alert(
          'Estimate Saved!',
          `${response.data.message}${syncToBudget ? '\n\nBudget has been synced with milestones.' : ''}`,
          [
            { text: 'View Estimates', onPress: () => router.push(`/projects/${projectId}/estimate` as any) },
            { text: 'Done', onPress: () => router.back() },
          ]
        );
      } else {
        throw new Error(response.data?.detail || 'Save failed');
      }
    } catch (error: any) {
      console.error('Save estimate error:', error);
      Alert.alert(
        'Save Error',
        error.response?.data?.detail || error.message || 'Failed to save estimate'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      excavation: 'hammer',
      foundation: 'layers',
      plinth: 'cube',
      superstructure: 'business',
      masonry: 'grid',
      plastering: 'color-palette',
      flooring: 'square',
      doors_windows: 'apps',
      electrical: 'flash',
      plumbing: 'water',
      painting: 'brush',
      kitchen: 'restaurant',
      bathroom: 'water-outline',
      exterior: 'home',
      miscellaneous: 'ellipsis-horizontal',
    };
    return icons[category] || 'construct';
  };

  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' & ');
  };

  // Step 1: Input Form
  const renderInputForm = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Details</Text>
        <Text style={styles.sectionSubtitle}>Enter your construction specifications</Text>
      </View>

      {/* Built-up Area */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Built-up Area (sqft) *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="resize" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={builtUpArea}
            onChangeText={setBuiltUpArea}
            placeholder="e.g., 3200"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
          />
          <Text style={styles.inputUnit}>sqft</Text>
        </View>
        <Text style={styles.inputHint}>
          Total built-up area including all floors
        </Text>
      </View>

      {/* Number of Floors */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Number of Floors *</Text>
        <View style={styles.floorSelector}>
          {[1, 2, 3, 4].map(floor => (
            <TouchableOpacity
              key={floor}
              style={[
                styles.floorOption,
                numFloors === floor.toString() && styles.floorOptionActive,
              ]}
              onPress={() => setNumFloors(floor.toString())}
            >
              <Text style={[
                styles.floorOptionText,
                numFloors === floor.toString() && styles.floorOptionTextActive,
              ]}>
                {floor}
              </Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.floorCustomInput}
            value={parseInt(numFloors) > 4 ? numFloors : ''}
            onChangeText={(text) => {
              if (text === '' || (parseInt(text) >= 1 && parseInt(text) <= 10)) {
                setNumFloors(text || '1');
              }
            }}
            placeholder="5+"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>
      </View>

      {/* Finishing Grade */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Finishing Grade *</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowGradePicker(true)}
        >
          <Ionicons name="star" size={20} color={Colors.primary} style={styles.inputIcon} />
          <View style={styles.pickerContent}>
            <Text style={styles.pickerValue}>
              {gradeOptions.find(g => g.value === finishingGrade)?.label}
            </Text>
            <Text style={styles.pickerRate}>
              {gradeOptions.find(g => g.value === finishingGrade)?.rate}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color={Colors.info} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>About Quick Estimate</Text>
          <Text style={styles.infoText}>
            This provides a rapid cost estimation based on standard construction parameters. 
            For detailed BOQ with customizations, create a full estimate.
          </Text>
        </View>
      </View>

      {/* Calculate Button */}
      <TouchableOpacity
        style={[styles.calculateButton, loading && styles.buttonDisabled]}
        onPress={handleCalculate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="calculator" size={20} color={Colors.white} />
            <Text style={styles.calculateButtonText}>Calculate Estimate</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // Step 2: Results
  const renderResults = () => {
    if (!result) return null;

    const { summary, boq_by_category, calculation_inputs, total_boq_items } = result;
    const categories = Object.keys(boq_by_category);

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Estimated Cost</Text>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.editButton}>
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.grandTotal}>{formatCurrency(summary.grand_total)}</Text>
          <Text style={styles.costPerSqft}>
            {formatCurrency(summary.cost_per_sqft)}/sqft
          </Text>

          <View style={styles.specsBadges}>
            <View style={styles.specBadge}>
              <Ionicons name="resize" size={14} color={Colors.textSecondary} />
              <Text style={styles.specBadgeText}>{calculation_inputs.built_up_area_sqft} sqft</Text>
            </View>
            <View style={styles.specBadge}>
              <Ionicons name="layers" size={14} color={Colors.textSecondary} />
              <Text style={styles.specBadgeText}>{result.specifications.num_floors} floor(s)</Text>
            </View>
            <View style={styles.specBadge}>
              <Ionicons name="star" size={14} color={Colors.textSecondary} />
              <Text style={styles.specBadgeText}>{result.specifications.finishing_grade}</Text>
            </View>
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Cost Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal (Materials + Labor)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(summary.subtotal)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Overhead (10%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(summary.overhead_amount)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Profit (15%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(summary.profit_amount)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownSubtotal]}>
            <Text style={styles.breakdownLabelBold}>Total Before Tax</Text>
            <Text style={styles.breakdownValueBold}>{formatCurrency(summary.total_before_tax)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST (18%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(summary.gst_amount)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={styles.breakdownLabelTotal}>Grand Total</Text>
            <Text style={styles.breakdownValueTotal}>{formatCurrency(summary.grand_total)}</Text>
          </View>
        </View>

        {/* BOQ by Category */}
        <View style={styles.boqSection}>
          <Text style={styles.boqTitle}>Bill of Quantities ({total_boq_items} items)</Text>
          
          {categories.map(category => (
            <View key={category} style={styles.categoryCard}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View style={styles.categoryIcon}>
                    <Ionicons
                      name={getCategoryIcon(category) as any}
                      size={18}
                      color={Colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.categoryName}>{formatCategoryName(category)}</Text>
                    <Text style={styles.categoryItemCount}>
                      {boq_by_category[category].length} items
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryHeaderRight}>
                  <Text style={styles.categoryTotal}>
                    {formatCurrency(
                      boq_by_category[category].reduce((sum, item) => sum + item.amount, 0)
                    )}
                  </Text>
                  <Ionicons
                    name={expandedCategories.includes(category) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {expandedCategories.includes(category) && (
                <View style={styles.categoryItems}>
                  {boq_by_category[category].map((item, index) => (
                    <View key={index} style={styles.boqItem}>
                      <View style={styles.boqItemLeft}>
                        <Text style={styles.boqItemName}>{item.item_name}</Text>
                        <Text style={styles.boqItemQty}>
                          {item.quantity.toFixed(2)} {item.unit} × {formatCurrency(item.rate)}
                        </Text>
                      </View>
                      <Text style={styles.boqItemAmount}>{formatCurrency(item.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Payment Schedule */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Schedule</Text>
          {summary.payment_schedule.map((payment, index) => (
            <View key={index} style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentMilestone}>{payment.milestone_name}</Text>
                <Text style={styles.paymentPercent}>{payment.percentage}%</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{calculation_inputs.carpet_area_sqm?.toFixed(1)} sqm</Text>
              <Text style={styles.metricLabel}>Flooring Area</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{calculation_inputs.paint_area?.toFixed(1)} sqm</Text>
              <Text style={styles.metricLabel}>Painting Area</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{calculation_inputs.num_columns}</Text>
              <Text style={styles.metricLabel}>Columns</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{calculation_inputs.total_rooms}</Text>
              <Text style={styles.metricLabel}>Rooms</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
            <Ionicons name="refresh" size={20} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Recalculate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // Grade Picker Modal
  const renderGradePicker = () => (
    <Modal
      visible={showGradePicker}
      animationType="slide"
      transparent
      onRequestClose={() => setShowGradePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Finishing Grade</Text>
            <TouchableOpacity onPress={() => setShowGradePicker(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {gradeOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.gradeOption,
                finishingGrade === option.value && styles.gradeOptionActive,
              ]}
              onPress={() => {
                setFinishingGrade(option.value);
                setShowGradePicker(false);
              }}
            >
              <View style={styles.gradeOptionLeft}>
                <Text style={[
                  styles.gradeOptionLabel,
                  finishingGrade === option.value && styles.gradeOptionLabelActive,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.gradeOptionDesc}>{option.description}</Text>
              </View>
              <View style={styles.gradeOptionRight}>
                <Text style={styles.gradeOptionRate}>{option.rate}</Text>
                {finishingGrade === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Quick Estimate' : 'Estimate Results'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
            <Text style={styles.progressStepText}>1</Text>
          </View>
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
            <Text style={styles.progressStepText}>2</Text>
          </View>
        </View>

        {step === 1 ? renderInputForm() : renderResults()}
        {renderGradePicker()}
      </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  inputUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  floorSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  floorOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  floorOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  floorOptionTextActive: {
    color: Colors.white,
  },
  floorCustomInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerContent: {
    flex: 1,
  },
  pickerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  pickerRate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${Colors.info}10`,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.info,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Results styles
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  grandTotal: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
  },
  costPerSqft: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  specsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  specBadgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  breakdownSubtotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownLabelBold: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  breakdownValueBold: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  breakdownTotal: {
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownLabelTotal: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  breakdownValueTotal: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
  },
  boqSection: {
    marginBottom: 16,
  },
  boqTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryItemCount: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  boqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  boqItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  boqItemName: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  boqItemQty: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  boqItemAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  paymentSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentMilestone: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  paymentPercent: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  metricsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    paddingVertical: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  gradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  gradeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  gradeOptionLeft: {
    flex: 1,
  },
  gradeOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  gradeOptionLabelActive: {
    color: Colors.primary,
  },
  gradeOptionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  gradeOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeOptionRate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
});
