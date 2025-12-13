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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Colors from '../../../../constants/Colors';
import { estimationAPI } from '../../../../services/api';
import EstimateLineEditModal from '../../../../components/EstimateLineEditModal';

export default function EstimateDetailScreen() {
  const router = useRouter();
  const { id: projectId, estimateId } = useLocalSearchParams();
  
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['excavation_foundation']));
  const [editingLine, setEditingLine] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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

        {/* BOQ Categories */}
        <View style={styles.boqSection}>
          <Text style={styles.sectionTitle}>Bill of Quantities (BOQ)</Text>
          <Text style={styles.sectionSubtitle}>{estimate.lines.length} line items</Text>

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

      {/* Edit Line Modal */}
      <EstimateLineEditModal
        visible={!!editingLine}
        line={editingLine}
        onClose={() => setEditingLine(null)}
        onSave={handleSaveEdit}
      />
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
});
