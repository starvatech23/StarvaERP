import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Colors from '../../../../constants/Colors';
import { estimationAPI } from '../../../../services/api';
import EstimateLineEditModal from '../../../../components/EstimateLineEditModal';
import { useAuth } from '../../../../context/AuthContext';

export default function EstimateDetailScreen() {
  const router = useRouter();
  const { id: projectId, estimateId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['excavation_foundation']));
  const [editingLine, setEditingLine] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Review/Approve state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [approveComments, setApproveComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Check user permissions
  const canReview = user?.role === 'admin' || user?.role === 'project_manager' || user?.role === 'crm_manager';
  const canApprove = user?.role === 'admin';

  useEffect(() => {
    loadEstimate();
  }, [estimateId]);

  const loadEstimate = async () => {
    try {
      const response = await estimationAPI.getById(estimateId as string);
      setEstimate(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      excavation_foundation: 'Excavation & Foundation',
      superstructure: 'Superstructure',
      masonry: 'Masonry',
      finishes: 'Finishes',
      services: 'Services',
      labour: 'Labour',
      overheads: 'Overheads',
      contingency: 'Contingency',
    };
    return names[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      excavation_foundation: 'construct',
      superstructure: 'business',
      masonry: 'grid',
      finishes: 'brush',
      services: 'flash',
      labour: 'people',
      overheads: 'calculator',
      contingency: 'shield-checkmark',
    };
    return icons[category] || 'document';
  };

  const groupLinesByCategory = () => {
    if (!estimate?.lines) return {};
    
    const grouped: { [key: string]: any[] } = {};
    estimate.lines.forEach((line: any) => {
      if (!grouped[line.category]) {
        grouped[line.category] = [];
      }
      grouped[line.category].push(line);
    });
    return grouped;
  };

  const getCategoryTotal = (lines: any[]) => {
    return lines.reduce((sum, line) => sum + line.amount, 0);
  };

  const handleSaveEdit = async (lineId: string, quantity: number, rate: number) => {
    setSaving(true);
    try {
      await estimationAPI.updateLine(estimateId as string, lineId, quantity, rate);
      
      // Reload estimate to get updated totals
      await loadEstimate();
      
      Alert.alert('Success', 'Line item updated successfully');
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update line item');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async () => {
    setActionLoading(true);
    try {
      await estimationAPI.review(estimateId as string, reviewComments || undefined);
      Alert.alert('Success', 'Estimate has been marked as reviewed');
      setShowReviewModal(false);
      setReviewComments('');
      await loadEstimate();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to review estimate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await estimationAPI.approve(estimateId as string, approveComments || undefined);
      Alert.alert('Success', 'Estimate has been approved');
      setShowApproveModal(false);
      setApproveComments('');
      await loadEstimate();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to approve estimate');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    const formatName = format === 'csv' ? 'CSV' : 'PDF';
    
    Alert.alert(
      `Export ${formatName}`,
      `This will download the estimate as a ${formatName} file.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: async () => {
            setSaving(true);
            try {
              console.log(`Starting ${formatName} export...`);
              
              // Call export API - response will be text data (CSV or HTML)
              const response = format === 'csv' 
                ? await estimationAPI.exportCSV(estimateId as string)
                : await estimationAPI.exportPDF(estimateId as string);
              
              const content = response.data;
              
              if (!content) {
                throw new Error('No data received from server');
              }
              
              console.log(`Export response received: ${content.length} characters`);
              
              // Create filename
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
              const extension = format === 'csv' ? 'csv' : 'html';
              const filename = `estimate_${timestamp}.${extension}`;
              
              // Check if we're on web or native using Platform
              if (Platform.OS === 'web') {
                // Web download approach
                const mimeType = format === 'csv' ? 'text/csv' : 'text/html';
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                Alert.alert('Success', `${formatName} file downloaded: ${filename}`);
              } else {
                // Native approach using expo-file-system legacy API
                const fileUri = FileSystem.documentDirectory + filename;
                await FileSystem.writeAsStringAsync(fileUri, content, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
                
                console.log('File saved to:', fileUri);
                
                // Share file
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: format === 'csv' ? 'text/csv' : 'text/html',
                    dialogTitle: `Export Estimate as ${formatName}`,
                  });
                } else {
                  Alert.alert('Success', `File saved to: ${fileUri}`);
                }
              }
            } catch (error: any) {
              console.error('Export error:', error);
              const errorMsg = error.response?.data?.detail || error.message || `Failed to export ${formatName}`;
              Alert.alert('Export Error', errorMsg);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!estimate) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Estimate not found</Text>
      </SafeAreaView>
    );
  }

  const groupedLines = groupLinesByCategory();
  const categories = Object.keys(groupedLines);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(`/projects/${projectId}`)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{estimate.version_name || `Version ${estimate.version}`}</Text>
          <Text style={styles.headerSubtitle}>{estimate.status.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="calculator" size={32} color={Colors.secondary} />
            <View style={styles.summaryHeaderText}>
              <Text style={styles.summaryTitle}>Total Estimate</Text>
              <Text style={styles.summaryAmount}>₹{estimate.grand_total.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cost/sqft</Text>
              <Text style={styles.statValue}>₹{Math.round(estimate.cost_per_sqft)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Area</Text>
              <Text style={styles.statValue}>{estimate.built_up_area_sqft} sqft</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Floors</Text>
              <Text style={styles.statValue}>{estimate.num_floors}</Text>
            </View>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.breakdownLabel}>Material</Text>
              <Text style={styles.breakdownValue}>₹{(estimate.total_material_cost / 100000).toFixed(1)}L</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.breakdownLabel}>Labour</Text>
              <Text style={styles.breakdownValue}>₹{(estimate.total_labour_cost / 100000).toFixed(1)}L</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.breakdownLabel}>Services</Text>
              <Text style={styles.breakdownValue}>₹{(estimate.total_services_cost / 100000).toFixed(1)}L</Text>
            </View>
          </View>
        </View>

        {/* Review & Approval Status Section */}
        <View style={styles.approvalSection}>
          <Text style={styles.sectionTitle}>Review & Approval</Text>
          
          {/* Review Status */}
          <View style={styles.approvalCard}>
            <View style={styles.approvalRow}>
              <View style={styles.approvalIconContainer}>
                <Ionicons 
                  name={estimate.reviewed_by ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={estimate.reviewed_by ? Colors.success : Colors.textTertiary} 
                />
              </View>
              <View style={styles.approvalContent}>
                <Text style={styles.approvalLabel}>Reviewed by (Project Manager)</Text>
                {estimate.reviewed_by ? (
                  <>
                    <Text style={styles.approvalName}>{estimate.reviewed_by_name || 'Unknown'}</Text>
                    <Text style={styles.approvalDate}>{formatDate(estimate.reviewed_at)}</Text>
                    {estimate.review_comments && (
                      <View style={styles.commentBox}>
                        <Ionicons name="chatbubble-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.commentText}>{estimate.review_comments}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.approvalPending}>Pending Review</Text>
                )}
              </View>
              {canReview && !estimate.reviewed_by && !estimate.approved_by && (
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                  <Text style={styles.actionBtnText}>Review</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Approval Status */}
          <View style={styles.approvalCard}>
            <View style={styles.approvalRow}>
              <View style={styles.approvalIconContainer}>
                <Ionicons 
                  name={estimate.approved_by ? "shield-checkmark" : "ellipse-outline"} 
                  size={24} 
                  color={estimate.approved_by ? Colors.success : Colors.textTertiary} 
                />
              </View>
              <View style={styles.approvalContent}>
                <Text style={styles.approvalLabel}>Approved by (Project Head/Director)</Text>
                {estimate.approved_by ? (
                  <>
                    <Text style={styles.approvalName}>{estimate.approved_by_name || 'Unknown'}</Text>
                    <Text style={styles.approvalDate}>{formatDate(estimate.approved_at)}</Text>
                    {estimate.approval_comments && (
                      <View style={styles.commentBox}>
                        <Ionicons name="chatbubble-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.commentText}>{estimate.approval_comments}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.approvalPending}>
                    {estimate.reviewed_by ? 'Pending Approval' : 'Requires Review First'}
                  </Text>
                )}
              </View>
              {canApprove && estimate.reviewed_by && !estimate.approved_by && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => setShowApproveModal(true)}
                >
                  <Ionicons name="shield-checkmark" size={18} color={Colors.white} />
                  <Text style={styles.actionBtnText}>Approve</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Floor-wise Breakdown Section */}
        {estimate.is_floor_wise && estimate.floors && estimate.floors.length > 0 && (
          <View style={styles.floorSection}>
            <Text style={styles.sectionTitle}>Floor-wise Breakdown</Text>
            <Text style={styles.sectionSubtitle}>
              {estimate.floors.length} floors • Area divided: {Math.round(estimate.built_up_area_sqft / estimate.num_floors)} sqft/floor
            </Text>

            {estimate.floors.map((floor: any, index: number) => (
              <View key={floor.id || index} style={styles.floorCard}>
                <View style={styles.floorHeader}>
                  <View style={styles.floorHeaderLeft}>
                    <View style={[
                      styles.floorIcon, 
                      floor.is_parking && styles.floorIconParking,
                      floor.is_basement && styles.floorIconBasement,
                      floor.is_terrace && styles.floorIconTerrace,
                    ]}>
                      <Ionicons 
                        name={floor.is_parking ? 'car' : floor.is_basement ? 'layers' : floor.is_terrace ? 'sunny' : 'business'} 
                        size={20} 
                        color={floor.is_parking ? Colors.warning : floor.is_basement ? Colors.info : floor.is_terrace ? Colors.success : Colors.primary} 
                      />
                    </View>
                    <View>
                      <Text style={styles.floorName}>{floor.floor_name}</Text>
                      <Text style={styles.floorArea}>{floor.area_sqft} sqft • ₹{Math.round(floor.rate_per_sqft)}/sqft</Text>
                    </View>
                  </View>
                  <View style={styles.floorHeaderRight}>
                    <Text style={styles.floorTotal}>₹{floor.floor_total?.toLocaleString('en-IN') || 0}</Text>
                    {floor.is_parking && (
                      <View style={styles.floorBadge}>
                        <Text style={styles.floorBadgeText}>60% rate</Text>
                      </View>
                    )}
                    {floor.is_basement && (
                      <View style={[styles.floorBadge, styles.floorBadgeInfo]}>
                        <Text style={[styles.floorBadgeText, styles.floorBadgeTextInfo]}>70% rate</Text>
                      </View>
                    )}
                    {floor.is_terrace && (
                      <View style={[styles.floorBadge, styles.floorBadgeSuccess]}>
                        <Text style={[styles.floorBadgeText, styles.floorBadgeTextSuccess]}>Package rate</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Floor Cost Breakdown */}
                <View style={styles.floorBreakdown}>
                  <View style={styles.floorBreakdownItem}>
                    <Text style={styles.floorBreakdownLabel}>Material</Text>
                    <Text style={styles.floorBreakdownValue}>₹{floor.material_cost?.toLocaleString('en-IN') || 0}</Text>
                  </View>
                  <View style={styles.floorBreakdownItem}>
                    <Text style={styles.floorBreakdownLabel}>Labour</Text>
                    <Text style={styles.floorBreakdownValue}>₹{floor.labour_cost?.toLocaleString('en-IN') || 0}</Text>
                  </View>
                  <View style={styles.floorBreakdownItem}>
                    <Text style={styles.floorBreakdownLabel}>Services</Text>
                    <Text style={styles.floorBreakdownValue}>₹{floor.services_cost?.toLocaleString('en-IN') || 0}</Text>
                  </View>
                </View>

                {/* Floor Items Count */}
                <View style={styles.floorItemsInfo}>
                  <Ionicons name="list" size={14} color={Colors.textTertiary} />
                  <Text style={styles.floorItemsText}>{floor.lines?.length || 0} line items</Text>
                </View>
              </View>
            ))}

            {/* Floor Totals Summary */}
            {(estimate.parking_total > 0 || estimate.basement_total > 0 || estimate.terrace_total > 0) && (
              <View style={styles.floorSummary}>
                <Text style={styles.floorSummaryTitle}>Special Area Totals</Text>
                {estimate.parking_total > 0 && (
                  <View style={styles.floorSummaryRow}>
                    <View style={styles.floorSummaryLeft}>
                      <Ionicons name="car" size={16} color={Colors.warning} />
                      <Text style={styles.floorSummaryLabel}>Parking</Text>
                    </View>
                    <Text style={styles.floorSummaryValue}>₹{estimate.parking_total?.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                {estimate.basement_total > 0 && (
                  <View style={styles.floorSummaryRow}>
                    <View style={styles.floorSummaryLeft}>
                      <Ionicons name="layers" size={16} color={Colors.info} />
                      <Text style={styles.floorSummaryLabel}>Basement</Text>
                    </View>
                    <Text style={styles.floorSummaryValue}>₹{estimate.basement_total?.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                {estimate.terrace_total > 0 && (
                  <View style={styles.floorSummaryRow}>
                    <View style={styles.floorSummaryLeft}>
                      <Ionicons name="sunny" size={16} color={Colors.success} />
                      <Text style={styles.floorSummaryLabel}>Terrace</Text>
                    </View>
                    <Text style={styles.floorSummaryValue}>₹{estimate.terrace_total?.toLocaleString('en-IN')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Client Summary Section - For Sharing */}
        {estimate.is_floor_wise && estimate.summary && (
          <View style={styles.clientSummarySection}>
            <View style={styles.clientSummaryHeader}>
              <Ionicons name="document-text" size={24} color={Colors.primary} />
              <Text style={styles.clientSummaryTitle}>Estimate Summary (For Client)</Text>
            </View>

            {/* Area Breakdown */}
            <View style={styles.areaBreakdown}>
              <Text style={styles.areaBreakdownTitle}>Area Breakdown</Text>
              <View style={styles.areaBreakdownRow}>
                <Text style={styles.areaBreakdownLabel}>Built-up Area ({estimate.summary.num_regular_floors || estimate.num_floors} floors × {estimate.summary.area_per_floor?.toLocaleString('en-IN')} sqft)</Text>
                <Text style={styles.areaBreakdownValue}>{estimate.summary.built_up_area?.toLocaleString('en-IN')} sqft</Text>
              </View>
              {estimate.summary.headroom_area > 0 && (
                <View style={styles.areaBreakdownRow}>
                  <Text style={styles.areaBreakdownLabel}>+ Headroom/Terrace</Text>
                  <Text style={styles.areaBreakdownValue}>{estimate.summary.headroom_area?.toLocaleString('en-IN')} sqft</Text>
                </View>
              )}
              <View style={[styles.areaBreakdownRow, styles.areaBreakdownTotal]}>
                <Text style={styles.areaBreakdownTotalLabel}>Total Built-up Area</Text>
                <Text style={styles.areaBreakdownTotalValue}>{estimate.summary.total_built_up_with_headroom?.toLocaleString('en-IN')} sqft</Text>
              </View>
              {estimate.summary.parking_area > 0 && (
                <View style={styles.areaBreakdownRow}>
                  <Text style={styles.areaBreakdownLabel}>Parking Area (separate)</Text>
                  <Text style={styles.areaBreakdownValue}>{estimate.summary.parking_area?.toLocaleString('en-IN')} sqft</Text>
                </View>
              )}
              {estimate.summary.basement_area > 0 && (
                <View style={styles.areaBreakdownRow}>
                  <Text style={styles.areaBreakdownLabel}>Basement Area (separate)</Text>
                  <Text style={styles.areaBreakdownValue}>{estimate.summary.basement_area?.toLocaleString('en-IN')} sqft</Text>
                </View>
              )}
            </View>
            
            <View style={styles.summaryTable}>
              <View style={styles.summaryTableHeader}>
                <Text style={styles.summaryTableHeaderText}>Description</Text>
                <Text style={styles.summaryTableHeaderText}>Area</Text>
                <Text style={styles.summaryTableHeaderText}>Rate</Text>
                <Text style={styles.summaryTableHeaderText}>Amount</Text>
              </View>
              
              {/* Built-up Area Row (includes headroom) */}
              <View style={styles.summaryTableRow}>
                <Text style={styles.summaryTableCell}>Built-up + Headroom</Text>
                <Text style={styles.summaryTableCell}>{estimate.summary.total_built_up_with_headroom?.toLocaleString('en-IN')}</Text>
                <Text style={styles.summaryTableCell}>₹{estimate.summary.package_rate?.toLocaleString('en-IN')}</Text>
                <Text style={styles.summaryTableCellAmount}>₹{estimate.summary.built_up_amount?.toLocaleString('en-IN')}</Text>
              </View>
              
              {/* Parking Row */}
              {estimate.summary.parking_area > 0 && (
                <View style={styles.summaryTableRow}>
                  <Text style={styles.summaryTableCell}>Parking Area</Text>
                  <Text style={styles.summaryTableCell}>{estimate.summary.parking_area?.toLocaleString('en-IN')}</Text>
                  <Text style={styles.summaryTableCell}>₹{estimate.summary.parking_rate?.toLocaleString('en-IN')}</Text>
                  <Text style={styles.summaryTableCellAmount}>₹{estimate.summary.parking_amount?.toLocaleString('en-IN')}</Text>
                </View>
              )}
              
              {/* Basement Row */}
              {estimate.summary.basement_area > 0 && (
                <View style={styles.summaryTableRow}>
                  <Text style={styles.summaryTableCell}>Basement Area</Text>
                  <Text style={styles.summaryTableCell}>{estimate.summary.basement_area?.toLocaleString('en-IN')}</Text>
                  <Text style={styles.summaryTableCell}>₹{estimate.summary.basement_rate?.toLocaleString('en-IN')}</Text>
                  <Text style={styles.summaryTableCellAmount}>₹{estimate.summary.basement_amount?.toLocaleString('en-IN')}</Text>
                </View>
              )}
              
              {/* Total Row */}
              <View style={[styles.summaryTableRow, styles.summaryTableTotalRow]}>
                <Text style={styles.summaryTableTotalLabel}>Total Construction Cost</Text>
                <Text style={styles.summaryTableCell}></Text>
                <Text style={styles.summaryTableCell}></Text>
                <Text style={styles.summaryTableTotalAmount}>₹{estimate.summary.total_construction_cost?.toLocaleString('en-IN')}</Text>
              </View>
            </View>
            
            {/* Rate Info */}
            <View style={styles.rateInfo}>
              <Text style={styles.rateInfoTitle}>Rate Structure:</Text>
              <Text style={styles.rateInfoItem}>• Package Rate: ₹{estimate.summary.package_rate?.toLocaleString('en-IN')}/sqft (Built-up + Headroom)</Text>
              {estimate.summary.parking_area > 0 && (
                <Text style={styles.rateInfoItem}>• Parking Rate: ₹{estimate.summary.parking_rate?.toLocaleString('en-IN')}/sqft</Text>
              )}
              {estimate.summary.basement_area > 0 && (
                <Text style={styles.rateInfoItem}>• Basement Rate: ₹{estimate.summary.basement_rate?.toLocaleString('en-IN')}/sqft</Text>
              )}
            </View>
          </View>
        )}

        {/* Legacy Estimate Notice */}
        {!estimate.is_floor_wise && (
          <View style={styles.legacyNotice}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.legacyNoticeText}>
              This is a legacy estimate. Create a new estimate to use floor-wise breakdown features.
            </Text>
          </View>
        )}

        {/* BOQ Categories */}
        <View style={styles.boqSection}>
          <Text style={styles.sectionTitle}>Bill of Quantities (BOQ)</Text>
          <Text style={styles.sectionSubtitle}>{estimate.lines?.length || 0} line items</Text>

          {categories.map((category) => {
            const lines = groupedLines[category];
            const isExpanded = expandedCategories.has(category);
            const categoryTotal = getCategoryTotal(lines);

            return (
              <View key={category} style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category)}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: Colors.primaryPale }]}>
                      <Ionicons name={getCategoryIcon(category)} size={20} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.categoryName}>{getCategoryName(category)}</Text>
                      <Text style={styles.categoryCount}>{lines.length} items</Text>
                    </View>
                  </View>
                  <View style={styles.categoryHeaderRight}>
                    <Text style={styles.categoryTotal}>₹{categoryTotal.toLocaleString('en-IN')}</Text>
                    <Ionicons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={Colors.textSecondary} 
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.lineItems}>
                    {lines.map((line: any, index: number) => (
                      <TouchableOpacity 
                        key={line.id || index} 
                        style={styles.lineItem}
                        onPress={() => setEditingLine(line)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.lineItemHeader}>
                          <Text style={styles.lineItemName}>{line.item_name}</Text>
                          {line.is_user_edited && (
                            <View style={styles.editedBadge}>
                              <Ionicons name="pencil" size={10} color={Colors.secondary} />
                              <Text style={styles.editedText}>Edited</Text>
                            </View>
                          )}
                        </View>
                        
                        {line.description && (
                          <Text style={styles.lineItemDescription}>{line.description}</Text>
                        )}
                        
                        <View style={styles.lineItemDetails}>
                          <View style={styles.lineItemDetailRow}>
                            <Text style={styles.lineItemDetailLabel}>Quantity:</Text>
                            <Text style={styles.lineItemDetailValue}>
                              {line.quantity.toLocaleString('en-IN')} {line.unit}
                            </Text>
                          </View>
                          <View style={styles.lineItemDetailRow}>
                            <Text style={styles.lineItemDetailLabel}>Rate:</Text>
                            <Text style={styles.lineItemDetailValue}>
                              ₹{line.rate.toLocaleString('en-IN')}/{line.unit}
                            </Text>
                          </View>
                          <View style={styles.lineItemDetailRow}>
                            <Text style={styles.lineItemDetailLabel}>Amount:</Text>
                            <Text style={[styles.lineItemDetailValue, styles.lineItemAmount]}>
                              ₹{line.amount.toLocaleString('en-IN')}
                            </Text>
                          </View>
                        </View>

                        {line.formula_used && (
                          <View style={styles.formulaBox}>
                            <Ionicons name="calculator-outline" size={12} color={Colors.textTertiary} />
                            <Text style={styles.formulaText}>{line.formula_used}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Assumptions */}
        {estimate.assumptions && (
          <View style={styles.assumptionsSection}>
            <Text style={styles.sectionTitle}>Assumptions Used</Text>
            <View style={styles.assumptionsCard}>
              {Object.entries(estimate.assumptions).map(([key, value]: [string, any]) => (
                <View key={key} style={styles.assumptionRow}>
                  <Text style={styles.assumptionKey}>{key.replace(/_/g, ' ')}:</Text>
                  <Text style={styles.assumptionValue}>
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.exportButton]}
          onPress={() => handleExport('csv')}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text" size={18} color={Colors.primary} />
              <Text style={styles.exportButtonText}>CSV</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.exportButton]}
          onPress={() => handleExport('pdf')}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="document" size={18} color={Colors.primary} />
              <Text style={styles.exportButtonText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.editButton]}
          onPress={() => router.push(`/projects/${projectId}/estimate/edit/${estimateId}`)}
          disabled={saving}
        >
          <Ionicons name="create" size={18} color={Colors.white} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Go to Project Button - Only show if estimate is linked to a project (not a lead) */}
      {estimate.project_id && projectId !== 'none' && (
        <TouchableOpacity 
          style={styles.goToProjectButton}
          onPress={() => router.push(`/projects/${projectId}`)}
        >
          <Ionicons name="folder-open" size={20} color={Colors.primary} />
          <Text style={styles.goToProjectButtonText}>Go to Project Card</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Edit Line Modal */}
      <EstimateLineEditModal
        visible={!!editingLine}
        line={editingLine}
        onClose={() => setEditingLine(null)}
        onSave={handleSaveEdit}
      />

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.primary} />
              <Text style={styles.modalTitle}>Review Estimate</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              By reviewing this estimate, you confirm that you have checked all details and calculations.
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Add review comments (optional)"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              value={reviewComments}
              onChangeText={setReviewComments}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewComments('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={handleReview}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approve Modal */}
      <Modal
        visible={showApproveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApproveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.success} />
              <Text style={styles.modalTitle}>Approve Estimate</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Final approval means this estimate is authorized for project execution. This action cannot be undone.
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Add approval comments (optional)"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              value={approveComments}
              onChangeText={setApproveComments}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowApproveModal(false);
                  setApproveComments('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmBtn, styles.approveConfirmBtn]}
                onPress={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: Colors.textSecondary,
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
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  breakdownItem: {
    alignItems: 'center',
    gap: 4,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  boqSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  lineItems: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lineItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lineItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryPale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary,
  },
  lineItemDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  lineItemDetails: {
    gap: 4,
  },
  lineItemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineItemDetailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lineItemDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  lineItemAmount: {
    fontWeight: '700',
    color: Colors.primary,
  },
  formulaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
  },
  formulaText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  assumptionsSection: {
    padding: 16,
  },
  assumptionsCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  assumptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  assumptionKey: {
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  assumptionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    flex: 1,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    flex: 1,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  goToProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.primaryPale,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  goToProjectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  // Review & Approval Styles
  approvalSection: {
    padding: 16,
  },
  approvalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  approvalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalContent: {
    flex: 1,
  },
  approvalLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  approvalName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  approvalDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  approvalPending: {
    fontSize: 14,
    color: Colors.warning,
    fontStyle: 'italic',
  },
  commentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: Colors.success,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  commentInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  approveConfirmBtn: {
    backgroundColor: Colors.success,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  // Floor-wise Breakdown Styles
  floorSection: {
    padding: 16,
  },
  floorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  floorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  floorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorIconParking: {
    backgroundColor: Colors.warningLight,
  },
  floorIconBasement: {
    backgroundColor: Colors.infoLight,
  },
  floorIconTerrace: {
    backgroundColor: Colors.successLight,
  },
  floorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  floorArea: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  floorHeaderRight: {
    alignItems: 'flex-end',
  },
  floorTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  floorBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  floorBadgeInfo: {
    backgroundColor: Colors.infoLight,
  },
  floorBadgeSuccess: {
    backgroundColor: Colors.successLight,
  },
  floorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.warning,
  },
  floorBadgeTextInfo: {
    color: Colors.info,
  },
  floorBadgeTextSuccess: {
    color: Colors.success,
  },
  floorBreakdown: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 16,
  },
  floorBreakdownItem: {
    flex: 1,
  },
  floorBreakdownLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  floorBreakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  floorItemsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  floorItemsText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  floorSummary: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floorSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  floorSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  floorSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floorSummaryLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  floorSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  legacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 16,
    backgroundColor: Colors.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.info,
  },
  legacyNoticeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.info,
    lineHeight: 18,
  },
  // Client Summary Section Styles
  clientSummarySection: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  clientSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  clientSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryTable: {
    marginBottom: 16,
  },
  summaryTableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  summaryTableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  summaryTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  summaryTableCell: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  summaryTableCellAmount: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  summaryTableTotalRow: {
    backgroundColor: Colors.primaryPale,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomWidth: 0,
  },
  summaryTableTotalLabel: {
    flex: 2,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryTableTotalAmount: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  rateInfo: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  rateInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  rateInfoItem: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  // Area Breakdown Styles
  areaBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  areaBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  areaBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  areaBreakdownLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  areaBreakdownValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  areaBreakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 10,
  },
  areaBreakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  areaBreakdownTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
