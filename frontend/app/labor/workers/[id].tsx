import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Colors from '../../../constants/Colors';
import { workersAPI, projectsAPI, weeklyPaymentsAPI } from '../../../services/api';
import moment from 'moment';

export default function WorkerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [worker, setWorker] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptsData, setReceiptsData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [skillGroup, setSkillGroup] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workerRes, projectsRes, receiptsRes] = await Promise.all([
        workersAPI.getById(id as string),
        projectsAPI.getAll(),
        weeklyPaymentsAPI.getWorkerReceipts(id as string).catch(() => ({ data: { receipts: [] } }))
      ]);
      
      const workerData = workerRes.data;
      setWorker(workerData);
      setProjects(projectsRes.data || []);
      setReceiptsData(receiptsRes.data);
      setReceipts(receiptsRes.data?.receipts || []);
      
      // Set form fields
      setFullName(workerData.full_name || '');
      setPhone(workerData.phone || '');
      setSkillGroup(workerData.skill_group || '');
      setBaseRate(workerData.base_rate?.toString() || '');
      setProjectId(workerData.project_id || '');
      setAddress(workerData.address || '');
      setEmergencyContact(workerData.emergency_contact || '');
      setNotes(workerData.notes || '');
    } catch (error) {
      console.error('Error loading worker:', error);
      Alert.alert('Error', 'Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const response = await weeklyPaymentsAPI.getReceipt(paymentId);
      if (response.data) {
        setSelectedReceipt(response.data);
        setShowReceiptModal(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load receipt');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Worker name is required');
      return;
    }

    setSaving(true);
    try {
      await workersAPI.update(id as string, {
        full_name: fullName,
        phone,
        skill_group: skillGroup,
        base_rate: parseFloat(baseRate) || 0,
        project_id: projectId || null,
        address,
        emergency_contact: emergencyContact,
        notes,
      });
      Alert.alert('Success', 'Worker details updated successfully');
      setIsEditing(false);
      loadData();
    } catch (error: any) {
      console.error('Error updating worker:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update worker');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Worker',
      `Are you sure you want to delete ${worker?.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workersAPI.delete(id as string);
              Alert.alert('Success', 'Worker deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete worker');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading worker details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getProjectName = () => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Not Assigned';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Worker Details</Text>
        <TouchableOpacity 
          onPress={() => isEditing ? handleSave() : setIsEditing(true)} 
          style={styles.editButton}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <Text style={styles.editButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Worker Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={Colors.secondary} />
          </View>
          {!isEditing && (
            <>
              <Text style={styles.workerName}>{worker?.full_name}</Text>
              <Text style={styles.workerSkill}>{worker?.skill_group || 'Worker'}</Text>
            </>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
              />
            ) : (
              <Text style={styles.value}>{worker?.full_name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{worker?.phone || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Skill Group</Text>
            {isEditing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={skillGroup}
                  onValueChange={setSkillGroup}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Skill" value="" />
                  <Picker.Item label="Mason" value="mason" />
                  <Picker.Item label="Carpenter" value="carpenter" />
                  <Picker.Item label="Electrician" value="electrician" />
                  <Picker.Item label="Plumber" value="plumber" />
                  <Picker.Item label="Painter" value="painter" />
                  <Picker.Item label="Helper" value="helper" />
                  <Picker.Item label="Supervisor" value="supervisor" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.value}>{worker?.skill_group || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Base Rate (₹/day)</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={baseRate}
                onChangeText={setBaseRate}
                placeholder="Enter daily rate"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.value}>₹{worker?.base_rate?.toLocaleString() || '0'}</Text>
            )}
          </View>
        </View>

        {/* Assignment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignment</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Current Project</Text>
            {isEditing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={projectId}
                  onValueChange={setProjectId}
                  style={styles.picker}
                >
                  <Picker.Item label="Not Assigned" value="" />
                  {projects.map((project: any) => (
                    <Picker.Item 
                      key={project.id} 
                      label={project.name} 
                      value={project.id} 
                    />
                  ))}
                </Picker>
              </View>
            ) : (
              <Text style={styles.value}>{getProjectName()}</Text>
            )}
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{worker?.address || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Emergency Contact</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                placeholder="Enter emergency contact"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{worker?.emergency_contact || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.value}>{worker?.notes || '-'}</Text>
            )}
          </View>
        </View>

        {/* Stats */}
        {!isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{worker?.attendance_count || 0}</Text>
                <Text style={styles.statLabel}>Days Worked</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹{worker?.total_wages?.toLocaleString() || 0}</Text>
                <Text style={styles.statLabel}>Total Wages</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Receipts */}
        {!isEditing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Receipts</Text>
              {receiptsData && (
                <Text style={styles.totalPaid}>Total: ₹{receiptsData.total_paid?.toLocaleString() || 0}</Text>
              )}
            </View>
            {receipts.length === 0 ? (
              <View style={styles.emptyReceipts}>
                <Ionicons name="receipt-outline" size={40} color="#CBD5E0" />
                <Text style={styles.emptyReceiptsText}>No payment receipts yet</Text>
              </View>
            ) : (
              receipts.map((receipt: any) => (
                <TouchableOpacity 
                  key={receipt.payment_id} 
                  style={styles.receiptItem}
                  onPress={() => handleViewReceipt(receipt.payment_id)}
                >
                  <View style={styles.receiptInfo}>
                    <View style={styles.receiptIconBox}>
                      <Ionicons name="receipt" size={20} color="#10B981" />
                    </View>
                    <View style={styles.receiptDetails}>
                      <Text style={styles.receiptProject}>{receipt.project_name}</Text>
                      <Text style={styles.receiptPeriod}>
                        {moment(receipt.week_start).format('DD MMM')} - {moment(receipt.week_end).format('DD MMM YYYY')}
                      </Text>
                      <Text style={styles.receiptPaidBy}>Paid by: {receipt.paid_by}</Text>
                    </View>
                  </View>
                  <View style={styles.receiptAmountBox}>
                    <Text style={styles.receiptAmount}>₹{receipt.amount?.toLocaleString()}</Text>
                    <Text style={styles.receiptDate}>{moment(receipt.paid_at).format('DD/MM/YY')}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Delete Button */}
        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Worker</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button */}
        {isEditing && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              setIsEditing(false);
              loadData(); // Reset form
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Receipt Modal */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptModal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={50} color="#10B981" />
              <Text style={styles.modalTitle}>Payment Receipt</Text>
            </View>

            {/* Worker Info */}
            <View style={styles.workerInfoBox}>
              <Text style={styles.workerNameModal}>{selectedReceipt?.worker_name}</Text>
              <Text style={styles.receiptAmountLarge}>₹{selectedReceipt?.amount?.toLocaleString()}</Text>
            </View>

            {/* Details */}
            <View style={styles.receiptDetailsBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Project</Text>
                <Text style={styles.receiptRowValue}>{selectedReceipt?.project_name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Period</Text>
                <Text style={styles.receiptRowValue}>
                  {selectedReceipt?.week_start ? moment(selectedReceipt.week_start).format('DD MMM') : ''} - {selectedReceipt?.week_end ? moment(selectedReceipt.week_end).format('DD MMM YYYY') : ''}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Payment Method</Text>
                <Text style={styles.receiptRowValue}>{selectedReceipt?.payment_method?.toUpperCase()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Paid On</Text>
                <Text style={styles.receiptRowValue}>
                  {selectedReceipt?.paid_at ? moment(selectedReceipt.paid_at).format('DD MMM YYYY, hh:mm A') : '-'}
                </Text>
              </View>
            </View>

            {/* Stamps */}
            <View style={styles.stampSection}>
              <View style={styles.stampBox}>
                <Text style={styles.stampLabel}>Paid By</Text>
                <Text style={styles.stampName}>{selectedReceipt?.paid_by || 'Project Engineer'}</Text>
                <Text style={styles.stampRole}>Project Engineer</Text>
              </View>
              <View style={styles.stampBox}>
                <Text style={styles.stampLabel}>Approved By</Text>
                <Text style={styles.stampName}>{selectedReceipt?.approved_by || 'Manager'}</Text>
                <Text style={styles.stampRole}>Project Manager</Text>
              </View>
            </View>

            {/* Received Stamp */}
            <View style={styles.receivedStamp}>
              <Text style={styles.receivedText}>✓ RECEIVED</Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowReceiptModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  content: {
    flex: 1,
    padding: 16,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  workerName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  workerSkill: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  // Receipt section styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalPaid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyReceipts: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyReceiptsText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  receiptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  receiptIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  receiptDetails: {
    flex: 1,
  },
  receiptProject: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  receiptPeriod: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  receiptPaidBy: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptAmountBox: {
    alignItems: 'flex-end',
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  receiptDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  workerInfoBox: {
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  workerNameModal: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  receiptAmountLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 8,
  },
  receiptDetailsBox: {
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  receiptRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  receiptRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  stampSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  stampBox: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  stampLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  stampName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  stampRole: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2,
  },
  receivedStamp: {
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    transform: [{ rotate: '-5deg' }],
    marginBottom: 16,
  },
  receivedText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 2,
  },
  closeButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
