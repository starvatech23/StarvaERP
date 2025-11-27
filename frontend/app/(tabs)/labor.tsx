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

    return <Text style={styles.placeholderText}>Attendance records will appear here</Text>;
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

    return <Text style={styles.placeholderText}>Transfer records will appear here</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Labor Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (activeTab === 'workers') {
              router.push('/labor/add-worker' as any);
            } else if (activeTab === 'attendance') {
              router.push('/labor/mark-attendance' as any);
            } else {
              router.push('/labor/transfer-worker' as any);
            }
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
});
