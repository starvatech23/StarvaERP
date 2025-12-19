import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';

interface Task {
  id: string;
  title: string;
  status: string;
  start_date?: string;
  due_date?: string;
  milestone_id?: string;
}

interface WeeklyGanttPreviewProps {
  projectId: string;
  tasks: Task[];
}

export default function WeeklyGanttPreview({ projectId, tasks }: WeeklyGanttPreviewProps) {
  const router = useRouter();
  
  // Get current week dates
  const startOfWeek = moment().startOf('week');
  const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek.clone().add(i, 'days'));
  const today = moment();

  // Get tasks that overlap with current week
  const weekTasks = tasks.filter((task) => {
    if (!task.due_date && !task.start_date) return false;
    
    const taskStart = task.start_date ? moment(task.start_date) : moment(task.due_date);
    const taskEnd = task.due_date ? moment(task.due_date) : moment(task.start_date);
    
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    
    // Task overlaps with current week if it starts before week ends and ends after week starts
    return taskStart.isSameOrBefore(weekEnd, 'day') && taskEnd.isSameOrAfter(weekStart, 'day');
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getTaskBarPosition = (task: Task) => {
    const weekStart = weekDays[0];
    const taskStart = task.start_date ? moment(task.start_date) : moment(task.due_date);
    const taskEnd = task.due_date ? moment(task.due_date) : moment(task.start_date);
    
    // Calculate start and end positions (0-7 for the week)
    let startPos = Math.max(0, taskStart.diff(weekStart, 'days'));
    let endPos = Math.min(7, taskEnd.diff(weekStart, 'days') + 1);
    
    // Ensure minimum width of 1 day
    if (endPos - startPos < 1) {
      endPos = startPos + 1;
    }
    
    return { startPos, width: endPos - startPos };
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/tasks/${task.id}` as any);
  };

  if (weekTasks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>This Week</Text>
          </View>
          <Text style={styles.weekRange}>
            {weekDays[0].format('MMM D')} - {weekDays[6].format('MMM D')}
          </Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={32} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>No tasks scheduled this week</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>This Week</Text>
        </View>
        <Text style={styles.weekRange}>
          {weekDays[0].format('MMM D')} - {weekDays[6].format('MMM D')}
        </Text>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaders}>
        {weekDays.map((day, index) => {
          const isToday = day.isSame(today, 'day');
          return (
            <View 
              key={index} 
              style={[styles.dayHeader, isToday && styles.todayHeader]}
            >
              <Text style={[styles.dayName, isToday && styles.todayText]}>
                {day.format('ddd')}
              </Text>
              <Text style={[styles.dayNumber, isToday && styles.todayText]}>
                {day.format('D')}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Today Indicator Line */}
      <View style={styles.ganttContainer}>
        {(() => {
          const todayIndex = today.diff(weekDays[0], 'days');
          if (todayIndex >= 0 && todayIndex < 7) {
            return (
              <View style={[styles.todayLine, { left: `${(todayIndex + 0.5) * (100/7)}%` }]} />
            );
          }
          return null;
        })()}

        {/* Task Bars */}
        <ScrollView style={styles.tasksContainer} nestedScrollEnabled>
          {weekTasks.slice(0, 5).map((task) => {
            const { startPos, width } = getTaskBarPosition(task);
            const barLeft = (startPos / 7) * 100;
            const barWidth = (width / 7) * 100;
            
            return (
              <TouchableOpacity 
                key={task.id} 
                style={styles.taskRow}
                onPress={() => handleTaskPress(task)}
                activeOpacity={0.7}
              >
                <View 
                  style={[
                    styles.taskBar,
                    { 
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      backgroundColor: getStatusColor(task.status) + '30',
                      borderLeftColor: getStatusColor(task.status),
                    }
                  ]}
                >
                  <Text style={styles.taskBarText} numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Show more indicator */}
        {weekTasks.length > 5 && (
          <TouchableOpacity 
            style={styles.showMore}
            onPress={() => router.push(`/projects/${projectId}/milestones` as any)}
          >
            <Text style={styles.showMoreText}>
              +{weekTasks.length - 5} more tasks
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* View Full Schedule Link */}
      <TouchableOpacity 
        style={styles.viewFullButton}
        onPress={() => router.push(`/projects/${projectId}/milestones` as any)}
      >
        <Text style={styles.viewFullText}>View Full Schedule</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weekRange: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  todayHeader: {
    backgroundColor: Colors.primary + '20',
  },
  dayName: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  todayText: {
    color: Colors.primary,
  },
  ganttContainer: {
    position: 'relative',
    minHeight: 120,
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.primary,
    zIndex: 10,
    opacity: 0.5,
  },
  tasksContainer: {
    maxHeight: 150,
  },
  taskRow: {
    height: 28,
    marginBottom: 4,
    position: 'relative',
  },
  taskBar: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 4,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    justifyContent: 'center',
    minWidth: 40,
  },
  taskBarText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  showMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  showMoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  viewFullText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
