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
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { constructionPresetsAPI } from '../../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

// Material Library Item interface
interface LibraryMaterial {
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

interface SpecItem {
  id: string;
  item_name: string;
  unit: string;
  rate_min: number;
  rate_max: number;
  material_type: string;
  is_mandatory: boolean;
  notes?: string;
  brands: Brand[];
}

interface Brand {
  id: string;
  brand_name: string;
  brand_rate_min?: number;
  brand_rate_max?: number;
  quality_grade?: string;
  supplier_name?: string;
}

interface SpecGroup {
  id: string;
  group_name: string;
  order_index: number;
  spec_items: SpecItem[];
}

const MATERIAL_TYPES = ['Brick', 'Block', 'Cement', 'Steel', 'Finishing', 'Plumbing', 'Electrical', 'Aggregate', 'Other'];
const UNITS = ['bag', 'kg', 'cubic_ft', 'sqft', 'unit', 'meter', 'liter'];
const STATUS_OPTIONS = ['draft', 'active', 'archived'];
const REGIONS = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Other'];

export default function CreateConstructionPresetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'groups' | 'preview'>('basic');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('Bangalore');
  const [effectiveDate, setEffectiveDate] = useState(new Date());
  const [ratePerSqft, setRatePerSqft] = useState('');
  const [status, setStatus] = useState('draft');

