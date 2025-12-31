import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { ganttAPI, milestonesAPI, tasksAPI } from '../../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = 40;

interface Milestone {
  id: string;
  name: string;
  start_date: string | null;
  target_date: string | null;
  status: string;
  completion_percentage: number;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  progress: number;
  is_delayed: boolean;
  delay_days: number;
}

interface ScheduleDelay {
  task_id: string;
  task_title: string;
  delay_days: number;
  reason: string;
  applied_at: string;
}

export default function ProjectScheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [delays, setDelays] = useState<ScheduleDelay[]>([]);
  const [projectDates, setProjectDates] = useState({ start: new Date(), end: new Date() });
  const [scheduleHealth, setScheduleHealth] = useState({
    totalTasks: 0,
    completedTasks: 0,
    delayedTasks: 0,
    onTrackTasks: 0,
    totalDelayDays: 0,
  });
  const [recalculating, setRecalculating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadScheduleData();
    }, [id])
  );

  const loadScheduleData = async () => {
    try {
      // Load Gantt data (milestones and tasks)
      const ganttRes = await ganttAPI.getProjectGantt(id as string);
      const ganttData = ganttRes.data;

      // Process milestones with tasks
      const processedMilestones: Milestone[] = (ganttData.milestones || []).map((ms: any) => {
        const msTasks = (ganttData.tasks || []).filter((t: any) => t.milestone_id === ms.id);
        return {
          id: ms.id,
          name: ms.name,
          start_date: ms.start_date,
          target_date: ms.target_date || ms.end_date,
          status: ms.status,
          completion_percentage: ms.completion_percentage || 0,
          tasks: msTasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            start_date: t.start_date,
            end_date: t.end_date,
            status: t.status,
            progress: t.progress || 0,
            is_delayed: isTaskDelayed(t),
            delay_days: calculateDelayDays(t),
          })),
        };
      });

      setMilestones(processedMilestones);

      // Calculate project date range
      const allDates: Date[] = [];
      processedMilestones.forEach((ms) => {
        if (ms.start_date) allDates.push(new Date(ms.start_date));
        if (ms.target_date) allDates.push(new Date(ms.target_date));
        ms.tasks.forEach((t) => {
          if (t.start_date) allDates.push(new Date(t.start_date));
          if (t.end_date) allDates.push(new Date(t.end_date));
        });
      });

      if (allDates.length > 0) {
        const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
        minDate.setDate(minDate.getDate() - 3);
        maxDate.setDate(maxDate.getDate() + 7);
        setProjectDates({ start: minDate, end: maxDate });
      }

      // Calculate schedule health
      const allTasks = processedMilestones.flatMap((ms) => ms.tasks);
      const delayed = allTasks.filter((t) => t.is_delayed);
      const completed = allTasks.filter((t) => t.status === 'completed');
      const onTrack = allTasks.filter((t) => !t.is_delayed && t.status !== 'completed');

      setScheduleHealth({
        totalTasks: allTasks.length,
        completedTasks: completed.length,
        delayedTasks: delayed.length,
        onTrackTasks: onTrack.length,
        totalDelayDays: delayed.reduce((sum, t) => sum + t.delay_days, 0),
      });

      // Try to load delay history
      try {
        const delaysRes = await fetch(`/api/schedule/delays/${id}`);
        if (delaysRes.ok) {
          const delayData = await delaysRes.json();
          setDelays(delayData.delays || []);
        }
      } catch (e) {
        // Delay history might not exist
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isTaskDelayed = (task: any): boolean => {
    if (!task.end_date || task.status === 'completed') return false;
    const endDate = new Date(task.end_date);
    const today = new Date();
    return endDate < today && task.status !== 'completed';
  };

  const calculateDelayDays = (task: any): number => {
    if (!task.end_date || task.status === 'completed') return 0;
    const endDate = new Date(task.end_date);
    const today = new Date();
    if (endDate >= today) return 0;
    return Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleRecalculateSchedule = async () => {
    Alert.alert(
      'Recalculate Schedule',
      'This will recalculate all task and milestone dates based on current data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recalculate',
          onPress: async () => {
            setRecalculating(true);
            try {
              const response = await fetch(`/api/schedule/project/recalculate/${id}`, {
                method: 'POST',
              });
              if (response.ok) {
                Alert.alert('Success', 'Schedule recalculated successfully');
                loadScheduleData();
              } else {
                throw new Error('Failed to recalculate');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to recalculate schedule');
            } finally {
              setRecalculating(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'pending':
      case 'not_started':
        return '#9CA3AF';
      case 'on_hold':
        return '#F59E0B';
      default:
        return Colors.textSecondary;
    }
  };

  const getProgressWidth = (task: Task, totalWidth: number) => {
    const progress = task.progress || 0;
    return (progress / 100) * totalWidth;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getDaysInRange = () => {
    const days: Date[] = [];
    let current = new Date(projectDates.start);
    while (current <= projectDates.end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const getTaskBarStyle = (task: Task) => {
    if (!task.start_date || !task.end_date) return { left: 0, width: 0 };
    
    const start = new Date(task.start_date);
    const end = new Date(task.end_date);
    const daysFromStart = Math.max(0, Math.ceil((start.getTime() - projectDates.start.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      left: daysFromStart * DAY_WIDTH,
      width: duration * DAY_WIDTH,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const days = getDaysInRange();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Schedule</Text>
        <TouchableOpacity 
          onPress={handleRecalculateSchedule} 
          disabled={recalculating}
          style={styles.headerButton}
        >
          {recalculating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadScheduleData(); }} 
          />
        }
      >
        {/* Schedule Health Dashboard */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionTitle}>Schedule Health</Text>
          <View style={styles.healthCards}>
            <View style={[styles.healthCard, { backgroundColor: '#10B98110' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={[styles.healthValue, { color: '#10B981' }]}>
                {scheduleHealth.completedTasks}
              </Text>
              <Text style={styles.healthLabel}>Completed</Text>
            </View>
            <View style={[styles.healthCard, { backgroundColor: '#3B82F610' }]}>
              <Ionicons name="time" size={24} color="#3B82F6" />
              <Text style={[styles.healthValue, { color: '#3B82F6' }]}>
                {scheduleHealth.onTrackTasks}
              </Text>
              <Text style={styles.healthLabel}>On Track</Text>
            </View>
            <View style={[styles.healthCard, { backgroundColor: '#EF444410' }]}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={[styles.healthValue, { color: '#EF4444' }]}>
                {scheduleHealth.delayedTasks}
              </Text>
              <Text style={styles.healthLabel}>Delayed</Text>
            </View>
          </View>

          {scheduleHealth.totalDelayDays > 0 && (
            <View style={styles.delayBanner}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.delayBannerText}>
                Total delay: {scheduleHealth.totalDelayDays} days across {scheduleHealth.delayedTasks} tasks
              </Text>
            </View>
          )}
        </View>

        {/* Timeline Header */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Date header */}
              <View style={styles.dateHeader}>
                <View style={styles.taskNameColumn}>
                  <Text style={styles.columnHeader}>Task</Text>
                </View>
                <View style={styles.timelineArea}>
                  {days.map((day, index) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <View 
                        key={index} 
                        style={[
                          styles.dayColumn,
                          isWeekend && styles.weekendColumn,
                          isToday && styles.todayColumn,
                        ]}
                      >
                        <Text style={[styles.dayText, isToday && styles.todayText]}>
                          {day.getDate()}
                        </Text>
                        <Text style={[styles.monthText, isToday && styles.todayText]}>
                          {day.toLocaleDateString('en-IN', { month: 'short' }).slice(0, 3)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Milestones and Tasks */}
              {milestones.map((milestone, msIndex) => (
                <View key={milestone.id} style={styles.milestoneGroup}>
                  {/* Milestone Header */}
                  <View style={styles.milestoneRow}>
                    <View style={styles.taskNameColumn}>
                      <View style={styles.milestoneHeader}>
                        <Ionicons name="flag" size={16} color={Colors.primary} />
                        <Text style={styles.milestoneName} numberOfLines={1}>
                          {milestone.name}
                        </Text>
                      </View>
                      <Text style={styles.milestoneDates}>
                        {formatDate(milestone.start_date)} - {formatDate(milestone.target_date)}
                      </Text>
                    </View>
                    <View style={[styles.timelineArea, { backgroundColor: Colors.primary + '10' }]}>
                      {/* Milestone bar would go here */}
                    </View>
                  </View>

                  {/* Tasks in milestone */}
                  {milestone.tasks.map((task, taskIndex) => {
                    const barStyle = getTaskBarStyle(task);
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={styles.taskRow}
                        onPress={() => router.push(`/tasks/${task.id}` as any)}
                      >
                        <View style={styles.taskNameColumn}>
                          <View style={styles.taskInfo}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
                            <Text style={styles.taskName} numberOfLines={1}>
                              {task.title}
                            </Text>
                          </View>
                          {task.is_delayed && (
                            <View style={styles.delayIndicator}>
                              <Ionicons name="alert" size={12} color="#EF4444" />
                              <Text style={styles.delayText}>+{task.delay_days}d</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.timelineArea}>
                          {barStyle.width > 0 && (
                            <View
                              style={[
                                styles.taskBar,
                                {
                                  left: barStyle.left,
                                  width: barStyle.width,
                                  backgroundColor: task.is_delayed ? '#EF4444' : getStatusColor(task.status),
                                },
                              ]}
                            >
                              {/* Progress fill */}
                              <View
                                style={[
                                  styles.taskProgress,
                                  {
                                    width: getProgressWidth(task, barStyle.width),
                                    backgroundColor: task.is_delayed ? '#DC2626' : '#059669',
                                  },
                                ]}
                              />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Today indicator line */}
              <View style={styles.todayLineContainer}>
                {days.map((day, index) => {
                  if (day.toDateString() === new Date().toDateString()) {
                    return (
                      <View
                        key={`today-${index}`}
                        style={[
                          styles.todayLine,
                          { left: 150 + index * DAY_WIDTH + DAY_WIDTH / 2 },
                        ]}
                      />
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Recent Delays */}
        {delays.length > 0 && (
          <View style={styles.delaysSection}>
            <Text style={styles.sectionTitle}>Recent Schedule Changes</Text>
            {delays.slice(0, 5).map((delay, index) => (
              <View key={index} style={styles.delayCard}>
                <View style={styles.delayIcon}>
                  <Ionicons name="time" size={20} color="#F59E0B" />
                </View>
                <View style={styles.delayContent}>
                  <Text style={styles.delayTaskTitle}>{delay.task_title}</Text>
                  <Text style={styles.delayReason}>{delay.reason || 'Schedule adjusted'}</Text>
                  <Text style={styles.delayMeta}>
                    +{delay.delay_days} days • {formatDate(delay.applied_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>In Progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
              <Text style={styles.legendText}>Not Started</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Delayed</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight || '#E8F4FE',
  },
  content: {
    flex: 1,
  },
  healthSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  healthCards: {
    flexDirection: 'row',
    gap: 12,
  },
  healthCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  healthValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  healthLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  delayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EF444410',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  delayBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  timelineSection: {
    paddingVertical: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  taskNameColumn: {
    width: 150,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    justifyContent: 'center',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  timelineArea: {
    flexDirection: 'row',
    position: 'relative',
  },
  dayColumn: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border + '40',
  },
  weekendColumn: {
    backgroundColor: Colors.background,
  },
  todayColumn: {
    backgroundColor: Colors.primary + '20',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  monthText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  todayText: {
    color: Colors.primary,
  },
  milestoneGroup: {
    marginBottom: 4,
  },
  milestoneRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  milestoneDates: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  taskRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '60',
    minHeight: 44,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskName: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
  },
  delayIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  delayText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
  taskBar: {
    position: 'absolute',
    height: 20,
    borderRadius: 4,
    top: 12,
    opacity: 0.8,
  },
  taskProgress: {
    height: '100%',
    borderRadius: 4,
    opacity: 1,
  },
  todayLineContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#EF4444',
    zIndex: 100,
  },
  delaysSection: {
    padding: 16,
  },
  delayCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  delayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  delayContent: {
    flex: 1,
  },
  delayTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  delayReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  delayMeta: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  legendSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
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
});
