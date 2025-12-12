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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { constructionPresetsAPI } from '../../../services/api';

interface SpecItem {
  item_id?: string;
  item_name: string;
  unit: string;
  rate_min: number;
  rate_max: number;
  material_type: string;
  is_mandatory: boolean;
  notes?: string;
  brand_list?: Brand[];
}

interface Brand {
  brand_id?: string;
  brand_name: string;
  brand_rate_min?: number;
  brand_rate_max?: number;
  quality_grade?: string;
  supplier_name?: string;
}

interface SpecGroup {
  group_id?: string;
  group_name: string;
  order_index: number;
  spec_items: SpecItem[];
}

interface Preset {
  id: string;
  name: string;
  description?: string;
  region: string;
  effective_date: string;
  rate_per_sqft: number;
  currency: string;
  status: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at?: string;
  spec_groups_count: number;
  spec_items_count: number;
  project_usage_count: number;
  spec_groups: SpecGroup[];
}

export default function PresetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPreset();
  }, [id]);

  const loadPreset = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await constructionPresetsAPI.getById(id as string);
      setPreset(response.data);
      // Expand first group by default
      if (response.data.spec_groups?.length > 0) {
        setExpandedGroups(new Set([response.data.spec_groups[0].group_id || '0']));
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load preset details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    Alert.prompt(
      'Duplicate Preset',
      'Enter name for the new preset:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async (newName) => {
            if (!newName || newName.trim().length < 3) {
              Alert.alert('Error', 'Name must be at least 3 characters');
              return;
            }
            setDuplicating(true);
            try {
              await constructionPresetsAPI.duplicate(id as string, newName.trim());
              Alert.alert('Success', 'Preset duplicated successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to duplicate');
            } finally {
              setDuplicating(false);
            }
          },
        },
      ],
      'plain-text',
      preset?.name ? `${preset.name} (Copy)` : ''
    );
  };

  const handleDelete = () => {
    if (!preset) return;
    
    const warningMessage = preset.project_usage_count > 0
      ? `This preset is used by ${preset.project_usage_count} active projects. Deleting it will affect those projects.\n\n`
      : '';

    Alert.alert(
      '⚠️ Delete Preset?',
      `${warningMessage}Type "${preset.name}" to confirm deletion:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Deletion',
              'Enter the exact preset name:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async (confirmName) => {
                    if (confirmName !== preset.name) {
                      Alert.alert('Error', 'Name does not match');
                      return;
                    }
                    setDeleting(true);
                    try {
                      await constructionPresetsAPI.delete(id as string, confirmName);
                      Alert.alert('Success', 'Preset deleted successfully');
                      router.back();
                    } catch (error: any) {
                      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'draft': return Colors.warning;
      case 'archived': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getMaterialTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      Brick: '#EF4444',
      Block: '#6366F1',
      Cement: '#6B7280',
      Steel: '#3B82F6',
      Finishing: '#10B981',
      Plumbing: '#06B6D4',
      Electrical: '#F59E0B',
      Aggregate: '#8B5CF6',
      Other: '#6B7280',
    };
    return colors[type] || Colors.textSecondary;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading preset details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!preset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.danger} />
          <Text style={styles.errorText}>Preset not found</Text>
          <TouchableOpacity style={styles.backToListButton} onPress={() => router.back()}>
            <Text style={styles.backToListText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.headerTitle} numberOfLines={1}>{preset.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(preset.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(preset.status) }]}>
              {preset.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/admin/construction-presets/create?id=${preset.id}`)}
          style={styles.editButton}
        >
          <Ionicons name="create" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.presetIcon}>
              <Ionicons name="construct" size={32} color={Colors.primary} />
            </View>
            <View style={styles.overviewInfo}>
              <Text style={styles.presetName}>{preset.name}</Text>
              <Text style={styles.presetRegion}>📍 {preset.region}</Text>
            </View>
          </View>

          {preset.description && (
            <Text style={styles.description}>{preset.description}</Text>
          )}

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag" size={20} color={Colors.success} />
              <Text style={styles.metaValue}>₹{preset.rate_per_sqft}</Text>
              <Text style={styles.metaLabel}>per sqft</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={20} color={Colors.primary} />
              <Text style={styles.metaValue}>{new Date(preset.effective_date).toLocaleDateString()}</Text>
              <Text style={styles.metaLabel}>Effective Date</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="git-branch" size={20} color={Colors.textSecondary} />
              <Text style={styles.metaValue}>v{preset.version}</Text>
              <Text style={styles.metaLabel}>Version</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="layers" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{preset.spec_groups_count}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="list" size={24} color={Colors.secondary} />
            <Text style={styles.statNumber}>{preset.spec_items_count}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="briefcase" size={24} color={Colors.warning} />
            <Text style={styles.statNumber}>{preset.project_usage_count}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
        </View>

        {/* Spec Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specification Groups</Text>
          
          {preset.spec_groups?.length === 0 ? (
            <View style={styles.emptyGroups}>
              <Ionicons name="folder-open-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No specification groups</Text>
            </View>
          ) : (
            preset.spec_groups?.map((group, groupIdx) => (
              <View key={group.group_id || groupIdx} style={styles.groupCard}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => toggleGroup(group.group_id || String(groupIdx))}
                >
                  <View style={styles.groupHeaderLeft}>
                    <View style={styles.groupNumber}>
                      <Text style={styles.groupNumberText}>{groupIdx + 1}</Text>
                    </View>
                    <View>
                      <Text style={styles.groupName}>{group.group_name}</Text>
                      <Text style={styles.groupItemCount}>{group.spec_items?.length || 0} items</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedGroups.has(group.group_id || String(groupIdx)) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>

                {expandedGroups.has(group.group_id || String(groupIdx)) && (
                  <View style={styles.groupContent}>
                    {group.spec_items?.map((item, itemIdx) => (
                      <View key={item.item_id || itemIdx} style={styles.specItem}>
                        <View style={styles.specItemHeader}>
                          <View style={styles.specItemMain}>
                            <Text style={styles.specItemName}>{item.item_name}</Text>
                            <View style={styles.specItemTags}>
                              <View style={[styles.materialTag, { backgroundColor: getMaterialTypeColor(item.material_type) + '20' }]}>
                                <Text style={[styles.materialTagText, { color: getMaterialTypeColor(item.material_type) }]}>
                                  {item.material_type}
                                </Text>
                              </View>
                              {item.is_mandatory && (
                                <View style={styles.mandatoryTag}>
                                  <Text style={styles.mandatoryTagText}>Required</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.specItemDetails}>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Unit</Text>
                            <Text style={styles.detailValue}>{item.unit}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Rate Range</Text>
                            <Text style={styles.detailValue}>₹{item.rate_min} - ₹{item.rate_max}</Text>
                          </View>
                        </View>

                        {item.brand_list && item.brand_list.length > 0 && (
                          <View style={styles.brandsSection}>
                            <Text style={styles.brandsTitle}>Available Brands ({item.brand_list.length})</Text>
                            <View style={styles.brandsList}>
                              {item.brand_list.map((brand, brandIdx) => (
                                <View key={brand.brand_id || brandIdx} style={styles.brandChip}>
                                  <Text style={styles.brandName}>{brand.brand_name}</Text>
                                  {brand.supplier_name && (
                                    <Text style={styles.brandSupplier}>• {brand.supplier_name}</Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {item.notes && (
                          <View style={styles.notesSection}>
                            <Ionicons name="document-text-outline" size={14} color={Colors.textTertiary} />
                            <Text style={styles.notesText}>{item.notes}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Audit Info */}
        <View style={styles.auditSection}>
          <Text style={styles.auditTitle}>Audit Information</Text>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Created:</Text>
            <Text style={styles.auditValue}>{new Date(preset.created_at).toLocaleString()}</Text>
          </View>
          {preset.updated_at && (
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Last Updated:</Text>
              <Text style={styles.auditValue}>{new Date(preset.updated_at).toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.duplicateButton]}
            onPress={handleDuplicate}
            disabled={duplicating}
          >
            {duplicating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="copy" size={20} color={Colors.primary} />
                <Text style={styles.duplicateButtonText}>Duplicate Preset</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <>
                <Ionicons name="trash" size={20} color={Colors.danger} />
                <Text style={styles.deleteButtonText}>Delete Preset</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  backToListButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backToListText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
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
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: Colors.secondary,
    padding: 10,
    borderRadius: 10,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  overviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetIcon: {
    width: 56,
    height: 56,
    backgroundColor: Colors.primaryPale,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  overviewInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  presetRegion: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  emptyGroups: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: Colors.backgroundAlt,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  groupItemCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  groupContent: {
    padding: 12,
  },
  specItem: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  specItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  specItemMain: {
    flex: 1,
  },
  specItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  specItemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  materialTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  materialTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mandatoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.dangerPale,
  },
  mandatoryTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.danger,
  },
  specItemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  brandsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  brandsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  brandsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  brandName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  brandSupplier: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  auditSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  auditTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  auditRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  auditLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: 100,
  },
  auditValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  actionsSection: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  duplicateButton: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primary,
  },
  duplicateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.dangerPale,
    borderColor: Colors.danger,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
  },
});
