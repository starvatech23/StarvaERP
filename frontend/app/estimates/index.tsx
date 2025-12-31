import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { estimatesV2API, estimatesAPI } from '../../services/api';

interface Estimate {
  id: string;
  version_name?: string;
  status: string;
  built_up_area_sqft?: number;
  grand_total?: number;
  cost_per_sqft?: number;
  project_id?: string;
  project_name?: string;
  lead_id?: string;
  lead_name?: string;
  created_at: string;
  reviewed_by_name?: string;
  approved_by_name?: string;
}

export default function EstimatesListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'approved'>('all');

  useFocusEffect(
    useCallback(() => {
      loadEstimates();
    }, [])
  );

  const loadEstimates = async () => {
    try {
      // Fetch lead estimates (v2 quick estimates)
      const leadEstimatesRes = await estimatesV2API.getLeadEstimates();
      const leadEstimates = leadEstimatesRes.data || [];
      
      // Format and combine
      const formattedEstimates = leadEstimates.map((est: any) => ({
        id: est.id || est._id,
        version_name: est.version_name || est.name || `Estimate`,
        status: est.status || 'draft',
        built_up_area_sqft: est.built_up_area_sqft || est.total_area_sqft || 0,
        grand_total: est.grand_total || est.total || 0,
        cost_per_sqft: est.cost_per_sqft || 0,
        project_id: est.project_id,
        project_name: est.project_name,
        lead_id: est.lead_id,
        lead_name: est.lead_name || est.client_name,
        created_at: est.created_at,
        reviewed_by_name: est.reviewed_by_name,
        approved_by_name: est.approved_by_name,
      }));

      setEstimates(formattedEstimates);
    } catch (error) {
      console.error('Error loading estimates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredEstimates = () => {
    switch (activeTab) {
      case 'draft':
        return estimates.filter(e => e.status === 'draft' || e.status === 'pending');
      case 'approved':
        return estimates.filter(e => e.status === 'approved');
      default:
        return estimates;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'reviewed':
        return '#3B82F6';
      case 'draft':
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'reviewed':
        return 'eye';
      case 'draft':
      case 'pending':
        return 'time';
      case 'rejected':
        return 'close-circle';
      default:
        return 'document';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handleEstimatePress = (estimate: Estimate) => {
    // Navigate to estimate detail or quick estimate with pre-filled data
    if (estimate.lead_id) {
      router.push({
        pathname: '/estimates/quick-estimate',
        params: { estimateId: estimate.id },
      });
    } else if (estimate.project_id) {
      router.push({
        pathname: `/projects/${estimate.project_id}/budget`,
      });
    }
  };

  const handleCreateNew = () => {
    router.push('/estimates/quick-estimate');
  };

  const filteredEstimates = getFilteredEstimates();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading estimates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estimates</Text>
        <TouchableOpacity onPress={handleCreateNew} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{estimates.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#F59E0B10' }]}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
            {estimates.filter(e => e.status === 'draft' || e.status === 'pending').length}
          </Text>
          <Text style={styles.summaryLabel}>Draft</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#10B98110' }]}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>
            {estimates.filter(e => e.status === 'approved').length}
          </Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['all', 'draft', 'approved'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Estimates List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadEstimates(); }} 
          />
        }
      >
        {filteredEstimates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyStateTitle}>No Estimates Found</Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'all' 
                ? 'Create your first quick estimate to get started'
                : `No ${activeTab} estimates available`}
            </Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreateNew}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.emptyStateButtonText}>Create Estimate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEstimates.map((estimate) => (
            <TouchableOpacity
              key={estimate.id}
              style={styles.estimateCard}
              onPress={() => handleEstimatePress(estimate)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {estimate.version_name || 'Estimate'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(estimate.status) + '20' }]}>
                    <Ionicons 
                      name={getStatusIcon(estimate.status) as any} 
                      size={12} 
                      color={getStatusColor(estimate.status)} 
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(estimate.status) }]}>
                      {estimate.status}
                    </Text>
                  </View>
                </View>
                {(estimate.lead_name || estimate.project_name) && (
                  <Text style={styles.cardSubtitle}>
                    {estimate.project_name ? `Project: ${estimate.project_name}` : `Lead: ${estimate.lead_name}`}
                  </Text>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardStat}>
                  <Ionicons name="resize" size={16} color={Colors.textSecondary} />
                  <Text style={styles.cardStatText}>
                    {estimate.built_up_area_sqft?.toLocaleString() || 0} sqft
                  </Text>
                </View>
                <View style={styles.cardStat}>
                  <Ionicons name="pricetag" size={16} color={Colors.textSecondary} />
                  <Text style={styles.cardStatText}>
                    ₹{estimate.cost_per_sqft?.toLocaleString() || 0}/sqft
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardTotal}>{formatCurrency(estimate.grand_total || 0)}</Text>
                <Text style={styles.cardDate}>{formatDate(estimate.created_at)}</Text>
              </View>

              {(estimate.reviewed_by_name || estimate.approved_by_name) && (
                <View style={styles.cardApproval}>
                  {estimate.reviewed_by_name && (
                    <Text style={styles.approvalText}>
                      Reviewed by {estimate.reviewed_by_name}
                    </Text>
                  )}
                  {estimate.approved_by_name && (
                    <Text style={styles.approvalText}>
                      Approved by {estimate.approved_by_name}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
        <Ionicons name="calculator" size={24} color="#FFF" />
        <Text style={styles.fabText}>Quick Estimate</Text>
      </TouchableOpacity>
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
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summarySection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 40,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  estimateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardStatText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  cardApproval: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  approvalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
