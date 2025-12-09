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
import { financialReportsAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';
import { PieChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function FinancialReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [showPieChart, setShowPieChart] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadReport();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      const projectsList = response.data || [];
      setProjects(projectsList);
      if (projectsList.length > 0) {
        setSelectedProject(projectsList[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await financialReportsAPI.getProjectReport(selectedProject);
      setReportData(response.data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const toggleChartView = (section: string) => {
    setShowPieChart(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getExpenseCategoryChartData = () => {
    if (!reportData?.expenses_by_category) return null;
    
    const categories = Object.entries(reportData.expenses_by_category);
    if (categories.length === 0) return null;

    return categories.map(([category, amount]: [string, any]) => ({
      name: category.replace('_', ' ').toUpperCase(),
      amount: amount,
      color: getRandomColor(category),
      legendFontColor: '#4A5568',
      legendFontSize: 12,
    }));
  };

  const getRandomColor = (seed: string) => {
    const colors = [
      'Colors.primary', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.primary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Project Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Project:</Text>
        <View style={{ flex: 1 }}>
          <ModalSelector
            options={projects.map(p => ({ label: p.name, value: p.id }))}
            selectedValue={selectedProject}
            onValueChange={setSelectedProject}
            placeholder="Select Project"
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {reportData ? (
          <>
            {/* Budget Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Budget Overview</Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Total Budget</Text>
                  <Text style={styles.budgetValue}>
                    {formatCurrency(reportData.total_budget || 0)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Total Spent</Text>
                  <Text style={[styles.budgetValue, { color: '#EF4444' }]}>
                    {formatCurrency(reportData.total_spent || 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Remaining</Text>
                  <Text style={[styles.budgetValue, { color: '#10B981' }]}>
                    {formatCurrency(reportData.budget_remaining || 0)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Utilization</Text>
                  <Text style={[styles.budgetValue, { color: 'Colors.primary' }]}>
                    {reportData.budget_utilization?.toFixed(1) || 0}%
                  </Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${Math.min(reportData.budget_utilization || 0, 100)}%`,
                        backgroundColor: (reportData.budget_utilization || 0) > 90 ? '#EF4444' : 'Colors.primary'
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>

            {/* Expenses by Category */}
            {reportData.expenses_by_category && Object.keys(reportData.expenses_by_category).length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Expenses by Category</Text>
                  <TouchableOpacity onPress={() => toggleChartView('category')}>
                    <Ionicons 
                      name={showPieChart.category ? 'list-outline' : 'pie-chart-outline'} 
                      size={24} 
                      color="Colors.primary" 
                    />
                  </TouchableOpacity>
                </View>

                {showPieChart.category ? (
                  <View style={styles.chartContainer}>
                    <PieChart
                      data={getExpenseCategoryChartData() || []}
                      width={screenWidth - 64}
                      height={200}
                      chartConfig={{
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      }}
                      accessor="amount"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      absolute
                    />
                  </View>
                ) : (
                  <View>
                    {Object.entries(reportData.expenses_by_category).map(([category, amount]: [string, any]) => (
                      <View key={category} style={styles.listItem}>
                        <Text style={styles.listLabel}>
                          {category.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={styles.listValue}>{formatCurrency(amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Budget Summary Details */}
            {reportData.budget_summary && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Budget Categories</Text>
                {Object.entries(reportData.budget_summary).map(([category, data]: [string, any]) => (
                  <View key={category} style={styles.budgetCategoryItem}>
                    <Text style={styles.categoryName}>
                      {category.replace('_', ' ').toUpperCase()}
                    </Text>
                    <View style={styles.categoryAmounts}>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Allocated:</Text>
                        <Text style={styles.amountValue}>{formatCurrency(data.allocated || 0)}</Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Spent:</Text>
                        <Text style={[styles.amountValue, { color: '#EF4444' }]}>
                          {formatCurrency(data.spent || 0)}
                        </Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Remaining:</Text>
                        <Text style={[styles.amountValue, { color: '#10B981' }]}>
                          {formatCurrency(data.remaining || 0)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.categoryProgress}>
                      <View style={styles.categoryProgressBar}>
                        <View 
                          style={[
                            styles.categoryProgressFill,
                            { 
                              width: `${Math.min(data.utilization || 0, 100)}%`,
                              backgroundColor: (data.utilization || 0) > 90 ? '#EF4444' : 'Colors.primary'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.utilizationText}>
                        {data.utilization?.toFixed(1) || 0}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Invoice Summary */}
            {reportData.invoice_summary && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Invoice Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryCount}>{reportData.invoice_summary.total_invoices || 0}</Text>
                    <Text style={styles.summaryLabel}>Total Invoices</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: '#10B981' }]}>
                      {reportData.invoice_summary.paid_invoices || 0}
                    </Text>
                    <Text style={styles.summaryLabel}>Paid</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>
                      {reportData.invoice_summary.pending_invoices || 0}
                    </Text>
                    <Text style={styles.summaryLabel}>Pending</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: '#EF4444' }]}>
                      {reportData.invoice_summary.overdue_invoices || 0}
                    </Text>
                    <Text style={styles.summaryLabel}>Overdue</Text>
                  </View>
                </View>
                <View style={styles.amountSummary}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Total Invoiced:</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(reportData.invoice_summary.total_amount || 0)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Total Collected:</Text>
                    <Text style={[styles.amountValue, { color: '#10B981' }]}>
                      {formatCurrency(reportData.invoice_summary.paid_amount || 0)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Outstanding:</Text>
                    <Text style={[styles.amountValue, { color: '#EF4444' }]}>
                      {formatCurrency(reportData.invoice_summary.outstanding_amount || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No financial data available</Text>
            <Text style={styles.emptySubtext}>
              Add budgets and expenses to see reports
            </Text>
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
    backgroundColor: 'Colors.background',
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
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    width: 80,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'Colors.surface',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'Colors.border',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetItem: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 12,
    color: 'Colors.textSecondary',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'Colors.border',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  listLabel: {
    fontSize: 13,
    color: '#4A5568',
  },
  listValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  budgetCategoryItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 8,
  },
  categoryAmounts: {
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: 'Colors.textSecondary',
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  categoryProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'Colors.border',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  utilizationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A5568',
    width: 45,
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'Colors.background',
    borderRadius: 8,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'Colors.textSecondary',
    marginTop: 4,
  },
  amountSummary: {
    borderTopWidth: 1,
    borderTopColor: 'Colors.border',
    paddingTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'Colors.textSecondary',
    marginTop: 8,
    textAlign: 'center',
  },
});
