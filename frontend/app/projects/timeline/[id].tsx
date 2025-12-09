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
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI, tasksAPI } from '../../../services/api';
import moment from 'moment';

const { width } = Dimensions.get('window');

export default function ProjectTimelineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ganttData, setGanttData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        projectsAPI.getById(id as string),
        tasksAPI.getAll(id as string),
      ]);
      
      setProject(projectRes.data);
      setTasks(tasksRes.data);
      
      // Transform tasks into Gantt chart format
      const ganttItems = tasksRes.data
        .filter((task: any) => task.due_date) // Only tasks with due dates
        .map((task: any, index: number) => {
          const createdDate = new Date(task.created_at);
          const dueDate = new Date(task.due_date);
          
          return {
            id: task.id,
            name: task.title,
            start: createdDate,
            end: dueDate,
            progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
            color: getTaskColor(task.status),
          };
        });
      
      setGanttData(ganttItems);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load project timeline');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getTaskColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return Colors.primary;
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getProgressStats = () => {
    if (tasks.length === 0) return { completed: 0, inProgress: 0, pending: 0 };
    
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    return { completed, inProgress, pending };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color=Colors.secondary />
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return null;
  }

  const stats = getProgressStats();
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((stats.completed / totalTasks) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color=Colors.textPrimary />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Timeline</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Project Info Card */}
        <View style={styles.card}>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectLocation}>{project.location}</Text>
          
          {project.start_date && project.end_date && (
            <View style={styles.dateRange}>
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color=Colors.textSecondary />
                <Text style={styles.dateLabel}>Start:</Text>
                <Text style={styles.dateValue}>
                  {moment(project.start_date).format('MMM DD, YYYY')}
                </Text>
              </View>
              <View style={styles.dateItem}>
                <Ionicons name="calendar" size={16} color=Colors.textSecondary />
                <Text style={styles.dateLabel}>End:</Text>
                <Text style={styles.dateValue}>
                  {moment(project.end_date).format('MMM DD, YYYY')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Progress Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress Overview</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="sync-circle" size={24} color=Colors.primary />
              </View>
              <Text style={styles.statValue}>{stats.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="time" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Overall Completion</Text>
              <Text style={styles.progressPercentage}>{completionRate}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${completionRate}%` }]} />
            </View>
          </View>
        </View>

        {/* Simple Timeline View */}
        {ganttData.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Timeline View</Text>
            <View style={styles.timelineContainer}>
              {ganttData.map((item: any, index: number) => {
                const duration = moment(item.end).diff(moment(item.start), 'days');
                const daysFromStart = moment(item.start).diff(moment(ganttData[0].start), 'days');
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.timelineItem}
                    onPress={() => router.push(`/tasks/${item.id}` as any)}
                  >
                    <View style={styles.timelineLeft}>
                      <Text style={styles.timelineName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.timelineDate}>
                        {moment(item.start).format('MMM DD')} - {moment(item.end).format('MMM DD')}
                      </Text>
                      <Text style={styles.timelineDuration}>{duration} days</Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <View style={styles.timelineBarContainer}>
                        <View
                          style={[
                            styles.timelineBar,
                            {
                              backgroundColor: item.color,
                              width: `${Math.min(item.progress, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.timelineProgress}>{item.progress}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#CBD5E0" />
              <Text style={styles.emptyTitle}>No Timeline Available</Text>
              <Text style={styles.emptyText}>
                Tasks need to have due dates to display on the timeline
              </Text>
            </View>
          </View>
        )}

        {/* Tasks List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Tasks ({tasks.length})</Text>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks yet</Text>
          ) : (
            <View style={styles.tasksList}>
              {tasks.map((task: any) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => router.push(`/tasks/${task.id}` as any)}
                >
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                      <View
                        style={[
                          styles.taskStatusDot,
                          { backgroundColor: getTaskColor(task.status) },
                        ]}
                      />
                      <Text style={styles.taskTitle}>{task.title}</Text>
                    </View>
                    <Text style={[styles.taskStatus, { color: getTaskColor(task.status) }]}>
                      {getStatusLabel(task.status)}
                    </Text>
                  </View>
                  {task.due_date && (
                    <View style={styles.taskMeta}>
                      <Ionicons name="calendar-outline" size={14} color=Colors.textSecondary />
                      <Text style={styles.taskMetaText}>
                        Due: {moment(task.due_date).format('MMM DD, YYYY')}
                      </Text>
                    </View>
                  )}
                  {task.assigned_users && task.assigned_users.length > 0 && (
                    <View style={styles.taskMeta}>
                      <Ionicons name="people-outline" size={14} color=Colors.textSecondary />
                      <Text style={styles.taskMetaText}>
                        {task.assigned_users.map((u: any) => u.name).join(', ')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  projectLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  dateRange: {
    gap: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  timelineContainer: {
    gap: 12,
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  timelineLeft: {
    flex: 1,
  },
  timelineName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timelineDuration: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  timelineRight: {
    justifyContent: 'center',
    minWidth: 100,
  },
  timelineBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  timelineBar: {
    height: '100%',
    borderRadius: 4,
  },
  timelineProgress: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  taskStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  taskMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
