import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import moment from 'moment';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  created_at: string;
}

interface ProjectGanttCardProps {
  project: any;
  tasks: Task[];
}

export default function ProjectGanttCard({ project, tasks }: ProjectGanttCardProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'on_hold': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Calculate project progress based on tasks
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate timeline progress
  const getTimelineProgress = () => {
    if (!project.start_date || !project.end_date) return null;
    
    const start = moment(project.start_date);
    const end = moment(project.end_date);
    const now = moment();
    
    if (now.isBefore(start)) return 0;
    if (now.isAfter(end)) return 100;
    
    const total = end.diff(start, 'days');
    const elapsed = now.diff(start, 'days');
    
    return Math.round((elapsed / total) * 100);
  };

  const timelineProgress = getTimelineProgress();

  // Create a simplified Gantt chart
  const renderGanttBars = () => {
    if (tasks.length === 0 || !project.start_date || !project.end_date) {
      return null;
    }

    const projectStart = moment(project.start_date);
    const projectEnd = moment(project.end_date);
    const projectDuration = projectEnd.diff(projectStart, 'days') || 1;

    // Sort tasks by creation date and show max 5
    const sortedTasks = [...tasks]
      .filter(t => t.due_date)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);

    return sortedTasks.map((task, index) => {
      const taskStart = moment(task.created_at);
      const taskEnd = moment(task.due_date);
      
      // Calculate position and width as percentage
      const startOffset = Math.max(0, taskStart.diff(projectStart, 'days'));
      const taskDuration = taskEnd.diff(taskStart, 'days') || 1;
      
      const leftPercent = (startOffset / projectDuration) * 100;
      const widthPercent = Math.min((taskDuration / projectDuration) * 100, 100 - leftPercent);

      return (
        <View key={task.id} style={styles.ganttRow}>
          <Text style={styles.ganttTaskName} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={styles.ganttTrack}>
            <View
              style={[
                styles.ganttBar,
                {
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: getStatusColor(task.status),
                },
              ]}
            />
          </View>
        </View>
      );
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/projects/${project.id}` as any)}
    >
      {/* Project Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.projectName} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={styles.projectLocation} numberOfLines={1}>
            {project.location}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getProjectStatusColor(project.status) + '20' },
          ]}
        >
          <Text style={[styles.statusText, { color: getProjectStatusColor(project.status) }]}>
            {project.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Progress Info */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <View style={styles.progressInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.progressText}>
              {completedTasks}/{totalTasks} Tasks
            </Text>
          </View>
          <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      {/* Timeline Progress */}
      {timelineProgress !== null && (
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Ionicons name="time-outline" size={14} color="#718096" />
            <Text style={styles.timelineLabel}>Timeline Progress</Text>
            <Text style={styles.timelinePercentage}>{timelineProgress}%</Text>
          </View>
          <View style={styles.timelineBarContainer}>
            <View style={[styles.timelineBar, { width: `${timelineProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Gantt Chart */}
      {tasks.length > 0 && project.start_date && project.end_date && (
        <View style={styles.ganttSection}>
          <View style={styles.ganttHeader}>
            <Ionicons name="stats-chart-outline" size={14} color="#718096" />
            <Text style={styles.ganttTitle}>Task Timeline</Text>
          </View>
          {renderGanttBars()}
          {tasks.length > 5 && (
            <Text style={styles.moreTasksText}>+{tasks.length - 5} more tasks</Text>
          )}
        </View>
      )}

      {/* Project Dates */}
      {project.start_date && project.end_date && (
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={12} color="#718096" />
            <Text style={styles.dateText}>{moment(project.start_date).format('MMM DD')}</Text>
          </View>
          <View style={styles.dateSeparator} />
          <View style={styles.dateItem}>
            <Ionicons name="calendar" size={12} color="#718096" />
            <Text style={styles.dateText}>{moment(project.end_date).format('MMM DD, YYYY')}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  projectLocation: {
    fontSize: 12,
    color: '#718096',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#718096',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  timelineSection: {
    marginBottom: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timelineLabel: {
    fontSize: 11,
    color: '#718096',
    flex: 1,
  },
  timelinePercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  timelineBarContainer: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timelineBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  ganttSection: {
    marginBottom: 12,
  },
  ganttHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ganttTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
  },
  ganttRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ganttTaskName: {
    fontSize: 10,
    color: '#718096',
    width: 80,
    marginRight: 8,
  },
  ganttTrack: {
    flex: 1,
    height: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  ganttBar: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  moreTasksText: {
    fontSize: 10,
    color: '#A0AEC0',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'right',
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateSeparator: {
    width: 16,
    height: 1,
    backgroundColor: '#CBD5E0',
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#718096',
  },
});
