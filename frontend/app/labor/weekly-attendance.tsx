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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersAPI, laborAttendanceAPI, projectsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';

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
      Alert.alert('Error', 'Failed to load data');
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
    setCurrentWeekStart(moment(currentWeekStart).add(direction, 'weeks'));
    setAttendanceData({});
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
      case 'present': return '#10B981';
      case 'overtime': return '#F59E0B';
      case 'absent': return '#EF4444';
      default: return 'Colors.background';
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
    Alert.alert(
      'Mark Entire Week',
      `Mark all days as ${status.toUpperCase()} for this labourer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            const weekDates = getWeekDates();
            weekDates.forEach(date => {
              if (!date.isAfter(moment(), 'day')) {
                markAttendance(workerId, date.format('YYYY-MM-DD'), status);
              }
            });
          },
        },
      ]
    );
  };

  const markEntireColumn = (date: string, status: 'present' | 'absent' | 'overtime') => {
    Alert.alert(
      'Mark Entire Day',
      `Mark ${moment(date).format('dddd, MMM DD')} as ${status.toUpperCase()} for all labourers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            workers.forEach(worker => {
              markAttendance(worker.id, date, status);
            });
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const records = Object.values(attendanceData);
    if (records.length === 0) {
      Alert.alert('Info', 'No attendance marked');
      return;
    }

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

      const weekStart = moment(currentWeekStart).format('DD MMM');
      const weekEnd = moment(currentWeekStart).add(6, 'days').format('DD MMM YYYY');

      Alert.alert(
        'Success!',
        `Attendance saved for ${records.length} entries\n${weekStart} - ${weekEnd}`,
        [
          { text: 'Next Week', onPress: () => {
            changeWeek(1);
            setAttendanceData({});
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

  if (fetchingData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="Colors.secondary" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const weekDates = getWeekDates();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Attendance</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.controlsSection}>
        {/* Week Navigation */}
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.weekButton} onPress={() => changeWeek(-1)}>
            <Ionicons name="chevron-back" size={24} color="Colors.secondary" />
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
              color={moment(currentWeekStart).add(7, 'days').isAfter(moment(), 'week') ? '#CBD5E0' : 'Colors.secondary'} 
            />
          </TouchableOpacity>
        </View>

        {/* Project Selector */}
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
                      style={[styles.bulkRowButton, { backgroundColor: '#10B981' }]}
                    >
                      <Text style={styles.bulkRowButtonText}>P All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => markEntireRow(worker.id, 'overtime')}
                      style={[styles.bulkRowButton, { backgroundColor: '#F59E0B' }]}
                    >
                      <Text style={styles.bulkRowButtonText}>OT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => markEntireRow(worker.id, 'absent')}
                      style={[styles.bulkRowButton, { backgroundColor: '#EF4444' }]}
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
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Overtime</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
        </View>
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
                Save ({Object.keys(attendanceData).length})
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
    backgroundColor: 'Colors.background',
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
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  placeholder: {
    width: 40,
  },
  controlsSection: {
    backgroundColor: 'Colors.surface',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
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
    color: 'Colors.textPrimary',
  },
  pickerContainer: {
    backgroundColor: 'Colors.background',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: 'Colors.textPrimary',
  },
  gridContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'Colors.secondary',
    borderBottomWidth: 2,
    borderBottomColor: 'Colors.border',
  },
  nameColumn: {
    width: 140,
    padding: 12,
    backgroundColor: 'Colors.surface',
    borderRightWidth: 1,
    borderRightColor: 'Colors.border',
    justifyContent: 'center',
  },
  dateColumn: {
    width: 80,
    padding: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#FFF5F2',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'Colors.surface',
    marginBottom: 2,
  },
  dateNumText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.surface',
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
    color: 'Colors.surface',
  },
  workersScroll: {
    maxHeight: 500,
  },
  workerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  evenRow: {
    backgroundColor: 'Colors.background',
  },
  workerName: {
    fontSize: 13,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 2,
  },
  workerSkill: {
    fontSize: 10,
    color: 'Colors.textSecondary',
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
    color: 'Colors.surface',
  },
  dateCell: {
    width: 80,
    height: 100,
    borderRightWidth: 1,
    borderRightColor: 'Colors.border',
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureCell: {
    opacity: 0.3,
  },
  cellText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CBD5E0',
  },
  cellTextMarked: {
    color: 'Colors.surface',
  },
  footer: {
    backgroundColor: 'Colors.surface',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border',
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
    color: 'Colors.textSecondary',
  },
  saveButton: {
    backgroundColor: 'Colors.secondary',
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
    color: 'Colors.surface',
  },
});