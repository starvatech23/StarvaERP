import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersAPI, laborAttendanceAPI, projectsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';
import ConfirmationModal from '../../components/ConfirmationModal';
import Colors from '../../constants/Colors';

export default function WeeklyAttendanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(moment().startOf('week'));
  const [attendanceData, setAttendanceData] = useState<any>({});
  const [existingAttendance, setExistingAttendance] = useState<any>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    destructive: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadWeekAttendance();
    }
  }, [currentWeekStart, selectedProject]);

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
    } finally {
      setFetchingData(false);
    }
  };

  const loadWeekAttendance = async () => {
    try {
      const weekDates = getWeekDates();
      const promises = weekDates.map(date => 
        laborAttendanceAPI.getAll({
          project_id: selectedProject,
          date: date.format('YYYY-MM-DD'),
        })
      );
      
      const results = await Promise.all(promises);
      const existing: any = {};
      
      results.forEach((response, index) => {
        response.data.forEach((record: any) => {
          const key = `${record.worker_id}_${weekDates[index].format('YYYY-MM-DD')}`;
          existing[key] = record;
        });
      });
      
      setExistingAttendance(existing);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(moment(currentWeekStart).add(i, 'days'));
    }
    return dates;
  };

  const changeWeek = (direction: number) => {
    if (hasUnsavedChanges) {
      setConfirmModal({
        visible: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved attendance data. Do you want to discard these changes?',
        destructive: true,
        onConfirm: () => {
          setCurrentWeekStart(moment(currentWeekStart).add(direction, 'weeks'));
          setAttendanceData({});
          setHasUnsavedChanges(false);
          setConfirmModal(prev => ({ ...prev, visible: false }));
        },
      });
    } else {
      setCurrentWeekStart(moment(currentWeekStart).add(direction, 'weeks'));
      setAttendanceData({});
    }
  };

  const markAttendance = (workerId: string, date: string, status: 'present' | 'absent' | 'overtime') => {
    const key = `${workerId}_${date}`;
    setAttendanceData((prev: any) => ({
      ...prev,
      [key]: {
        status,
        worker_id: workerId,
        project_id: selectedProject,
        attendance_date: date,
        hours_worked: status === 'overtime' ? 12 : status === 'present' ? 8 : 0,
        overtime_hours: status === 'overtime' ? 4 : 0,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const getAttendanceStatus = (workerId: string, date: string) => {
    const key = `${workerId}_${date}`;
    if (attendanceData[key]) {
      return attendanceData[key].status;
    }
    if (existingAttendance[key]) {
      const existing = existingAttendance[key];
      if (existing.overtime_hours > 0) return 'overtime';
      if (existing.status === 'present') return 'present';
      if (existing.status === 'absent') return 'absent';
    }
    return null;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present': return Colors.success;
      case 'overtime': return Colors.warning;
      case 'absent': return Colors.error;
      default: return Colors.background;
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

  const markEntireRow = (workerId: string, status: 'present' | 'absent' | 'overtime') => {
    setConfirmModal({
      visible: true,
      title: 'Mark Entire Week',
      message: `Mark all days as ${status.toUpperCase()} for this labourer?`,
      destructive: false,
      onConfirm: () => {
        const weekDates = getWeekDates();
        weekDates.forEach(date => {
          if (!date.isAfter(moment(), 'day')) {
            markAttendance(workerId, date.format('YYYY-MM-DD'), status);
          }
        });
        setConfirmModal(prev => ({ ...prev, visible: false }));
      },
    });
  };

  const markEntireColumn = (date: string, status: 'present' | 'absent' | 'overtime') => {
    setConfirmModal({
      visible: true,
      title: 'Mark Entire Day',
      message: `Mark ${moment(date).format('dddd, MMM DD')} as ${status.toUpperCase()} for all labourers?`,
      destructive: false,
      onConfirm: () => {
        workers.forEach(worker => {
          markAttendance(worker.id, date, status);
        });
        setConfirmModal(prev => ({ ...prev, visible: false }));
      },
    });
  };

  const handleSave = async () => {
    const records = Object.values(attendanceData);
    if (records.length === 0) return;

    setLoading(true);
    try {
      const promises = records.map((record: any) => {
        const key = `${record.worker_id}_${record.attendance_date}`;
        if (existingAttendance[key]) {
          return laborAttendanceAPI.update(existingAttendance[key].id, {
            status: record.status,
            hours_worked: record.hours_worked,
            overtime_hours: record.overtime_hours,
          });
        } else {
          return laborAttendanceAPI.create({
            ...record,
            check_in_time: `${record.attendance_date}T08:00:00Z`,
            check_out_time: record.status !== 'absent' 
              ? `${record.attendance_date}T${record.status === 'overtime' ? '20:00:00' : '17:00:00'}Z` 
              : null,
          });
        }
      });

      await Promise.all(promises);
      
      // Success - clear unsaved changes and show success modal
      setSavedCount(records.length);
      setHasUnsavedChanges(false);
      setAttendanceData({});
      await loadWeekAttendance();
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Save error:', error);
      setConfirmModal({
        visible: true,
        title: 'Save Failed',
        message: error.response?.data?.detail || 'Failed to save attendance. Please try again.',
        destructive: true,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessAction = (action: 'stay' | 'back' | 'nextWeek') => {
    setShowSuccessModal(false);
    if (action === 'back') {
      router.back();
    } else if (action === 'nextWeek') {
      setCurrentWeekStart(moment(currentWeekStart).add(1, 'weeks'));
    }
    // 'stay' does nothing, just closes modal
  };

  if (fetchingData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const weekDates = getWeekDates();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Attendance</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.controlsSection}>
        {/* Week Navigation */}
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.weekButton} onPress={() => changeWeek(-1)}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.weekText}>
            {moment(currentWeekStart).format('DD MMM')} - {moment(currentWeekStart).add(6, 'days').format('DD MMM YYYY')}
          </Text>
          <TouchableOpacity 
            style={styles.weekButton} 
            onPress={() => changeWeek(1)}
            disabled={moment(currentWeekStart).add(7, 'days').isAfter(moment(), 'week')}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={moment(currentWeekStart).add(7, 'days').isAfter(moment(), 'week') ? Colors.disabledText : Colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Project Selector */}
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedProject}
            onValueChange={(value) => {
              if (hasUnsavedChanges) {
                setConfirmModal({
                  visible: true,
                  title: 'Unsaved Changes',
                  message: 'Changing projects will discard unsaved attendance. Continue?',
                  destructive: true,
                  onConfirm: () => {
                    setSelectedProject(value);
                    setAttendanceData({});
                    setHasUnsavedChanges(false);
                    setConfirmModal(prev => ({ ...prev, visible: false }));
                  },
                });
              } else {
                setSelectedProject(value);
                setAttendanceData({});
              }
            }}
            style={styles.picker}
          >
            {projects.map((project) => (
              <Picker.Item key={project.id} label={project.name} value={project.id} />
            ))}
          </Picker>
        </View>
        
        {hasUnsavedChanges && (
          <View style={styles.unsavedBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.warning} />
            <Text style={styles.unsavedText}>
              {Object.keys(attendanceData).length} unsaved change(s)
            </Text>
          </View>
        )}
      </View>

      <ScrollView horizontal style={styles.gridContainer}>
        <View>
          {/* Header Row with Dates */}
          <View style={styles.headerRow}>
            <View style={styles.nameColumn}>
              <Text style={styles.headerText}>Labourer</Text>
            </View>
            {weekDates.map((date, index) => (
              <View key={index} style={styles.dateColumn}>
                <Text style={styles.dayText}>{date.format('ddd')}</Text>
                <Text style={styles.dateNumText}>{date.format('DD')}</Text>
                {/* Bulk mark buttons for each day */}
                <View style={styles.bulkDayButtons}>
                  <TouchableOpacity
                    onPress={() => markEntireColumn(date.format('YYYY-MM-DD'), 'present')}
                    style={styles.miniButton}
                    disabled={date.isAfter(moment(), 'day')}
                  >
                    <Text style={styles.miniButtonText}>P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => markEntireColumn(date.format('YYYY-MM-DD'), 'overtime')}
                    style={styles.miniButton}
                    disabled={date.isAfter(moment(), 'day')}
                  >
                    <Text style={styles.miniButtonText}>OT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => markEntireColumn(date.format('YYYY-MM-DD'), 'absent')}
                    style={styles.miniButton}
                    disabled={date.isAfter(moment(), 'day')}
                  >
                    <Text style={styles.miniButtonText}>A</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Worker Rows */}
          <ScrollView style={styles.workersScroll}>
            {workers.map((worker, workerIndex) => (
              <View key={worker.id} style={[styles.workerRow, workerIndex % 2 === 0 && styles.evenRow]}>
                <View style={styles.nameColumn}>
                  <Text style={styles.workerName} numberOfLines={2}>{worker.full_name}</Text>
                  <Text style={styles.workerSkill}>{worker.skill_group}</Text>
                  {/* Bulk mark row buttons */}
                  <View style={styles.bulkRowButtons}>
                    <TouchableOpacity
                      onPress={() => markEntireRow(worker.id, 'present')}
                      style={[styles.bulkRowButton, { backgroundColor: 'Colors.success }]}
                    >
                      <Text style={styles.bulkRowButtonText}>P All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => markEntireRow(worker.id, 'overtime')}
                      style={[styles.bulkRowButton, { backgroundColor: 'Colors.warning }]}
                    >
                      <Text style={styles.bulkRowButtonText}>OT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => markEntireRow(worker.id, 'absent')}
                      style={[styles.bulkRowButton, { backgroundColor: 'Colors.error }]}
                    >
                      <Text style={styles.bulkRowButtonText}>A</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {weekDates.map((date, dateIndex) => {
                  const dateStr = date.format('YYYY-MM-DD');
                  const status = getAttendanceStatus(worker.id, dateStr);
                  const isFuture = date.isAfter(moment(), 'day');
                  
                  return (
                    <TouchableOpacity
                      key={dateIndex}
                      style={[
                        styles.dateCell,
                        { backgroundColor: getStatusColor(status) },
                        isFuture && styles.futureCell,
                      ]}
                      onPress={() => {
                        if (!isFuture) {
                          // Cycle through states: null -> P -> OT -> A -> null
                          if (status === 'present') {
                            markAttendance(worker.id, dateStr, 'overtime');
                          } else if (status === 'overtime') {
                            markAttendance(worker.id, dateStr, 'absent');
                          } else if (status === 'absent') {
                            // Clear
                            setAttendanceData((prev: any) => {
                              const newData = { ...prev };
                              delete newData[`${worker.id}_${dateStr}`];
                              return newData;
                            });
                            setHasUnsavedChanges(Object.keys(attendanceData).length > 1);
                          } else {
                            markAttendance(worker.id, dateStr, 'present');
                          }
                        }
                      }}
                      disabled={isFuture}
                    >
                      <Text style={[
                        styles.cellText,
                        status && styles.cellTextMarked,
                      ]}>
                        {getStatusLabel(status)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Legend & Save Button */}
      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'Colors.success }]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'Colors.warning }]} />
            <Text style={styles.legendText}>Overtime</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'Colors.error }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, (!hasUnsavedChanges || loading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasUnsavedChanges || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>
                Save {hasUnsavedChanges ? `(${Object.keys(attendanceData).length})` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        destructive={confirmModal.destructive}
      />
      
      {/* Success Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title="Attendance Saved!"
        message={`Successfully saved ${savedCount} attendance record(s) for ${moment(currentWeekStart).format('DD MMM')} - ${moment(currentWeekStart).add(6, 'days').format('DD MMM YYYY')}`}
        icon="checkmark-circle"
        iconColor={Colors.success}
        confirmText="Next Week"
        cancelText="Stay Here"
        onConfirm={() => handleSuccessAction('nextWeek')}
        onCancel={() => handleSuccessAction('stay')}
        destructive={false}
      />
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
    justifyContent: 'center',
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
  placeholder: {
    width: 40,
  },
  controlsSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekButton: {
    padding: 8,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  picker: {
    color: Colors.textPrimary,
  },
  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  unsavedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  gridContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  nameColumn: {
    width: 140,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    justifyContent: 'center',
  },
  dateColumn: {
    width: 80,
    padding: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.white,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  dateNumText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  bulkDayButtons: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  miniButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 2,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  miniButtonText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.white,
  },
  workersScroll: {
    maxHeight: 500,
  },
  workerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  evenRow: {
    backgroundColor: Colors.background,
  },
  workerName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  workerSkill: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  bulkRowButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  bulkRowButton: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  bulkRowButtonText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.white,
  },
  dateCell: {
    width: 80,
    height: 100,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureCell: {
    opacity: 0.3,
  },
  cellText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textTertiary,
  },
  cellTextMarked: {
    color: Colors.white,
  },
  footer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.secondary,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.disabled,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
