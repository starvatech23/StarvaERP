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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { poRequestAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending_ops_manager': return '#F59E0B';
    case 'pending_head_approval': return '#3B82F6';
    case 'pending_finance': return '#8B5CF6';
    case 'approved': return '#10B981';
    case 'rejected': return '#EF4444';
    default: return '#6B7280';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending_ops_manager': return 'Pending Operations Manager';
    case 'pending_head_approval': return 'Pending Project/Ops Head';
    case 'pending_finance': return 'Pending Finance';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    default: return status;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return '#EF4444';
    case 'high': return '#F59E0B';
    case 'medium': return '#3B82F6';
    case 'low': return '#6B7280';
    default: return '#6B7280';
  }
};

const getLevelInfo = (level: number) => {
  switch (level) {
    case 1: return { title: 'Level 1', subtitle: 'Operations Manager', icon: 'person-circle' };
    case 2: return { title: 'Level 2', subtitle: 'Project/Ops Head', icon: 'people-circle' };
    case 3: return { title: 'Level 3', subtitle: 'Finance Head', icon: 'wallet' };
    default: return { title: `Level ${level}`, subtitle: '', icon: 'checkmark-circle' };
  }
};

export default function PORequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [poRequest, setPoRequest] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingToVendor, setSendingToVendor] = useState(false);

  useEffect(() => {
    loadPORequest();
  }, [id]);

  const loadPORequest = async () => {
    try {
      setLoading(true);
      const response = await poRequestAPI.getById(id as string);
      setPoRequest(response.data);
    } catch (error) {
      console.error('Error loading PO request:', error);
      Alert.alert('Error', 'Failed to load PO request details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canApprove = () => {
    if (!poRequest || !user) return false;
    const role = user?.role;
    const status = poRequest.status;
    
    // Level 1: Operations Manager approval
    if (status === 'pending_ops_manager') {
      return role === 'admin' || role === 'operations_manager';
    }
    // Level 2: Project Head + Operations Head approval
    if (status === 'pending_head_approval') {
      return role === 'admin' || role === 'project_head' || role === 'operations_head';
    }
    // Level 3: Finance approval
    if (status === 'pending_finance') {
      return role === 'admin' || role === 'finance_head' || role === 'finance_team';
    }
    return false;
  };

  const canSendToVendor = () => {
    if (!poRequest || !user) return false;
    const role = user?.role;
    
    // Only approved POs can be sent
    if (poRequest.status !== 'approved') return false;
    if (poRequest.po_sent_to_vendor) return false;
    
    // Operations team can send
    const allowedRoles = ['admin', 'operations_manager', 'operations_head', 'operations_executive', 'project_manager'];
    return allowedRoles.includes(role);
  };

  const needsVendorSelection = () => {
    if (!poRequest) return false;
    return poRequest.status === 'approved' && !poRequest.po_sent_to_vendor && !poRequest.vendor_id;
  };

  const handleSendToVendor = async () => {
    Alert.alert(
      'Send PO to Vendor',
      `Are you sure you want to send PO ${poRequest.po_number} to ${poRequest.vendor_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setSendingToVendor(true);
              const response = await poRequestAPI.sendToVendor(id as string);
              Alert.alert(
                'Success',
                `PO sent to ${response.data.vendor_name} successfully!\n\nPhone: ${response.data.vendor_phone || 'N/A'}\nEmail: ${response.data.vendor_email || 'N/A'}`,
                [{ text: 'OK', onPress: () => loadPORequest() }]
              );
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Failed to send PO to vendor';
              Alert.alert('Error', message);
            } finally {
              setSendingToVendor(false);
            }
          }
        }
      ]
    );
  };

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setComments('');
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    try {
      setSubmitting(true);
      await poRequestAPI.approve(id as string, {
        action: approvalAction,
        comments: comments.trim() || undefined,
      });
      
      Alert.alert(
        'Success',
        approvalAction === 'approve' 
          ? 'PO Request has been approved successfully' 
          : 'PO Request has been rejected',
        [{ text: 'OK', onPress: () => {
          setShowApprovalModal(false);
          loadPORequest();
        }}]
      );
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to process approval';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!poRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>PO Request not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentLevel = 
    poRequest.status === 'pending_ops_manager' ? 1 :
    poRequest.status === 'pending_head_approval' ? 2 :
    poRequest.status === 'pending_finance' ? 3 : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{poRequest.request_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(poRequest.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(poRequest.status) }]}>
              {getStatusLabel(poRequest.status)}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{poRequest.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(poRequest.priority) + '20' }]}>
              <Ionicons name="flag" size={14} color={getPriorityColor(poRequest.priority)} />
              <Text style={[styles.priorityText, { color: getPriorityColor(poRequest.priority) }]}>
                {poRequest.priority?.toUpperCase()}
              </Text>
            </View>
          </View>

          {poRequest.description && (
            <Text style={styles.description}>{poRequest.description}</Text>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="business" size={16} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Project</Text>
                <Text style={styles.infoValue}>{poRequest.project_name || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={16} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Requested By</Text>
                <Text style={styles.infoValue}>{poRequest.requested_by_name || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Required By</Text>
                <Text style={styles.infoValue}>
                  {poRequest.required_by_date ? formatDate(poRequest.required_by_date).split(',')[0] : 'Not specified'}
                </Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={16} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Delivery Location</Text>
                <Text style={styles.infoValue}>{poRequest.delivery_location || 'Not specified'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Vendor Information */}
        {(poRequest.vendor_name || poRequest.vendor_id) && (
          <View style={styles.card}>
            <View style={styles.vendorHeader}>
              <Ionicons name="storefront" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Vendor</Text>
            </View>
            <View style={styles.vendorDetails}>
              <Text style={styles.vendorName}>{poRequest.vendor_name || 'Vendor Selected'}</Text>
              {poRequest.po_sent_to_vendor && (
                <View style={styles.poSentBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.poSentText}>PO Sent</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Amount Summary */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Estimated Amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(poRequest.total_estimated_amount)}</Text>
          {poRequest.po_number && (
            <View style={styles.poNumberRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.poNumberText}>PO Number: {poRequest.po_number}</Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Line Items ({poRequest.line_items?.length || 0})</Text>
          {poRequest.line_items?.map((item: any, index: number) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemName}>{item.item_name}</Text>
                <Text style={styles.lineItemTotal}>{formatCurrency(item.estimated_total)}</Text>
              </View>
              <View style={styles.lineItemDetails}>
                <Text style={styles.lineItemDetail}>
                  Qty: {item.quantity} {item.unit}
                </Text>
                <Text style={styles.lineItemDetail}>
                  Rate: {formatCurrency(item.estimated_unit_price)}
                </Text>
              </View>
              {item.specifications && (
                <Text style={styles.lineItemSpec}>{item.specifications}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Justification */}
        {poRequest.justification && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Justification</Text>
            <Text style={styles.justificationText}>{poRequest.justification}</Text>
          </View>
        )}

        {/* Approval Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Approval Progress</Text>
          <View style={styles.timeline}>
            {[1, 2, 3].map((level) => {
              const levelInfo = getLevelInfo(level);
              const approval = poRequest.approvals?.find((a: any) => a.level === level);
              const isCompleted = approval?.status === 'approve' || approval?.status === 'approved';
              const isRejected = approval?.status === 'reject' || approval?.status === 'rejected';
              const isCurrent = currentLevel === level;
              const isPending = level > currentLevel && !isRejected && poRequest.status !== 'rejected';

              return (
                <View key={level} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isRejected && styles.timelineDotRejected,
                      isCurrent && styles.timelineDotCurrent,
                    ]}>
                      <Ionicons 
                        name={isCompleted ? 'checkmark' : isRejected ? 'close' : levelInfo.icon as any} 
                        size={16} 
                        color={isCompleted ? '#fff' : isRejected ? '#fff' : isCurrent ? Colors.primary : '#9CA3AF'} 
                      />
                    </View>
                    {level < 3 && <View style={[
                      styles.timelineLine,
                      (isCompleted || (level < currentLevel && !isRejected)) && styles.timelineLineCompleted,
                    ]} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{levelInfo.title}: {levelInfo.subtitle}</Text>
                    {approval ? (
                      <>
                        <Text style={[
                          styles.timelineStatus,
                          { color: isCompleted ? '#10B981' : '#EF4444' }
                        ]}>
                          {isCompleted ? 'Approved' : 'Rejected'} by {approval.approved_by_name}
                        </Text>
                        <Text style={styles.timelineDate}>{formatDate(approval.approved_at)}</Text>
                        {approval.comments && (
                          <Text style={styles.timelineComments}>"{approval.comments}"</Text>
                        )}
                      </>
                    ) : isPending ? (
                      <Text style={styles.timelineStatus}>Pending</Text>
                    ) : isCurrent ? (
                      <Text style={[styles.timelineStatus, { color: '#F59E0B' }]}>Awaiting approval</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Rejection Info */}
        {poRequest.status === 'rejected' && poRequest.rejection_reason && (
          <View style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.rejectionTitle}>Request Rejected</Text>
            </View>
            <Text style={styles.rejectionReason}>{poRequest.rejection_reason}</Text>
            {poRequest.rejected_by_name && (
              <Text style={styles.rejectionBy}>By: {poRequest.rejected_by_name}</Text>
            )}
          </View>
        )}

        {/* Created Info */}
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>Created: {formatDate(poRequest.created_at)}</Text>
          {poRequest.updated_at && (
            <Text style={styles.metaText}>Updated: {formatDate(poRequest.updated_at)}</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {canApprove() && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleApprovalAction('reject')}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprovalAction('approve')}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Send to Vendor Button - for approved POs */}
      {canSendToVendor() && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.sendVendorButton, sendingToVendor && { opacity: 0.7 }]}
            onPress={handleSendToVendor}
            disabled={sendingToVendor}
          >
            {sendingToVendor ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.sendVendorButtonText}>Send PO to Vendor</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Approval Modal */}
      <Modal visible={showApprovalModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
              </Text>
              <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {approvalAction === 'approve'
                ? 'Please confirm you want to approve this PO request.'
                : 'Please provide a reason for rejection.'}
            </Text>

            <Text style={styles.inputLabel}>Comments {approvalAction === 'reject' ? '(Required)' : '(Optional)'}</Text>
            <TextInput
              style={styles.commentInput}
              value={comments}
              onChangeText={setComments}
              placeholder="Enter your comments..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowApprovalModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  approvalAction === 'reject' && styles.modalRejectBtn,
                  (submitting || (approvalAction === 'reject' && !comments.trim())) && styles.modalBtnDisabled,
                ]}
                onPress={submitApproval}
                disabled={submitting || (approvalAction === 'reject' && !comments.trim())}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={approvalAction === 'approve' ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.modalConfirmText}>
                      {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingVertical: 12,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  amountCard: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  poNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  poNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  lineItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lineItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  lineItemDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  lineItemDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lineItemSpec: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
  },
  justificationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timelineDotCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  timelineDotRejected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  timelineDotCurrent: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  timelineStatus: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timelineComments: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  rejectionReason: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  rejectionBy: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 8,
  },
  metaInfo: {
    padding: 16,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 100,
    backgroundColor: Colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  modalRejectBtn: {
    backgroundColor: '#EF4444',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Vendor styles
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  vendorDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  poSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  poSentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  sendVendorButton: {
    backgroundColor: '#3B82F6',
    flex: 1,
  },
  sendVendorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
