import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://uacmender.preview.emergentagent.com';

export default function PublicGanttScreen() {
  const { projectId, token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [ganttData, setGanttData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGanttData();
  }, []);

  const loadGanttData = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/projects/${projectId}/gantt-share/${token}`
      );
      setGanttData(response.data);
    } catch (err: any) {
      console.error('Error loading Gantt data:', err);
      setError(err.response?.data?.detail || 'Failed to load Gantt chart');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#F59E0B';
      case 'pending':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Gantt Chart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Access Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const project = ganttData?.project || {};
  const tasks = ganttData?.tasks || [];
  const milestones = ganttData?.milestones || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
        <Text style={styles.headerTitle}>Gantt Chart</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Project Info */}
        <View style={styles.projectCard}>
          <Text style={styles.projectName}>{project.name || 'Project'}</Text>
          <View style={styles.projectDates}>
            <View style={styles.dateItem}>
              <Ionicons name="play-circle-outline" size={16} color="#10B981" />
              <Text style={styles.dateText}>Start: {formatDate(project.start_date)}</Text>
            </View>
            <View style={styles.dateItem}>
              <Ionicons name="flag-outline" size={16} color="#EF4444" />
              <Text style={styles.dateText}>End: {formatDate(project.end_date)}</Text>
            </View>
          </View>
          {project.status && (
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(project.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                {project.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Milestones */}
        {milestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="flag" size={18} color="#F59E0B" /> Milestones
            </Text>
            {milestones.map((milestone: any, index: number) => (
              <View key={milestone.id || index} style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneName}>{milestone.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(milestone.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(milestone.status) }]}>
                      {milestone.status?.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                {milestone.description && (
                  <Text style={styles.description}>{milestone.description}</Text>
                )}
                <View style={styles.milestoneFooter}>
                  <Text style={styles.dueDate}>Due: {formatDate(milestone.due_date)}</Text>
                  {milestone.progress !== undefined && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[styles.progressFill, { width: `${milestone.progress}%` }]}
                        />
                      </View>
                      <Text style={styles.progressText}>{milestone.progress}%</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="list" size={18} color={Colors.primary} /> Tasks
            </Text>
            {tasks.map((task: any, index: number) => (
              <View key={task.id || index} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={[styles.priorityBadge, { 
                    backgroundColor: task.priority === 'high' || task.priority === 'urgent' ? '#FEE2E2' : '#E0E7FF'
                  }]}>
                    <Text style={[styles.priorityText, {
                      color: task.priority === 'high' || task.priority === 'urgent' ? '#DC2626' : Colors.primary
                    }]}>
                      {task.priority}
                    </Text>
                  </View>
                </View>
                {task.description && (
                  <Text style={styles.description}>{task.description}</Text>
                )}
                <View style={styles.taskDates}>
                  <Text style={styles.taskDate}>
                    {formatDate(task.start_date)} → {formatDate(task.due_date)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(task.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                      {task.status?.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {tasks.length === 0 && milestones.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No tasks or milestones yet</Text>
          </View>
        )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#4A5568',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  projectCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  projectDates: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#4A5568',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneCard: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  milestoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dueDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 60,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  taskCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  taskDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  taskDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
