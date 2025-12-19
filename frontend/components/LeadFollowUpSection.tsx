import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { crmFollowUpsAPI } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

interface FollowUp {
  id: string;
  lead_id: string;
  follow_up_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  title: string;
  description?: string;
  notes?: string;
  next_step?: string;
  status: string;
  outcome?: string;
  reminder_enabled: boolean;
  send_whatsapp_invite: boolean;
  whatsapp_invite_sent: boolean;
  created_by_name?: string;
  created_at?: string;
}

interface LeadFollowUpSectionProps {
  leadId: string;
  leadName: string;
  leadPhone?: string;
  hasWhatsAppConsent?: boolean;
  onFollowUpCreated?: () => void;
}

const FOLLOW_UP_TYPES = [
  { value: 'call', label: 'Call', icon: 'call' },
  { value: 'meeting', label: 'Meeting', icon: 'people' },
  { value: 'site_visit', label: 'Site Visit', icon: 'location' },
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#10B981';
    case 'pending': return '#F59E0B';
    case 'overdue': return '#EF4444';
    case 'rescheduled': return '#6366F1';
    case 'cancelled': return '#6B7280';
    default: return '#6B7280';
  }
};

const getTypeIcon = (type: string) => {
  const found = FOLLOW_UP_TYPES.find(t => t.value === type);
  return found?.icon || 'ellipsis-horizontal';
};

