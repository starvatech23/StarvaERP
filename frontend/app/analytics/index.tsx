import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import {
  projectsAPI,
  tasksAPI,
  expensesAPI,
  invoicesAPI,
  financialReportsAPI,
} from '../../services/api';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [projectsRes, tasksRes, expensesRes, invoicesRes] = await Promise.all([
        projectsAPI.getAll(),
        tasksAPI.getAll(),
        expensesAPI.getAll(),
        invoicesAPI.getAll(),
      ]);

      const projects = projectsRes.data || [];
      const tasks = tasksRes.data || [];
      const expenses = expensesRes.data || [];
      const invoices = invoicesRes.data || [];

      // Calculate statistics
      const totalProjects = projects.length;
      const activeProjects = projects.filter((p: any) => p.status === 'in_progress').length;
      const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
      const delayedProjects = projects.filter((p: any) => 
        p.status === 'in_progress' && new Date(p.expected_completion_date) < new Date()
      ).length;

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;
      const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;

      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalInvoiced = invoices.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
      const totalPaid = invoices.reduce((sum: number, i: any) => sum + (i.paid_amount || 0), 0);
      const outstanding = totalInvoiced - totalPaid;

      const paidInvoices = invoices.filter((i: any) => i.status === 'paid').length;
      const pendingInvoices = invoices.filter((i: any) => ['sent', 'draft'].includes(i.status)).length;
      const overdueInvoices = invoices.filter((i: any) => i.status === 'overdue').length;

      // Task completion rate trend (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const taskCompletionTrend = last7Days.map(date => {
        return tasks.filter((t: any) => 
          t.status === 'completed' && 
          t.updated_at?.startsWith(date)
        ).length;
      });

      // Expense trend by category
      const expensesByCategory = expenses.reduce((acc: any, e: any) => {
        const category = e.category || 'other';
        acc[category] = (acc[category] || 0) + e.amount;
        return acc;
      }, {});

      setStats({
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          delayed: delayedProjects,
          completionRate: totalProjects > 0 ? (completedProjects / totalProjects * 100).toFixed(1) : 0,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0,
        },
        finance: {
          totalExpenses,
          totalInvoiced,
          totalPaid,
          outstanding,
          paidInvoices,
          pendingInvoices,
          overdueInvoices,
          collectionRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100).toFixed(1) : 0,
        },
        trends: {
          taskCompletion: taskCompletionTrend,
          labels: last7Days.map(d => new Date(d).getDate().toString()),
        },
        expensesByCategory,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#3B82F6',
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics & Insights</Text>
        <TouchableOpacity style={styles.exportButton} onPress={() => {}}>
          <Ionicons name="download-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {['week', 'month', 'year'].map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange(range as any)}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive,
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Key Metrics Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="briefcase" size={28} color="#3B82F6" />
              <Text style={styles.metricValue}>{stats.projects?.active}</Text>
              <Text style={styles.metricLabel}>Active Projects</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              <Text style={styles.metricValue}>{stats.tasks?.completed}</Text>
              <Text style={styles.metricLabel}>Tasks Completed</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={28} color="#F59E0B" />
              <Text style={styles.metricValue}>{stats.tasks?.pending}</Text>
              <Text style={styles.metricLabel}>Pending Tasks</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={28} color="#EF4444" />
              <Text style={styles.metricValue}>{stats.projects?.delayed}</Text>
              <Text style={styles.metricLabel}>Delayed Projects</Text>
            </View>
          </View>
        </View>

        {/* Project Status Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Distribution</Text>
          <View style={styles.card}>
            <View style={styles.distributionRow}>
              <View style={styles.distributionItem}>
                <View style={[styles.distributionDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.distributionLabel}>Completed</Text>
                <Text style={styles.distributionValue}>{stats.projects?.completed}</Text>
              </View>
              <View style={styles.distributionItem}>
                <View style={[styles.distributionDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.distributionLabel}>Active</Text>
                <Text style={styles.distributionValue}>{stats.projects?.active}</Text>
              </View>
              <View style={styles.distributionItem}>
                <View style={[styles.distributionDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.distributionLabel}>Delayed</Text>
                <Text style={styles.distributionValue}>{stats.projects?.delayed}</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressSegment,
                  {
                    width: `${(stats.projects?.completed / stats.projects?.total * 100) || 0}%`,
                    backgroundColor: '#10B981',
                  },
                ]}
              />
              <View
                style={[
                  styles.progressSegment,
                  {
                    width: `${(stats.projects?.active / stats.projects?.total * 100) || 0}%`,
                    backgroundColor: '#3B82F6',
                  },
                ]}
              />
              <View
                style={[
                  styles.progressSegment,
                  {
                    width: `${(stats.projects?.delayed / stats.projects?.total * 100) || 0}%`,
                    backgroundColor: '#EF4444',
                  },
                ]}
              />
            </View>
            <View style={styles.completionRate}>
              <Text style={styles.completionRateLabel}>Overall Completion Rate:</Text>
              <Text style={styles.completionRateValue}>{stats.projects?.completionRate}%</Text>
            </View>
          </View>
        </View>

        {/* Task Completion Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Completion Trend (Last 7 Days)</Text>
          <View style={styles.card}>
            <LineChart
              data={{
                labels: stats.trends?.labels || [],
                datasets: [
                  {
                    data: stats.trends?.taskCompletion || [0],
                  },
                ],
              }}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        {/* Financial Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Overview</Text>
          <View style={styles.card}>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Total Expenses</Text>
                <Text style={[styles.financialValue, { color: '#EF4444' }]}>
                  ₹{(stats.finance?.totalExpenses || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Total Invoiced</Text>
                <Text style={[styles.financialValue, { color: '#3B82F6' }]}>
                  ₹{(stats.finance?.totalInvoiced || 0).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Collected</Text>
                <Text style={[styles.financialValue, { color: '#10B981' }]}>
                  ₹{(stats.finance?.totalPaid || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Outstanding</Text>
                <Text style={[styles.financialValue, { color: '#F59E0B' }]}>
                  ₹{(stats.finance?.outstanding || 0).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.collectionRate}>
              <Text style={styles.collectionRateLabel}>Collection Rate:</Text>
              <Text style={styles.collectionRateValue}>{stats.finance?.collectionRate}%</Text>
            </View>
          </View>
        </View>

        {/* Invoice Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Status</Text>
          <View style={styles.invoiceGrid}>
            <View style={styles.invoiceCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.invoiceValue}>{stats.finance?.paidInvoices}</Text>
              <Text style={styles.invoiceLabel}>Paid</Text>
            </View>
            <View style={styles.invoiceCard}>
              <Ionicons name="time" size={24} color="#F59E0B" />
              <Text style={styles.invoiceValue}>{stats.finance?.pendingInvoices}</Text>
              <Text style={styles.invoiceLabel}>Pending</Text>
            </View>
            <View style={styles.invoiceCard}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.invoiceValue}>{stats.finance?.overdueInvoices}</Text>
              <Text style={styles.invoiceLabel}>Overdue</Text>
            </View>
          </View>
        </View>

        {/* Expenses by Category */}
        {Object.keys(stats.expensesByCategory || {}).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expenses by Category</Text>
            <View style={styles.card}>
              {Object.entries(stats.expensesByCategory).map(([category, amount]: [string, any]) => (
                <View key={category} style={styles.categoryRow}>
                  <Text style={styles.categoryName}>
                    {category.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.categoryAmount}>₹{amount.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
    textAlign: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  distributionItem: {
    alignItems: 'center',
  },
  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  distributionLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  distributionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressSegment: {
    height: '100%',
  },
  completionRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  completionRateLabel: {
    fontSize: 14,
    color: '#718096',
  },
  completionRateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  financialItem: {
    flex: 1,
  },
  financialLabel: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  collectionRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  collectionRateLabel: {
    fontSize: 14,
    color: '#718096',
  },
  collectionRateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  invoiceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  invoiceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  invoiceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 8,
  },
  invoiceLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryName: {
    fontSize: 14,
    color: '#4A5568',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
  },
});
