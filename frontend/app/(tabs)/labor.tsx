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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersAPI, laborAttendanceAPI, siteTransfersAPI } from '../../services/api';
import moment from 'moment';

export default function LaborScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'workers' | 'attendance' | 'transfers' | 'reports'>('workers');
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'workers') {
        const response = await workersAPI.getAll();
        setWorkers(response.data || []);
      } else if (activeTab === 'attendance') {
        const response = await laborAttendanceAPI.getAll();
        setAttendance(response.data || []);
      } else {
        const response = await siteTransfersAPI.getAll();
        setTransfers(response.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [activeTab]);

  const getSkillColor = (skill: string) => {
    const colors: any = {
      mason: '#EF4444',
      carpenter: '#F59E0B',
      electrician: '#3B82F6',
      plumber: '#06B6D4',
      painter: '#8B5CF6',
      welder: '#EC4899',
      helper: '#10B981',
      machine_operator: '#F97316',
      supervisor: '#6366F1',
    };
    return colors[skill] || '#6B7280';
  };

  const renderWorkers = () => {
    if (workers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Workers Yet</Text>
          <Text style={styles.emptyText}>Add workers to start managing your labor force</Text>
        </View>
      );
    }

    return workers.map((worker: any) => (
      <TouchableOpacity
        key={worker.id}
        style={styles.card}
        onPress={() => router.push(`/labor/workers/${worker.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.workerInfo}>
            <Ionicons name="person-circle" size={40} color="#FF6B35" />
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{worker.full_name}</Text>
              <Text style={styles.workerPhone}>{worker.phone}</Text>
            </View>
          </View>
          <View
            style={[
              styles.skillBadge,
              { backgroundColor: getSkillColor(worker.skill_group) + '20' },
            ]}
          >
            <Text
              style={[
                styles.skillText,
                { color: getSkillColor(worker.skill_group) },
              ]}
            >
              {worker.skill_group.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={16} color="#718096" />
            <Text style={styles.infoText}>₹{worker.base_rate}/{worker.pay_scale}</Text>
          </View>
          {worker.current_site_name && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color="#718096" />
              <Text style={styles.infoText}>{worker.current_site_name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ));
  };

  const renderAttendance = () => {
    if (attendance.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Attendance Records</Text>
          <Text style={styles.emptyText}>Mark attendance to track worker hours</Text>
        </View>
      );
    }

    // Group by date
    const groupedByDate: any = {};
    attendance.forEach((record: any) => {
      const date = moment(record.attendance_date).format('YYYY-MM-DD');
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(record);
    });

    return Object.keys(groupedByDate).sort().reverse().slice(0, 10).map(date => (
      <View key={date} style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <Ionicons name="calendar" size={20} color="#FF6B35" />
          <Text style={styles.attendanceDate}>{moment(date).format('DD MMM YYYY')}</Text>
        </View>
        {groupedByDate[date].map((record: any) => (
          <View key={record.id} style={styles.attendanceRow}>
            <View style={styles.attendanceWorker}>
              <Text style={styles.attendanceWorkerName}>{record.worker_name}</Text>
              <Text style={styles.attendanceProject}>{record.project_name}</Text>
            </View>
            <View style={styles.attendanceStatus}>
              <View
                style={[
                  styles.attendanceStatusBadge,
                  {
                    backgroundColor:
                      record.overtime_hours > 0
                        ? '#F59E0B'
                        : record.status === 'present'
                        ? '#10B981'
                        : '#EF4444',
                  },
                ]}
              >
                <Text style={styles.attendanceStatusText}>
                  {record.overtime_hours > 0 ? 'OT' : record.status === 'present' ? 'P' : 'A'}
                </Text>
              </View>
              <Text style={styles.attendanceHours}>{record.hours_worked}h</Text>
            </View>
          </View>
        ))}
      </View>
    ));
  };

  const renderTransfers = () => {
    if (transfers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Site Transfers</Text>
          <Text style={styles.emptyText}>Transfer workers between sites as needed</Text>
        </View>
      );
    }

    return transfers.map((transfer: any) => (
      <View key={transfer.id} style={styles.card}>
        <View style={styles.transferHeader}>
          <View style={styles.transferInfo}>
            <Ionicons name="person-circle" size={32} color="#FF6B35" />
            <View style={styles.transferDetails}>
              <Text style={styles.transferWorkerName}>{transfer.worker_name}</Text>
              <Text style={styles.transferDate}>
                {moment(transfer.transfer_date).format('DD MMM YYYY')}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.transferRoute}>
          <View style={styles.siteBox}>
            <Text style={styles.siteLabel}>From</Text>
            <Text style={styles.siteName}>{transfer.from_project_name}</Text>
            {transfer.hours_at_from_site > 0 && (
              <Text style={styles.hours}>{transfer.hours_at_from_site}h</Text>
            )}
          </View>
          
          <Ionicons name="arrow-forward" size={24} color="#FF6B35" />
          
          <View style={styles.siteBox}>
            <Text style={styles.siteLabel}>To</Text>
            <Text style={styles.siteName}>{transfer.to_project_name}</Text>
            {transfer.hours_at_to_site > 0 && (
              <Text style={styles.hours}>{transfer.hours_at_to_site}h</Text>
            )}
          </View>
        </View>
        
        {transfer.reason && (
          <View style={styles.transferReason}>
            <Ionicons name="information-circle-outline" size={16} color="#718096" />
            <Text style={styles.reasonText}>{transfer.reason}</Text>
          </View>
        )}
        
        {(transfer.wages_from_site || transfer.wages_to_site) && (
          <View style={styles.wagesSection}>
            <Text style={styles.wagesLabel}>Split Wages:</Text>
            <Text style={styles.wagesValue}>
              ₹{transfer.wages_from_site?.toFixed(2) || 0} + ₹{transfer.wages_to_site?.toFixed(2) || 0}
            </Text>
          </View>
        )}
      </View>
    ));
  };

  const renderReports = () => {
    return (
      <View style={styles.reportsContainer}>
        <Ionicons name="stats-chart" size={80} color="#FF6B35" />
        <Text style={styles.reportsTitle}>Labour Wage Reports</Text>
        <Text style={styles.reportsText}>
          View weekly and monthly wage reports, site-wise breakdowns, and individual labourer earnings
        </Text>
        <TouchableOpacity
          style={styles.viewReportsButton}
          onPress={() => router.push('/labor/reports' as any)}
        >
          <Ionicons name="document-text" size={20} color="#FFFFFF" />
          <Text style={styles.viewReportsText}>View Reports</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Labor Management</Text>
        <View style={styles.headerButtons}>
          {activeTab === 'attendance' && (
            <TouchableOpacity
              style={styles.weeklyButton}
              onPress={() => router.push('/labor/weekly-attendance' as any)}
            >
              <Ionicons name="calendar" size={20} color="#FF6B35" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (activeTab === 'workers') {
                router.push('/labor/add-worker' as any);
              } else if (activeTab === 'attendance') {
                router.push('/labor/mark-attendance' as any);
              } else if (activeTab === 'transfers') {
                router.push('/labor/site-transfer' as any);
              } else {
                router.push('/labor/reports' as any);
              }
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workers' && styles.activeTab]}
          onPress={() => setActiveTab('workers')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'workers' ? '#FF6B35' : '#718096'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'workers' && styles.activeTabText,
            ]}
          >
            Workers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
          onPress={() => setActiveTab('attendance')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={activeTab === 'attendance' ? '#FF6B35' : '#718096'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'attendance' && styles.activeTabText,
            ]}
          >
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'transfers' && styles.activeTab]}
          onPress={() => setActiveTab('transfers')}
        >
          <Ionicons
            name="swap-horizontal"
            size={20}
            color={activeTab === 'transfers' ? '#FF6B35' : '#718096'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'transfers' && styles.activeTabText,
            ]}
          >
            Transfers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'reports' ? '#FF6B35' : '#718096'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'reports' && styles.activeTabText,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FF6B35" style={styles.loader} />
        ) : (
          <>
            {activeTab === 'workers' && renderWorkers()}
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'transfers' && renderTransfers()}
            {activeTab === 'reports' && renderReports()}
          </>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  weeklyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: 14,
    color: '#718096',
  },
  skillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#718096',
  },
  placeholderText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 20,
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  attendanceDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attendanceWorker: {
    flex: 1,
  },
  attendanceWorkerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 2,
  },
  attendanceProject: {
    fontSize: 12,
    color: '#718096',
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendanceStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  attendanceHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  reportsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  reportsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  reportsText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  viewReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  viewReportsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transferInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transferDetails: {
    flex: 1,
  },
  transferWorkerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  transferDate: {
    fontSize: 14,
    color: '#718096',
  },
  transferRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  siteBox: {
    flex: 1,
    alignItems: 'center',
  },
  siteLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  siteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    textAlign: 'center',
  },
  hours: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 4,
  },
  transferReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
  },
  wagesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  wagesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  wagesValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
});