export default function LeadFollowUpSection({
  leadId,
  leadName,
  leadPhone,
  hasWhatsAppConsent,
  onFollowUpCreated,
}: LeadFollowUpSectionProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const defaultFormData = {
    follow_up_type: 'call',
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    title: '',
    description: '',
    next_step: '',
    reminder_enabled: true,
    reminder_before_minutes: 30,
    send_whatsapp_invite: false,
  };
  
  const [formData, setFormData] = useState({
    follow_up_type: 'call',
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    title: '',
    description: '',
    next_step: '',
    reminder_enabled: true,
    reminder_before_minutes: 30,
    send_whatsapp_invite: false,
  });
  const [outcome, setOutcome] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadFollowUps();
  }, [leadId]);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      const response = await crmFollowUpsAPI.getByLead(leadId);
      setFollowUps(response.data || []);
    } catch (error) {
      console.error('Error loading follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      follow_up_type: 'call',
      scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      title: '',
      description: '',
      next_step: '',
      reminder_enabled: true,
      reminder_before_minutes: 30,
      send_whatsapp_invite: false,
    });
    setIsEditing(false);
    setSelectedFollowUp(null);
  };

  const openEditModal = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setIsEditing(true);
    setFormData({
      follow_up_type: followUp.follow_up_type,
      scheduled_date: new Date(followUp.scheduled_date),
      title: followUp.title,
      description: followUp.description || '',
      next_step: followUp.next_step || '',
      reminder_enabled: followUp.reminder_enabled,
      reminder_before_minutes: 30,
      send_whatsapp_invite: followUp.send_whatsapp_invite,
    });
    setShowCreateModal(true);
  };

  const handleCreateFollowUp = async () => {
    if (!formData.title.trim()) {
      return;
    }

    try {
      setCreating(true);
      
      if (isEditing && selectedFollowUp) {
        // Update existing follow-up
        await crmFollowUpsAPI.update(selectedFollowUp.id, {
          follow_up_type: formData.follow_up_type,
          scheduled_date: formData.scheduled_date.toISOString(),
          scheduled_time: formData.scheduled_date.toTimeString().slice(0, 5),
          title: formData.title.trim(),
          description: formData.description || null,
          next_step: formData.next_step || null,
          reminder_enabled: formData.reminder_enabled,
          send_whatsapp_invite: formData.send_whatsapp_invite,
        });
      } else {
        // Create new follow-up
        await crmFollowUpsAPI.create(leadId, {
          follow_up_type: formData.follow_up_type,
          scheduled_date: formData.scheduled_date.toISOString(),
          scheduled_time: formData.scheduled_date.toTimeString().slice(0, 5),
          title: formData.title.trim() || `${FOLLOW_UP_TYPES.find(t => t.value === formData.follow_up_type)?.label} with ${leadName}`,
          description: formData.description || null,
          next_step: formData.next_step || null,
          reminder_enabled: formData.reminder_enabled,
          reminder_before_minutes: formData.reminder_before_minutes,
          send_whatsapp_invite: formData.send_whatsapp_invite,
        });
      }
      
      setShowCreateModal(false);
      resetForm();
      loadFollowUps();
      onFollowUpCreated?.();
    } catch (error) {
      console.error('Error saving follow-up:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteFollowUp = async () => {
    if (!selectedFollowUp) return;

    try {
      setCompleting(true);
      await crmFollowUpsAPI.update(selectedFollowUp.id, {
        status: 'completed',
        outcome: outcome.trim() || 'Completed',
      });
      setShowCompleteModal(false);
      setOutcome('');
      setSelectedFollowUp(null);
      loadFollowUps();
    } catch (error) {
      console.error('Error completing follow-up:', error);
    } finally {
      setCompleting(false);
    }
  };

  const openCompleteModal = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setOutcome('');
    setShowCompleteModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const pendingFollowUps = followUps.filter(f => f.status === 'pending' || f.status === 'overdue');
  const completedFollowUps = followUps.filter(f => f.status === 'completed');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Follow-ups</Text>
          {pendingFollowUps.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingFollowUps.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ padding: 20 }} />
      ) : followUps.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>No follow-ups scheduled</Text>
          <Text style={styles.emptySubtext}>Tap + Add to schedule a follow-up</Text>
        </View>
      ) : (
        <View>
          {/* Pending Follow-ups */}
          {pendingFollowUps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {pendingFollowUps.map((followUp) => (
                <View key={followUp.id} style={styles.followUpCard}>
                  <View style={styles.followUpHeader}>
                    <View style={[styles.typeIcon, { backgroundColor: Colors.primary + '20' }]}>
                      <Ionicons name={getTypeIcon(followUp.follow_up_type) as any} size={16} color={Colors.primary} />
                    </View>
                    <View style={styles.followUpInfo}>
                      <Text style={styles.followUpTitle}>{followUp.title}</Text>
                      <View style={styles.followUpMeta}>
                        <Ionicons name="time-outline" size={12} color={isOverdue(followUp.scheduled_date) ? '#EF4444' : Colors.textSecondary} />
                        <Text style={[styles.followUpDate, isOverdue(followUp.scheduled_date) && styles.overdueText]}>
                          {formatDate(followUp.scheduled_date)}
                          {isOverdue(followUp.scheduled_date) && ' (Overdue)'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(followUp)}
                      >
                        <Ionicons name="pencil" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => openCompleteModal(followUp)}
                      >
                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {/* Follow-up Details Section */}
                  <View style={styles.followUpDetails}>
                    {followUp.description && (
                      <View style={styles.detailRow}>
                        <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{followUp.description}</Text>
                      </View>
                    )}
                    {followUp.next_step && (
                      <View style={styles.detailRow}>
                        <Ionicons name="arrow-forward-circle-outline" size={14} color={Colors.primary} />
                        <Text style={[styles.detailText, { color: Colors.primary }]}>Next: {followUp.next_step}</Text>
                      </View>
                    )}
                    {followUp.notes && (
                      <View style={styles.detailRow}>
                        <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{followUp.notes}</Text>
                      </View>
                    )}
                  </View>
                  {followUp.whatsapp_invite_sent && (
                    <View style={styles.inviteSentBadge}>
                      <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
                      <Text style={styles.inviteSentText}>Invite sent</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Completed Follow-ups */}
          {completedFollowUps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Completed</Text>
              {completedFollowUps.slice(0, 3).map((followUp) => (
                <View key={followUp.id} style={[styles.followUpCard, styles.completedCard]}>
                  <View style={styles.followUpHeader}>
                    <View style={[styles.typeIcon, { backgroundColor: '#10B98120' }]}>
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                    </View>
                    <View style={styles.followUpInfo}>
                      <Text style={[styles.followUpTitle, styles.completedTitle]}>{followUp.title}</Text>
                      <Text style={styles.followUpOutcome}>{followUp.outcome || 'Completed'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Create/Edit Follow-up Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Follow-up' : 'Schedule Follow-up'}</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Follow-up Type */}
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {FOLLOW_UP_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      formData.follow_up_type === type.value && styles.typeOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, follow_up_type: type.value })}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={18}
                      color={formData.follow_up_type === type.value ? '#fff' : Colors.textSecondary}
                    />
                    <Text style={[
                      styles.typeOptionText,
                      formData.follow_up_type === type.value && styles.typeOptionTextSelected,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder={`${FOLLOW_UP_TYPES.find(t => t.value === formData.follow_up_type)?.label} with ${leadName}`}
                placeholderTextColor={Colors.textSecondary}
              />

              {/* Date & Time */}
              <Text style={styles.inputLabel}>Date & Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>
                  {formData.scheduled_date.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.scheduled_date}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      setFormData({ ...formData, scheduled_date: date });
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}

              {/* Description */}
              <Text style={styles.inputLabel}>Details</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Add details about this follow-up..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />

              {/* Next Step */}
              <Text style={styles.inputLabel}>Next Step (after this follow-up)</Text>
              <TextInput
                style={styles.input}
                value={formData.next_step}
                onChangeText={(text) => setFormData({ ...formData, next_step: text })}
                placeholder="e.g., Send proposal, Schedule site visit"
                placeholderTextColor={Colors.textSecondary}
              />

              {/* Reminder Toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Enable Reminder</Text>
                  <Text style={styles.toggleSubtext}>Get notified 30 mins before</Text>
                </View>
                <Switch
                  value={formData.reminder_enabled}
                  onValueChange={(value) => setFormData({ ...formData, reminder_enabled: value })}
                  trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                  thumbColor={formData.reminder_enabled ? Colors.primary : '#f4f3f4'}
                />
              </View>

              {/* WhatsApp Invite Toggle */}
              {hasWhatsAppConsent && leadPhone && (
                <View style={styles.toggleRow}>
                  <View>
                    <Text style={styles.toggleLabel}>Send WhatsApp Invite</Text>
                    <Text style={styles.toggleSubtext}>Send meeting invite to {leadPhone}</Text>
                  </View>
                  <Switch
                    value={formData.send_whatsapp_invite}
                    onValueChange={(value) => setFormData({ ...formData, send_whatsapp_invite: value })}
                    trackColor={{ false: Colors.border, true: '#25D36660' }}
                    thumbColor={formData.send_whatsapp_invite ? '#25D366' : '#f4f3f4'}
                  />
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowCreateModal(false); resetForm(); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (!formData.title.trim() || creating) && styles.submitButtonDisabled]}
                onPress={handleCreateFollowUp}
                disabled={!formData.title.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{isEditing ? 'Update' : 'Schedule'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Follow-up Modal */}
      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Follow-up</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Outcome / Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={outcome}
                onChangeText={setOutcome}
                placeholder="How did the follow-up go? Add notes here..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#10B981' }, completing && styles.submitButtonDisabled]}
                onPress={handleCompleteFollowUp}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Mark Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  followUpCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completedCard: {
    opacity: 0.7,
  },
  followUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  followUpInfo: {
    flex: 1,
  },
  followUpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  followUpMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  followUpDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  followUpDetails: {
    marginTop: 10,
    marginLeft: 42,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  followUpDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    marginLeft: 42,
  },
  followUpOutcome: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    padding: 4,
  },
  inviteSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginLeft: 42,
  },
  inviteSentText: {
    fontSize: 11,
    color: '#25D366',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeOptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  toggleSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
