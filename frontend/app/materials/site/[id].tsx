import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { siteMaterialsAPI, materialTransfersAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Colors from '../../../constants/Colors';

interface TransferRecord {
  id: string;
  material_type: string;
  quantity: number;
  unit: string;
  source_project_id: string;
  source_project_name: string;
  destination_type: string;
  destination_project_id?: string;
  destination_project_name?: string;
  status: string;
  initiated_by_name: string;
  accepted_by_name?: string;
  created_at: string;
  accepted_at?: string;
  direction?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_review: { bg: '#FEF3C7', text: '#F59E0B' },
  approved: { bg: '#D1FAE5', text: '#10B981' },
  rejected: { bg: '#FEE2E2', text: '#EF4444' },
  transferred: { bg: '#E0E7FF', text: '#6366F1' },
};

const CONDITION_COLORS: Record<string, string> = {
  new: '#10B981',
  good: '#3B82F6',
  fair: '#F59E0B',
  damaged: '#EF4444',
  needs_repair: '#8B5CF6',
};

export default function SiteMaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [material, setMaterial] = useState<any>(null);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMaterial();
      loadTransferHistory();
    }
  }, [id]);

  const loadMaterial = async () => {
    try {
      const response = await siteMaterialsAPI.getById(id as string);
      setMaterial(response.data);
    } catch (error) {
      console.error('Failed to load material:', error);
      Alert.alert('Error', 'Failed to load material details');
    } finally {
      setLoading(false);
    }
  };

  const loadTransferHistory = async () => {
    try {
      // Get transfers where this material was involved
      const response = await materialTransfersAPI.list({});
      // Filter transfers for this material
      const relevantTransfers = (response.data || []).filter(
        (t: any) => t.site_material_id === id
      );
      setTransferHistory(relevantTransfers);
    } catch (error) {
      console.log('Could not load transfer history');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!material) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Material Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>Material not found or has been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[material.status] || STATUS_COLORS.approved;
  const conditionColor = CONDITION_COLORS[material.condition] || '#6B7280';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Media Gallery */}
        {material.media_urls?.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.mediaGallery}
            contentContainerStyle={styles.mediaGalleryContent}
          >
            {material.media_urls.map((url: string, index: number) => (
              <Image key={index} source={{ uri: url }} style={styles.mediaImage} />
            ))}
          </ScrollView>
        )}

        {/* Main Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.materialType}>{material.material_type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {material.status === 'pending_review' ? 'Pending' : material.status}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="cube-outline" size={20} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Quantity</Text>
                <Text style={styles.infoValue}>{material.quantity} {material.unit}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.conditionIndicator, { backgroundColor: conditionColor }]} />
              <View>
                <Text style={styles.infoLabel}>Condition</Text>
                <Text style={[styles.infoValue, { color: conditionColor }]}>
                  {material.condition?.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>

          {material.cost && (
            <View style={styles.costRow}>
              <Ionicons name="cash-outline" size={20} color={Colors.secondary} />
              <Text style={styles.costValue}>{formatCurrency(material.cost)}</Text>
            </View>
          )}
        </View>

        {/* Project Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Project / Site</Text>
          <View style={styles.projectInfo}>
            <Ionicons name="business" size={24} color={Colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.projectName}>{material.project_name || 'Unknown Project'}</Text>
              <Text style={styles.projectId}>ID: {material.project_id}</Text>
            </View>
          </View>
        </View>

        {/* Added By Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Added By</Text>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(material.added_by_name || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{material.added_by_name || 'Unknown'}</Text>
              <Text style={styles.dateText}>{formatDate(material.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Review Info */}
        {material.reviewed_by_name && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Reviewed By</Text>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: Colors.secondary + '20' }]}>
                <Ionicons name="checkmark" size={20} color={Colors.secondary} />
              </View>
              <View>
                <Text style={styles.userName}>{material.reviewed_by_name}</Text>
                <Text style={styles.dateText}>
                  {material.reviewed_at ? formatDate(material.reviewed_at) : 'Date unknown'}
                </Text>
                {material.review_notes && (
                  <Text style={styles.reviewNotes}>"{material.review_notes}"</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {material.notes && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{material.notes}</Text>
          </View>
        )}

        {/* Transfer Note (if transferred) */}
        {material.transfer_note && (
          <View style={[styles.sectionCard, styles.transferNoteCard]}>
            <View style={styles.transferNoteHeader}>
              <Ionicons name="swap-horizontal" size={20} color="#6366F1" />
              <Text style={styles.transferNoteTitle}>Transfer Note</Text>
            </View>
            <Text style={styles.transferNoteText}>{material.transfer_note}</Text>
            {material.transferred_at && (
              <Text style={styles.transferDate}>Transferred on {formatDate(material.transferred_at)}</Text>
            )}
          </View>
        )}

        {/* Transfer History - From Project/s */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transfer History</Text>
            {transferHistory.length > 0 && (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{transferHistory.length}</Text>
              </View>
            )}
          </View>

          {transferHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="document-text-outline" size={32} color={Colors.textSecondary} />
              <Text style={styles.emptyHistoryText}>No transfer history</Text>
              <Text style={styles.emptyHistorySubtext}>
                This material has not been transferred to/from any project
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {transferHistory.map((transfer, index) => (
                <View key={transfer.id} style={styles.historyItem}>
                  <View style={styles.historyTimeline}>
                    <View style={[
                      styles.historyDot,
                      { backgroundColor: transfer.status === 'accepted' ? '#10B981' : 
                        transfer.status === 'rejected' ? '#EF4444' : '#F59E0B' }
                    ]} />
                    {index < transferHistory.length - 1 && <View style={styles.historyLine} />}
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyAction}>
                        {transfer.destination_type === 'project' 
                          ? `→ ${transfer.destination_project_name || 'Unknown Project'}`
                          : `→ ${transfer.destination_type?.toUpperCase()}`
                        }
                      </Text>
                      <View style={[
                        styles.historyStatus,
                        { backgroundColor: transfer.status === 'accepted' ? '#D1FAE5' : 
                          transfer.status === 'rejected' ? '#FEE2E2' : '#FEF3C7' }
                      ]}>
                        <Text style={[
                          styles.historyStatusText,
                          { color: transfer.status === 'accepted' ? '#10B981' : 
                            transfer.status === 'rejected' ? '#EF4444' : '#F59E0B' }
                        ]}>
                          {transfer.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyQty}>
                      {transfer.quantity} {transfer.unit} transferred
                    </Text>
                    <Text style={styles.historyFrom}>
                      From: {transfer.source_project_name || 'Unknown'}
                    </Text>
                    <Text style={styles.historyMeta}>
                      By {transfer.initiated_by_name} • {formatDate(transfer.created_at)}
                    </Text>
                    {transfer.accepted_by_name && transfer.status === 'accepted' && (
                      <Text style={styles.historyAccepted}>
                        Accepted by {transfer.accepted_by_name}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  mediaGallery: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  mediaGalleryContent: {
    paddingHorizontal: 16,
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  materialType: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  conditionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  costValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  projectId: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reviewNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  transferNoteCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  transferNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  transferNoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  transferNoteText: {
    fontSize: 14,
    color: '#4338CA',
  },
  transferDate: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 8,
  },
  historyBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptyHistorySubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  historyTimeline: {
    alignItems: 'center',
    marginRight: 12,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  historyQty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  historyFrom: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  historyMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  historyAccepted: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
});
