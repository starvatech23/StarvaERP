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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { materialsAPI } from '../../../services/api';
import { Picker } from '@react-native-picker/picker';

const CATEGORIES = [
  { label: 'Cement', value: 'cement' },
  { label: 'Steel', value: 'steel' },
  { label: 'Sand', value: 'sand' },
  { label: 'Aggregate', value: 'aggregate' },
  { label: 'Bricks', value: 'bricks' },
  { label: 'Blocks', value: 'blocks' },
  { label: 'Tiles', value: 'tiles' },
  { label: 'Paint', value: 'paint' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Hardware', value: 'hardware' },
  { label: 'Wood', value: 'wood' },
  { label: 'Glass', value: 'glass' },
  { label: 'Miscellaneous', value: 'miscellaneous' },
];

export default function MaterialDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [material, setMaterial] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadMaterial();
  }, [id]);

  const loadMaterial = async () => {
    try {
      const response = await materialsAPI.getById(id as string);
      setMaterial(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error loading material:', error);
      Alert.alert('Error', 'Failed to load material details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await materialsAPI.update(id as string, {
        ...formData,
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
      });
      Alert.alert('Success', 'Material updated successfully');
      setEditing(false);
      loadMaterial();
    } catch (error: any) {
      console.error('Error updating material:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Material',
      'Are you sure you want to delete this material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await materialsAPI.delete(id as string);
              Alert.alert('Success', 'Material deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete material');
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: any = {
      cement: '#78716C',
      steel: '#DC2626',
      sand: '#F59E0B',
      aggregate: '#6B7280',
      bricks: '#EF4444',
      blocks: '#94A3B8',
      tiles: '#06B6D4',
      paint: '#8B5CF6',
      plumbing: Colors.primary,
      electrical: '#FBBF24',
      hardware: '#6366F1',
      wood: '#92400E',
      glass: '#38BDF8',
    };
    return colors[category] || '#6B7280';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color=Colors.secondary style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!material) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Material not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Details</Text>
        <View style={styles.headerActions}>
          {editing ? (
            <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content}>
          {/* Material Info */}
          <View style={styles.section}>
            <View style={styles.categoryHeader}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: getCategoryColor(material.category) + '20' },
                ]}
              >
                <Ionicons
                  name="cube"
                  size={32}
                  color={getCategoryColor(material.category)}
                />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryLabel}>CATEGORY</Text>
                <Text style={styles.categoryValue}>{material.category.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Material Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Material name"
                />
              ) : (
                <Text style={styles.value}>{material.name}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              {editing ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    style={styles.picker}
                  >
                    {CATEGORIES.map((cat) => (
                      <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.value}>{material.category.toUpperCase()}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Unit of Measurement</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.unit}
                  onChangeText={(text) => setFormData({ ...formData, unit: text })}
                  placeholder="e.g., kg, ton, bag"
                />
              ) : (
                <View style={styles.unitBadgeContainer}>
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>{material.unit}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Minimum Stock Level</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={String(formData.minimum_stock)}
                  onChangeText={(text) => setFormData({ ...formData, minimum_stock: text })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.value}>{material.minimum_stock} {material.unit}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>HSN Code</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.hsn_code || ''}
                  onChangeText={(text) => setFormData({ ...formData, hsn_code: text })}
                  placeholder="HSN Code"
                />
              ) : (
                <Text style={styles.value}>{material.hsn_code || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description || ''}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Material description"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.value}>{material.description || 'No description'}</Text>
              )}
            </View>
          </View>

          {!editing && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash" size={20} color={Colors.surface} />
              <Text style={styles.deleteButtonText}>Delete Material</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {editing && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
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
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  categoryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  unitBadgeContainer: {
    flexDirection: 'row',
  },
  unitBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: Colors.textPrimary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
});
