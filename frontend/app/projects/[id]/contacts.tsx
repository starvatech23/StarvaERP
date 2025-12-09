import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectContactsAPI, usersAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

const REQUIRED_ROLES = [
  { key: 'architect', label: 'Architect', icon: 'hammer' },
  { key: 'project_engineer', label: 'Project Engineer', icon: 'construct' },
  { key: 'project_manager', label: 'Project Manager', icon: 'briefcase' },
  { key: 'project_head', label: 'Project Head', icon: 'ribbon' },
  { key: 'operations_executive', label: 'Operations Executive', icon: 'person' },
  { key: 'operations_manager', label: 'Operations Manager', icon: 'people' },
  { key: 'operations_head', label: 'Operations Head', icon: 'shield-checkmark' },
];

const CONTACT_METHODS = [
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
];

export default function ProjectContactsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    role: '',
    type: 'external',
    user_id: '',
    name: '',
    phone_mobile: '',
    phone_alternate: '',
    email: '',
    office_phone: '',
    preferred_contact_method: 'phone',
    working_hours: '9 AM - 6 PM',
    timezone: 'Asia/Kolkata',
    notes: '',
    is_primary: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsRes, usersRes] = await Promise.all([
        projectContactsAPI.getAll(id as string),
        usersAPI.getActive(),
      ]);
      setContacts(contactsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const getContactsForRole = (roleKey: string) => {
    return contacts.filter(c => c.role === roleKey);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  const handleAddContact = async () => {
    // Validation
    if (!formData.role || !formData.name || !formData.phone_mobile || !formData.email) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Phone validation
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(formData.phone_mobile.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return;
    }

    setLoading(true);
    try {
      await projectContactsAPI.add(id as string, formData);
      Alert.alert('Success', 'Contact added successfully');
      setShowAddForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error adding contact:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContact = async (index: number) => {
    setLoading(true);
    try {
      await projectContactsAPI.update(id as string, index, formData);
      Alert.alert('Success', 'Contact updated successfully');
      setEditingIndex(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating contact:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (index: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await projectContactsAPI.delete(id as string, index);
              Alert.alert('Success', 'Contact deleted successfully');
              loadData();
            } catch (error: any) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const startEdit = (contact: any, index: number) => {
    setFormData({ ...contact });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      role: '',
      type: 'external',
      user_id: '',
      name: '',
      phone_mobile: '',
      phone_alternate: '',
      email: '',
      office_phone: '',
      preferred_contact_method: 'phone',
      working_hours: '9 AM - 6 PM',
      timezone: 'Asia/Kolkata',
      notes: '',
      is_primary: false,
    });
  };

  const handleValidate = async () => {
    try {
      const response = await projectContactsAPI.validate(id as string);
      if (response.data.valid) {
        Alert.alert('✅ Validation Passed', 'All required contact roles are filled!');
      } else {
        Alert.alert(
          '⚠️ Missing Roles',
          `Please add contacts for:\n${response.data.missing_roles.map((r: string) => `• ${r.replace('_', ' ')}`).join('\n')}`
        );
      }
    } catch (error) {
      console.error('Error validating contacts:', error);
    }
  };

  if (loading && contacts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Contacts</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)}>
          <Ionicons name={showAddForm ? "close" : "add"} size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Validate Button */}
      <View style={styles.validateContainer}>
        <TouchableOpacity style={styles.validateButton} onPress={handleValidate}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
          <Text style={styles.validateText}>Validate Required Roles</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {/* Add/Edit Form */}
          {showAddForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingIndex !== null ? 'Edit Contact' : 'Add New Contact'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role *</Text>
                <ModalSelector
                  options={REQUIRED_ROLES.map(r => ({ label: r.label, value: r.key }))}
                  selectedValue={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  placeholder="Select Role"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Type *</Text>
                <ModalSelector
                  options={[
                    { label: 'Internal User', value: 'internal' },
                    { label: 'External Contact', value: 'external' },
                  ]}
                  selectedValue={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  placeholder="Select Type"
                />
              </View>

              {formData.type === 'internal' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Select User *</Text>
                  <ModalSelector
                    options={users.map(u => ({ label: u.full_name, value: u.id }))}
                    selectedValue={formData.user_id}
                    onValueChange={(value) => {
                      const user = users.find(u => u.id === value);
                      setFormData({
                        ...formData,
                        user_id: value,
                        name: user?.full_name || '',
                        email: user?.email || '',
                        phone_mobile: user?.phone || '',
                      });
                    }}
                    placeholder="Select User"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Full Name"
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone_mobile}
                  onChangeText={(text) => setFormData({ ...formData, phone_mobile: text })}
                  placeholder="+91 1234567890"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="email@example.com"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Alternate Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone_alternate}
                  onChangeText={(text) => setFormData({ ...formData, phone_alternate: text })}
                  placeholder="+91 9876543210"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Preferred Contact Method</Text>
                <ModalSelector
                  options={CONTACT_METHODS}
                  selectedValue={formData.preferred_contact_method}
                  onValueChange={(value) => setFormData({ ...formData, preferred_contact_method: value })}
                  placeholder="Select Method"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Working Hours</Text>
                <TextInput
                  style={styles.input}
                  value={formData.working_hours}
                  onChangeText={(text) => setFormData({ ...formData, working_hours: text })}
                  placeholder="9 AM - 6 PM"
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Additional notes..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, is_primary: !formData.is_primary })}
              >
                <Ionicons
                  name={formData.is_primary ? "checkbox" : "square-outline"}
                  size={24}
                  color={Colors.primary} />
                <Text style={styles.checkboxLabel}>Set as Primary Contact for this role</Text>
              </TouchableOpacity>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowAddForm(false);
                    setEditingIndex(null);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={() => editingIndex !== null ? handleUpdateContact(editingIndex) : handleAddContact()}
                >
                  <Text style={styles.saveButtonText}>
                    {editingIndex !== null ? 'Update' : 'Add'} Contact
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contact Hierarchy */}
          {REQUIRED_ROLES.map((role) => {
            const roleContacts = getContactsForRole(role.key);
            const isExpanded = expandedRole === role.key;

            return (
              <View key={role.key} style={styles.roleSection}>
                <TouchableOpacity
                  style={styles.roleHeader}
                  onPress={() => setExpandedRole(isExpanded ? null : role.key)}
                >
                  <View style={styles.roleHeaderLeft}>
                    <View style={[styles.roleIcon, roleContacts.length === 0 && styles.roleIconEmpty]}>
                      <Ionicons
                        name={role.icon as any}
                        size={20}
                        color={roleContacts.length > 0 ? "#10B981" : "#EF4444"}
                      />
                    </View>
                    <View>
                      <Text style={styles.roleTitle}>{role.label}</Text>
                      <Text style={styles.roleCount}>
                        {roleContacts.length} contact{roleContacts.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color={Colors.textSecondary} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.contactsList}>
                    {roleContacts.length === 0 ? (
                      <View style={styles.emptyRole}>
                        <Text style={styles.emptyRoleText}>No contacts added for this role</Text>
                      </View>
                    ) : (
                      roleContacts.map((contact, index) => (
                        <View key={index} style={styles.contactCard}>
                          <View style={styles.contactHeader}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.contactNameRow}>
                                <Text style={styles.contactName}>{contact.name}</Text>
                                {contact.is_primary && (
                                  <View style={styles.primaryBadge}>
                                    <Text style={styles.primaryText}>PRIMARY</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.contactType}>
                                {contact.type === 'internal' ? '👤 Internal User' : '📧 External Contact'}
                              </Text>
                            </View>
                            <View style={styles.contactActions}>
                              <TouchableOpacity
                                onPress={() => startEdit(contact, contacts.indexOf(contact))}
                              >
                                <Ionicons name="pencil" size={20} color={Colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteContact(contacts.indexOf(contact))}
                              >
                                <Ionicons name="trash" size={20} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={styles.contactDetails}>
                            <TouchableOpacity
                              style={styles.contactRow}
                              onPress={() => handleCall(contact.phone_mobile)}
                            >
                              <Ionicons name="call" size={18} color="#10B981" />
                              <Text style={styles.contactText}>{contact.phone_mobile}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.contactRow}
                              onPress={() => handleEmail(contact.email)}
                            >
                              <Ionicons name="mail" size={18} color={Colors.primary} />
                              <Text style={styles.contactText}>{contact.email}</Text>
                            </TouchableOpacity>

                            {contact.phone_alternate && (
                              <View style={styles.contactRow}>
                                <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
                                <Text style={styles.contactText}>{contact.phone_alternate}</Text>
                              </View>
                            )}

                            {contact.working_hours && (
                              <View style={styles.contactRow}>
                                <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                                <Text style={styles.contactText}>{contact.working_hours}</Text>
                              </View>
                            )}

                            {contact.notes && (
                              <View style={styles.notesContainer}>
                                <Text style={styles.notesText}>{contact.notes}</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.quickActions}>
                            <TouchableOpacity
                              style={styles.quickActionButton}
                              onPress={() => handleCall(contact.phone_mobile)}
                            >
                              <Ionicons name="call" size={16} color={Colors.surface} />
                              <Text style={styles.quickActionText}>Call</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.quickActionButton, { backgroundColor: 'Colors.primary }]}
                              onPress={() => handleEmail(contact.email)}
                            >
                              <Ionicons name="mail" size={16} color={Colors.surface} />
                              <Text style={styles.quickActionText}>Email</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.quickActionButton, { backgroundColor: '#25D366' }]}
                              onPress={() => handleWhatsApp(contact.phone_mobile)}
                            >
                              <Ionicons name="logo-whatsapp" size={16} color={Colors.surface} />
                              <Text style={styles.quickActionText}>WhatsApp</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  validateContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    borderRadius: 8,
  },
  validateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.surface,
  },
  roleSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  roleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconEmpty: {
    backgroundColor: '#FEE2E2',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  roleCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  contactsList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emptyRole: {
    padding: 16,
    alignItems: 'center',
  },
  emptyRoleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  contactCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  primaryBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.surface,
  },
  contactType: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 16,
  },
  contactDetails: {
    gap: 8,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#4A5568',
  },
  notesContainer: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  notesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.surface,
  },
});
