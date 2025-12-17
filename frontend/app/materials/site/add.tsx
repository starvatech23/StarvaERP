import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { siteMaterialsAPI, projectsAPI, materialsAPI } from '../../../services/api';
import Colors from '../../../constants/Colors';

type MaterialCondition = 'new' | 'good' | 'fair' | 'damaged' | 'needs_repair';

const CONDITIONS: { value: MaterialCondition; label: string; icon: string }[] = [
  { value: 'new', label: 'New', icon: 'sparkles' },
  { value: 'good', label: 'Good', icon: 'checkmark-circle' },
  { value: 'fair', label: 'Fair', icon: 'remove-circle' },
  { value: 'damaged', label: 'Damaged', icon: 'warning' },
  { value: 'needs_repair', label: 'Needs Repair', icon: 'construct' },
];

const COMMON_UNITS = ['bags', 'units', 'kg', 'tons', 'pieces', 'meters', 'sq.ft', 'cu.ft', 'liters'];

export default function AddSiteMaterialScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  // Form state
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [materialType, setMaterialType] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('units');
  const [cost, setCost] = useState('');
  const [condition, setCondition] = useState<MaterialCondition>('new');
  const [notes, setNotes] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [projectsRes, materialsRes] = await Promise.all([
        projectsAPI.getAll(),
        materialsAPI.getAll().catch(() => ({ data: [] })),
      ]);
      console.log('Projects loaded:', projectsRes.data?.length || 0);
      setProjects(projectsRes.data || []);
      setMaterials(materialsRes.data || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      Alert.alert('Error', 'Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to photos to add material images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newUrls = result.assets.map((asset) => {
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          return `data:${mimeType};base64,${asset.base64}`;
        }
        return asset.uri;
      });
      setMediaUrls([...mediaUrls, ...newUrls]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType || 'image/jpeg';
        setMediaUrls([...mediaUrls, `data:${mimeType};base64,${asset.base64}`]);
      } else {
        setMediaUrls([...mediaUrls, asset.uri]);
      }
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedProject) {
      Alert.alert('Validation Error', 'Please select a project');
      return;
    }
    if (!materialType.trim()) {
      Alert.alert('Validation Error', 'Please enter material type');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid quantity');
      return;
    }
    if (mediaUrls.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one photo or video');
      return;
    }

    setSubmitting(true);
    try {
      await siteMaterialsAPI.create({
        project_id: selectedProject.id,
        material_type: materialType.trim(),
        material_id: selectedMaterial?.id,
        quantity: parseFloat(quantity),
        unit,
        cost: cost ? parseFloat(cost) : undefined,
        condition,
        notes: notes.trim() || undefined,
        media_urls: mediaUrls,
      });

      Alert.alert(
        'Success',
        'Material added successfully. It will be reviewed by the operations team.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add material');
    } finally {
      setSubmitting(false);
    }
  };

  const selectMaterial = (mat: any) => {
    setSelectedMaterial(mat);
    setMaterialType(mat.name || mat.material_name);
    if (mat.unit) setUnit(mat.unit);
    setShowMaterialPicker(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Site Material</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Project Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Project / Site *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowProjectPicker(!showProjectPicker)}
            >
              <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
              <Text style={selectedProject ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                {selectedProject?.name || 'Select a project'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            {showProjectPicker && (
              <View style={styles.pickerDropdown}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setSelectedProject(project);
                        setShowProjectPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{project.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Material Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Material Type *</Text>
            <View style={styles.materialInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g., Cement Bags, Steel Bars"
                value={materialType}
                onChangeText={setMaterialType}
              />
              {materials.length > 0 && (
                <TouchableOpacity
                  style={styles.catalogButton}
                  onPress={() => setShowMaterialPicker(!showMaterialPicker)}
                >
                  <Ionicons name="list" size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {showMaterialPicker && materials.length > 0 && (
              <View style={styles.pickerDropdown}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {materials.slice(0, 20).map((mat, index) => (
                    <TouchableOpacity
                      key={mat.id || index}
                      style={styles.pickerItem}
                      onPress={() => selectMaterial(mat)}
                    >
                      <Text style={styles.pickerItemText}>{mat.name || mat.material_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Quantity & Unit */}
          <View style={styles.row}>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="decimal-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
            <View style={[styles.section, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.unitChips}>
                  {COMMON_UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, unit === u && styles.unitChipActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Cost (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>Cost (Optional)</Text>
            <View style={styles.costInput}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={[styles.input, { flex: 1, paddingLeft: 8 }]}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={cost}
                onChangeText={setCost}
              />
            </View>
          </View>

          {/* Condition */}
          <View style={styles.section}>
            <Text style={styles.label}>Condition *</Text>
            <View style={styles.conditionGrid}>
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond.value}
                  style={[
                    styles.conditionCard,
                    condition === cond.value && styles.conditionCardActive,
                  ]}
                  onPress={() => setCondition(cond.value)}
                >
                  <Ionicons
                    name={cond.icon as any}
                    size={24}
                    color={condition === cond.value ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.conditionLabel,
                      condition === cond.value && styles.conditionLabelActive,
                    ]}
                  >
                    {cond.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any additional notes about this material..."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Media Upload */}
          <View style={styles.section}>
            <Text style={styles.label}>Photos / Videos * (Required)</Text>
            <View style={styles.mediaSection}>
              <View style={styles.mediaButtons}>
                <TouchableOpacity style={styles.mediaButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.mediaButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaButton} onPress={handlePickImage}>
                  <Ionicons name="images" size={24} color={Colors.primary} />
                  <Text style={styles.mediaButtonText}>Choose Files</Text>
                </TouchableOpacity>
              </View>

              {mediaUrls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreview}>
                  {mediaUrls.map((url, index) => (
                    <View key={index} style={styles.mediaItem}>
                      <Image source={{ uri: url }} style={styles.mediaImage} />
                      <TouchableOpacity
                        style={styles.removeMediaButton}
                        onPress={() => handleRemoveMedia(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {mediaUrls.length === 0 && (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={48} color={Colors.textSecondary} />
                  <Text style={styles.mediaPlaceholderText}>
                    Add photos or videos of the material
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.submitButtonText}>Submit for Review</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  selectButtonPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  pickerDropdown: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  materialInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catalogButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitChipActive: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primary,
  },
  unitChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  unitChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  costInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingLeft: 14,
  },
  currencySymbol: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  conditionCard: {
    width: '30%',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  conditionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  conditionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  conditionLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  mediaSection: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 16,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    backgroundColor: Colors.primaryPale,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  mediaPreview: {
    marginTop: 16,
  },
  mediaItem: {
    marginRight: 12,
    position: 'relative',
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  mediaPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  mediaPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
