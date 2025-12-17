import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { siteMaterialsAPI, projectsAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import Colors from '../../../constants/Colors';

type MaterialCondition = 'new' | 'good' | 'fair' | 'damaged' | 'needs_repair';
type MaterialStatus = 'pending_review' | 'approved' | 'rejected';

interface SiteMaterial {
  id: string;
  project_id: string;
  project_name?: string;
  material_type: string;
  quantity: number;
  unit: string;
  cost?: number;
  condition: MaterialCondition;
  notes?: string;
  media_urls: string[];
  status: MaterialStatus;
  added_by: string;
  added_by_name?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  review_notes?: string;
  reviewed_at?: string;
  created_at: string;
}

const CONDITION_LABELS: Record<MaterialCondition, { label: string; color: string }> = {
  new: { label: 'New', color: '#10B981' },
  good: { label: 'Good', color: '#3B82F6' },
  fair: { label: 'Fair', color: '#F59E0B' },
  damaged: { label: 'Damaged', color: '#EF4444' },
  needs_repair: { label: 'Needs Repair', color: '#8B5CF6' },
};

const STATUS_LABELS: Record<MaterialStatus, { label: string; color: string; bgColor: string }> = {
  pending_review: { label: 'Pending Review', color: '#F59E0B', bgColor: '#FEF3C7' },
  approved: { label: 'Approved', color: '#10B981', bgColor: '#D1FAE5' },
  rejected: { label: 'Rejected', color: '#EF4444', bgColor: '#FEE2E2' },
};

export default function SiteMaterialsScreen() {
  const { status: filterStatus } = useLocalSearchParams<{ status?: string }>();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<SiteMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(filterStatus || 'all');
  const [selectedMaterial, setSelectedMaterial] = useState<SiteMaterial | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const canReview = user?.role && ['admin', 'project_manager', 'crm_manager'].includes(user.role);

  const loadMaterials = useCallback(async () => {
    try {
      const params: any = {};
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      const response = await siteMaterialsAPI.list(params);
      setMaterials(response.data);
    } catch (error) {
      console.error('Failed to load site materials:', error);
      Alert.alert('Error', 'Failed to load site materials');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMaterials();
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedMaterial) return;

    setReviewing(true);
    try {
      await siteMaterialsAPI.review(selectedMaterial.id, status, reviewNotes);
      Alert.alert('Success', `Material ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setShowReviewModal(false);
      setSelectedMaterial(null);
      setReviewNotes('');
      loadMaterials();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to review material');
    } finally {
      setReviewing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderMaterialCard = (material: SiteMaterial) => {
    const statusInfo = STATUS_LABELS[material.status];
    const conditionInfo = CONDITION_LABELS[material.condition];

    return (
      <TouchableOpacity
        key={material.id}
        style={styles.materialCard}
        onPress={() => {
          setSelectedMaterial(material);
          if (canReview && material.status === 'pending_review') {
            setShowReviewModal(true);
          }
        }}
      >
        {/* Media Preview */}
        {material.media_urls.length > 0 && (
          <View style={styles.mediaPreview}>
            <Image
              source={{ uri: material.media_urls[0] }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {material.media_urls.length > 1 && (
              <View style={styles.mediaCount}>
                <Text style={styles.mediaCountText}>+{material.media_urls.length - 1}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.materialType}>{material.material_type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="cube-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{material.quantity} {material.unit}</Text>
            </View>
            <View style={[styles.conditionBadge, { borderColor: conditionInfo.color }]}>
              <View style={[styles.conditionDot, { backgroundColor: conditionInfo.color }]} />
              <Text style={[styles.conditionText, { color: conditionInfo.color }]}>{conditionInfo.label}</Text>
            </View>
          </View>

          {material.cost && (
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{formatCurrency(material.cost)}</Text>
            </View>
          )}

          {/* Project */}
          {material.project_name && (
            <View style={styles.projectRow}>
              <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.projectName}>{material.project_name}</Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.addedBy}>Added by {material.added_by_name || 'Unknown'}</Text>
            <Text style={styles.dateText}>{formatDate(material.created_at)}</Text>
          </View>

          {/* Review Info */}
          {material.status !== 'pending_review' && material.reviewed_by_name && (
            <View style={styles.reviewInfo}>
              <Ionicons 
                name={material.status === 'approved' ? 'checkmark-circle' : 'close-circle'} 
                size={14} 
                color={material.status === 'approved' ? '#10B981' : '#EF4444'} 
              />
              <Text style={styles.reviewText}>
                {material.status === 'approved' ? 'Approved' : 'Rejected'} by {material.reviewed_by_name}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading materials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Materials</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/materials/site/add' as any)}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['all', 'pending_review', 'approved', 'rejected'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              selectedStatus === status && styles.filterTabActive,
            ]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === status && styles.filterTabTextActive,
              ]}
            >
              {status === 'all' ? 'All' : STATUS_LABELS[status as MaterialStatus]?.label || status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Materials List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >
        {materials.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Materials Found</Text>
            <Text style={styles.emptyText}>
              {selectedStatus === 'all'
                ? 'No site materials have been added yet.'
                : `No ${STATUS_LABELS[selectedStatus as MaterialStatus]?.label.toLowerCase() || selectedStatus} materials.`}
            </Text>
            <TouchableOpacity
              style={styles.addMaterialButton}
              onPress={() => router.push('/materials/site/add' as any)}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
              <Text style={styles.addMaterialButtonText}>Add Material</Text>
            </TouchableOpacity>
          </View>
        ) : (
          materials.map(renderMaterialCard)
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Material</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedMaterial && (
              <>
                <View style={styles.reviewMaterialInfo}>
                  <Text style={styles.reviewMaterialType}>{selectedMaterial.material_type}</Text>
                  <Text style={styles.reviewMaterialQty}>
                    {selectedMaterial.quantity} {selectedMaterial.unit}
                  </Text>
                  {selectedMaterial.notes && (
                    <Text style={styles.reviewMaterialNotes}>Notes: {selectedMaterial.notes}</Text>
                  )}
                </View>

                {selectedMaterial.media_urls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                    {selectedMaterial.media_urls.map((url, index) => (
                      <Image key={index} source={{ uri: url }} style={styles.reviewMediaImage} />
                    ))}
                  </ScrollView>
                )}

                <TextInput
                  style={styles.reviewNotesInput}
                  placeholder="Add review notes (optional)"
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    style={[styles.reviewButton, styles.rejectButton]}
                    onPress={() => handleReview('rejected')}
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <Text style={[styles.reviewButtonText, { color: '#EF4444' }]}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reviewButton, styles.approveButton]}
                    onPress={() => handleReview('approved')}
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                        <Text style={[styles.reviewButtonText, { color: Colors.white }]}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  materialCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mediaPreview: {
    height: 160,
    backgroundColor: Colors.backgroundSecondary,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  conditionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  projectName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addedBy: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
  },
  reviewText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  addMaterialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  addMaterialButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewMaterialInfo: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  reviewMaterialType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewMaterialQty: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  reviewMaterialNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  mediaScroll: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  reviewMediaImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewNotesInput: {
    marginHorizontal: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  approveButton: {
    backgroundColor: Colors.primary,
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
