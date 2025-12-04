import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leadCategoriesAPI } from '../../services/crm-api';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6', order: 0 });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await leadCategoriesAPI.list(true);
      setCategories(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Validation Error', 'Category name is required');
      return;
    }

    try {
      if (editingId) {
        await leadCategoriesAPI.update(editingId, formData);
      } else {
        await leadCategoriesAPI.create(formData);
      }
      setEditingId(null);
      setFormData({ name: '', description: '', color: '#3B82F6', order: 0 });
      loadCategories();
      Alert.alert('Success', editingId ? 'Category updated' : 'Category created');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Category',
      'Are you sure? This will fail if any leads are assigned to this category.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await leadCategoriesAPI.delete(id);
              loadCategories();
              Alert.alert('Success', 'Category deleted');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const startEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
      order: category.order,
    });
  };

  const renderCategory = ({ item }: any) => (
    <View style={styles.categoryCard}>
      <View style={[styles.colorBar, { backgroundColor: item.color || '#3B82F6' }]} />
      <View style={styles.categoryContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.categoryName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.categoryDescription}>{item.description}</Text>
          )}
          <Text style={styles.categoryMeta}>
            {item.lead_count} leads • Order: {item.order}
          </Text>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionButton}>
            <Ionicons name="create-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
          {!item.is_system && (
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Categories</Text>
        <TouchableOpacity onPress={() => {
          setEditingId(null);
          setFormData({ name: '', description: '', color: '#3B82F6', order: categories.length });
        }}>
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Edit Form */}
      {(editingId !== null || formData.name !== '' || Object.keys(formData).length > 2) && (
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Category' : 'New Category'}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Category name"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Optional description"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Display Order</Text>
            <TextInput
              style={styles.input}
              value={formData.order.toString()}
              onChangeText={(text) => setFormData({ ...formData, order: parseInt(text) || 0 })}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                setEditingId(null);
                setFormData({ name: '', description: '', color: '#3B82F6', order: 0 });
              }}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSave}
            >
              <Text style={styles.buttonPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="filing-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No categories yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A202C', flex: 1, marginLeft: 16 },
  formSection: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 12 },
  formTitle: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1A202C' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#3B82F6' },
  buttonSecondary: { backgroundColor: '#E2E8F0' },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondaryText: { color: '#4A5568', fontSize: 16, fontWeight: '600' },
  list: { padding: 16 },
  categoryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  colorBar: { height: 4 },
  categoryContent: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 4 },
  categoryDescription: { fontSize: 14, color: '#718096', marginBottom: 4 },
  categoryMeta: { fontSize: 12, color: '#A0AEC0' },
  categoryActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#A0AEC0', marginTop: 16 },
});