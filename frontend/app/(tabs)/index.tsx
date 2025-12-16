import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { PieChart, BarChart } from 'react-native-chart-kit';
import Colors from '../../constants/Colors';
import { statusUpdatesAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface StatusUpdate {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  photos: string[];
  overall_progress: number;
  project_id: string;
  project_name?: string;
  created_by_name?: string;
  created_at: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${global.userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
      
      // Load recent status updates
      try {
        const updatesRes = await statusUpdatesAPI.getAll(undefined, 5);
        setStatusUpdates(updatesRes.data || []);
      } catch (err) {
        console.log('Status updates not available');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return Colors.success;
      case 'project_manager':
        return Colors.primary;
      case 'crm_manager':
        return Colors.secondary;
      case 'crm_user':
        return Colors.info;
      default:
        return Colors.textSecondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'project_manager':
        return 'Project Manager';
      case 'crm_manager':
        return 'CRM Manager';
      case 'crm_user':
        return 'CRM User';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  // Build quick actions based on user role
  const getQuickActions = () => {
    const actions = [];
    
    if (user?.role === 'admin' || user?.role === 'project_manager') {
      actions.push(
        { icon: 'add-circle', label: 'New Project', color: Colors.primary, route: '/projects/create' },
        { icon: 'cube', label: 'Materials', color: Colors.secondary, route: '/(tabs)/materials' },
        { icon: 'wallet', label: 'Finance', color: Colors.success, route: '/finance' },
        { icon: 'people', label: 'Labor', color: Colors.info, route: '/labor' }
      );
    }
    
    if (user?.role === 'admin' || user?.role === 'crm_manager' || user?.role === 'crm_user') {
      actions.push(
        { icon: 'person-add', label: 'New Lead', color: Colors.secondary, route: '/crm/leads/create' },
        { icon: 'briefcase', label: 'CRM', color: Colors.primary, route: '/(tabs)/crm' }
      );
    }
    
    if (user?.role === 'admin') {
      actions.push(
        { icon: 'shield-checkmark', label: 'Admin', color: Colors.error, route: '/admin' }
      );
    }
    
    return actions;
  };

  // Check if user has permission for a widget
  const hasPermission = (widget: string) => {
    const role = user?.role || '';
    const permissions: Record<string, string[]> = {
      projects: ['admin', 'project_manager', 'engineer'],
      tasks: ['admin', 'project_manager', 'engineer'],
      crm: ['admin', 'crm_manager', 'crm_user'],
      finance: ['admin', 'project_manager'],
      labor: ['admin', 'project_manager'],
      materials: ['admin', 'project_manager', 'engineer'],
      payables: ['admin', 'project_manager'],
      receivables: ['admin', 'project_manager'],
    };
    return permissions[widget]?.includes(role) || false;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{stats?.user?.name || 'User'}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role || '') + '30' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(user?.role || '') }]}>
              {getRoleLabel(user?.role || '')}
            </Text>
          </View>
        </View>

        {/* Key Metrics */}
        {stats?.projects && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Overview</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: Colors.primaryPale }]}>
                <Ionicons name="business" size={28} color={Colors.primary} />
                <Text style={styles.statValue}>{stats.projects.total}</Text>
                <Text style={styles.statLabel}>Total Projects</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.secondary + '20' }]}>
                <Ionicons name="flash" size={28} color={Colors.secondary} />
                <Text style={styles.statValue}>{stats.projects.active}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                <Text style={styles.statValue}>{stats.projects.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
            
            {/* Project Status Chart */}
            {stats.projects.status_distribution && Object.keys(stats.projects.status_distribution).length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Project Status Distribution</Text>
                <PieChart
                  data={Object.entries(stats.projects.status_distribution).map(([key, value]: [string, any], index) => ({
                    name: key.replace('_', ' ').toUpperCase(),
                    population: value,
                    color: ['#3B82F6', '#FDB913', '#10B981', '#F59E0B', '#EF4444'][index % 5],
                    legendFontColor: Colors.textPrimary,
                    legendFontSize: 12,
                  }))}
                  width={width - 64}
                  height={180}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}
          </View>
        )}

        {/* Tasks */}
        {stats?.tasks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks Overview</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: Colors.info + '20' }]}>
                <Ionicons name="list" size={28} color={Colors.info} />
                <Text style={styles.statValue}>{stats.tasks.total}</Text>
                <Text style={styles.statLabel}>Total Tasks</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.warning + '20' }]}>
                <Ionicons name="time" size={28} color={Colors.warning} />
                <Text style={styles.statValue}>{stats.tasks.my_pending}</Text>
                <Text style={styles.statLabel}>My Pending</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.error + '20' }]}>
                <Ionicons name="alert-circle" size={28} color={Colors.error} />
                <Text style={styles.statValue}>{stats.tasks.overdue || 0}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Task Completion</Text>
                <Text style={styles.progressPercent}>{stats.tasks.completion_rate}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${stats.tasks.completion_rate}%` }]} />
              </View>
            </View>
          </View>
        )}

        {/* CRM Stats */}
        {stats?.crm && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CRM Performance</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: Colors.secondary + '20' }]}>
                <Ionicons name="people" size={28} color={Colors.secondary} />
                <Text style={styles.statValue}>{stats.crm.total_leads}</Text>
                <Text style={styles.statLabel}>Total Leads</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.success + '20' }]}>
                <Ionicons name="trophy" size={28} color={Colors.success} />
                <Text style={styles.statValue}>{stats.crm.won_leads}</Text>
                <Text style={styles.statLabel}>Won</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.info + '20' }]}>
                <Ionicons name="star" size={28} color={Colors.info} />
                <Text style={styles.statValue}>{stats.crm.conversion_rate}%</Text>
                <Text style={styles.statLabel}>Conversion</Text>
              </View>
            </View>
            
            {/* Lead Status Chart */}
            {stats.crm.status_distribution && Object.keys(stats.crm.status_distribution).length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Lead Status</Text>
                <BarChart
                  data={{
                    labels: Object.keys(stats.crm.status_distribution).map(k => k.substring(0, 3).toUpperCase()),
                    datasets: [{
                      data: Object.values(stats.crm.status_distribution) as number[]
                    }]
                  }}
                  width={width - 64}
                  height={200}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: Colors.surface,
                    backgroundGradientFrom: Colors.surface,
                    backgroundGradientTo: Colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => Colors.secondary,
                    labelColor: (opacity = 1) => Colors.textPrimary,
                    style: {
                      borderRadius: 16,
                    },
                    propsForLabels: {
                      fontSize: 10,
                    }
                  }}
                  style={{
                    borderRadius: 16,
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* Materials & Finance */}
        {(stats?.materials || stats?.finance) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operations</Text>
            <View style={styles.statsRow}>
              {stats?.materials && (
                <>
                  <View style={[styles.statCard, { backgroundColor: Colors.warning + '20' }]}>
                    <Ionicons name="cube" size={28} color={Colors.warning} />
                    <Text style={styles.statValue}>{stats.materials.low_stock}</Text>
                    <Text style={styles.statLabel}>Low Stock</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: Colors.info + '20' }]}>
                    <Ionicons name="pricetag" size={28} color={Colors.info} />
                    <Text style={styles.statValue}>₹{(stats.materials.inventory_value / 100000).toFixed(1)}L</Text>
                    <Text style={styles.statLabel}>Inventory</Text>
                  </View>
                </>
              )}
              {stats?.finance && (
                <View style={[styles.statCard, { backgroundColor: stats.finance.cash_flow >= 0 ? Colors.success + '20' : Colors.error + '20' }]}>
                  <Ionicons name="trending-up" size={28} color={stats.finance.cash_flow >= 0 ? Colors.success : Colors.error} />
                  <Text style={styles.statValue}>₹{(Math.abs(stats.finance.cash_flow) / 100000).toFixed(1)}L</Text>
                  <Text style={styles.statLabel}>Cash Flow</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {getQuickActions().map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        {stats?.recent_activity && stats.recent_activity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {stats.recent_activity.slice(0, 5).map((activity: any, index: number) => (
                <View key={index} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: Colors.primary + '20' }]}>
                    <Ionicons name={activity.icon} size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activitySubtitle}>{activity.action} - {activity.type}</Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Project Status Updates */}
        {statusUpdates.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Status Updates</Text>
              <TouchableOpacity onPress={() => router.push('/dashboard/status-feed' as any)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusCarousel}>
              {statusUpdates.map((update) => (
                <TouchableOpacity 
                  key={update.id} 
                  style={styles.statusCard}
                  onPress={() => router.push(`/projects/${update.project_id}/status` as any)}
                >
                  {update.photos && update.photos.length > 0 && (
                    <Image 
                      source={{ uri: update.photos[0] }} 
                      style={styles.statusCardImage}
                    />
                  )}
                  <View style={styles.statusCardContent}>
                    <View style={[styles.frequencyChip, { 
                      backgroundColor: update.frequency === 'daily' ? '#DBEAFE' : 
                        update.frequency === 'weekly' ? '#D1FAE5' : '#FEF3C7' 
                    }]}>
                      <Text style={[styles.frequencyChipText, { 
                        color: update.frequency === 'daily' ? '#1D4ED8' : 
                          update.frequency === 'weekly' ? '#047857' : '#B45309' 
                      }]}>
                        {update.frequency.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.statusCardTitle} numberOfLines={2}>{update.title}</Text>
                    <Text style={styles.statusCardProject} numberOfLines={1}>{update.project_name}</Text>
                    <View style={styles.statusCardFooter}>
                      <View style={styles.progressMini}>
                        <View style={[styles.progressMiniFill, { width: `${update.overall_progress}%` }]} />
                      </View>
                      <Text style={styles.progressMiniText}>{update.overall_progress}%</Text>
                    </View>
                    <Text style={styles.statusCardMeta}>
                      By {update.created_by_name} • {new Date(update.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 56) / 3,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  activityTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  // Status Updates Widget Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  statusCarousel: {
    marginHorizontal: -8,
  },
  statusCard: {
    width: width * 0.7,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginHorizontal: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E5E7EB',
  },
  statusCardContent: {
    padding: 12,
  },
  frequencyChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  frequencyChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statusCardProject: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statusCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressMini: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressMiniFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressMiniText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statusCardMeta: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
