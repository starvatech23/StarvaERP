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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ganttAPI } from '../../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = 60;
const TASK_HEIGHT = 50;

export default function ProjectTimelineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [minDate, setMinDate] = useState<Date>(new Date());
  const [maxDate, setMaxDate] = useState<Date>(new Date());
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    loadGanttData();
  }, [id]);

  const loadGanttData = async () => {
    try {
      const response = await ganttAPI.getProjectGantt(id as string);
      const ganttData = response.data;
      
      setTasks(ganttData.tasks || []);
      setMilestones(ganttData.milestones || []);
      
      // Calculate date range
      if (ganttData.tasks.length > 0) {
        const dates: Date[] = [];
        
        ganttData.tasks.forEach((task: any) => {
          if (task.start_date) dates.push(new Date(task.start_date));
          if (task.end_date) dates.push(new Date(task.end_date));
        });
        
        if (dates.length > 0) {
          const min = new Date(Math.min(...dates.map(d => d.getTime())));
          const max = new Date(Math.max(...dates.map(d => d.getTime())));
          
          // Add padding
          min.setDate(min.getDate() - 7);
          max.setDate(max.getDate() + 7);
          
          setMinDate(min);
          setMaxDate(max);
          setTotalDays(Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
    } catch (error) {
      console.error('Error loading Gantt data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskPosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return { left: 0, width: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const daysFromStart = Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: daysFromStart * DAY_WIDTH,
      width: Math.max(duration * DAY_WIDTH, 20),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'pending': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Timeline</Text>
        <View style={{ width: 40 }} />
      </View>

      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyText}>No tasks with dates</Text>
          <Text style={styles.emptySubtext}>Add start and end dates to tasks to see the timeline</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} />
              <Text style={styles.legendText}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>In Progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
          </View>

          {/* Timeline Container */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.ganttContainer}>
              {/* Date Header */}
              <View style={styles.dateHeader}>
                {Array.from({ length: totalDays }).map((_, index) => {
                  const date = new Date(minDate);
                  date.setDate(date.getDate() + index);
                  return (
                    <View key={index} style={[styles.dateCell, { width: DAY_WIDTH }]}>
                      <Text style={styles.dateText}>{formatDate(date)}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Tasks */}
              <View style={styles.tasksContainer}>
                {tasks.map((task, index) => {
                  const position = getTaskPosition(task.start_date, task.end_date);
                  
                  return (
                    <View key={task.id} style={[styles.taskRow, { height: TASK_HEIGHT }]}>
                      {/* Task Name (Fixed) */}
                      <View style={styles.taskNameContainer}>
                        <Text style={styles.taskName} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <Text style={styles.taskProgress}>{task.progress}%</Text>
                      </View>

                      {/* Grid Lines */}
                      {Array.from({ length: totalDays }).map((_, dayIndex) => (
                        <View
                          key={dayIndex}
                          style={[
                            styles.gridCell,
                            { width: DAY_WIDTH, left: dayIndex * DAY_WIDTH + 150 },
                          ]}
                        />
                      ))}

                      {/* Task Bar */}
                      {position.width > 0 && (
                        <View
                          style={[
                            styles.taskBar,
                            {
                              left: position.left + 150,
                              width: position.width,
                              backgroundColor: getStatusColor(task.status),
                            },
                          ]}
                        >
                          <View style={[styles.progressBar, { width: `${task.progress}%` }]} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Milestones */}
              {milestones.map((milestone, index) => {
                const date = new Date(milestone.due_date);
                const daysFromStart = Math.ceil(
                  (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const position = daysFromStart * DAY_WIDTH + 150;

                return (
                  <View
                    key={milestone.id}
                    style={[
                      styles.milestone,
                      { left: position },
                    ]}
                  >
                    <View style={styles.milestoneDiamond}>
                      <Ionicons name="diamond" size={16} color="#8B5CF6" />
                    </View>
                    <Text style={styles.milestoneText}>{milestone.name}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Task List Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Tasks Summary</Text>
            {tasks.map((task) => (
              <View key={task.id} style={styles.summaryItem}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryTaskName}>{task.title}</Text>
                  <Text style={styles.summaryDates}>
                    {task.start_date && new Date(task.start_date).toLocaleDateString()} -{' '}
                    {task.end_date && new Date(task.end_date).toLocaleDateString()}
                  </Text>
                  {task.assigned_to && task.assigned_to.length > 0 && (
                    <Text style={styles.summaryAssigned}>
                      Assigned: {task.assigned_to.map((u: any) => u.full_name).join(', ')}
                    </Text>
                  )}
                </View>
                <Text style={styles.summaryProgress}>{task.progress}%</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
  legendContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'Colors.surface',
    marginBottom: 8,
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#4A5568',
  },
  ganttContainer: {
    backgroundColor: 'Colors.surface',
    paddingBottom: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: 'Colors.border',
    marginLeft: 150,
  },
  dateCell: {
    padding: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'Colors.background',
  },
  dateText: {
    fontSize: 11,
    color: '#4A5568',
    fontWeight: '600',
  },
  tasksContainer: {
    position: 'relative',
  },
  taskRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.background',
    position: 'relative',
  },
  taskNameContainer: {
    width: 150,
    padding: 8,
    justifyContent: 'center',
    backgroundColor: 'Colors.surface',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderRightColor: 'Colors.border',
    zIndex: 1,
  },
  taskName: {
    fontSize: 12,
    color: 'Colors.textPrimary',
    fontWeight: '600',
  },
  taskProgress: {
    fontSize: 10,
    color: 'Colors.textSecondary',
    marginTop: 2,
  },
  gridCell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderRightColor: 'Colors.background',
  },
  taskBar: {
    position: 'absolute',
    height: 32,
    borderRadius: 4,
    top: 9,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  milestone: {
    position: 'absolute',
    top: 10,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
  },
  milestoneDiamond: {
    backgroundColor: 'Colors.surface',
    padding: 4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  milestoneText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 4,
    backgroundColor: 'Colors.surface',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  summarySection: {
    padding: 16,
    backgroundColor: 'Colors.surface',
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.background',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTaskName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  summaryDates: {
    fontSize: 12,
    color: 'Colors.textSecondary',
    marginTop: 2,
  },
  summaryAssigned: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 2,
  },
  summaryProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
});
