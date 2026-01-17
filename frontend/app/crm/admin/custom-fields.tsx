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
  Switch,
  Modal,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import BackToCRM from '../../../components/BackToCRM';
import { crmCustomFieldsAPI } from '../../../services/api';

export default function CustomFieldsScreen() {
  const router = useRouter();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [formData, setFormData] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false,
    dropdown_options: '',
  });

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      const res = await crmCustomFieldsAPI.getAll();
      setFields(res.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only admins can manage custom fields');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingField(null);
    setFormData({
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      dropdown_options: '',
    });
    setShowModal(true);
  };

  const handleEdit = (field: any) => {
    setEditingField(field);
    setFormData({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      is_required: field.is_required,
      dropdown_options: field.dropdown_options?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.field_name || !formData.field_label) {
      Alert.alert('Validation Error', 'Field name and label are required');
      return;
    }

    try {
      const payload: any = {
        field_name: formData.field_name,
        field_label: formData.field_label,
        field_type: formData.field_type,
        is_required: formData.is_required,
      };

      if (formData.field_type === 'dropdown' && formData.dropdown_options) {
        payload.dropdown_options = formData.dropdown_options.split(',').map(opt => opt.trim());
      }

      if (editingField) {
        await crmCustomFieldsAPI.update(editingField.id, payload);
      } else {
        await crmCustomFieldsAPI.create(payload);
      }

      setShowModal(false);
      loadFields();
      Alert.alert('Success', `Field ${editingField ? 'updated' : 'created'} successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save custom field');
    }
  };

  const handleDelete = (field: any) => {
    Alert.alert(
      'Delete Field',
      `Are you sure you want to delete "${field.field_label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await crmCustomFieldsAPI.delete(field.id);
              loadFields();
              Alert.alert('Success', 'Field deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete field');
            }
          },
        },
      ]
    );
  };

  const fieldTypeOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Date', value: 'date' },
    { label: 'Dropdown', value: 'dropdown' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Text Area', value: 'textarea' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackToCRM title="Custom Fields" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackToCRM title="Custom Fields" />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Custom Fields</Text>
          <Text style={styles.headerSubtitle}>{fields.length} fields configured</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {fields.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Custom Fields</Text>
            <Text style={styles.emptyText}>Create custom fields to capture additional lead information</Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
              <Text style={styles.createButtonText}>Create First Field</Text>
            </TouchableOpacity>
          </View>
        ) : (
          fields.map((field: any) => (
            <View key={field.id} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{field.field_label}</Text>
                  <Text style={styles.fieldName}>{field.field_name}</Text>
                </View>
                <View style={styles.fieldTypeBadge}>
                  <Text style={styles.fieldTypeText}>{field.field_type}</Text>
                </View>
              </View>
              
              {field.is_required && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}

              {field.dropdown_options && field.dropdown_options.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.optionsLabel}>Options:</Text>
                  <Text style={styles.optionsText}>{field.dropdown_options.join(', ')}</Text>
                </View>
              )}

              <View style={styles.fieldActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.primary20 }]}
                  onPress={() => handleEdit(field)}
                >
                  <Ionicons name="pencil" size={16} color={Colors.primary} />
                  <Text style={[styles.actionButtonText, { color: Colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
                  onPress={() => handleDelete(field)}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingField ? 'Edit' : 'Create'} Custom Field</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Field Name (internal)</Text>
              <TextInput
                style={styles.input}
                value={formData.field_name}
                onChangeText={(text) => setFormData({ ...formData, field_name: text })}
                placeholder="e.g., project_size"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Field Label (display)</Text>
              <TextInput
                style={styles.input}
                value={formData.field_label}
                onChangeText={(text) => setFormData({ ...formData, field_label: text })}
                placeholder="e.g., Project Size"
              />

              <Text style={styles.label}>Field Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.field_type}
                  onValueChange={(value) => setFormData({ ...formData, field_type: value })}
                >
                  {fieldTypeOptions.map((opt) => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>

              {formData.field_type === 'dropdown' && (
                <>
                  <Text style={styles.label}>Dropdown Options (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.dropdown_options}
                    onChangeText={(text) => setFormData({ ...formData, dropdown_options: text })}
                    placeholder="Option 1, Option 2, Option 3"
                    multiline
                  />
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.label}>Required Field</Text>
                <Switch
                  value={formData.is_required}
                  onValueChange={(value) => setFormData({ ...formData, is_required: value })}
                  trackColor={{ false: Colors.border, true: '#10B981' }}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Field</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  createButton: { backgroundColor: Colors.secondary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  createButtonText: { color: Colors.surface, fontSize: 16, fontWeight: '600' },
  fieldCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  fieldLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  fieldName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  fieldTypeBadge: { backgroundColor: '#EBF8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  fieldTypeText: { fontSize: 11, fontWeight: '600', color: '#2C5282' },
  requiredBadge: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  requiredText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  optionsContainer: { marginTop: 8 },
  optionsLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  optionsText: { fontSize: 13, color: '#4A5568' },
  fieldActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalBody: { padding: 20, maxHeight: 400 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8, marginTop: 12 },
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
  pickerContainer: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: Colors.background },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  saveButton: { backgroundColor: Colors.secondary },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: Colors.surface },
});