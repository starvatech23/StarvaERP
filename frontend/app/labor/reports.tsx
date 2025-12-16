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
import { workersAPI, laborAttendanceAPI, projectsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';
import { PieChart } from 'react-native-chart-kit';
import Colors from '../../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const screenWidth = Dimensions.get('window').width;

export default function LaborReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(moment());
  const [showSiteChart, setShowSiteChart] = useState(false);
  const [showAttendanceChart, setShowAttendanceChart] = useState(false);

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
      const [workersRes, projectsRes] = await Promise.all([
        workersAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setWorkers(workersRes.data || []);
      setProjects(projectsRes.data || []);
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
      const days = [];
      let current = moment(startDate);
      
      while (current.isSameOrBefore(endDate, 'day')) {
        days.push(current.format('YYYY-MM-DD'));
        current.add(1, 'day');
      }

      const promises = days.map(date => 
        laborAttendanceAPI.getAll({
          ...(selectedProject !== 'all' && { project_id: selectedProject }),
          date,
        })
      );

      const results = await Promise.all(promises);
      const allAttendance = results.flatMap(res => res.data || []);
      setAttendance(allAttendance);
    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Export labor report to CSV
  const exportReport = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const workerStats = calculateWorkerWages();
      
      // Create CSV content
      const headers = ['Worker Name', 'Skill', 'Days Present', 'Days Absent', 'Total Hours', 'Overtime Days', 'Total Wages (₹)'];
      const rows = workerStats.map((worker: any) => [
        worker.name,
        worker.skill || '',
        worker.daysPresent,
        worker.daysAbsent,
        worker.totalHours,
        worker.overtimeDays,
        worker.totalWages,
      ]);
      
      // Calculate totals
      const totals = workerStats.reduce((acc: any, w: any) => ({
        daysPresent: acc.daysPresent + w.daysPresent,
        daysAbsent: acc.daysAbsent + w.daysAbsent,
        totalHours: acc.totalHours + w.totalHours,
        overtimeDays: acc.overtimeDays + w.overtimeDays,
        totalWages: acc.totalWages + w.totalWages,
      }), { daysPresent: 0, daysAbsent: 0, totalHours: 0, overtimeDays: 0, totalWages: 0 });
      
      rows.push(['TOTAL', '', totals.daysPresent, totals.daysAbsent, totals.totalHours, totals.overtimeDays, totals.totalWages]);
      
      // Build CSV string
      const csvContent = [
        `Labour Report - ${period === 'weekly' ? 'Week' : 'Month'} of ${startDate.format('DD MMM')} - ${endDate.format('DD MMM YYYY')}`,
        `Project: ${selectedProject === 'all' ? 'All Projects' : projects.find(p => p.id === selectedProject)?.name || 'Unknown'}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');
      
      // Save to file
      const filename = `labour_report_${startDate.format('YYYYMMDD')}_${endDate.format('YYYYMMDD')}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Labour Report',
        });
      } else {
        Alert.alert('Success', 'Report saved successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export report');
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

  const calculateWorkerWages = () => {
    const workerStats: any = {};

    attendance.forEach((record: any) => {
      if (!workerStats[record.worker_id]) {
        const worker = workers.find(w => w.id === record.worker_id);
        workerStats[record.worker_id] = {
          id: record.worker_id,
          name: record.worker_name,
          skill: record.worker_skill,
          totalWages: 0,
          daysPresent: 0,
          daysAbsent: 0,
          overtimeDays: 0,
          totalHours: 0,
          baseRate: worker?.base_rate || 0,
        };
      }

      const stats = workerStats[record.worker_id];
      stats.totalWages += record.wages_earned || 0;
      stats.totalHours += record.hours_worked || 0;

      if (record.status === 'present' || record.overtime_hours > 0) {
        stats.daysPresent++;
      }
      if (record.status === 'absent') {
        stats.daysAbsent++;
      }
      if (record.overtime_hours > 0) {
        stats.overtimeDays++;
      }
    });

    return Object.values(workerStats).sort((a: any, b: any) => b.totalWages - a.totalWages);
  };

  const calculateSiteWages = () => {
    const siteStats: any = {};

    attendance.forEach((record: any) => {
      const projectId = record.project_id;
      if (!siteStats[projectId]) {
        siteStats[projectId] = {
          projectId,
          projectName: record.project_name,
          totalWages: 0,
          workerCount: new Set(),
          daysWorked: 0,
          totalHours: 0,
        };
      }

      const stats = siteStats[projectId];
      stats.totalWages += record.wages_earned || 0;
      stats.workerCount.add(record.worker_id);
      if (record.status !== 'absent') {
        stats.daysWorked++;
      }
      stats.totalHours += record.hours_worked || 0;
    });

    return Object.values(siteStats).map((site: any) => ({
      ...site,
      workerCount: site.workerCount.size,
      avgWagePerWorker: site.totalWages / site.workerCount.size,
    })).sort((a: any, b: any) => b.totalWages - a.totalWages);
  };

  const getOverallStats = () => {
    const totalWages = attendance.reduce((sum, record) => sum + (record.wages_earned || 0), 0);
    const totalHours = attendance.reduce((sum, record) => sum + (record.hours_worked || 0), 0);
    const uniqueWorkers = new Set(attendance.map(record => record.worker_id)).size;
    const daysPresent = attendance.filter(r => r.status === 'present' || r.overtime_hours > 0).length;
    const daysAbsent = attendance.filter(r => r.status === 'absent').length;
    const overtimeRecords = attendance.filter(r => r.overtime_hours > 0).length;

    return {
      totalWages,
      totalHours,
      uniqueWorkers,
      daysPresent,
      daysAbsent,
      overtimeRecords,
      attendanceRate: daysPresent + daysAbsent > 0 ? (daysPresent / (daysPresent + daysAbsent) * 100) : 0,
    };
  };

  const prepareSiteChartData = () => {
    const siteWages = calculateSiteWages();
    const colors = ['#FF6B35', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    
    return siteWages.slice(0, 6).map((site: any, index: number) => ({
      name: site.projectName.length > 15 ? site.projectName.substring(0, 15) + '...' : site.projectName,
      population: site.totalWages,
      color: colors[index % colors.length],
      legendFontColor: Colors.textPrimary,
      legendFontSize: 12,
    }));
  };

  const prepareAttendanceChartData = () => {
    const stats = getOverallStats();
    return [
      {
        name: 'Present',
        population: stats.daysPresent,
        color: '#10B981',
        legendFontColor: Colors.textPrimary,
        legendFontSize: 12,
      },
      {
        name: 'Absent',
        population: stats.daysAbsent,
        color: '#EF4444',
        legendFontColor: Colors.textPrimary,
        legendFontSize: 12,
      },
      {
        name: 'Overtime',
        population: stats.overtimeRecords,
        color: '#F59E0B',
        legendFontColor: Colors.textPrimary,
        legendFontSize: 12,
      },
    ];
  };

  const chartConfig = {
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const workerWages = calculateWorkerWages();
  const siteWages = calculateSiteWages();
  const overallStats = getOverallStats();
  const { startDate, endDate } = getDateRange();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Labour Reports</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => Alert.alert('Export', 'Export functionality coming soon')}
        >
          <Ionicons name="download-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        {/* Period Toggle */}
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

        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navButton} onPress={() => changePeriod(-1)}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
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
              color={endDate.isAfter(moment(), 'day') ? Colors.border : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Project Filter */}
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedProject}
            onValueChange={(value) => setSelectedProject(value)}
            style={styles.picker}
            dropdownIconColor={Colors.textPrimary}
          >
            <Picker.Item label="All Sites" value="all" color={Colors.textPrimary} />
            {projects.map((project) => (
              <Picker.Item key={project.id} label={project.name} value={project.id} color={Colors.textPrimary} />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overall Statistics */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Overall Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="cash" size={32} color="#10B981" />
              <Text style={styles.statValue}>₹{overallStats.totalWages.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Wages</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="people" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{overallStats.uniqueWorkers}</Text>
              <Text style={styles.statLabel}>Workers</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="time" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{overallStats.totalHours}h</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trending-up" size={32} color="#8B5CF6" />
              <Text style={styles.statValue}>{overallStats.attendanceRate.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
          </View>

          <View style={styles.miniStats}>
            <View style={styles.miniStatRow}>
              <Text style={styles.miniStatLabel}>Days Present:</Text>
              <Text style={[styles.miniStatValue, { color: '#10B981' }]}>{overallStats.daysPresent}</Text>
            </View>
            <View style={styles.miniStatRow}>
              <Text style={styles.miniStatLabel}>Days Absent:</Text>
              <Text style={[styles.miniStatValue, { color: '#EF4444' }]}>{overallStats.daysAbsent}</Text>
            </View>
            <View style={styles.miniStatRow}>
              <Text style={styles.miniStatLabel}>Overtime Days:</Text>
              <Text style={[styles.miniStatValue, { color: '#F59E0B' }]}>{overallStats.overtimeRecords}</Text>
            </View>
          </View>
        </View>

        {/* Attendance Distribution Chart */}
        {attendance.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="stats-chart" size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Attendance Distribution</Text>
              <TouchableOpacity
                style={styles.chartToggle}
                onPress={() => setShowAttendanceChart(!showAttendanceChart)}
              >
                <Ionicons
                  name={showAttendanceChart ? 'list' : 'pie-chart'}
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
            {showAttendanceChart ? (
              <View style={styles.chartContainer}>
                <PieChart
                  data={prepareAttendanceChartData()}
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
              <View style={styles.statsRow}>
                <View style={styles.attendanceStatBox}>
                  <View style={[styles.attendanceStatIndicator, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.attendanceStatLabel}>Present</Text>
                  <Text style={styles.attendanceStatValue}>{overallStats.daysPresent}</Text>
                </View>
                <View style={styles.attendanceStatBox}>
                  <View style={[styles.attendanceStatIndicator, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.attendanceStatLabel}>Absent</Text>
                  <Text style={styles.attendanceStatValue}>{overallStats.daysAbsent}</Text>
                </View>
                <View style={styles.attendanceStatBox}>
                  <View style={[styles.attendanceStatIndicator, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.attendanceStatLabel}>Overtime</Text>
                  <Text style={styles.attendanceStatValue}>{overallStats.overtimeRecords}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Site-wise Wages */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Site-wise Wages</Text>
            <TouchableOpacity
              style={styles.chartToggle}
              onPress={() => setShowSiteChart(!showSiteChart)}
            >
              <Ionicons
                name={showSiteChart ? 'list' : 'pie-chart'}
                size={20}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
          {siteWages.length === 0 ? (
            <Text style={styles.emptyText}>No data for selected period</Text>
          ) : showSiteChart ? (
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
            siteWages.map((site: any, index: number) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemTitle}>{site.projectName}</Text>
                  <View style={styles.listItemMeta}>
                    <Text style={styles.listItemMetaText}>
                      {site.workerCount} workers • {site.totalHours}h
                    </Text>
                  </View>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemAmount}>₹{site.totalWages.toLocaleString()}</Text>
                  <Text style={styles.listItemSubtext}>Avg: ₹{Math.round(site.avgWagePerWorker)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Individual Worker Wages */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Individual Labourer Wages</Text>
          </View>
          {workerWages.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records for selected period</Text>
          ) : (
            workerWages.map((worker: any, index: number) => (
              <View key={index} style={styles.workerItem}>
                <View style={styles.workerItemHeader}>
                  <View style={styles.workerItemLeft}>
                    <Text style={styles.workerName}>{worker.name}</Text>
                    <Text style={styles.workerSkill}>{worker.skill}</Text>
                  </View>
                  <Text style={styles.workerWage}>₹{worker.totalWages.toLocaleString()}</Text>
                </View>
                <View style={styles.workerItemStats}>
                  <View style={styles.workerStat}>
                    <View style={[styles.workerStatDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.workerStatText}>P: {worker.daysPresent}</Text>
                  </View>
                  <View style={styles.workerStat}>
                    <View style={[styles.workerStatDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.workerStatText}>OT: {worker.overtimeDays}</Text>
                  </View>
                  <View style={styles.workerStat}>
                    <View style={[styles.workerStatDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.workerStatText}>A: {worker.daysAbsent}</Text>
                  </View>
                  <View style={styles.workerStat}>
                    <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.workerStatText}>{worker.totalHours}h</Text>
                  </View>
                </View>
                <View style={styles.workerItemFooter}>
                  <Text style={styles.workerRateText}>Rate: ₹{worker.baseRate}/day</Text>
                  <TouchableOpacity style={styles.payButton}>
                    <Text style={styles.payButtonText}>Mark Paid</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Advance Payments Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Advance Payments</Text>
          </View>
          <View style={styles.advanceNotice}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.advanceNoticeText}>
              Advance payment tracking will be available soon. Track advances given to labourers and auto-deduct from wages.
            </Text>
          </View>
          <TouchableOpacity style={styles.comingSoonButton} disabled>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </TouchableOpacity>
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
  loader: {
    flex: 1,
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exportButton: {
    padding: 8,
  },
  controls: {
    backgroundColor: Colors.surface,
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  miniStats: {
    gap: 8,
  },
  miniStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniStatLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemLeft: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  listItemMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  listItemMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 2,
  },
  listItemSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  workerItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  workerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerItemLeft: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  workerSkill: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  workerWage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  workerItemStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  workerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workerStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  workerStatText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  workerItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerRateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  payButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  payButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  advanceNotice: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    padding: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 12,
  },
  advanceNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#93C5FD',
    lineHeight: 18,
  },
  comingSoonButton: {
    backgroundColor: Colors.border,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chartToggle: {
    marginLeft: 'auto',
    padding: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  attendanceStatBox: {
    alignItems: 'center',
    gap: 8,
  },
  attendanceStatIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  attendanceStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
