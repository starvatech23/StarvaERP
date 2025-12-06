import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { materialReportsAPI, projectsAPI, siteInventoryAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';
import { PieChart, BarChart } from 'react-native-chart-kit';
import Colors from '../../constants/Colors';

const screenWidth = Dimensions.get('window').width;

export default function MaterialReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(moment());
  const [showCategoryChart, setShowCategoryChart] = useState(true);
  const [showSiteChart, setShowSiteChart] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      loadReportData();
    }
  }, [period, selectedProject, currentDate]);

  const loadData = async () => {
    try {
      const [projectsRes, inventoryRes] = await Promise.all([
        projectsAPI.getAll(),
        siteInventoryAPI.getAll(),
      ]);
      setProjects(projectsRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params: any = {
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };
      if (selectedProject !== 'all') {
        params.project_id = selectedProject;
      }

      const response = await materialReportsAPI.getSpendingReport(params);
      setReportData(response.data);
    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    if (period === 'weekly') {
      return {
        startDate: moment(currentDate).startOf('week'),
        endDate: moment(currentDate).endOf('week'),
      };
    } else {
      return {
        startDate: moment(currentDate).startOf('month'),
        endDate: moment(currentDate).endOf('month'),
      };
    }
  };

  const changePeriod = (direction: number) => {
    if (period === 'weekly') {
      setCurrentDate(moment(currentDate).add(direction, 'weeks'));
    } else {
      setCurrentDate(moment(currentDate).add(direction, 'months'));
    }
  };

  const prepareCategoryChartData = () => {
    if (!reportData || !reportData.category_spending) return [];
    const colors = ['#78716C', '#DC2626', '#F59E0B', '#6B7280', '#EF4444', '#3B82F6'];
    return Object.entries(reportData.category_spending).map(([category, amount]: any, index) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      population: amount,
      color: colors[index % colors.length],
      legendFontColor: '#1A202C',
      legendFontSize: 12,
    }));
  };

  const prepareSiteChartData = () => {
    if (!reportData || !reportData.site_spending) return [];
    const colors = ['#FF6B35', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    return Object.entries(reportData.site_spending).map(([site, amount]: any, index) => ({
      name: site.length > 15 ? site.substring(0, 15) + '...' : site,
      population: amount,
      color: colors[index % colors.length],
      legendFontColor: '#1A202C',
      legendFontSize: 12,
    }));
  };

  const prepareVendorBarData = () => {
    if (!reportData || !reportData.vendor_spending) return { labels: [], datasets: [{ data: [] }] };
    const vendors = Object.entries(reportData.vendor_spending)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5);
    
    return {
      labels: vendors.map(([vendor]) => vendor.length > 10 ? vendor.substring(0, 10) : vendor),
      datasets: [
        {
          data: vendors.map(([, amount]) => amount as number),
        },
      ],
    };
  };

  const getLowStockItems = () => {
    return inventory.filter(item => item.current_stock <= item.minimum_stock).slice(0, 5);
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(26, 32, 44, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const { startDate, endDate } = getDateRange();
  const lowStockItems = getLowStockItems();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Reports</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => Alert.alert('Export', 'Export functionality coming soon')}
        >
          <Ionicons name="download-outline" size={20} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'weekly' && styles.toggleButtonActive]}
            onPress={() => setPeriod('weekly')}
          >
            <Text style={[styles.toggleText, period === 'weekly' && styles.toggleTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'monthly' && styles.toggleButtonActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text style={[styles.toggleText, period === 'monthly' && styles.toggleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navButton} onPress={() => changePeriod(-1)}>
            <Ionicons name="chevron-back" size={20} color="#FF6B35" />
          </TouchableOpacity>
          <Text style={styles.dateText}>
            {period === 'weekly'
              ? `${startDate.format('DD MMM')} - ${endDate.format('DD MMM YYYY')}`
              : startDate.format('MMMM YYYY')}
          </Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => changePeriod(1)}
            disabled={endDate.isAfter(moment(), 'day')}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={endDate.isAfter(moment(), 'day') ? '#CBD5E0' : '#FF6B35'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedProject}
            onValueChange={(value) => setSelectedProject(value)}
            style={styles.picker}
          >
            <Picker.Item label="All Sites" value="all" />
            {projects.map((project) => (
              <Picker.Item key={project.id} label={project.name} value={project.id} />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overall Spending Summary */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Overall Spending</Text>
          <View style={styles.totalSpending}>
            <Ionicons name="cash" size={48} color="#FF6B35" />
            <Text style={styles.totalAmount}>
              ₹{reportData?.total_spending?.toLocaleString() || 0}
            </Text>
            <Text style={styles.totalLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Category-wise Spending */}
        {reportData && Object.keys(reportData.category_spending || {}).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="grid" size={20} color="#FF6B35" />
              <Text style={styles.cardTitle}>Category-wise Spending</Text>
              <TouchableOpacity
                style={styles.chartToggle}
                onPress={() => setShowCategoryChart(!showCategoryChart)}
              >
                <Ionicons
                  name={showCategoryChart ? 'list' : 'pie-chart'}
                  size={20}
                  color="#FF6B35"
                />
              </TouchableOpacity>
            </View>
            {showCategoryChart ? (
              <View style={styles.chartContainer}>
                <PieChart
                  data={prepareCategoryChartData()}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                  absolute
                />
              </View>
            ) : (
              <View style={styles.listContainer}>
                {Object.entries(reportData.category_spending).map(([category, amount]: any) => (
                  <View key={category} style={styles.listItem}>
                    <Text style={styles.listItemLabel}>{category.toUpperCase()}</Text>
                    <Text style={styles.listItemValue}>₹{amount.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Site-wise Spending */}
        {reportData && Object.keys(reportData.site_spending || {}).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.cardTitle}>Site-wise Spending</Text>
              <TouchableOpacity
                style={styles.chartToggle}
                onPress={() => setShowSiteChart(!showSiteChart)}
              >
                <Ionicons
                  name={showSiteChart ? 'list' : 'pie-chart'}
                  size={20}
                  color="#FF6B35"
                />
              </TouchableOpacity>
            </View>
            {showSiteChart ? (
              <View style={styles.chartContainer}>
                <PieChart
                  data={prepareSiteChartData()}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                  absolute
                />
              </View>
            ) : (
              <View style={styles.listContainer}>
                {Object.entries(reportData.site_spending).map(([site, amount]: any) => (
                  <View key={site} style={styles.listItem}>
                    <Text style={styles.listItemLabel}>{site}</Text>
                    <Text style={styles.listItemValue}>₹{amount.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Vendor-wise Spending Bar Chart */}
        {reportData && Object.keys(reportData.vendor_spending || {}).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={20} color="#FF6B35" />
              <Text style={styles.cardTitle}>Top Vendors</Text>
            </View>
            <View style={styles.chartContainer}>
              <BarChart
                data={prepareVendorBarData()}
                width={screenWidth - 64}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                style={styles.barChart}
                showValuesOnTopOfBars
              />
            </View>
          </View>
        )}

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Low Stock Alerts</Text>
            </View>
            {lowStockItems.map((item: any) => (
              <View key={item.id} style={styles.alertItem}>
                <View style={styles.alertLeft}>
                  <Text style={styles.alertMaterial}>{item.material_name}</Text>
                  <Text style={styles.alertSite}>{item.project_name}</Text>
                </View>
                <View style={styles.alertRight}>
                  <Text style={styles.alertStock}>
                    {item.current_stock} / {item.minimum_stock} {item.material_unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loader: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  exportButton: {
    padding: 8,
  },
  controls: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B35',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  pickerContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#1A202C',
  },
  scrollContent: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  totalSpending: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FF6B35',
    marginTop: 12,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#718096',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartToggle: {
    marginLeft: 'auto',
    padding: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  barChart: {
    borderRadius: 8,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  listItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginBottom: 8,
  },
  alertLeft: {
    flex: 1,
  },
  alertMaterial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 2,
  },
  alertSite: {
    fontSize: 12,
    color: '#718096',
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  alertStock: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
