import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../../../../constants/Colors';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { milestonesAPI, tasksAPI } from '../../../../services/api';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress_percentage: number;
  assigned_users: { id: string; name: string }[];
  estimated_cost: number;
  actual_cost: number;
}

interface Milestone {
  id: string;
  name: string;
  description?: string;
  status: string;
  due_date: string;
  start_date?: string;
  completion_percentage: number;
  estimated_cost: number;
  actual_cost: number;
  task_count: number;
  completed_task_count: number;
  color?: string;
}

export default function MilestonesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      const [milestonesRes, tasksRes] = await Promise.all([
        milestonesAPI.getAll(id as string),
        tasksAPI.getAll(id as string),
      ]);
      setMilestones(milestonesRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  const getTasksForMilestone = (milestoneId: string) => {
    return tasks.filter(t => t.milestone_id === milestoneId);
  };

  const handleDelete = async (milestoneId: string) => {
    Alert.alert(
      'Delete Milestone',
      'Are you sure you want to delete this milestone? All tasks will be unassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await milestonesAPI.delete(milestoneId);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete milestone');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'delayed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Milestones</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(`/projects/${id}/milestones/create` as any)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {milestones.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No milestones yet</Text>
            <Text style={styles.emptySubtext}>Add milestones to track project progress</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push(`/projects/${id}/milestones/create` as any)}
            >
              <Text style={styles.emptyButtonText}>Create Milestone</Text>
            </TouchableOpacity>
          </View>
        ) : (
          milestones.map((milestone) => {
            const milestoneTasks = getTasksForMilestone(milestone.id);
            const isExpanded = expandedMilestones.has(milestone.id);
            
            return (
              <View key={milestone.id} style={styles.milestoneCard}>
                {/* Milestone Header - Clickable to expand */}
                <TouchableOpacity 
                  style={styles.milestoneHeader}
                  onPress={() => toggleMilestone(milestone.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.milestoneHeaderLeft}>
                    <View style={[styles.milestoneColorBar, { backgroundColor: milestone.color || '#8B5CF6' }]} />
                    <View style={styles.milestoneHeaderInfo}>
                      <View style={styles.milestoneTop}>
                        <Text style={styles.milestoneName}>{milestone.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(milestone.status) }]}>
                          <Text style={styles.statusText}>{getStatusLabel(milestone.status)}</Text>
                        </View>
                      </View>
                      {milestone.description && (
                        <Text style={styles.milestoneDescription} numberOfLines={2}>
                          {milestone.description}
                        </Text>
                      )}
                      <View style={styles.milestoneStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="checkbox-outline" size={14} color="#6B7280" />
                          <Text style={styles.statText}>
                            {milestone.completed_task_count || 0}/{milestone.task_count || milestoneTasks.length} tasks
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                          <Text style={styles.statText}>
                            {new Date(milestone.due_date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={24} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${milestone.completion_percentage || 0}%`,
                          backgroundColor: milestone.color || '#8B5CF6',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{milestone.completion_percentage || 0}%</Text>
                </View>

                {/* Cost Summary */}
                {(milestone.estimated_cost > 0 || milestone.actual_cost > 0) && (
                  <View style={styles.costSummary}>
                    <View style={styles.costItem}>
                      <Text style={styles.costLabel}>Estimated</Text>
                      <Text style={styles.costValue}>{formatCurrency(milestone.estimated_cost)}</Text>
                    </View>
                    <View style={styles.costItem}>
                      <Text style={styles.costLabel}>Actual</Text>
                      <Text style={styles.costValue}>{formatCurrency(milestone.actual_cost)}</Text>
                    </View>
                  </View>
                )}

                {/* Expanded Tasks Section */}
                {isExpanded && (
                  <View style={styles.tasksSection}>
                    <View style={styles.tasksSectionHeader}>
                      <Text style={styles.tasksSectionTitle}>Tasks</Text>
                      <TouchableOpacity 
                        style={styles.addTaskButton}
                        onPress={() => router.push(`/tasks/create?projectId=${id}&milestone_id=${milestone.id}` as any)}
                      >
                        <Ionicons name="add-circle" size={20} color="#8B5CF6" />
                        <Text style={styles.addTaskText}>Add Task</Text>
                      </TouchableOpacity>
                    </View>

                    {milestoneTasks.length === 0 ? (
                      <View style={styles.noTasksMessage}>
                        <Ionicons name="clipboard-outline" size={32} color="#CBD5E0" />
                        <Text style={styles.noTasksText}>No tasks in this milestone</Text>
                        <TouchableOpacity 
                          style={styles.createTaskButton}
                          onPress={() => router.push(`/tasks/create?projectId=${id}&milestone_id=${milestone.id}` as any)}
                        >
                          <Text style={styles.createTaskButtonText}>Create First Task</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      milestoneTasks.map((task, index) => (
                        <TouchableOpacity 
                          key={task.id} 
                          style={[
                            styles.taskCard,
                            index === milestoneTasks.length - 1 && styles.taskCardLast
                          ]}
                          onPress={() => router.push(`/tasks/${task.id}` as any)}
                        >
                          <View style={styles.taskLeft}>
                            <View style={[styles.taskStatusDot, { backgroundColor: getStatusColor(task.status) }]} />
                            <View style={styles.taskInfo}>
                              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                              <View style={styles.taskMeta}>
                                {task.assigned_users?.length > 0 && (
                                  <View style={styles.taskAssignees}>
                                    <Ionicons name="person" size={12} color="#6B7280" />
                                    <Text style={styles.taskAssigneesText}>
                                      {task.assigned_users.map(u => u.name.split(' ')[0]).join(', ')}
                                    </Text>
                                  </View>
                                )}
                                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                                  <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                                    {task.priority}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                          <View style={styles.taskRight}>
                            <View style={styles.taskProgressContainer}>
                              <View style={styles.taskProgressBar}>
                                <View 
                                  style={[
                                    styles.taskProgressFill, 
                                    { 
                                      width: `${task.progress_percentage || 0}%`,
                                      backgroundColor: getStatusColor(task.status) 
                                    }
                                  ]} 
                                />
                              </View>
                              <Text style={styles.taskProgressText}>{task.progress_percentage || 0}%</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}

                {/* Milestone Actions */}
                <View style={styles.milestoneActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push(`/projects/${id}/milestones/edit/${milestone.id}` as any)}
                  >
                    <Ionicons name="pencil" size={16} color="#8B5CF6" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(milestone.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        
        {/* Unassigned Tasks Section */}
        {tasks.filter(t => !t.milestone_id).length > 0 && (
          <View style={styles.unassignedSection}>
            <Text style={styles.unassignedTitle}>Unassigned Tasks</Text>
            <Text style={styles.unassignedSubtitle}>
              {tasks.filter(t => !t.milestone_id).length} tasks not linked to any milestone
            </Text>
            {tasks.filter(t => !t.milestone_id).map((task) => (
              <TouchableOpacity 
                key={task.id} 
                style={styles.unassignedTaskCard}
                onPress={() => router.push(`/tasks/${task.id}` as any)}
              >
                <View style={[styles.taskStatusDot, { backgroundColor: getStatusColor(task.status) }]} />
                <Text style={styles.unassignedTaskTitle} numberOfLines={1}>{task.title}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
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
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  milestoneHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  milestoneColorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  milestoneHeaderInfo: {
    flex: 1,
  },
  milestoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  milestoneDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  milestoneStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    width: 36,
    textAlign: 'right',
  },
  costSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 16,
  },
  costItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
  },
  costLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  tasksSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  tasksSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTaskText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  noTasksMessage: {
    alignItems: 'center',
    padding: 24,
  },
  noTasksText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  createTaskButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
  },
  createTaskButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskCardLast: {
    borderBottomWidth: 0,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskAssignees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskAssigneesText: {
    fontSize: 11,
    color: '#6B7280',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  taskRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskProgressContainer: {
    alignItems: 'flex-end',
  },
  taskProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  taskProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  taskProgressText: {
    fontSize: 10,
    color: '#6B7280',
  },
  milestoneActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  unassignedSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  unassignedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  unassignedSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 12,
  },
  unassignedTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  unassignedTaskTitle: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 12,
  },
});
