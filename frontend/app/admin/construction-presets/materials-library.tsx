import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../../../constants/Colors';
import { constructionPresetsAPI } from '../../../services/api';

interface Material {
  item_name: string;
  category: string;
  description: string;
  unit: string;
  specifications: string;
  rate_min: number;
  rate_max: number;
  brands: Array<{ name: string; rate: number; grade: string }>;
  is_mandatory: boolean;
}

interface Template {
  name: string;
  description: string;
  project_type: string;
  region: string;
  quality_preference: string;
  categories: string[];
}

const REGIONS = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Kochi', 'Jaipur'];

export default function MaterialsLibraryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<{ [key: string]: string }>({});
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState('Bangalore');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedRegion]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [materialsRes, templatesRes] = await Promise.all([
        constructionPresetsAPI.getMaterialsLibrary({
          category: selectedCategory || undefined,
          region: selectedRegion,
        }),
        constructionPresetsAPI.getTemplates(),
      ]);

      setMaterials(materialsRes.data.materials || []);
      setCategories(materialsRes.data.categories || {});
      setTotalCount(materialsRes.data.total_count || 0);
      setTemplates(templatesRes.data.templates || []);
    } catch (error: any) {
      console.error('Failed to load materials:', error);
      Alert.alert('Error', 'Failed to load materials library');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const handleUploadExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);
      setShowUploadModal(false);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);

      const response = await constructionPresetsAPI.uploadExcel(formData);
      
      Alert.alert(
        'Excel Parsed Successfully',
        `Found ${response.data.total_count} items.\nColumns detected: ${response.data.columns_found?.join(', ')}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.response?.data?.detail || 'Failed to process Excel file');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);
      setShowUploadModal(false);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/pdf',
      } as any);

      const response = await constructionPresetsAPI.uploadPDF(formData);
      
      Alert.alert(
        'PDF Parsed Successfully',
        `Tables found: ${response.data.tables_found}\nItems extracted: ${response.data.items_extracted}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.response?.data?.detail || 'Failed to process PDF file');
    } finally {
      setUploading(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      CEMENT: 'cube',
      STEEL: 'hardware-chip',
      AGGREGATES: 'layers',
      MASONRY: 'grid',
      FLOORING: 'apps',
      PAINTING: 'color-palette',
      PLUMBING: 'water',
      ELECTRICAL: 'flash',
      WATERPROOFING: 'umbrella',
      DOORS_WINDOWS: 'browsers',
      HARDWARE: 'construct',
      WOOD: 'leaf',
      KITCHEN: 'restaurant',
      GLASS: 'glasses',
      ROOFING: 'home',
      SAFETY: 'shield-checkmark',
    };
    return icons[category] || 'cube-outline';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Luxury': return '#9333EA';
      case 'Premium': return Colors.primary;
      case 'Standard': return Colors.success;
      case 'Economy': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  if (loading && materials.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Materials Library...</Text>
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
          <Text style={styles.headerTitle}>Materials Library</Text>
          <Text style={styles.headerSubtitle}>{totalCount} items available</Text>
        </View>
        <TouchableOpacity onPress={() => setShowUploadModal(true)} style={styles.uploadButton}>
          <Ionicons name="cloud-upload" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search materials..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Region Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll}>
          {REGIONS.map(region => (
            <TouchableOpacity
              key={region}
              style={[styles.regionChip, selectedRegion === region && styles.regionChipActive]}
              onPress={() => setSelectedRegion(region)}
            >
              <Text style={[styles.regionChipText, selectedRegion === region && styles.regionChipTextActive]}>
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('')}
          >
            <Ionicons name="apps" size={14} color={!selectedCategory ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
          </TouchableOpacity>
          {Object.entries(categories).map(([key, name]) => (
            <TouchableOpacity
              key={key}
              style={[styles.categoryChip, selectedCategory === key && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(key)}
            >
              <Ionicons 
                name={getCategoryIcon(key) as any} 
                size={14} 
                color={selectedCategory === key ? Colors.white : Colors.textSecondary} 
              />
              <Text style={[styles.categoryChipText, selectedCategory === key && styles.categoryChipTextActive]}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Templates Button */}
      <TouchableOpacity style={styles.templatesButton} onPress={() => setShowTemplateModal(true)}>
        <Ionicons name="copy" size={18} color={Colors.primary} />
        <Text style={styles.templatesButtonText}>Load from Template</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
      </TouchableOpacity>

      {/* Materials List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : filteredMaterials.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No materials found</Text>
          </View>
        ) : (
          filteredMaterials.map((material, idx) => (
            <TouchableOpacity
              key={`${material.item_name}-${idx}`}
              style={styles.materialCard}
              onPress={() => toggleItem(material.item_name)}
              activeOpacity={0.7}
            >
              <View style={styles.materialHeader}>
                <View style={styles.materialIcon}>
                  <Ionicons name={getCategoryIcon(material.category) as any} size={20} color={Colors.primary} />
                </View>
                <View style={styles.materialInfo}>
                  <Text style={styles.materialName}>{material.item_name}</Text>
                  <Text style={styles.materialCategory}>{categories[material.category] || material.category}</Text>
                </View>
                <View style={styles.materialRate}>
                  <Text style={styles.rateText}>₹{material.rate_min.toLocaleString('en-IN')}</Text>
                  <Text style={styles.rateUnit}>/{material.unit}</Text>
                </View>
                <Ionicons 
                  name={expandedItems.has(material.item_name) ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={Colors.textSecondary} 
                />
              </View>

              {expandedItems.has(material.item_name) && (
                <View style={styles.materialDetails}>
                  <Text style={styles.materialDescription}>{material.description}</Text>
                  
                  {material.specifications && (
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Specifications:</Text>
                      <Text style={styles.specValue}>{material.specifications}</Text>
                    </View>
                  )}

                  <View style={styles.rateRange}>
                    <Text style={styles.rangeLabel}>Rate Range:</Text>
                    <Text style={styles.rangeValue}>
                      ₹{material.rate_min.toLocaleString('en-IN')} - ₹{material.rate_max.toLocaleString('en-IN')} /{material.unit}
                    </Text>
                  </View>

                  {material.brands && material.brands.length > 0 && (
                    <View style={styles.brandsSection}>
                      <Text style={styles.brandsTitle}>Available Brands ({material.brands.length})</Text>
                      <View style={styles.brandsList}>
                        {material.brands.map((brand, bidx) => (
                          <View key={bidx} style={styles.brandChip}>
                            <Text style={styles.brandName}>{brand.name}</Text>
                            <Text style={[styles.brandGrade, { color: getGradeColor(brand.grade) }]}>
                              {brand.grade}
                            </Text>
                            <Text style={styles.brandRate}>₹{brand.rate.toLocaleString('en-IN')}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {material.is_mandatory && (
                    <View style={styles.mandatoryBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.mandatoryText}>Mandatory Item</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Templates Modal */}
      <Modal visible={showTemplateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preset Templates</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {templates.map((template, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.templateCard}
                  onPress={async () => {
                    setShowTemplateModal(false);
                    setLoading(true);
                    try {
                      const response = await constructionPresetsAPI.loadTemplate(template.name, selectedRegion);
                      setMaterials(response.data.materials || []);
                      setTotalCount(response.data.total_count || 0);
                      Alert.alert('Template Loaded', `Loaded ${response.data.total_count} materials from "${template.name}"`);
                    } catch (error: any) {
                      Alert.alert('Error', 'Failed to load template');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <View style={styles.templateIcon}>
                    <Ionicons 
                      name={template.project_type === 'residential' ? 'home' : template.project_type === 'commercial' ? 'business' : 'sparkles'} 
                      size={24} 
                      color={Colors.primary} 
                    />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateDesc}>{template.description}</Text>
                    <View style={styles.templateTags}>
                      <View style={[styles.templateTag, { backgroundColor: getGradeColor(template.quality_preference) + '20' }]}>
                        <Text style={[styles.templateTagText, { color: getGradeColor(template.quality_preference) }]}>
                          {template.quality_preference}
                        </Text>
                      </View>
                      <View style={styles.templateTag}>
                        <Text style={styles.templateTagText}>{template.categories.length} categories</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Specifications</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.uploadOptions}>
              <TouchableOpacity style={styles.uploadOption} onPress={handleUploadExcel}>
                <View style={[styles.uploadIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="document-text" size={32} color="#10B981" />
                </View>
                <Text style={styles.uploadOptionTitle}>Excel File</Text>
                <Text style={styles.uploadOptionDesc}>.xlsx or .xls format</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.uploadOption} onPress={handleUploadPDF}>
                <View style={[styles.uploadIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="document" size={32} color="#EF4444" />
                </View>
                <Text style={styles.uploadOptionTitle}>PDF File</Text>
                <Text style={styles.uploadOptionDesc}>Extract tables from PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.uploadingText}>Processing file...</Text>
        </View>
      )}
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
    marginLeft: 8,
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
  uploadButton: {
    backgroundColor: Colors.secondary,
    padding: 10,
    borderRadius: 10,
  },
  filtersContainer: {
    backgroundColor: Colors.surface,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    margin: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  regionScroll: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  regionChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regionChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  regionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  regionChipTextActive: {
    color: Colors.white,
  },
  categoryScroll: {
    paddingHorizontal: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 12,
    padding: 12,
    backgroundColor: Colors.primaryPale,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  templatesButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  materialCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  materialIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  materialCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  materialRate: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  rateText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  rateUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  materialDetails: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  materialDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 8,
  },
  specValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  rateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 8,
  },
  rangeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  brandsSection: {
    marginTop: 8,
  },
  brandsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  brandsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  brandGrade: {
    fontSize: 10,
    fontWeight: '600',
  },
  brandRate: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
  },
  mandatoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  mandatoryText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalScroll: {
    padding: 16,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  templateDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  templateTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  templateTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 10,
  },
  templateTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  uploadOptions: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  uploadOption: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  uploadOptionDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    fontSize: 16,
    color: Colors.white,
    marginTop: 16,
  },
});
