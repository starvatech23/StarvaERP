import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackToHome from '../../../components/BackToHome';
import { crmFunnelsAPI, crmCategoriesAPI } from '../../../services/api';

interface Stage {
  name: string;
  description: string;
  color: string;
  order: number;
  default_probability: number;
  expected_duration_days: number;
}

export default function CreateFunnelScreen() {
  const router = useRouter();
  const [funnelName, setFunnelName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stages, setStages] = useState<Stage[]>([
    { name: 'New Lead', description: '', color: Colors.primary, order: 1, default_probability: 0.1, expected_duration_days: 3 },
    { name: 'Contacted', description: '', color: '#8B5CF6', order: 2, default_probability: 0.3, expected_duration_days: 5 },
    { name: 'Qualified', description: '', color: '#10B981', order: 3, default_probability: 0.5, expected_duration_days: 7 },
    { name: 'Proposal', description: '', color: '#F59E0B', order: 4, default_probability: 0.7, expected_duration_days: 10 },
    { name: 'Negotiation', description: '', color: '#EF4444', order: 5, default_probability: 0.9, expected_duration_days: 7 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await crmCategoriesAPI.getAll();
      setCategories(res.data);
      
      // Show alert if no categories exist
      if (res.data.length === 0) {
        Alert.alert(
          'No Categories Found',
          'You need to create at least one category before creating a funnel. Would you like to go to Categories now?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            { text: 'Go to Categories', onPress: () => router.push('/crm/categories' as any) }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const addStage = () => {
    const newStage: Stage = {
      name: `Stage ${stages.length + 1}`,
      description: '',
      color: '#6B7280',
      order: stages.length + 1,
      default_probability: 0.5,
      expected_duration_days: 5,
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 2) {
      Alert.alert('Minimum Required', 'A funnel must have at least 2 stages');
      return;
    }
    const newStages = stages.filter((_, i) => i !== index);
    // Reorder stages
    newStages.forEach((stage, i) => {
      stage.order = i + 1;
    });
    setStages(newStages);
  };

  const updateStage = (index: number, field: keyof Stage, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    // Update order
    newStages.forEach((stage, i) => {
      stage.order = i + 1;
    });
    
    setStages(newStages);
  };

  const handleSave = async () => {
    if (!funnelName.trim()) {
      Alert.alert('Validation Error', 'Please enter a funnel name');
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one category');
      return;
    }

    if (stages.length < 2) {
      Alert.alert('Validation Error', 'A funnel must have at least 2 stages');
      return;
    }

    // Validate stage names
    for (const stage of stages) {
      if (!stage.name.trim()) {
        Alert.alert('Validation Error', 'All stages must have a name');
        return;
      }
    }

    try {
      setSaving(true);
      
      await crmFunnelsAPI.create({
        name: funnelName,
        description: description || undefined,
        is_active: true,
        category_ids: selectedCategories,
        stages: stages.map(s => ({
          name: s.name,
          description: s.description || undefined,
          color: s.color,
          order: s.order,
          default_probability: s.default_probability,
          expected_duration_days: s.expected_duration_days || undefined,
        })),
        custom_field_ids: [],
        assigned_to_users: [],
        assigned_to_teams: [],
        assigned_to_project_types: [],
      });

      Alert.alert('Success', 'Funnel created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Funnel creation error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create funnel';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const stageColors = [Colors.primary, '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <SafeAreaView style={styles.container}>
      <BackToHome />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Create Funnel</Text>
          <Text style={styles.headerSubtitle}>Define your sales pipeline</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Funnel Name *</Text>
              <TextInput
                style={styles.input}
                value={funnelName}
                onChangeText={setFunnelName}
                placeholder="e.g., Residential Sales Pipeline"
                placeholderTextColor="#CBD5E0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe this funnel..."
                placeholderTextColor="#CBD5E0"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lead Categories *</Text>
            <Text style={styles.sectionSubtitle}>Select categories this funnel applies to</Text>
            
            <View style={styles.categoriesGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategories.includes(cat.id) && styles.categoryChipSelected,
                    { borderColor: cat.color }
                  ]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategories.includes(cat.id) && styles.categoryChipTextSelected
                  ]}>
                    {cat.name}
                  </Text>
                  {selectedCategories.includes(cat.id) && (
                    <Ionicons name="checkmark-circle" size={18} color={cat.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stages */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Pipeline Stages</Text>
                <Text style={styles.sectionSubtitle}>{stages.length} stages configured</Text>
              </View>
              <TouchableOpacity style={styles.addStageButton} onPress={addStage}>
                <Ionicons name="add" size={20} color={Colors.surface} />
              </TouchableOpacity>
            </View>

            {stages.map((stage, index) => (
              <View key={index} style={styles.stageCard}>
                <View style={styles.stageHeader}>
                  <View style={styles.stageHeaderLeft}>
                    <View style={[styles.stageColorDot, { backgroundColor: stage.color }]} />
                    <Text style={styles.stageNumber}>Stage {stage.order}</Text>
                  </View>
                  <View style={styles.stageActions}>
                    <TouchableOpacity onPress={() => moveStage(index, 'up')} disabled={index === 0}>
                      <Ionicons name="chevron-up" size={20} color={index === 0 ? '#CBD5E0' : Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveStage(index, 'down')} disabled={index === stages.length - 1}>
                      <Ionicons name="chevron-down" size={20} color={index === stages.length - 1 ? '#CBD5E0' : Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeStage(index)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.stageInputGroup}>
                  <Text style={styles.stageLabel}>Stage Name *</Text>
                  <TextInput
                    style={styles.stageInput}
                    value={stage.name}
                    onChangeText={(text) => updateStage(index, 'name', text)}
                    placeholder="Stage name"
                    placeholderTextColor="#CBD5E0"
                  />
                </View>

                <View style={styles.stageInputGroup}>
                  <Text style={styles.stageLabel}>Color</Text>
                  <View style={styles.colorPicker}>
                    {stageColors.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          stage.color === color && styles.colorOptionSelected
                        ]}
                        onPress={() => updateStage(index, 'color', color)}
                      >
                        {stage.color === color && (
                          <Ionicons name="checkmark" size={16} color={Colors.surface} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.stageRow}>
                  <View style={[styles.stageInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.stageLabel}>Win Probability</Text>
                    <TextInput
                      style={styles.stageInput}
                      value={String(Math.round(stage.default_probability * 100))}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        updateStage(index, 'default_probability', Math.min(100, Math.max(0, val)) / 100);
                      }}
                      placeholder="50"
                      keyboardType="numeric"
                      placeholderTextColor="#CBD5E0"
                    />
                  </View>

                  <View style={[styles.stageInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.stageLabel}>Expected Days</Text>
                    <TextInput
                      style={styles.stageInput}
                      value={String(stage.expected_duration_days)}
                      onChangeText={(text) => updateStage(index, 'expected_duration_days', parseInt(text) || 0)}
                      placeholder="5"
                      keyboardType="numeric"
                      placeholderTextColor="#CBD5E0"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  saveButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonDisabled: { backgroundColor: '#CBD5E0' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: Colors.surface },
  content: { flex: 1, padding: 16 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  categoryChipSelected: { backgroundColor: '#F0FDF4' },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryChipText: { fontSize: 14, fontWeight: '600', color: '#4A5568' },
  categoryChipTextSelected: { color: Colors.textPrimary },
  addStageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageColorDot: { width: 16, height: 16, borderRadius: 8 },
  stageNumber: { fontSize: 14, fontWeight: '700', color: '#4A5568' },
  stageActions: { flexDirection: 'row', gap: 12 },
  stageInputGroup: { marginBottom: 12 },
  stageLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  stageInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stageRow: {
    flexDirection: 'row',
  },
});
