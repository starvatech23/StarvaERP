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
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersAPI, laborAttendanceAPI, projectsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';

export default function MarkAttendanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedProject, setSelectedProject] = useState('');
  const [attendanceData, setAttendanceData] = useState<any>({});
  const [existingAttendance, setExistingAttendance] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedProject) {
      loadExistingAttendance();
    }
  }, [selectedDate, selectedProject]);

  const loadData = async () => {
    try {
      const [workersRes, projectsRes] = await Promise.all([
        workersAPI.getAll({ status: 'active' }),
        projectsAPI.getAll(),
      ]);
      setWorkers(workersRes.data || []);
      setProjects(projectsRes.data || []);
      if (projectsRes.data && projectsRes.data.length > 0) {
        setSelectedProject(projectsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setFetchingData(false);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const response = await laborAttendanceAPI.getAll({
        project_id: selectedProject,
        date: selectedDate,
      });
      const existing: any = {};
      response.data.forEach((record: any) => {
        existing[record.worker_id] = record;
      });
      setExistingAttendance(existing);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const markAttendance = (workerId: string, status: 'present' | 'absent' | 'overtime') => {
    setAttendanceData((prev: any) => ({
      ...prev,
      [workerId]: {
        status,
        worker_id: workerId,
        project_id: selectedProject,
        attendance_date: selectedDate,
        hours_worked: status === 'overtime' ? 12 : status === 'present' ? 8 : 0,
        overtime_hours: status === 'overtime' ? 4 : 0,
      },
    }));
  };

  const getAttendanceStatus = (workerId: string) => {
    if (attendanceData[workerId]) {
      return attendanceData[workerId].status;
    }
    if (existingAttendance[workerId]) {
      const existing = existingAttendance[workerId];
      if (existing.overtime_hours > 0) return 'overtime';
      if (existing.status === 'present') return 'present';
      if (existing.status === 'absent') return 'absent';
    }
    return null;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present': return '#10B981';
      case 'overtime': return '#F59E0B';
      case 'absent': return '#EF4444';
      default: return Colors.border;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'present': return 'P';
      case 'overtime': return 'OT';
      case 'absent': return 'A';
      default: return '-';
    }
  };

  const handleSave = async () => {
    const records = Object.values(attendanceData);
    if (records.length === 0) {
      Alert.alert('Info', 'No attendance marked');
      return;
    }

    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }

    setLoading(true);
    try {
      // Create attendance records
      const promises = records.map((record: any) => {
        // Check if already exists
        if (existingAttendance[record.worker_id]) {
          // Update existing
          return laborAttendanceAPI.update(existingAttendance[record.worker_id].id, {
            status: record.status,
            hours_worked: record.hours_worked,
            overtime_hours: record.overtime_hours,
          });
        } else {
          // Create new
          return laborAttendanceAPI.create({
            ...record,
            check_in_time: `${selectedDate}T08:00:00Z`,
            check_out_time: record.status !== 'absent' ? `${selectedDate}T${record.status === 'overtime' ? '20:00:00' : '17:00:00'}Z` : null,
          });
        }
      });

      await Promise.all(promises);

      Alert.alert(
        'Success!',
        `Attendance marked for ${records.length} labourer(s) on ${moment(selectedDate).format('DD MMM YYYY')}`,
        [
          { text: 'Mark Another Day', onPress: () => {
            setAttendanceData({});
            setSelectedDate(moment().format('YYYY-MM-DD'));
          }},
          { text: 'Done', onPress: () => router.back(), style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMark = (status: 'present' | 'absent' | 'overtime') => {
    Alert.alert(
      'Bulk Mark',
      `Mark all labourers as ${status.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            const newData: any = {};
            workers.forEach(worker => {
              newData[worker.id] = {
                status,
                worker_id: worker.id,
                project_id: selectedProject,
                attendance_date: selectedDate,
                hours_worked: status === 'overtime' ? 12 : status === 'present' ? 8 : 0,
                overtime_hours: status === 'overtime' ? 4 : 0,
              };
            });
            setAttendanceData(newData);
          },
        },
      ]
    );
  };

  const changeDate = (days: number) => {
    setSelectedDate(moment(selectedDate).add(days, 'days').format('YYYY-MM-DD'));
    setAttendanceData({});
  };

  if (fetchingData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="Colors.secondary" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Selector */}
        <View style={styles.dateSection}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => changeDate(-1)}
            >
              <Ionicons name="chevron-back" size={24} color="Colors.secondary" />
            </TouchableOpacity>
            <View style={styles.dateDisplay}>
              <Ionicons name="calendar" size={20} color="Colors.secondary" />
              <Text style={styles.dateText}>{moment(selectedDate).format('DD MMM YYYY')}</Text>
            </View>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => changeDate(1)}
              disabled={moment(selectedDate).isAfter(moment(), 'day')}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={moment(selectedDate).isAfter(moment(), 'day') ? '#CBD5E0' : Colors.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Project Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Site/Project</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProject}
              onValueChange={(value) => {
                setSelectedProject(value);
                setAttendanceData({});
              }}
              style={styles.picker}
            >
              {projects.map((project) => (
                <Picker.Item key={project.id} label={project.name} value={project.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Bulk Actions */}
        <View style={styles.bulkActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.bulkButtons}>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: '#F0FDF4' }]}
              onPress={() => handleBulkMark('present')}
            >
              <Text style={[styles.bulkButtonText, { color: '#10B981' }]}>Mark All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: '#FFFBEB' }]}
              onPress={() => handleBulkMark('overtime')}
            >
              <Text style={[styles.bulkButtonText, { color: '#F59E0B' }]}>Mark All OT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: '#FEF2F2' }]}
              onPress={() => handleBulkMark('absent')}
            >
              <Text style={[styles.bulkButtonText, { color: '#EF4444' }]}>Mark All Absent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Labourers List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Labourers ({workers.length})
          </Text>

          {workers.length === 0 ? (
            <Text style={styles.emptyText}>No active labourers found</Text>
          ) : (
            workers.map((worker) => {
              const status = getAttendanceStatus(worker.id);
              return (
                <View key={worker.id} style={styles.workerCard}>
                  <View style={styles.workerInfo}>
                    <View style={styles.workerAvatar}>
                      <Ionicons name="person" size={24} color="Colors.secondary" />
                    </View>
                    <View style={styles.workerDetails}>
                      <Text style={styles.workerName}>{worker.full_name}</Text>
                      <Text style={styles.workerSkill}>{worker.skill_group}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(status) },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{getStatusLabel(status)}</Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        status === 'present' && styles.actionButtonActive,
                        { borderColor: '#10B981' },
                      ]}
                      onPress={() => markAttendance(worker.id, 'present')}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          status === 'present' && styles.actionButtonTextActive,
                          { color: status === 'present' ? Colors.surface : '#10B981' },
                        ]}
                      >
                        P
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        status === 'overtime' && styles.actionButtonActive,
                        { borderColor: '#F59E0B' },
                      ]}
                      onPress={() => markAttendance(worker.id, 'overtime')}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          status === 'overtime' && styles.actionButtonTextActive,
                          { color: status === 'overtime' ? Colors.surface : '#F59E0B' },
                        ]}
                      >
                        OT
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        status === 'absent' && styles.actionButtonActive,
                        { borderColor: '#EF4444' },
                      ]}
                      onPress={() => markAttendance(worker.id, 'absent')}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          status === 'absent' && styles.actionButtonTextActive,
                          { color: status === 'absent' ? Colors.surface : '#EF4444' },
                        ]}
                      >
                        A
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Summary */}
        {Object.keys(attendanceData).length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Present</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  {Object.values(attendanceData).filter((a: any) => a.status === 'present').length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>OT</Text>
                <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                  {Object.values(attendanceData).filter((a: any) => a.status === 'overtime').length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Absent</Text>
                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                  {Object.values(attendanceData).filter((a: any) => a.status === 'absent').length}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (loading || Object.keys(attendanceData).length === 0) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading || Object.keys(attendanceData).length === 0}
        >
          {loading ? (
            <ActivityIndicator color="Colors.surface" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="Colors.surface" />
              <Text style={styles.saveButtonText}>
                Save Attendance ({Object.keys(attendanceData).length})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  dateButton: {
    padding: 8,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  pickerContainer: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: 'Colors.textPrimary,
  },
  bulkActions: {
    marginBottom: 16,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bulkButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  workerCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 2,
  },
  workerSkill: {
    fontSize: 12,
    color: 'Colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'Colors.surface,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'Colors.surface,
  },
  actionButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonTextActive: {
    color: 'Colors.surface,
  },
  summary: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    color: 'Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
  },
  saveButton: {
    backgroundColor: 'Colors.secondary,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.surface,
  },
});