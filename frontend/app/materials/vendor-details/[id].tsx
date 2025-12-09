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
import { vendorsAPI } from '../../../services/api';

export default function VendorDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadVendor();
  }, [id]);

  const loadVendor = async () => {
    try {
      const response = await vendorsAPI.getById(id as string);
      setVendor(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error loading vendor:', error);
      Alert.alert('Error', 'Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await vendorsAPI.update(id as string, formData);
      Alert.alert('Success', 'Vendor updated successfully');
      setEditing(false);
      loadVendor();
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Vendor',
      'Are you sure you want to delete this vendor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorsAPI.delete(id as string);
              Alert.alert('Success', 'Vendor deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete vendor');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="Colors.secondary" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!vendor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Vendor not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Details</Text>
        <View style={styles.headerActions}>
          {editing ? (
            <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color="Colors.secondary" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Business Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.business_name}
                  onChangeText={(text) => setFormData({ ...formData, business_name: text })}
                  placeholder="Business name"
                />
              ) : (
                <Text style={styles.value}>{vendor.business_name}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contact Person</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.contact_person}
                  onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
                  placeholder="Contact person"
                />
              ) : (
                <Text style={styles.value}>{vendor.contact_person}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{vendor.phone}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.email || ''}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.value}>{vendor.email || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.address || ''}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Address"
                />
              ) : (
                <Text style={styles.value}>{vendor.address || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>City</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={formData.city || ''}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                    placeholder="City"
                  />
                ) : (
                  <Text style={styles.value}>{vendor.city || 'N/A'}</Text>
                )}
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>State</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={formData.state || ''}
                    onChangeText={(text) => setFormData({ ...formData, state: text })}
                    placeholder="State"
                  />
                ) : (
                  <Text style={styles.value}>{vendor.state || 'N/A'}</Text>
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Pincode</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.pincode || ''}
                  onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                  placeholder="Pincode"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.value}>{vendor.pincode || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {/* Tax Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax & Payment</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>GST Number</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.gst_number || ''}
                  onChangeText={(text) => setFormData({ ...formData, gst_number: text.toUpperCase() })}
                  placeholder="GST Number"
                  autoCapitalize="characters"
                />
              ) : (
                <View style={styles.valueWithBadge}>
                  <Text style={styles.value}>{vendor.gst_number || 'Not provided'}</Text>
                  {vendor.gst_number && (
                    <View style={styles.gstBadge}>
                      <Text style={styles.gstBadgeText}>GST</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PAN Number</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.pan_number || ''}
                  onChangeText={(text) => setFormData({ ...formData, pan_number: text.toUpperCase() })}
                  placeholder="PAN Number"
                  autoCapitalize="characters"
                />
              ) : (
                <Text style={styles.value}>{vendor.pan_number || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Payment Terms</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.payment_terms || ''}
                  onChangeText={(text) => setFormData({ ...formData, payment_terms: text })}
                  placeholder="e.g., Net 30"
                />
              ) : (
                <Text style={styles.value}>{vendor.payment_terms || 'Not specified'}</Text>
              )}
            </View>
          </View>

          {/* Bank Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Bank Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.bank_name || ''}
                  onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                  placeholder="Bank name"
                />
              ) : (
                <Text style={styles.value}>{vendor.bank_name || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account Holder</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.account_holder_name || ''}
                  onChangeText={(text) => setFormData({ ...formData, account_holder_name: text })}
                  placeholder="Account holder name"
                />
              ) : (
                <Text style={styles.value}>{vendor.account_holder_name || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account Number</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.account_number || ''}
                  onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                  placeholder="Account number"
                  keyboardType="numeric"
                  secureTextEntry
                />
              ) : (
                <Text style={styles.value}>
                  {vendor.account_number ? '•••• ' + vendor.account_number.slice(-4) : 'Not provided'}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>IFSC Code</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.ifsc_code || ''}
                  onChangeText={(text) => setFormData({ ...formData, ifsc_code: text.toUpperCase() })}
                  placeholder="IFSC code"
                  autoCapitalize="characters"
                />
              ) : (
                <Text style={styles.value}>{vendor.ifsc_code || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.field}>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes || ''}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Additional notes"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.value}>{vendor.notes || 'No notes'}</Text>
              )}
            </View>
          </View>

          {!editing && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash" size={20} color="Colors.surface" />
              <Text style={styles.deleteButtonText}>Delete Vendor</Text>
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
    backgroundColor: 'Colors.background,
  },
  loader: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: 'Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
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
    color: 'Colors.textSecondary,
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
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textSecondary,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: 'Colors.textPrimary,
  },
  valueWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gstBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gstBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  input: {
    backgroundColor: 'Colors.background,
    borderWidth: 1,
    borderColor: 'Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'Colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
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
    color: 'Colors.surface,
  },
  footer: {
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
  },
  saveButton: {
    backgroundColor: 'Colors.secondary,
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
    color: 'Colors.surface,
  },
});
