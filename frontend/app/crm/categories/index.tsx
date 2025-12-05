import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackToHome from '../../../components/BackToHome';
import { crmCategoriesAPI } from '../../../services/api';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const colors = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
    '#EF4444', '#EC4899', '#14B8A6', '#F97316',
    '#6366F1', '#84CC16', '#06B6D4', '#A855F7'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await crmCategoriesAPI.getAll();
      setCategories(res.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load categories');
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category?: any) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setDescription(category.description || '');
      setSelectedColor(category.color || '#3B82F6');
    } else {
      setEditingCategory(null);
      setName('');
      setDescription('');
      setSelectedColor('#3B82F6');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCategory(null);
    setName('');
    setDescription('');
    setSelectedColor('#3B82F6');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        await crmCategoriesAPI.update(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color: selectedColor,
        });
        Alert.alert('Success', 'Category updated successfully');
      } else {
        // Create new category
        await crmCategoriesAPI.create({
          name: name.trim(),
          description: description.trim() || undefined,
          color: selectedColor,
          order: categories.length,
          is_active: true,
        });
        Alert.alert('Success', 'Category created successfully');
      }
      closeModal();
      loadCategories();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save category');
    }
  };

  const handleDelete = (category: any) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await crmCategoriesAPI.delete(category.id);
              Alert.alert('Success', 'Category deleted successfully');
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackToHome />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackToHome />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Lead Categories</Text>
          <Text style={styles.headerSubtitle}>{categories.length} categories</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#8B5CF6" />
          <Text style={styles.infoText}>
            Categories help organize your leads. Create categories based on your business needs (e.g., Residential, Commercial, Industrial).
          </Text>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Categories Yet</Text>
            <Text style={styles.emptyText}>
              Create your first category to start organizing leads
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => openModal()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Create Category</Text>
            </TouchableOpacity>
          </View>
        ) : (
          categories.map((category) => (
            <View key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryLeft}>
                <View style={[styles.colorDot, { backgroundColor: category.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {category.description && (
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  )}
                  <View style={styles.categoryStats}>
                    <Ionicons name="people" size={14} color="#718096" />
                    <Text style={styles.categoryStatsText}>
                      {category.lead_count || 0} leads
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.categoryActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openModal(category)}
                >
                  <Ionicons name="create-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(category)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'New Category'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={28} color="#718096" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Residential, Commercial"
                  placeholderTextColor="#CBD5E0"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief description of this category..."
                  placeholderTextColor="#CBD5E0"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorGrid}>
                  {colors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={styles.previewItem}>
                  <View style={[styles.previewDot, { backgroundColor: selectedColor }]} />
                  <Text style={styles.previewText}>{name || 'Category Name'}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingCategory ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A202C' },
  headerSubtitle: { fontSize: 13, color: '#718096', marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#5B21B6', lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#718096', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  colorDot: { width: 20, height: 20, borderRadius: 10 },
  categoryName: { fontSize: 16, fontWeight: '700', color: '#1A202C' },
  categoryDescription: { fontSize: 13, color: '#718096', marginTop: 2 },
  categoryStats: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  categoryStatsText: { fontSize: 12, color: '#718096' },
  categoryActions: { flexDirection: 'row', gap: 8 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C' },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  previewCard: {
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  previewLabel: { fontSize: 12, fontWeight: '600', color: '#718096', marginBottom: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewDot: { width: 16, height: 16, borderRadius: 8 },
  previewText: { fontSize: 16, fontWeight: '600', color: '#1A202C' },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '700', color: '#4A5568' },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
