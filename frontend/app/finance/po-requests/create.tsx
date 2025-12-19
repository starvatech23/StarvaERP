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
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { poRequestAPI, projectsAPI, materialsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#6B7280' },
  { value: 'medium', label: 'Medium', color: '#3B82F6' },
  { value: 'high', label: 'High', color: '#F59E0B' },
  { value: 'urgent', label: 'Urgent', color: '#EF4444' },
];

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  min_stock_level?: number;
  unit_price?: number;
}

interface LineItem {
  item_name: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
  specifications: string;
  material_id?: string;
  is_new_material: boolean;
}

export default function CreatePORequestScreen() {
  const router = useRouter();
  const { projectId, projectName } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  
  // Form state
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [justification, setJustification] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { item_name: '', quantity: 0, unit: 'units', estimated_unit_price: 0, specifications: '', is_new_material: true },
  ]);
  
  // Material search state
  const [activeLineItemIndex, setActiveLineItemIndex] = useState<number | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);

  useEffect(() => {
    loadProjects();
    loadMaterials();
  }, []);

  useEffect(() => {
    // Pre-select project if passed as param and auto-populate details
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setDeliveryLocation(project.location || project.address || '');
        // Auto-set title based on project
        if (!title) {
          setTitle(`Material Purchase - ${project.name}`);
        }
      }
    }
  }, [projectId, projects]);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadMaterials = async () => {
    try {
      const response = await materialsAPI.getAll();
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  // Handle material name input change
  const handleMaterialNameChange = (text: string, index: number) => {
    // Update line item with the typed text
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      item_name: text,
      is_new_material: true,
      material_id: undefined,
    };
    setLineItems(updated);
    
    // Show suggestions if text is not empty
    setActiveLineItemIndex(index);
    if (text.trim().length > 0) {
      const filtered = materials.filter((m) =>
        m.name.toLowerCase().includes(text.toLowerCase()) ||
        m.category?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredMaterials(filtered.slice(0, 5));
      setShowMaterialSuggestions(filtered.length > 0);
    } else {
      setFilteredMaterials([]);
      setShowMaterialSuggestions(false);
    }
  };

  // Select material from suggestions
  const selectMaterial = (material: Material, index: number) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      item_name: material.name,
      unit: material.unit || 'units',
      estimated_unit_price: material.unit_price || 0,
      material_id: material.id,
      is_new_material: false,
    };
    setLineItems(updated);
    setShowMaterialSuggestions(false);
    setActiveLineItemIndex(null);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.estimated_unit_price);
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { item_name: '', quantity: 0, unit: 'units', estimated_unit_price: 0, specifications: '', is_new_material: true }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const validateForm = () => {
    if (!selectedProject) {
      Alert.alert('Validation Error', 'Please select a project');
      return false;
    }
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title');
      return false;
    }
    const validItems = lineItems.filter((item) => item.item_name.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one line item with name and quantity');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const validItems = lineItems
        .filter((item) => item.item_name.trim() && item.quantity > 0)
        .map((item) => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          estimated_unit_price: item.estimated_unit_price,
          estimated_total: item.quantity * item.estimated_unit_price,
          specifications: item.specifications,
          material_id: item.material_id,
          is_new_material: item.is_new_material,
        }));

      const payload = {
        project_id: selectedProject.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        required_by_date: requiredByDate ? new Date(requiredByDate).toISOString() : undefined,
        delivery_location: deliveryLocation.trim() || undefined,
        justification: justification.trim() || undefined,
        line_items: validItems,
        total_estimated_amount: calculateTotal(),
      };

      await poRequestAPI.create(payload);

      Alert.alert(
        'Success',
        'PO Request has been submitted successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to create PO request';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Raise PO Request</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Project Selection - Read-only if pre-selected */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project *</Text>
            {projectId && selectedProject ? (
              <View style={styles.projectInfoCard}>
                <Ionicons name="business" size={24} color={Colors.primary} />
                <View style={styles.projectInfoContent}>
                  <Text style={styles.projectInfoName}>{selectedProject.name}</Text>
                  {selectedProject.location && (
                    <Text style={styles.projectInfoLocation}>{selectedProject.location}</Text>
                  )}
                  {selectedProject.client_name && (
                    <Text style={styles.projectInfoClient}>Client: {selectedProject.client_name}</Text>
                  )}
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowProjectPicker(!showProjectPicker)}
                >
                  <Ionicons name="business" size={20} color={Colors.textSecondary} />
                  <Text style={selectedProject ? styles.pickerText : styles.pickerPlaceholder}>
                    {selectedProject?.name || 'Select a project'}
                  </Text>
                  <Ionicons name={showProjectPicker ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showProjectPicker && (
                  <View style={styles.pickerDropdown}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {projects.map((project) => (
                        <TouchableOpacity
                          key={project.id}
                          style={[
                            styles.pickerOption,
                            selectedProject?.id === project.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedProject(project);
                            setDeliveryLocation(project.location || project.address || '');
                            if (!title) {
                              setTitle(`Material Purchase - ${project.name}`);
                            }
                            setShowProjectPicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{project.name}</Text>
                          {project.location && (
                            <Text style={styles.pickerOptionSubtext}>{project.location}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter PO request title"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you need and why"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.priorityOption,
                    priority === option.value && { borderColor: option.color, backgroundColor: option.color + '20' },
                  ]}
                  onPress={() => setPriority(option.value)}
                >
                  <Ionicons
                    name="flag"
                    size={16}
                    color={priority === option.value ? option.color : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.priorityText,
                      priority === option.value && { color: option.color, fontWeight: '600' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Required By Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required By Date</Text>
            <TextInput
              style={styles.input}
              value={requiredByDate}
              onChangeText={setRequiredByDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Delivery Location - Pre-filled from project */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Location</Text>
            <TextInput
              style={styles.input}
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              placeholder="Where should items be delivered?"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Line Items with Material Autocomplete */}
          <View style={styles.section}>
            <View style={styles.lineItemsHeader}>
              <Text style={styles.sectionTitle}>Line Items *</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={addLineItem}>
                <Ionicons name="add-circle" size={20} color={Colors.primary} />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.materialHint}>
              <Ionicons name="information-circle" size={16} color={Colors.primary} />
              <Text style={styles.materialHintText}>
                Start typing to search existing materials. Price & unit will auto-fill.
              </Text>
            </View>

            {lineItems.map((item, index) => (
              <View key={index} style={styles.lineItemCard}>
                <View style={styles.lineItemHeader}>
                  <Text style={styles.lineItemNumber}>Item #{index + 1}</Text>
                  <View style={styles.lineItemHeaderRight}>
                    {!item.is_new_material && (
                      <View style={styles.existingMaterialBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.existingMaterialText}>From Library</Text>
                      </View>
                    )}
                    {item.is_new_material && item.item_name.trim() && (
                      <View style={styles.newMaterialBadge}>
                        <Ionicons name="add-circle" size={14} color="#F59E0B" />
                        <Text style={styles.newMaterialText}>New Item</Text>
                      </View>
                    )}
                    {lineItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeLineItem(index)}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Material Name with Autocomplete */}
                <View style={styles.materialInputContainer}>
                  <TextInput
                    style={styles.lineItemInput}
                    value={item.item_name}
                    onChangeText={(text) => searchMaterials(text, index)}
                    onFocus={() => {
                      setActiveLineItemIndex(index);
                      if (item.item_name.trim()) {
                        searchMaterials(item.item_name, index);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow tap
                      setTimeout(() => {
                        if (activeLineItemIndex === index) {
                          setShowMaterialSuggestions(false);
                        }
                      }, 200);
                    }}
                    placeholder="Material name * (type to search)"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  
                  {/* Material Suggestions Dropdown */}
                  {showMaterialSuggestions && activeLineItemIndex === index && filteredMaterials.length > 0 && (
                    <View style={styles.suggestionsDropdown}>
                      {filteredMaterials.map((material) => (
                        <TouchableOpacity
                          key={material.id}
                          style={styles.suggestionItem}
                          onPress={() => selectMaterial(material, index)}
                        >
                          <View>
                            <Text style={styles.suggestionName}>{material.name}</Text>
                            <Text style={styles.suggestionDetails}>
                              {material.category} • {material.unit} 
                              {material.unit_price ? ` • ₹${material.unit_price}` : ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.lineItemRow}>
                  <View style={styles.lineItemCol}>
                    <Text style={styles.lineItemLabel}>Quantity *</Text>
                    <TextInput
                      style={styles.lineItemInput}
                      value={item.quantity > 0 ? String(item.quantity) : ''}
                      onChangeText={(text) => updateLineItem(index, 'quantity', parseFloat(text) || 0)}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.lineItemCol}>
                    <Text style={styles.lineItemLabel}>Unit</Text>
                    <TextInput
                      style={[styles.lineItemInput, !item.is_new_material && styles.readOnlyInput]}
                      value={item.unit}
                      onChangeText={(text) => updateLineItem(index, 'unit', text)}
                      placeholder="units"
                      placeholderTextColor={Colors.textSecondary}
                      editable={item.is_new_material}
                    />
                  </View>
                </View>

                <View style={styles.lineItemRow}>
                  <View style={styles.lineItemColFull}>
                    <Text style={styles.lineItemLabel}>Estimated Unit Price (₹)</Text>
                    <TextInput
                      style={[styles.lineItemInput, !item.is_new_material && styles.readOnlyInput]}
                      value={item.estimated_unit_price > 0 ? String(item.estimated_unit_price) : ''}
                      onChangeText={(text) => updateLineItem(index, 'estimated_unit_price', parseFloat(text) || 0)}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                      editable={item.is_new_material}
                    />
                  </View>
                </View>

                <TextInput
                  style={styles.lineItemInput}
                  value={item.specifications}
                  onChangeText={(text) => updateLineItem(index, 'specifications', text)}
                  placeholder="Specifications (optional)"
                  placeholderTextColor={Colors.textSecondary}
                />

                <View style={styles.lineItemTotal}>
                  <Text style={styles.lineItemTotalLabel}>Line Total:</Text>
                  <Text style={styles.lineItemTotalValue}>
                    {formatCurrency(item.quantity * item.estimated_unit_price)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Justification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Justification</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={justification}
              onChangeText={setJustification}
              placeholder="Why is this purchase necessary?"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Total Summary */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Estimated Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitBar}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit PO Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  projectInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  projectInfoContent: {
    flex: 1,
  },
  projectInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  projectInfoLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  projectInfoClient: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  pickerDropdown: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 8,
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primary + '10',
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerOptionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  priorityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  materialHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '10',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  materialHintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
  },
  lineItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  lineItemCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineItemNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  existingMaterialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  existingMaterialText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  newMaterialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newMaterialText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  materialInputContainer: {
    position: 'relative',
    zIndex: 100,
  },
  lineItemInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  readOnlyInput: {
    backgroundColor: '#F3F4F6',
    color: Colors.textSecondary,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  suggestionDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lineItemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  lineItemCol: {
    flex: 1,
  },
  lineItemColFull: {
    flex: 1,
  },
  lineItemLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  lineItemTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lineItemTotalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lineItemTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  totalCard: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  submitBar: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
