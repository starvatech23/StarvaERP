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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { constructionPresetsAPI } from '../../../services/api';

export default function ConstructionPresetsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, [searchQuery, selectedRegion, selectedStatus]);

  const loadPresets = async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedRegion) params.region = selectedRegion;
      if (selectedStatus) params.status = selectedStatus;

      const response = await constructionPresetsAPI.list(params);
      setPresets(response.data || []);
    } catch (error: any) {
      console.error('Failed to load presets:', error);
      Alert.alert('Error', 'Failed to load construction presets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (preset: any) => {
    Alert.alert(
      '⚠️ Delete Construction Preset?',
      `Name: ${preset.name}\nRegion: ${preset.region}\n\n${
        preset.project_usage_count > 0 
          ? `[!] Used by ${preset.project_usage_count} active projects\nProjects will switch to default preset\n\n`
          : ''
      }Type preset name to confirm:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Deletion',
              'Type the exact preset name:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: (confirmationName) => executeDelete(preset.id, preset.name, confirmationName || ''),
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const executeDelete = async (presetId: string, presetName: string, confirmationName: string) => {
    if (confirmationName !== presetName) {
      Alert.alert('Error', 'Preset name confirmation does not match');
      return;
    }

    setDeleting(presetId);
    try {
      await constructionPresetsAPI.delete(presetId, confirmationName);
      Alert.alert('Success', 'Construction preset deleted successfully');
      loadPresets();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete preset');
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (preset: any) => {
    Alert.prompt(
      'Duplicate Preset',
      'Enter new name for the duplicated preset:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async (newName) => {
            if (!newName || newName.trim().length < 3) {
              Alert.alert('Error', 'Please enter a valid name (at least 3 characters)');
              return;
            }
            
            try {
              await constructionPresetsAPI.duplicate(preset.id, newName.trim());
              Alert.alert('Success', 'Preset duplicated successfully');
              loadPresets();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to duplicate preset');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'draft': return Colors.warning;
      case 'archived': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'draft': return 'create-circle';
      case 'archived': return 'archive';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading construction presets...</Text>
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
          <Text style={styles.headerTitle}>Construction Presets</Text>
          <Text style={styles.headerSubtitle}>{presets.length} preset(s) available</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/admin/construction-presets/create')}
          style={styles.createButton}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search presets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <View style={styles.quickFilters}>
          <TouchableOpacity 
            style={[styles.filterChip, selectedStatus === 'active' && styles.filterChipActive]}
            onPress={() => setSelectedStatus(selectedStatus === 'active' ? '' : 'active')}
          >
            <Text style={[styles.filterChipText, selectedStatus === 'active' && styles.filterChipTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, selectedStatus === 'draft' && styles.filterChipActive]}
            onPress={() => setSelectedStatus(selectedStatus === 'draft' ? '' : 'draft')}
          >
            <Text style={[styles.filterChipText, selectedStatus === 'draft' && styles.filterChipTextActive]}>
              Draft
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Presets List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {presets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Construction Presets</Text>
            <Text style={styles.emptyText}>
              Create your first construction preset to standardize material costs and specifications
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/admin/construction-presets/create')}
            >
              <Ionicons name="add-circle" size={20} color={Colors.white} />
              <Text style={styles.emptyButtonText}>Create First Preset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          presets.map((preset) => (
            <TouchableOpacity 
              key={preset.id}
              style={styles.presetCard}
              onPress={() => router.push(`/admin/construction-presets/${preset.id}`)}
            >
              <View style={styles.presetHeader}>
                <View style={styles.presetIcon}>
                  <Ionicons name="construct" size={24} color={Colors.primary} />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <Text style={styles.presetRegion}>📍 {preset.region}</Text>
                  {preset.description && (
                    <Text style={styles.presetDescription}>{preset.description}</Text>
                  )}
                </View>
                <View style={styles.statusBadge}>
                  <Ionicons 
                    name={getStatusIcon(preset.status)} 
                    size={16} 
                    color={getStatusColor(preset.status)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(preset.status) }]}>
                    {preset.status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.presetMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="pricetag" size={16} color={Colors.success} />
                  <Text style={styles.metaText}>₹{preset.rate_per_sqft}/sqft</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="list" size={16} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{preset.spec_items_count} items</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="folder" size={16} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{preset.spec_groups_count} groups</Text>
                </View>
                {preset.project_usage_count > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="briefcase" size={16} color={Colors.warning} />
                    <Text style={styles.metaText}>{preset.project_usage_count} projects</Text>
                  </View>
                )}
              </View>

              <View style={styles.presetActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/construction-presets/${preset.id}`);
                  }}
                >
                  <Ionicons name="eye" size={16} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/construction-presets/${preset.id}/edit`);
                  }}
                >
                  <Ionicons name="create" size={16} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDuplicate(preset);
                  }}
                >
                  <Ionicons name="copy" size={16} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Duplicate</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(preset);
                  }}
                  disabled={deleting === preset.id}
                >
                  {deleting === preset.id ? (
                    <ActivityIndicator size={16} color={Colors.danger} />
                  ) : (
                    <Ionicons name="trash" size={16} color={Colors.danger} />
                  )}
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  createButton: {
    backgroundColor: Colors.secondary,
    padding: 12,
    borderRadius: 12,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  presetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  presetIcon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primaryPale,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  presetRegion: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  presetDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  presetMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  presetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  deleteButton: {
    borderColor: Colors.dangerPale,
    backgroundColor: Colors.dangerPale,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButtonText: {
    color: Colors.danger,
  },
});