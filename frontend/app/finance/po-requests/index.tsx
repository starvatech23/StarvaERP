import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { poRequestAPI, projectsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending_ops_manager', label: 'Pending Ops Manager' },
  { value: 'pending_head_approval', label: 'Pending Heads' },
  { value: 'pending_finance', label: 'Pending Finance' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

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
    case 'pending_ops_manager': return 'Pending Ops Mgr';
    case 'pending_head_approval': return 'Pending Heads';
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

export default function PORequestsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [poRequests, setPoRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [poRes, projRes] = await Promise.all([
        poRequestAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setPoRequests(poRes.data || []);
      setProjects(projRes.data || []);
    } catch (error) {
      console.error('Error loading PO requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredRequests = poRequests.filter((po) => {
    if (selectedStatus && po.status !== selectedStatus) return false;
    if (selectedPriority && po.priority !== selectedPriority) return false;
    if (selectedProject && po.project_id !== selectedProject) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        po.request_number?.toLowerCase().includes(query) ||
        po.title?.toLowerCase().includes(query) ||
        po.project_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const clearFilters = () => {
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedProject('');
    setSearchQuery('');
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
    });
  };

  // Check if user can approve at current level
  const canApprove = (po: any) => {
    const role = user?.role;
    const status = po.status;
    
    // Level 1: Operations Manager
    if (status === 'pending_l1' && (role === 'admin' || role === 'project_manager')) {
      return true;
    }
    // Level 2: Project/Operations Head
    if (status === 'pending_l2' && (role === 'admin' || role === 'project_manager')) {
      return true;
    }
    // Level 3: Finance
    if (status === 'pending_finance' && (role === 'admin' || role === 'project_manager')) {
      return true;
    }
    return false;
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PO Requests</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'filter' : 'filter-outline'}
            size={24}
            color={showFilters ? Colors.primary : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by PO number, title..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textSecondary}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Status Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      selectedStatus === option.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedStatus === option.value && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {/* Priority Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Priority</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PRIORITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      selectedPriority === option.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedPriority(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedPriority === option.value && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          {(selectedStatus || selectedPriority || selectedProject) && (
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
              <Ionicons name="close-circle" size={16} color={Colors.primary} />
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.statCount, { color: '#F59E0B' }]}>
            {poRequests.filter((p) => p.status === 'pending_l1').length}
          </Text>
          <Text style={styles.statLabel}>Pending L1</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.statCount, { color: '#3B82F6' }]}>
            {poRequests.filter((p) => p.status === 'pending_l2').length}
          </Text>
          <Text style={styles.statLabel}>Pending L2</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: '#EDE9FE' }]}>
          <Text style={[styles.statCount, { color: '#8B5CF6' }]}>
            {poRequests.filter((p) => p.status === 'pending_finance').length}
          </Text>
          <Text style={styles.statLabel}>Finance</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.statCount, { color: '#10B981' }]}>
            {poRequests.filter((p) => p.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No PO Requests Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || selectedStatus || selectedPriority
                ? 'Try adjusting your filters'
                : 'PO requests raised from projects will appear here'}
            </Text>
          </View>
        ) : (
          filteredRequests.map((po) => (
            <TouchableOpacity
              key={po.id}
              style={styles.poCard}
              onPress={() => router.push(`/finance/po-requests/${po.id}` as any)}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.poNumber}>{po.request_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(po.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(po.status) }]}>
                      {getStatusLabel(po.status)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(po.priority) + '20' }]}>
                  <Ionicons name="flag" size={12} color={getPriorityColor(po.priority)} />
                  <Text style={[styles.priorityText, { color: getPriorityColor(po.priority) }]}>
                    {po.priority?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.poTitle} numberOfLines={2}>
                {po.title}
              </Text>

              {/* Project */}
              <View style={styles.projectRow}>
                <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.projectName} numberOfLines={1}>
                  {po.project_name || 'Unknown Project'}
                </Text>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Amount</Text>
                  <Text style={styles.footerValue}>{formatCurrency(po.total_estimated_amount)}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Items</Text>
                  <Text style={styles.footerValue}>{po.line_items?.length || 0}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Created</Text>
                  <Text style={styles.footerValue}>{formatDate(po.created_at)}</Text>
                </View>
              </View>

              {/* Action indicator */}
              {canApprove(po) && (
                <View style={styles.actionIndicator}>
                  <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                  <Text style={styles.actionIndicatorText}>Needs your approval</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  filtersContainer: {
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterGroup: {
    marginRight: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  clearFiltersText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statBadge: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  poCard: {
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
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
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
    fontSize: 10,
    fontWeight: '600',
  },
  poTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  projectName: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
});
