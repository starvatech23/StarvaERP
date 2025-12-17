import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { crmDashboardAPI } from '../../services/api';
import Colors from '../../constants/Colors';

interface Filters {
  city?: string;
  state?: string;
  status?: string;
  source?: string;
  category_id?: string;
  funnel_id?: string;
  priority?: string;
  assigned_to?: string;
  min_value?: number;
  max_value?: number;
}

interface FilterOptions {
  cities: string[];
  states: string[];
  categories: { id: string; name: string }[];
  funnels: { id: string; name: string }[];
  statuses: string[];
  sources: string[];
  priorities: string[];
  assigned_users: { id: string; name: string }[];
  value_ranges: { label: string; min: number; max: number | null }[];
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  contacted: '#8B5CF6',
  qualified: '#F59E0B',
  proposal: '#06B6D4',
  negotiation: '#EC4899',
  won: '#10B981',
  lost: '#EF4444',
  on_hold: '#6B7280',
};

const formatCurrency = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
};

export default function CRMDashboardScreen() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [analyticsRes, filtersRes] = await Promise.all([
        crmDashboardAPI.getAnalytics(filters),
        filterOptions ? Promise.resolve({ data: filterOptions }) : crmDashboardAPI.getFilterOptions(),
      ]);
      setAnalytics(analyticsRes.data);
      if (!filterOptions) setFilterOptions(filtersRes.data);
    } catch (error) {
      console.error('Failed to load CRM analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, filterOptions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const applyFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setActiveFilterSection(null);
  };

  const clearFilter = (key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key as keyof Filters];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const activeFiltersCount = Object.keys(filters).length;

  const renderSummaryCard = (icon: string, title: string, value: string | number, subtitle?: string, color?: string) => (
    <View style={[styles.summaryCard, color && { borderLeftColor: color }]}>
      <View style={[styles.summaryIcon, { backgroundColor: (color || Colors.primary) + '20' }]}>
        <Ionicons name={icon as any} size={22} color={color || Colors.primary} />
      </View>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
        {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderStatusBar = (status: string, data: { count: number; value: number }) => {
    const total = analytics?.summary?.total_leads || 1;
    const percentage = ((data.count / total) * 100).toFixed(0);
    const color = STATUS_COLORS[status] || '#6B7280';

    return (
      <TouchableOpacity 
        key={status} 
        style={styles.statusBar}
        onPress={() => applyFilter('status', status)}
      >
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={styles.statusName}>{status.replace('_', ' ')}</Text>
          <Text style={styles.statusCount}>{data.count}</Text>
        </View>
        <View style={styles.statusProgress}>
          <View style={[styles.statusFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.statusValue}>{formatCurrency(data.value)}</Text>
      </TouchableOpacity>
    );
  };

  const renderBreakdownItem = (label: string, count: number, value?: number, onPress?: () => void) => (
    <TouchableOpacity key={label} style={styles.breakdownItem} onPress={onPress}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownStats}>
        <Text style={styles.breakdownCount}>{count}</Text>
        {value !== undefined && <Text style={styles.breakdownValue}>{formatCurrency(value)}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading CRM Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRM Dashboard</Text>
        <TouchableOpacity 
          style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]} 
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={20} color={activeFiltersCount > 0 ? Colors.white : Colors.primary} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
          {Object.entries(filters).map(([key, value]) => (
            <TouchableOpacity key={key} style={styles.filterChip} onPress={() => clearFilter(key)}>
              <Text style={styles.filterChipText}>{key}: {String(value)}</Text>
              <Ionicons name="close" size={14} color={Colors.primary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.clearAllChip} onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          {renderSummaryCard('people', 'Total Leads', analytics?.summary?.total_leads || 0, undefined, '#3B82F6')}
          {renderSummaryCard('trending-up', 'Pipeline Value', formatCurrency(analytics?.summary?.total_pipeline_value || 0), undefined, '#8B5CF6')}
          {renderSummaryCard('trophy', 'Won Deals', analytics?.summary?.won_leads || 0, formatCurrency(analytics?.summary?.won_value || 0), '#10B981')}
          {renderSummaryCard('analytics', 'Conversion', `${analytics?.summary?.conversion_rate || 0}%`, undefined, '#F59E0B')}
        </View>

        {/* Status Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pipeline by Status</Text>
          <View style={styles.statusList}>
            {analytics?.by_status && Object.entries(analytics.by_status).map(([status, data]: [string, any]) => 
              renderStatusBar(status, data)
            )}
          </View>
        </View>

        {/* Source Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Sources</Text>
          <View style={styles.breakdownGrid}>
            {analytics?.by_source && Object.entries(analytics.by_source).map(([source, count]: [string, any]) => 
              renderBreakdownItem(source.replace('_', ' '), count, undefined, () => applyFilter('source', source))
            )}
          </View>
        </View>

        {/* Priority Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Priority</Text>
          <View style={styles.priorityRow}>
            {analytics?.by_priority && Object.entries(analytics.by_priority).map(([priority, count]: [string, any]) => (
              <TouchableOpacity 
                key={priority} 
                style={[styles.priorityCard, { borderColor: priority === 'urgent' ? '#EF4444' : priority === 'high' ? '#F59E0B' : priority === 'medium' ? '#3B82F6' : '#6B7280' }]}
                onPress={() => applyFilter('priority', priority)}
              >
                <Text style={styles.priorityCount}>{count}</Text>
                <Text style={styles.priorityLabel}>{priority}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Value Ranges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deal Size Distribution</Text>
          <View style={styles.valueRanges}>
            {analytics?.by_value_range && Object.entries(analytics.by_value_range).map(([range, count]: [string, any]) => (
              <View key={range} style={styles.valueRangeItem}>
                <Text style={styles.valueRangeLabel}>{range}</Text>
                <View style={styles.valueRangeBar}>
                  <View style={[styles.valueRangeFill, { width: `${Math.min((count / (analytics?.summary?.total_leads || 1)) * 100 * 3, 100)}%` }]} />
                </View>
                <Text style={styles.valueRangeCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Cities */}
        {analytics?.by_city?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Cities</Text>
            <View style={styles.locationList}>
              {analytics.by_city.slice(0, 5).map((item: any) => (
                <TouchableOpacity 
                  key={item.city} 
                  style={styles.locationItem}
                  onPress={() => applyFilter('city', item.city)}
                >
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.locationName}>{item.city}</Text>
                  <Text style={styles.locationCount}>{item.count} leads</Text>
                  <Text style={styles.locationValue}>{formatCurrency(item.value)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Top States */}
        {analytics?.by_state?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top States</Text>
            <View style={styles.locationList}>
              {analytics.by_state.slice(0, 5).map((item: any) => (
                <TouchableOpacity 
                  key={item.state} 
                  style={styles.locationItem}
                  onPress={() => applyFilter('state', item.state)}
                >
                  <Ionicons name="map" size={16} color="#8B5CF6" />
                  <Text style={styles.locationName}>{item.state}</Text>
                  <Text style={styles.locationCount}>{item.count} leads</Text>
                  <Text style={styles.locationValue}>{formatCurrency(item.value)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Categories */}
        {analytics?.by_category?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Category</Text>
            <View style={styles.breakdownGrid}>
              {analytics.by_category.map((item: any) => 
                renderBreakdownItem(item.name, item.count, item.value, () => applyFilter('category_id', item.category_id))
              )}
            </View>
          </View>
        )}

        {/* Funnels */}
        {analytics?.by_funnel?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Funnel</Text>
            <View style={styles.funnelList}>
              {analytics.by_funnel.map((item: any) => (
                <TouchableOpacity 
                  key={item.funnel_id} 
                  style={styles.funnelItem}
                  onPress={() => applyFilter('funnel_id', item.funnel_id)}
                >
                  <Ionicons name="funnel" size={18} color={Colors.secondary} />
                  <Text style={styles.funnelName}>{item.name}</Text>
                  <View style={styles.funnelCount}>
                    <Text style={styles.funnelCountText}>{item.count}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterSections}>
              {/* City Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'city' ? null : 'city')}>
                <Text style={styles.filterSectionTitle}>City</Text>
                <Ionicons name={activeFilterSection === 'city' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'city' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.cities.map((city) => (
                    <TouchableOpacity key={city} style={styles.filterOption} onPress={() => { applyFilter('city', city); setShowFilters(false); }}>
                      <Text style={styles.filterOptionText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* State Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'state' ? null : 'state')}>
                <Text style={styles.filterSectionTitle}>State</Text>
                <Ionicons name={activeFilterSection === 'state' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'state' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.states.map((state) => (
                    <TouchableOpacity key={state} style={styles.filterOption} onPress={() => { applyFilter('state', state); setShowFilters(false); }}>
                      <Text style={styles.filterOptionText}>{state}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Status Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'status' ? null : 'status')}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <Ionicons name={activeFilterSection === 'status' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'status' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.statuses.map((status) => (
                    <TouchableOpacity key={status} style={styles.filterOption} onPress={() => { applyFilter('status', status); setShowFilters(false); }}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || '#6B7280' }]} />
                      <Text style={styles.filterOptionText}>{status.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Source Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'source' ? null : 'source')}>
                <Text style={styles.filterSectionTitle}>Source</Text>
                <Ionicons name={activeFilterSection === 'source' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'source' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.sources.map((source) => (
                    <TouchableOpacity key={source} style={styles.filterOption} onPress={() => { applyFilter('source', source); setShowFilters(false); }}>
                      <Text style={styles.filterOptionText}>{source.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Priority Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'priority' ? null : 'priority')}>
                <Text style={styles.filterSectionTitle}>Priority</Text>
                <Ionicons name={activeFilterSection === 'priority' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'priority' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.priorities.map((priority) => (
                    <TouchableOpacity key={priority} style={styles.filterOption} onPress={() => { applyFilter('priority', priority); setShowFilters(false); }}>
                      <Text style={styles.filterOptionText}>{priority}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Category Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'category' ? null : 'category')}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <Ionicons name={activeFilterSection === 'category' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'category' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.categories.map((cat) => (
                    <TouchableOpacity key={cat.id} style={styles.filterOption} onPress={() => { applyFilter('category_id', cat.id); setShowFilters(false); }}>
                      <Text style={styles.filterOptionText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Funnel Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'funnel' ? null : 'funnel')}>
                <Text style={styles.filterSectionTitle}>Funnel</Text>
                <Ionicons name={activeFilterSection === 'funnel' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'funnel' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.funnels.map((funnel) => (
                    <TouchableOpacity key={funnel.id} style={styles.filterOption} onPress={() => { applyFilter('funnel_id', funnel.id); setShowFilters(false); }}>
                      <Text style={styles.filterOptionText}>{funnel.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Assigned User Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'assigned' ? null : 'assigned')}>
                <Text style={styles.filterSectionTitle}>Assigned To</Text>
                <Ionicons name={activeFilterSection === 'assigned' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'assigned' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.assigned_users.map((user) => (
                    <TouchableOpacity key={user.id} style={styles.filterOption} onPress={() => { applyFilter('assigned_to', user.id); setShowFilters(false); }}>
                      <Text style={styles.filterOptionText}>{user.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Value Range Filter */}
              <TouchableOpacity style={styles.filterSection} onPress={() => setActiveFilterSection(activeFilterSection === 'value' ? null : 'value')}>
                <Text style={styles.filterSectionTitle}>Deal Value</Text>
                <Ionicons name={activeFilterSection === 'value' ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {activeFilterSection === 'value' && (
                <View style={styles.filterOptions}>
                  {filterOptions?.value_ranges.map((range) => (
                    <TouchableOpacity 
                      key={range.label} 
                      style={styles.filterOption} 
                      onPress={() => { 
                        setFilters(prev => ({ ...prev, min_value: range.min, max_value: range.max || undefined }));
                        setShowFilters(false);
                      }}
                    >
                      <Text style={styles.filterOptionText}>{range.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  filterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterBadge: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  activeFilters: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  filterChipText: { fontSize: 12, color: Colors.primary, fontWeight: '500', textTransform: 'capitalize' },
  clearAllChip: { paddingHorizontal: 12, paddingVertical: 6 },
  clearAllText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryCard: { width: '47%', backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  summaryContent: {},
  summaryValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  summaryTitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  summarySubtitle: { fontSize: 11, color: Colors.secondary, marginTop: 2 },
  section: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusList: { gap: 12 },
  statusBar: {},
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusName: { flex: 1, fontSize: 13, color: Colors.textPrimary, textTransform: 'capitalize' },
  statusCount: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  statusProgress: { height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  statusFill: { height: '100%', borderRadius: 3 },
  statusValue: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'right' },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  breakdownItem: { width: '48%', backgroundColor: Colors.background, padding: 12, borderRadius: 8 },
  breakdownLabel: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize', marginBottom: 4 },
  breakdownStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownCount: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  breakdownValue: { fontSize: 12, color: Colors.secondary },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 2, backgroundColor: Colors.background },
  priorityCount: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  priorityLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 4 },
  valueRanges: { gap: 10 },
  valueRangeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueRangeLabel: { width: 70, fontSize: 12, color: Colors.textSecondary },
  valueRangeBar: { flex: 1, height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: 'hidden' },
  valueRangeFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  valueRangeCount: { width: 30, fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  locationList: { gap: 10 },
  locationItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: Colors.background, borderRadius: 8 },
  locationName: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  locationCount: { fontSize: 12, color: Colors.textSecondary },
  locationValue: { fontSize: 12, fontWeight: '600', color: Colors.secondary },
  funnelList: { gap: 10 },
  funnelItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: Colors.background, borderRadius: 8 },
  funnelName: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  funnelCount: { backgroundColor: Colors.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  funnelCountText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  filterSections: { padding: 16 },
  filterSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterSectionTitle: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  filterOptions: { paddingVertical: 8, paddingLeft: 16 },
  filterOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.background },
  filterOptionText: { fontSize: 14, color: Colors.textSecondary, textTransform: 'capitalize' },
  applyBtn: { margin: 16, marginBottom: 32, backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { fontSize: 16, fontWeight: '600', color: Colors.White },
});