  // Spec Groups
  const [specGroups, setSpecGroups] = useState<SpecGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Materials Library Modal
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [libraryMaterials, setLibraryMaterials] = useState<LibraryMaterial[]>([]);
  const [libraryCategories, setLibraryCategories] = useState<Record<string, number>>({});
  const [selectedLibraryCategory, setSelectedLibraryCategory] = useState('');
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadPreset();
    }
  }, [params.id]);

  const loadPreset = async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const response = await constructionPresetsAPI.getById(params.id as string);
      const preset = response.data;
      setName(preset.name);
      setDescription(preset.description || '');
      setRegion(preset.region);
      setEffectiveDate(new Date(preset.effective_date));
      setRatePerSqft(preset.rate_per_sqft.toString());
      setStatus(preset.status);
      setSpecGroups(preset.spec_groups || []);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load preset');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim() || name.length < 3) {
      Alert.alert('Error', 'Name must be at least 3 characters');
      return;
    }
    if (!region.trim()) {
      Alert.alert('Error', 'Region is required');
      return;
    }
    if (!ratePerSqft || parseFloat(ratePerSqft) <= 0) {
      Alert.alert('Error', 'Rate per sqft must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        region: region.trim(),
        effective_date: effectiveDate.toISOString(),
        rate_per_sqft: parseFloat(ratePerSqft),
        status,
        spec_groups: specGroups.map((g, idx) => ({
          group_id: g.id,
          group_name: g.group_name,
          order_index: idx,
          spec_items: g.spec_items.map((item, itemIdx) => ({
            item_id: item.id,
            item_name: item.item_name,
            unit: item.unit,
            rate_min: item.rate_min,
            rate_max: item.rate_max,
            material_type: item.material_type,
            is_mandatory: item.is_mandatory,
            notes: item.notes,
            order_index: itemIdx,
            brand_list: item.brands.map(b => ({
              brand_id: b.id,
              brand_name: b.brand_name,
              brand_rate_min: b.brand_rate_min,
              brand_rate_max: b.brand_rate_max,
              quality_grade: b.quality_grade,
              supplier_name: b.supplier_name,
            })),
          })),
        })),
      };

      if (isEditing) {
        await constructionPresetsAPI.update(params.id as string, data);
        Alert.alert('Success', 'Preset updated successfully');
      } else {
        await constructionPresetsAPI.create(data);
        Alert.alert('Success', 'Preset created successfully');
      }
      router.back();
    } catch (error: any) {
      console.error('Save preset error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save preset';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const addSpecGroup = () => {
    const newGroup: SpecGroup = {
      id: generateId(),
      group_name: `Group ${specGroups.length + 1}`,
      order_index: specGroups.length,
      spec_items: [],
    };
    setSpecGroups([...specGroups, newGroup]);
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  };

  const updateGroupName = (groupId: string, newName: string) => {
    setSpecGroups(groups =>
      groups.map(g => (g.id === groupId ? { ...g, group_name: newName } : g))
    );
  };

  const deleteGroup = (groupId: string) => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group and all its items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setSpecGroups(groups => groups.filter(g => g.id !== groupId)),
        },
      ]
    );
  };

  const addSpecItem = (groupId: string) => {
    const newItem: SpecItem = {
      id: generateId(),
      item_name: 'New Item',
      unit: 'unit',
      rate_min: 0,
      rate_max: 0,
      material_type: 'Other',
      is_mandatory: true,
      brands: [],
    };
    setSpecGroups(groups =>
      groups.map(g =>
        g.id === groupId ? { ...g, spec_items: [...g.spec_items, newItem] } : g
      )
    );
  };

  const updateSpecItem = (groupId: string, itemId: string, updates: Partial<SpecItem>) => {
    setSpecGroups(groups =>
      groups.map(g =>
        g.id === groupId
          ? {
              ...g,
              spec_items: g.spec_items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : g
      )
    );
  };

  const deleteSpecItem = (groupId: string, itemId: string) => {
    setSpecGroups(groups =>
      groups.map(g =>
        g.id === groupId
          ? { ...g, spec_items: g.spec_items.filter(item => item.id !== itemId) }
          : g
      )
    );
  };

  const addBrand = (groupId: string, itemId: string) => {
    const newBrand: Brand = {
      id: generateId(),
      brand_name: 'New Brand',
    };
    setSpecGroups(groups =>
      groups.map(g =>
        g.id === groupId
          ? {
              ...g,
              spec_items: g.spec_items.map(item =>
                item.id === itemId ? { ...item, brands: [...item.brands, newBrand] } : item
              ),
            }
          : g
      )
    );
  };

  const updateBrand = (groupId: string, itemId: string, brandId: string, updates: Partial<Brand>) => {
    setSpecGroups(groups =>
      groups.map(g =>
        g.id === groupId
          ? {
              ...g,
              spec_items: g.spec_items.map(item =>
                item.id === itemId
                  ? {
                      ...item,
                      brands: item.brands.map(b =>
                        b.id === brandId ? { ...b, ...updates } : b
                      ),
                    }
                  : item
              ),
            }
          : g
      )
    );
  };

  const deleteBrand = (groupId: string, itemId: string, brandId: string) => {
    setSpecGroups(groups =>
      groups.map(g =>
        g.id === groupId
          ? {
              ...g,
              spec_items: g.spec_items.map(item =>
                item.id === itemId
                  ? { ...item, brands: item.brands.filter(b => b.id !== brandId) }
                  : item
              ),
            }
          : g
      )
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

  // Materials Library Functions
  const openMaterialsLibrary = async (groupId: string) => {
    setTargetGroupId(groupId);
    setSelectedMaterials(new Set());
    setMaterialSearchQuery('');
    setSelectedLibraryCategory('');
    setShowMaterialsModal(true);
    await loadMaterialsLibrary();
  };

  const loadMaterialsLibrary = async () => {
    setMaterialsLoading(true);
    try {
      const response = await constructionPresetsAPI.getMaterialsLibrary({
        category: selectedLibraryCategory || undefined,
        region: region,
      });
      setLibraryMaterials(response.data.materials || []);
      setLibraryCategories(response.data.categories || {});
    } catch (error: any) {
      console.error('Failed to load materials library:', error);
      Alert.alert('Error', 'Failed to load materials library');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const toggleMaterialSelection = (itemName: string) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const selectAllFilteredMaterials = () => {
    const filtered = getFilteredMaterials();
    const allNames = new Set(filtered.map(m => m.item_name));
    setSelectedMaterials(allNames);
  };

  const clearMaterialSelection = () => {
    setSelectedMaterials(new Set());
  };

  const getFilteredMaterials = () => {
    return libraryMaterials.filter(material => {
      const matchesSearch = !materialSearchQuery || 
        material.item_name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
        material.category.toLowerCase().includes(materialSearchQuery.toLowerCase());
      const matchesCategory = !selectedLibraryCategory || material.category === selectedLibraryCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const importSelectedMaterials = () => {
    if (!targetGroupId || selectedMaterials.size === 0) {
      Alert.alert('No Selection', 'Please select at least one material to import');
      return;
    }

    const materialsToImport = libraryMaterials.filter(m => selectedMaterials.has(m.item_name));
    
    const newSpecItems: SpecItem[] = materialsToImport.map(material => ({
      id: generateId(),
      item_name: material.item_name,
      unit: material.unit,
      rate_min: material.rate_min,
      rate_max: material.rate_max,
      material_type: mapCategoryToMaterialType(material.category),
      is_mandatory: material.is_mandatory,
      notes: material.description,
      brands: material.brands.map(b => ({
        id: generateId(),
        brand_name: b.name,
        brand_rate_min: b.rate,
        brand_rate_max: b.rate,
        quality_grade: b.grade,
      })),
    }));

    setSpecGroups(groups =>
      groups.map(g =>
        g.id === targetGroupId
          ? { ...g, spec_items: [...g.spec_items, ...newSpecItems] }
          : g
      )
    );

    setShowMaterialsModal(false);
    Alert.alert('Success', `${newSpecItems.length} material(s) imported successfully`);
  };

  const mapCategoryToMaterialType = (category: string): string => {
    const mapping: Record<string, string> = {
      'Cement & Binding Materials': 'Cement',
      'Steel & Reinforcement': 'Steel',
      'Aggregates & Sand': 'Aggregate',
      'Bricks, Blocks & Masonry': 'Brick',
      'Flooring & Tiles': 'Finishing',
      'Paints & Coatings': 'Finishing',
      'Plumbing Materials': 'Plumbing',
      'Electrical Materials': 'Electrical',
      'Waterproofing & Insulation': 'Other',
      'Doors & Windows': 'Other',
      'Structural Materials': 'Other',
    };
    return mapping[category] || 'Other';
  };

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= specGroups.length) return;
    const newGroups = [...specGroups];
    [newGroups[index], newGroups[newIndex]] = [newGroups[newIndex], newGroups[index]];
    setSpecGroups(newGroups);
  };

  const renderBasicInfoTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Preset Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Bangalore Standard 2025"
          placeholderTextColor={Colors.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of this preset..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Region *</Text>
        <View style={styles.chipContainer}>
          {REGIONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, region === r && styles.chipActive]}
              onPress={() => setRegion(r)}
            >
              <Text style={[styles.chipText, region === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Effective Date *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.dateText}>{effectiveDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={effectiveDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setEffectiveDate(date);
            }}
          />
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Rate per Sqft (₹) *</Text>
        <TextInput
          style={styles.input}
          value={ratePerSqft}
          onChangeText={setRatePerSqft}
          placeholder="e.g., 2500"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.chipContainer}>
          {STATUS_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, status === s && styles.chipActive]}
              onPress={() => setStatus(s)}
            >
              <Ionicons
                name={s === 'active' ? 'checkmark-circle' : s === 'draft' ? 'create' : 'archive'}
                size={16}
                color={status === s ? Colors.white : Colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderSpecGroupsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.groupsHeader}>
        <Text style={styles.sectionTitle}>Specification Groups</Text>
        <TouchableOpacity style={styles.addButton} onPress={addSpecGroup}>
          <Ionicons name="add-circle" size={20} color={Colors.white} />
          <Text style={styles.addButtonText}>Add Group</Text>
        </TouchableOpacity>
      </View>

      {specGroups.length === 0 ? (
        <View style={styles.emptyGroups}>
          <Ionicons name="layers-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No specification groups yet</Text>
          <Text style={styles.emptySubtext}>Add groups to organize your spec items</Text>
        </View>
      ) : (
        specGroups.map((group, groupIndex) => (
          <View key={group.id} style={styles.groupCard}>
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => toggleGroup(group.id)}
            >
              <View style={styles.groupHeaderLeft}>
                <Ionicons
                  name={expandedGroups.has(group.id) ? 'chevron-down' : 'chevron-forward'}
                  size={20}
                  color={Colors.textSecondary}
                />
                <TextInput
                  style={styles.groupNameInput}
                  value={group.group_name}
                  onChangeText={(text) => updateGroupName(group.id, text)}
                  placeholder="Group Name"
                />
                <Text style={styles.itemCount}>({group.spec_items.length} items)</Text>
              </View>
              <View style={styles.groupActions}>
                <TouchableOpacity
                  onPress={() => moveGroup(groupIndex, 'up')}
                  disabled={groupIndex === 0}
                  style={[styles.iconButton, groupIndex === 0 && styles.iconButtonDisabled]}
                >
                  <Ionicons name="arrow-up" size={18} color={groupIndex === 0 ? Colors.textTertiary : Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveGroup(groupIndex, 'down')}
                  disabled={groupIndex === specGroups.length - 1}
                  style={[styles.iconButton, groupIndex === specGroups.length - 1 && styles.iconButtonDisabled]}
                >
                  <Ionicons name="arrow-down" size={18} color={groupIndex === specGroups.length - 1 ? Colors.textTertiary : Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteGroup(group.id)} style={styles.iconButton}>
                  <Ionicons name="trash" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {expandedGroups.has(group.id) && (
              <View style={styles.groupContent}>
                {group.spec_items.map((item) => (
                  <View key={item.id} style={styles.specItemCard}>
                    <View style={styles.specItemHeader}>
                      <TextInput
                        style={styles.itemNameInput}
                        value={item.item_name}
                        onChangeText={(text) => updateSpecItem(group.id, item.id, { item_name: text })}
                        placeholder="Item Name"
                      />
                      <TouchableOpacity onPress={() => deleteSpecItem(group.id, item.id)}>
                        <Ionicons name="close-circle" size={20} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.specItemRow}>
                      <View style={styles.halfField}>
                        <Text style={styles.smallLabel}>Unit</Text>
                        <View style={styles.pickerContainer}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {UNITS.map(u => (
                              <TouchableOpacity
                                key={u}
                                style={[styles.miniChip, item.unit === u && styles.miniChipActive]}
                                onPress={() => updateSpecItem(group.id, item.id, { unit: u })}
                              >
                                <Text style={[styles.miniChipText, item.unit === u && styles.miniChipTextActive]}>{u}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                      <View style={styles.halfField}>
                        <Text style={styles.smallLabel}>Material Type</Text>
                        <View style={styles.pickerContainer}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {MATERIAL_TYPES.map(t => (
                              <TouchableOpacity
                                key={t}
                                style={[styles.miniChip, item.material_type === t && styles.miniChipActive]}
                                onPress={() => updateSpecItem(group.id, item.id, { material_type: t })}
                              >
                                <Text style={[styles.miniChipText, item.material_type === t && styles.miniChipTextActive]}>{t}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    </View>

                    <View style={styles.specItemRow}>
                      <View style={styles.quarterField}>
                        <Text style={styles.smallLabel}>Min Rate (₹)</Text>
                        <TextInput
                          style={styles.smallInput}
                          value={item.rate_min.toString()}
                          onChangeText={(text) => updateSpecItem(group.id, item.id, { rate_min: parseFloat(text) || 0 })}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.quarterField}>
                        <Text style={styles.smallLabel}>Max Rate (₹)</Text>
                        <TextInput
                          style={styles.smallInput}
                          value={item.rate_max.toString()}
                          onChangeText={(text) => updateSpecItem(group.id, item.id, { rate_max: parseFloat(text) || 0 })}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.quarterField}>
                        <TouchableOpacity
                          style={[styles.mandatoryToggle, item.is_mandatory && styles.mandatoryToggleActive]}
                          onPress={() => updateSpecItem(group.id, item.id, { is_mandatory: !item.is_mandatory })}
                        >
                          <Ionicons
                            name={item.is_mandatory ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={item.is_mandatory ? Colors.white : Colors.textSecondary}
                          />
                          <Text style={[styles.mandatoryText, item.is_mandatory && styles.mandatoryTextActive]}>Mandatory</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Brands Section */}
                    <View style={styles.brandsSection}>
                      <View style={styles.brandsHeader}>
                        <Text style={styles.brandsTitle}>Brands ({item.brands.length})</Text>
                        <TouchableOpacity onPress={() => addBrand(group.id, item.id)}>
                          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                      {item.brands.map((brand) => (
                        <View key={brand.id} style={styles.brandRow}>
                          <TextInput
                            style={styles.brandNameInput}
                            value={brand.brand_name}
                            onChangeText={(text) => updateBrand(group.id, item.id, brand.id, { brand_name: text })}
                            placeholder="Brand Name"
                          />
                          <TextInput
                            style={styles.brandRateInput}
                            value={brand.supplier_name || ''}
                            onChangeText={(text) => updateBrand(group.id, item.id, brand.id, { supplier_name: text })}
                            placeholder="Supplier"
                          />
                          <TouchableOpacity onPress={() => deleteBrand(group.id, item.id, brand.id)}>
                            <Ionicons name="close" size={18} color={Colors.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={styles.addItemActions}>
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => addSpecItem(group.id)}
                  >
                    <Ionicons name="add" size={18} color={Colors.primary} />
                    <Text style={styles.addItemText}>Add Item</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.importLibraryButton}
                    onPress={() => openMaterialsLibrary(group.id)}
                  >
                    <Ionicons name="library" size={18} color={Colors.white} />
                    <Text style={styles.importLibraryText}>Import from Library</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  const renderPreviewTab = () => {
    const totalItems = specGroups.reduce((sum, g) => sum + g.spec_items.length, 0);
    const totalBrands = specGroups.reduce(
      (sum, g) => sum + g.spec_items.reduce((s, i) => s + i.brands.length, 0),
      0
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Ionicons name="construct" size={32} color={Colors.primary} />
            <Text style={styles.previewTitle}>{name || 'Untitled Preset'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status === 'active' ? Colors.successPale : status === 'draft' ? Colors.warningPale : Colors.backgroundAlt }]}>
              <Text style={[styles.statusBadgeText, { color: status === 'active' ? Colors.success : status === 'draft' ? Colors.warning : Colors.textSecondary }]}>
                {status.toUpperCase()}
              </Text>
            </View>
          </View>

          {description && <Text style={styles.previewDescription}>{description}</Text>}

          <View style={styles.previewMeta}>
            <View style={styles.previewMetaItem}>
              <Ionicons name="location" size={16} color={Colors.textSecondary} />
              <Text style={styles.previewMetaText}>{region}</Text>
            </View>
            <View style={styles.previewMetaItem}>
              <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
              <Text style={styles.previewMetaText}>{effectiveDate.toLocaleDateString()}</Text>
            </View>
            <View style={styles.previewMetaItem}>
              <Ionicons name="pricetag" size={16} color={Colors.success} />
              <Text style={[styles.previewMetaText, { color: Colors.success, fontWeight: '700' }]}>₹{ratePerSqft || '0'}/sqft</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{specGroups.length}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalItems}</Text>
            <Text style={styles.statLabel}>Spec Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalBrands}</Text>
            <Text style={styles.statLabel}>Brands</Text>
          </View>
        </View>

        {specGroups.length > 0 && (
          <View style={styles.previewGroups}>
            <Text style={styles.sectionTitle}>Groups Overview</Text>
            {specGroups.map((group, idx) => (
              <View key={group.id} style={styles.previewGroupItem}>
                <Text style={styles.previewGroupNumber}>{idx + 1}</Text>
                <View style={styles.previewGroupInfo}>
                  <Text style={styles.previewGroupName}>{group.group_name}</Text>
                  <Text style={styles.previewGroupMeta}>{group.spec_items.length} items</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading preset...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Preset' : 'Create Preset'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={Colors.white} />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'basic' && styles.tabActive]}
            onPress={() => setActiveTab('basic')}
          >
            <Ionicons name="information-circle" size={18} color={activeTab === 'basic' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'basic' && styles.tabTextActive]}>Basic Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Ionicons name="layers" size={18} color={activeTab === 'groups' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>Spec Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'preview' && styles.tabActive]}
            onPress={() => setActiveTab('preview')}
          >
            <Ionicons name="eye" size={18} color={activeTab === 'preview' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'preview' && styles.tabTextActive]}>Preview</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'basic' && renderBasicInfoTab()}
          {activeTab === 'groups' && renderSpecGroupsTab()}
          {activeTab === 'preview' && renderPreviewTab()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Materials Library Modal */}
      <Modal
        visible={showMaterialsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMaterialsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMaterialsModal(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Materials Library</Text>
            <TouchableOpacity 
              onPress={importSelectedMaterials} 
              style={[styles.modalImportButton, selectedMaterials.size === 0 && styles.modalImportButtonDisabled]}
              disabled={selectedMaterials.size === 0}
            >
              <Text style={[styles.modalImportButtonText, selectedMaterials.size === 0 && styles.modalImportButtonTextDisabled]}>
                Import ({selectedMaterials.size})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search materials..."
              value={materialSearchQuery}
              onChangeText={setMaterialSearchQuery}
              placeholderTextColor={Colors.textTertiary}
            />
            {materialSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setMaterialSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalCategoryScroll}>
            <View style={styles.modalCategoryContainer}>
              <TouchableOpacity
                style={[styles.modalCategoryChip, !selectedLibraryCategory && styles.modalCategoryChipActive]}
                onPress={() => setSelectedLibraryCategory('')}
              >
                <Text style={[styles.modalCategoryText, !selectedLibraryCategory && styles.modalCategoryTextActive]}>
                  All ({libraryMaterials.length})
                </Text>
              </TouchableOpacity>
              {Object.entries(libraryCategories).map(([cat, count]) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalCategoryChip, selectedLibraryCategory === cat && styles.modalCategoryChipActive]}
                  onPress={() => setSelectedLibraryCategory(cat)}
                >
                  <Text style={[styles.modalCategoryText, selectedLibraryCategory === cat && styles.modalCategoryTextActive]}>
                    {cat.split(' ')[0]} ({count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Selection Actions */}
          <View style={styles.modalSelectionBar}>
            <Text style={styles.modalSelectionText}>
              {selectedMaterials.size} selected
            </Text>
            <View style={styles.modalSelectionActions}>
              <TouchableOpacity onPress={selectAllFilteredMaterials} style={styles.modalSelectionButton}>
                <Text style={styles.modalSelectionButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearMaterialSelection} style={styles.modalSelectionButton}>
                <Text style={styles.modalSelectionButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Materials List */}
          {materialsLoading ? (
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.modalLoaderText}>Loading materials...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredMaterials()}
              keyExtractor={(item) => item.item_name}
              renderItem={({ item }) => {
                const isSelected = selectedMaterials.has(item.item_name);
                return (
                  <TouchableOpacity
                    style={[styles.materialCard, isSelected && styles.materialCardSelected]}
                    onPress={() => toggleMaterialSelection(item.item_name)}
                  >
                    <View style={styles.materialCheckbox}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={isSelected ? Colors.primary : Colors.textSecondary}
                      />
                    </View>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialName}>{item.item_name}</Text>
                      <Text style={styles.materialCategory}>{item.category}</Text>
                      <View style={styles.materialMeta}>
                        <Text style={styles.materialRate}>
                          ₹{item.rate_min.toLocaleString()} - ₹{item.rate_max.toLocaleString()}/{item.unit}
                        </Text>
                        {item.brands.length > 0 && (
                          <Text style={styles.materialBrands}>{item.brands.length} brand(s)</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.materialsList}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Ionicons name="cube-outline" size={48} color={Colors.textTertiary} />
                  <Text style={styles.modalEmptyText}>No materials found</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  dateText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  groupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  emptyGroups: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.backgroundAlt,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupNameInput: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  groupContent: {
    padding: 12,
  },
  specItemCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  specItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemNameInput: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  specItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  halfField: {
    flex: 1,
  },
  quarterField: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  pickerContainer: {
    maxHeight: 32,
  },
  miniChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
    marginRight: 4,
  },
  miniChipActive: {
    backgroundColor: Colors.primary,
  },
  miniChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  miniChipTextActive: {
    color: Colors.white,
  },
  smallInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  mandatoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 6,
    marginTop: 16,
  },
  mandatoryToggleActive: {
    backgroundColor: Colors.secondary,
  },
  mandatoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mandatoryTextActive: {
    color: Colors.white,
  },
  brandsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  brandsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  brandNameInput: {
    flex: 2,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 6,
    fontSize: 12,
  },
  brandRateInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 6,
    fontSize: 12,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statsGrid: {
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
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  previewGroups: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewGroupNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryPale,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginRight: 12,
  },
  previewGroupInfo: {
    flex: 1,
  },
  previewGroupName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewGroupMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Add Item Actions Row
  addItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: Colors.primaryPale,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  importLibraryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
  },
  importLibraryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  // Materials Library Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalImportButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalImportButtonDisabled: {
    backgroundColor: Colors.backgroundAlt,
  },
  modalImportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  modalImportButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modalCategoryScroll: {
    maxHeight: 48,
    marginBottom: 8,
  },
  modalCategoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  modalCategoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCategoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalCategoryTextActive: {
    color: Colors.white,
  },
  modalSelectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primaryPale,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.primary,
  },
  modalSelectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalSelectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSelectionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalSelectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoaderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  materialsList: {
    padding: 16,
    paddingTop: 8,
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  materialCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  materialCheckbox: {
    marginRight: 12,
    marginTop: 2,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  materialCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  materialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materialRate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  materialBrands: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  modalEmpty: {
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
