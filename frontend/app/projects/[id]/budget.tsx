import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { projectsAPI, taskCostAPI } from '../../../services/api';

type FinishingGrade = 'economy' | 'standard' | 'premium' | 'luxury';
type City = 'mumbai' | 'delhi' | 'bangalore' | 'chennai' | 'hyderabad' | 'pune' | 'kolkata' | 'tier2' | 'tier3' | 'default';

export default function ProjectBudgetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [deviations, setDeviations] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'budget' | 'deviations'>('budget');
  
  // Cost calculation modal state
  const [showCostModal, setShowCostModal] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [numFloors, setNumFloors] = useState('1');
  const [finishingGrade, setFinishingGrade] = useState<FinishingGrade>('standard');
  const [city, setCity] = useState<City>('bangalore');
  const [showGradeOptions, setShowGradeOptions] = useState(false);
  const [showCityOptions, setShowCityOptions] = useState(false);

  const gradeOptions: { value: FinishingGrade; label: string; multiplier: string }[] = [
    { value: 'economy', label: 'Economy', multiplier: '0.8x' },
    { value: 'standard', label: 'Standard', multiplier: '1.0x' },
    { value: 'premium', label: 'Premium', multiplier: '1.4x' },
    { value: 'luxury', label: 'Luxury', multiplier: '2.0x' },
  ];

  const cityOptions: { value: City; label: string; multiplier: string }[] = [
    { value: 'mumbai', label: 'Mumbai', multiplier: '1.3x' },
    { value: 'delhi', label: 'Delhi NCR', multiplier: '1.2x' },
    { value: 'bangalore', label: 'Bangalore', multiplier: '1.15x' },
    { value: 'chennai', label: 'Chennai', multiplier: '1.1x' },
    { value: 'hyderabad', label: 'Hyderabad', multiplier: '1.1x' },
    { value: 'pune', label: 'Pune', multiplier: '1.05x' },
    { value: 'kolkata', label: 'Kolkata', multiplier: '1.0x' },
    { value: 'tier2', label: 'Tier 2 City', multiplier: '1.73x' },
    { value: 'tier3', label: 'Tier 3 City', multiplier: '1.73x' },
  ];

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      const [budgetRes, deviationRes] = await Promise.all([
        projectsAPI.getBudgetSummary(id as string),
        projectsAPI.getDeviationReport(id as string),
      ]);
      setBudget(budgetRes.data);
      setDeviations(deviationRes.data);
    } catch (error) {
      console.error('Error loading budget:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCalculateCosts = async () => {
    const area = parseFloat(builtUpArea);
    if (!area || area < 100) {
      Alert.alert('Invalid Input', 'Please enter a valid built-up area (minimum 100 sqft)');
      return;
    }

    setCalculating(true);
    try {
      const response = await taskCostAPI.applyToProject(id as string, {
        built_up_area_sqft: area,
        num_floors: parseInt(numFloors) || 1,
        finishing_grade: finishingGrade,
        city: city,
      });

      if (response.data?.success) {
        const summary = response.data.summary;
        setShowCostModal(false);
        Alert.alert(
          'Costs Calculated!',
          `✅ ${response.data.tasks_updated} tasks updated\n\n` +
          `Total Estimated: ₹${summary.total_estimated_cost?.toLocaleString()}\n` +
          `Material: ₹${summary.total_material_cost?.toLocaleString()}\n` +
          `Labour: ₹${summary.total_labour_cost?.toLocaleString()}\n` +
          `Cost/sqft: ₹${summary.cost_per_sqft?.toLocaleString()}`,
          [{ text: 'OK', onPress: () => loadData() }]
        );
      } else {
        throw new Error(response.data?.detail || 'Calculation failed');
      }
    } catch (error: any) {
      console.error('Cost calculation error:', error);
      Alert.alert('Error', error.response?.data?.detail || error.message || 'Failed to calculate costs');
    } finally {
      setCalculating(false);
    }
  };

  const getVarianceColor = (variance: number, percentage: number) => {
    if (percentage > 0) return '#10B981'; // Under budget (good)
    if (percentage < -10) return '#EF4444'; // Over budget (bad)
    if (percentage < 0) return '#F59E0B'; // Slightly over
    return Colors.textSecondary;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return Colors.textSecondary;
    }
  };

  const renderProgressBar = (planned: number, actual: number) => {
    const percentage = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
    const isOverBudget = actual > planned;
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: isOverBudget ? '#EF4444' : '#10B981'
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, isOverBudget && { color: '#EF4444' }]}>
          {percentage.toFixed(0)}%
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading budget data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget & Deviations</Text>
        <TouchableOpacity onPress={() => setShowCostModal(true)} style={styles.headerButton}>
          <Ionicons name="calculator" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'budget' && styles.tabActive]}
          onPress={() => setActiveTab('budget')}
        >
          <Ionicons name="wallet" size={18} color={activeTab === 'budget' ? Colors.secondary : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'budget' && styles.tabTextActive]}>Budget</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'deviations' && styles.tabActive]}
          onPress={() => setActiveTab('deviations')}
        >
          <Ionicons name="warning" size={18} color={activeTab === 'deviations' ? Colors.secondary : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'deviations' && styles.tabTextActive]}>Deviations</Text>
          {deviations?.total_deviations > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{deviations.total_deviations}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {activeTab === 'budget' && budget && (
          <>
            {/* Calculate Costs Banner */}
            {(!budget.total?.planned || budget.total?.planned === 0) && (
              <TouchableOpacity 
                style={styles.calculateBanner}
                onPress={() => setShowCostModal(true)}
              >
                <Ionicons name="calculator" size={24} color={Colors.primary} />
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>Calculate Task Costs</Text>
                  <Text style={styles.bannerSubtitle}>Generate cost estimates for all tasks</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Summary Cards */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Cost Summary</Text>
              
              {/* Total Cost Card */}
              <View style={styles.totalCard}>
                <View style={styles.totalHeader}>
                  <Ionicons name="cash" size={24} color="#FFF" />
                  <Text style={styles.totalLabel}>Total Project Cost</Text>
                </View>
                <View style={styles.totalRow}>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalItemLabel}>Planned</Text>
                    <Text style={styles.totalItemValue}>₹{budget.total.planned?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Text style={styles.totalItemLabel}>Actual</Text>
                    <Text style={styles.totalItemValue}>₹{budget.total.actual?.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.varianceRow}>
                  <Text style={styles.varianceLabel}>Variance</Text>
                  <Text style={[styles.varianceValue, { color: getVarianceColor(budget.total.variance, budget.total.variance_percentage) }]}>
                    {budget.total.variance >= 0 ? '+' : ''}₹{budget.total.variance?.toLocaleString()} ({budget.total.variance_percentage?.toFixed(1)}%)
                  </Text>
                </View>
              </View>

              {/* Labour & Material Cards */}
              <View style={styles.costCardsRow}>
                <View style={[styles.costCard, { backgroundColor: '#6366F110' }]}>
                  <View style={styles.costCardHeader}>
                    <Ionicons name="people" size={20} color="#6366F1" />
                    <Text style={[styles.costCardTitle, { color: '#6366F1' }]}>Labour</Text>
                  </View>
                  <Text style={styles.costCardPlanned}>₹{budget.labour.planned?.toLocaleString()}</Text>
                  <Text style={styles.costCardActual}>Actual: ₹{budget.labour.actual?.toLocaleString()}</Text>
                  {renderProgressBar(budget.labour.planned, budget.labour.actual)}
                </View>

                <View style={[styles.costCard, { backgroundColor: '#F59E0B10' }]}>
                  <View style={styles.costCardHeader}>
                    <Ionicons name="cube" size={20} color="#F59E0B" />
                    <Text style={[styles.costCardTitle, { color: '#F59E0B' }]}>Material</Text>
                  </View>
                  <Text style={styles.costCardPlanned}>₹{budget.material.planned?.toLocaleString()}</Text>
                  <Text style={styles.costCardActual}>Actual: ₹{budget.material.actual?.toLocaleString()}</Text>
                  {renderProgressBar(budget.material.planned, budget.material.actual)}
                </View>
              </View>
            </View>

            {/* Milestone Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Milestone Breakdown</Text>
              {budget.milestones?.map((ms: any, index: number) => (
                <View key={index} style={styles.milestoneCard}>
                  <View style={styles.milestoneHeader}>
                    <View style={styles.milestoneInfo}>
                      <Text style={styles.milestoneName}>{ms.milestone_name}</Text>
                      <Text style={styles.milestonePhase}>{ms.phase}</Text>
                    </View>
                    <View style={[
                      styles.milestoneStatus,
                      { backgroundColor: ms.status === 'completed' ? '#10B98120' : ms.status === 'in_progress' ? '#3B82F620' : '#6B728020' }
                    ]}>
                      <Text style={[
                        styles.milestoneStatusText,
                        { color: ms.status === 'completed' ? '#10B981' : ms.status === 'in_progress' ? '#3B82F6' : '#6B7280' }
                      ]}>
                        {ms.status?.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.milestoneCosts}>
                    <View style={styles.milestoneCostItem}>
                      <Text style={styles.milestoneCostLabel}>Labour</Text>
                      <Text style={styles.milestoneCostValue}>₹{ms.labour_planned?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.milestoneCostItem}>
                      <Text style={styles.milestoneCostLabel}>Material</Text>
                      <Text style={styles.milestoneCostValue}>₹{ms.material_planned?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.milestoneCostItem}>
                      <Text style={styles.milestoneCostLabel}>Total</Text>
                      <Text style={[styles.milestoneCostValue, { fontWeight: '700' }]}>₹{ms.total_planned?.toLocaleString()}</Text>
                    </View>
                  </View>

                  {ms.variance !== 0 && (
                    <View style={styles.milestoneVariance}>
                      <Ionicons 
                        name={ms.variance > 0 ? 'trending-down' : 'trending-up'} 
                        size={16} 
                        color={ms.variance > 0 ? '#10B981' : '#EF4444'} 
                      />
                      <Text style={[styles.milestoneVarianceText, { color: ms.variance > 0 ? '#10B981' : '#EF4444' }]}>
                        {ms.variance > 0 ? 'Under' : 'Over'} budget by ₹{Math.abs(ms.variance).toLocaleString()} ({Math.abs(ms.variance_percentage).toFixed(1)}%)
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'deviations' && deviations && (
          <>
            {/* Deviation Summary */}
            <View style={styles.deviationSummary}>
              <View style={styles.deviationSummaryCard}>
                <Text style={styles.deviationSummaryValue}>{deviations.total_deviations}</Text>
                <Text style={styles.deviationSummaryLabel}>Total Deviations</Text>
              </View>
              <View style={[styles.deviationSummaryCard, { backgroundColor: '#EF444410' }]}>
                <Text style={[styles.deviationSummaryValue, { color: '#EF4444' }]}>{deviations.high_severity_count}</Text>
                <Text style={styles.deviationSummaryLabel}>High</Text>
              </View>
              <View style={[styles.deviationSummaryCard, { backgroundColor: '#F59E0B10' }]}>
                <Text style={[styles.deviationSummaryValue, { color: '#F59E0B' }]}>{deviations.medium_severity_count}</Text>
                <Text style={styles.deviationSummaryLabel}>Medium</Text>
              </View>
              <View style={[styles.deviationSummaryCard, { backgroundColor: '#10B98110' }]}>
                <Text style={[styles.deviationSummaryValue, { color: '#10B981' }]}>{deviations.low_severity_count}</Text>
                <Text style={styles.deviationSummaryLabel}>Low</Text>
              </View>
            </View>

            {/* Schedule Deviations */}
            {deviations.schedule_deviations?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Schedule Deviations</Text>
                {deviations.schedule_deviations.map((dev: any, index: number) => (
                  <View key={index} style={styles.deviationCard}>
                    <View style={[styles.severityIndicator, { backgroundColor: getSeverityColor(dev.severity) }]} />
                    <View style={styles.deviationContent}>
                      <Text style={styles.deviationName}>{dev.entity_name}</Text>
                      <Text style={styles.deviationMilestone}>{dev.milestone_name}</Text>
                      <View style={styles.deviationDetail}>
                        <Ionicons name="calendar" size={14} color={Colors.textSecondary} />
                        <Text style={styles.deviationDetailText}>
                          Delayed by {dev.variance} days
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(dev.severity) + '20' }]}>
                      <Text style={[styles.severityBadgeText, { color: getSeverityColor(dev.severity) }]}>
                        {dev.severity}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Cost Deviations */}
            {deviations.cost_deviations?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cost Deviations</Text>
                {deviations.cost_deviations.map((dev: any, index: number) => (
                  <View key={index} style={styles.deviationCard}>
                    <View style={[styles.severityIndicator, { backgroundColor: getSeverityColor(dev.severity) }]} />
                    <View style={styles.deviationContent}>
                      <Text style={styles.deviationName}>{dev.entity_name}</Text>
                      <Text style={styles.deviationMilestone}>{dev.milestone_name}</Text>
                      <View style={styles.deviationDetail}>
                        <Ionicons name="cash" size={14} color={Colors.textSecondary} />
                        <Text style={styles.deviationDetailText}>
                          Variance: ₹{Math.abs(dev.variance).toLocaleString()} ({dev.variance_percentage.toFixed(1)}%)
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(dev.severity) + '20' }]}>
                      <Text style={[styles.severityBadgeText, { color: getSeverityColor(dev.severity) }]}>
                        {dev.severity}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {deviations.total_deviations === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                <Text style={styles.emptyStateTitle}>No Deviations</Text>
                <Text style={styles.emptyStateText}>Project is on track with no schedule or cost deviations</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cost Calculation Modal */}
      <Modal
        visible={showCostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCostModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setShowCostModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculate Task Costs</Text>
              <TouchableOpacity onPress={() => setShowCostModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Built-up Area */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Built-up Area (sqft) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={builtUpArea}
                  onChangeText={setBuiltUpArea}
                  placeholder="e.g., 3200"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>

              {/* Number of Floors */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Number of Floors</Text>
                <View style={styles.floorButtons}>
                  {['1', '2', '3', '4'].map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.floorBtn, numFloors === f && styles.floorBtnActive]}
                      onPress={() => setNumFloors(f)}
                    >
                      <Text style={[styles.floorBtnText, numFloors === f && styles.floorBtnTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Finishing Grade */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Finishing Grade</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowGradeOptions(!showGradeOptions)}
                >
                  <Text style={styles.selectText}>
                    {gradeOptions.find(g => g.value === finishingGrade)?.label} 
                    ({gradeOptions.find(g => g.value === finishingGrade)?.multiplier})
                  </Text>
                  <Ionicons name={showGradeOptions ? "chevron-up" : "chevron-down"} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showGradeOptions && (
                  <View style={styles.optionsList}>
                    {gradeOptions.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionItem, finishingGrade === opt.value && styles.optionItemActive]}
                        onPress={() => { setFinishingGrade(opt.value); setShowGradeOptions(false); }}
                      >
                        <Text style={styles.optionText}>{opt.label}</Text>
                        <Text style={styles.optionMult}>{opt.multiplier}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* City */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City / Location</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowCityOptions(!showCityOptions)}
                >
                  <Text style={styles.selectText}>
                    {cityOptions.find(c => c.value === city)?.label}
                    ({cityOptions.find(c => c.value === city)?.multiplier})
                  </Text>
                  <Ionicons name={showCityOptions ? "chevron-up" : "chevron-down"} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showCityOptions && (
                  <View style={styles.optionsList}>
                    {cityOptions.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionItem, city === opt.value && styles.optionItemActive]}
                        onPress={() => { setCity(opt.value); setShowCityOptions(false); }}
                      >
                        <Text style={styles.optionText}>{opt.label}</Text>
                        <Text style={styles.optionMult}>{opt.multiplier}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={Colors.info} />
                <Text style={styles.infoText}>
                  This will calculate and apply estimated costs to all tasks in this project using Indian construction rates (2024-2025).
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setShowCostModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.calculateBtn, calculating && styles.btnDisabled]}
                onPress={handleCalculateCosts}
                disabled={calculating}
              >
                {calculating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="calculator" size={18} color="#FFF" />
                    <Text style={styles.calculateBtnText}>Calculate</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.secondary },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { color: Colors.secondary },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  content: { flex: 1 },
  summarySection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  totalCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  totalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  totalRow: { flexDirection: 'row', alignItems: 'center' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalItemLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  totalItemValue: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  totalDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  varianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  varianceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  varianceValue: { fontSize: 16, fontWeight: '700' },
  costCardsRow: { flexDirection: 'row', gap: 12 },
  costCard: { flex: 1, borderRadius: 12, padding: 16 },
  costCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  costCardTitle: { fontSize: 14, fontWeight: '600' },
  costCardPlanned: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  costCardActual: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  progressBarContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, minWidth: 35 },
  section: { padding: 16 },
  milestoneCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  milestoneInfo: { flex: 1 },
  milestoneName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  milestonePhase: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  milestoneStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  milestoneStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  milestoneCosts: { flexDirection: 'row', marginTop: 12, gap: 12 },
  milestoneCostItem: { flex: 1 },
  milestoneCostLabel: { fontSize: 11, color: Colors.textSecondary },
  milestoneCostValue: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginTop: 2 },
  milestoneVariance: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  milestoneVarianceText: { fontSize: 13, fontWeight: '500' },
  deviationSummary: { flexDirection: 'row', padding: 16, gap: 8 },
  deviationSummaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center' },
  deviationSummaryValue: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  deviationSummaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  deviationCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  severityIndicator: { width: 4 },
  deviationContent: { flex: 1, padding: 14 },
  deviationName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  deviationMilestone: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  deviationDetail: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  deviationDetailText: { fontSize: 13, color: Colors.textSecondary },
  severityBadge: { paddingHorizontal: 10, justifyContent: 'center', marginRight: 12 },
  severityBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptyStateText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  
  // Header button
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight || '#E8F4FE',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalBody: {
    padding: 20,
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
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floorButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  floorBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floorBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  floorBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  floorBtnTextActive: {
    color: '#FFF',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionsList: {
    marginTop: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionItemActive: {
    backgroundColor: Colors.primaryLight || '#E8F4FE',
  },
  optionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  optionMult: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#3B82F610',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.info || '#3B82F6',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calculateBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  calculateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  calculateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
