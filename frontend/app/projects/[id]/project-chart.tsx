import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { milestonesAPI, tasksAPI, projectsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'tree' | 'gantt' | 'kanban';

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
  budget_variance: number;
  task_count: number;
  completed_task_count: number;
  color?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  milestone_id?: string;
  milestone_name?: string;
  assigned_users: { id: string; name: string }[];
  planned_start_date?: string;
  planned_end_date?: string;
  progress_percentage: number;
  estimated_cost: number;
  actual_cost: number;
}

export default function ProjectChartScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  const canEdit = user?.role === 'admin' || user?.role === 'project_manager' || user?.role === 'engineer';

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      const [projectRes, milestonesRes, tasksRes] = await Promise.all([
        projectsAPI.getById(id as string),
        milestonesAPI.getAll(id as string),
        tasksAPI.getAll(id as string),
      ]);
      setProject(projectRes.data);
      setMilestones(milestonesRes.data || []);
      setTasks(tasksRes.data || []);
      
      // Expand first milestone by default
      if (milestonesRes.data?.length > 0) {
        setExpandedMilestones(new Set([milestonesRes.data[0].id]));
      }
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

  const getTasksForMilestone = (milestoneId: string | null) => {
    if (milestoneId === null) {
      return tasks.filter(t => !t.milestone_id);
    }
    return tasks.filter(t => t.milestone_id === milestoneId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'delayed': return '#EF4444';
      case 'pending': return '#6B7280';
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

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  // ============= TREE VIEW =============
  const renderTreeView = () => (
    <ScrollView style={styles.viewContent}>
      {/* Unassigned Tasks (no milestone) */}
      {getTasksForMilestone(null).length > 0 && (
        <View style={styles.treeSection}>
          <TouchableOpacity
            style={styles.treeMilestoneHeader}
            onPress={() => toggleMilestone('unassigned')}
          >
            <View style={styles.treeMilestoneLeft}>
              <Ionicons 
                name={expandedMilestones.has('unassigned') ? 'chevron-down' : 'chevron-forward'} 
                size={20} 
                color={Colors.textSecondary} 
              />
              <View style={[styles.milestoneColorBar, { backgroundColor: '#6B7280' }]} />
              <View>
                <Text style={styles.treeMilestoneName}>Unassigned Tasks</Text>
                <Text style={styles.treeMilestoneStats}>
                  {getTasksForMilestone(null).length} tasks
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {expandedMilestones.has('unassigned') && (
            <View style={styles.treeTaskList}>
              {getTasksForMilestone(null).map(task => renderTreeTask(task))}
            </View>
          )}
        </View>
      )}

      {/* Milestones with tasks */}
      {milestones.map(milestone => (
        <View key={milestone.id} style={styles.treeSection}>
          <TouchableOpacity
            style={styles.treeMilestoneHeader}
            onPress={() => toggleMilestone(milestone.id)}
          >
            <View style={styles.treeMilestoneLeft}>
              <Ionicons 
                name={expandedMilestones.has(milestone.id) ? 'chevron-down' : 'chevron-forward'} 
                size={20} 
                color={Colors.textSecondary} 
              />
              <View style={[styles.milestoneColorBar, { backgroundColor: milestone.color || '#3B82F6' }]} />
              <View style={styles.treeMilestoneInfo}>
                <Text style={styles.treeMilestoneName}>{milestone.name}</Text>
                <Text style={styles.treeMilestoneStats}>
                  {milestone.completed_task_count}/{milestone.task_count} tasks • {milestone.completion_percentage}%
                </Text>
              </View>
            </View>
            <View style={styles.treeMilestoneRight}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(milestone.status) }]} />
              <Text style={styles.milestoneCost}>{formatCurrency(milestone.actual_cost)}</Text>
            </View>
          </TouchableOpacity>
          
          {/* Progress bar */}
          <View style={styles.milestoneProgressContainer}>
            <View style={styles.milestoneProgressBar}>
              <View 
                style={[
                  styles.milestoneProgressFill, 
                  { width: `${milestone.completion_percentage}%`, backgroundColor: milestone.color || '#3B82F6' }
                ]} 
              />
            </View>
          </View>
          
          {expandedMilestones.has(milestone.id) && (
            <View style={styles.treeTaskList}>
              {getTasksForMilestone(milestone.id).length === 0 ? (
                <View style={styles.emptyTasksMessage}>
                  <Text style={styles.emptyTasksText}>No tasks in this milestone</Text>
                  <TouchableOpacity 
                    style={styles.addTaskMiniButton}
                    onPress={() => router.push(`/tasks/create?projectId=${id}&milestone_id=${milestone.id}` as any)}
                  >
                    <Ionicons name="add" size={16} color={Colors.primary} />
                    <Text style={styles.addTaskMiniText}>Add Task</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {getTasksForMilestone(milestone.id).map(task => renderTreeTask(task))}
                  <TouchableOpacity 
                    style={styles.addTaskRow}
                    onPress={() => router.push(`/tasks/create?projectId=${id}&milestone_id=${milestone.id}` as any)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.addTaskRowText}>Add another task</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      ))}

      {milestones.length === 0 && tasks.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="git-branch-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyText}>No milestones or tasks yet</Text>
          <Text style={styles.emptySubtext}>Create milestones to organize your project</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push(`/projects/${id}/milestones/create` as any)}
          >
            <Text style={styles.emptyButtonText}>Create Milestone</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderTreeTask = (task: Task) => (
    <TouchableOpacity 
      key={task.id} 
      style={styles.treeTaskCard}
      onPress={() => router.push(`/projects/${id}/tasks/${task.id}` as any)}
    >
      <View style={styles.treeTaskLeft}>
        <View style={[styles.taskStatusIndicator, { backgroundColor: getStatusColor(task.status) }]} />
        <View style={styles.treeTaskInfo}>
          <Text style={styles.treeTaskTitle} numberOfLines={1}>{task.title}</Text>
          <View style={styles.treeTaskMeta}>
            {task.assigned_users?.length > 0 && (
              <View style={styles.taskAssignees}>
                <Ionicons name="person" size={12} color={Colors.textSecondary} />
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
      <View style={styles.treeTaskRight}>
        <Text style={styles.taskProgress}>{task.progress_percentage}%</Text>
        {(task.actual_cost > 0 || task.estimated_cost > 0) && (
          <Text style={styles.taskCost}>{formatCurrency(task.actual_cost || task.estimated_cost)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // ============= KANBAN VIEW =============
  const renderKanbanView = () => {
    const columns = [
      { status: 'pending', label: 'To Do', color: '#6B7280' },
      { status: 'in_progress', label: 'In Progress', color: '#F59E0B' },
      { status: 'completed', label: 'Done', color: '#10B981' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kanbanContainer}>
        {columns.map(column => {
          const columnTasks = tasks.filter(t => t.status === column.status);
          return (
            <View key={column.status} style={styles.kanbanColumn}>
              <View style={[styles.kanbanColumnHeader, { borderTopColor: column.color }]}>
                <Text style={styles.kanbanColumnTitle}>{column.label}</Text>
                <View style={[styles.kanbanCountBadge, { backgroundColor: column.color }]}>
                  <Text style={styles.kanbanCountText}>{columnTasks.length}</Text>
                </View>
              </View>
              <ScrollView style={styles.kanbanColumnContent} showsVerticalScrollIndicator={false}>
                {columnTasks.map(task => (
                  <TouchableOpacity 
                    key={task.id} 
                    style={styles.kanbanCard}
                    onPress={() => router.push(`/projects/${id}/tasks/${task.id}` as any)}
                  >
                    {task.milestone_name && (
                      <View style={styles.kanbanMilestoneBadge}>
                        <Ionicons name="flag" size={10} color="#8B5CF6" />
                        <Text style={styles.kanbanMilestoneText}>{task.milestone_name}</Text>
                      </View>
                    )}
                    <Text style={styles.kanbanTaskTitle} numberOfLines={2}>{task.title}</Text>
                    <View style={styles.kanbanTaskFooter}>
                      {task.assigned_users?.length > 0 && (
                        <View style={styles.kanbanAssignees}>
                          {task.assigned_users.slice(0, 3).map((u, i) => (
                            <View key={u.id} style={[styles.kanbanAvatar, { marginLeft: i > 0 ? -8 : 0 }]}>
                              <Text style={styles.kanbanAvatarText}>{u.name.charAt(0)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <View style={[styles.kanbanPriorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                    </View>
                  </TouchableOpacity>
                ))}
                {columnTasks.length === 0 && (
                  <View style={styles.kanbanEmptyColumn}>
                    <Ionicons name="clipboard-outline" size={24} color="#CBD5E0" />
                    <Text style={styles.kanbanEmptyText}>No tasks</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // ============= GANTT VIEW (Simplified Timeline) =============
  const renderGanttView = () => {
    // Group tasks by milestone for gantt display
    const milestonesWithTasks = milestones.map(m => ({
      ...m,
      tasks: getTasksForMilestone(m.id)
    }));

    return (
      <ScrollView style={styles.ganttContainer}>
        <View style={styles.ganttHeader}>
          <Text style={styles.ganttHeaderText}>Timeline Overview</Text>
          <Text style={styles.ganttSubHeader}>Milestones and their tasks</Text>
        </View>

        {milestonesWithTasks.map((milestone, mIndex) => (
          <View key={milestone.id} style={styles.ganttMilestoneSection}>
            {/* Milestone Row */}
            <View style={styles.ganttMilestoneRow}>
              <View style={styles.ganttMilestoneInfo}>
                <View style={[styles.ganttMilestoneIcon, { backgroundColor: milestone.color || '#3B82F6' }]}>
                  <Ionicons name="flag" size={16} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.ganttMilestoneName}>{milestone.name}</Text>
                  <Text style={styles.ganttMilestoneDate}>
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.ganttMilestoneProgress}>
                <View style={styles.ganttProgressCircle}>
                  <Text style={styles.ganttProgressText}>{milestone.completion_percentage}%</Text>
                </View>
              </View>
            </View>

            {/* Timeline Bar */}
            <View style={styles.ganttTimeline}>
              <View style={styles.ganttTimelineTrack}>
                <View 
                  style={[
                    styles.ganttTimelineFill, 
                    { 
                      width: `${milestone.completion_percentage}%`,
                      backgroundColor: milestone.color || '#3B82F6' 
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Tasks under milestone */}
            {milestone.tasks.map((task, tIndex) => (
              <TouchableOpacity 
                key={task.id} 
                style={styles.ganttTaskRow}
                onPress={() => router.push(`/projects/${id}/tasks/${task.id}` as any)}
              >
                <View style={styles.ganttConnector}>
                  <View style={styles.ganttVerticalLine} />
                  <View style={[styles.ganttDot, { backgroundColor: getStatusColor(task.status) }]} />
                </View>
                <View style={styles.ganttTaskInfo}>
                  <Text style={styles.ganttTaskTitle} numberOfLines={1}>{task.title}</Text>
                  <View style={styles.ganttTaskMeta}>
                    <Text style={styles.ganttTaskStatus}>{task.status.replace('_', ' ')}</Text>
                    <Text style={styles.ganttTaskProgress}>{task.progress_percentage}%</Text>
                  </View>
                </View>
                <View style={styles.ganttTaskBar}>
                  <View 
                    style={[
                      styles.ganttTaskBarFill, 
                      { width: `${task.progress_percentage}%`, backgroundColor: getStatusColor(task.status) }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
            ))}

            {milestone.tasks.length === 0 && (
              <View style={styles.ganttNoTasks}>
                <Text style={styles.ganttNoTasksText}>No tasks assigned</Text>
              </View>
            )}
          </View>
        ))}

        {/* Cost Summary */}
        <View style={styles.ganttSummary}>
          <Text style={styles.ganttSummaryTitle}>Cost Summary</Text>
          <View style={styles.ganttSummaryRow}>
            <Text style={styles.ganttSummaryLabel}>Total Estimated</Text>
            <Text style={styles.ganttSummaryValue}>
              {formatCurrency(milestones.reduce((sum, m) => sum + (m.estimated_cost || 0), 0))}
            </Text>
          </View>
          <View style={styles.ganttSummaryRow}>
            <Text style={styles.ganttSummaryLabel}>Total Actual</Text>
            <Text style={styles.ganttSummaryValue}>
              {formatCurrency(milestones.reduce((sum, m) => sum + (m.actual_cost || 0), 0))}
            </Text>
          </View>
          <View style={[styles.ganttSummaryRow, styles.ganttSummaryTotal]}>
            <Text style={styles.ganttSummaryLabelBold}>Variance</Text>
            <Text style={[
              styles.ganttSummaryValueBold,
              { color: milestones.reduce((sum, m) => sum + (m.budget_variance || 0), 0) >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {formatCurrency(milestones.reduce((sum, m) => sum + (m.budget_variance || 0), 0))}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Project Chart</Text>
          <Text style={styles.headerSubtitle}>{project?.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push(`/projects/${id}/milestones/create` as any)}
        >
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewTabs}>
        <TouchableOpacity
          style={[styles.viewTab, viewMode === 'tree' && styles.viewTabActive]}
          onPress={() => setViewMode('tree')}
        >
          <Ionicons 
            name="git-branch-outline" 
            size={18} 
            color={viewMode === 'tree' ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[styles.viewTabText, viewMode === 'tree' && styles.viewTabTextActive]}>
            Tree
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, viewMode === 'gantt' && styles.viewTabActive]}
          onPress={() => setViewMode('gantt')}
        >
          <Ionicons 
            name="bar-chart-outline" 
            size={18} 
            color={viewMode === 'gantt' ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[styles.viewTabText, viewMode === 'gantt' && styles.viewTabTextActive]}>
            Gantt
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, viewMode === 'kanban' && styles.viewTabActive]}
          onPress={() => setViewMode('kanban')}
        >
          <Ionicons 
            name="albums-outline" 
            size={18} 
            color={viewMode === 'kanban' ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[styles.viewTabText, viewMode === 'kanban' && styles.viewTabTextActive]}>
            Kanban
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on view mode */}
      {viewMode === 'tree' && renderTreeView()}
      {viewMode === 'gantt' && renderGanttView()}
      {viewMode === 'kanban' && renderKanbanView()}
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
    paddingVertical: 12,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewTabActive: {
    borderBottomColor: Colors.primary,
  },
  viewTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  viewTabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  viewContent: {
    flex: 1,
    padding: 16,
  },
  
  // Tree View Styles
  treeSection: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  treeMilestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  treeMilestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  milestoneColorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginHorizontal: 12,
  },
  treeMilestoneInfo: {
    flex: 1,
  },
  treeMilestoneName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  treeMilestoneStats: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  treeMilestoneRight: {
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  milestoneCost: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  milestoneProgressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  milestoneProgressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  treeTaskList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  treeTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  treeTaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskStatusIndicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  treeTaskInfo: {
    flex: 1,
  },
  treeTaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  treeTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  taskAssignees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskAssigneesText: {
    fontSize: 11,
    color: Colors.textSecondary,
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
  treeTaskRight: {
    alignItems: 'flex-end',
  },
  taskProgress: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  taskCost: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyTasksMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  emptyTasksText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  addTaskMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primaryPale,
    borderRadius: 6,
  },
  addTaskMiniText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  addTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingLeft: 48,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addTaskRowText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },

  // Kanban Styles
  kanbanContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  kanbanColumn: {
    width: SCREEN_WIDTH * 0.75,
    marginHorizontal: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  kanbanColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 3,
  },
  kanbanColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  kanbanCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  kanbanCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  kanbanColumnContent: {
    padding: 8,
    maxHeight: 500,
  },
  kanbanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kanbanMilestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  kanbanMilestoneText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  kanbanTaskTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  kanbanTaskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kanbanAssignees: {
    flexDirection: 'row',
  },
  kanbanAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  kanbanAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  kanbanPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kanbanEmptyColumn: {
    alignItems: 'center',
    padding: 24,
  },
  kanbanEmptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },

  // Gantt Styles
  ganttContainer: {
    flex: 1,
    padding: 16,
  },
  ganttHeader: {
    marginBottom: 16,
  },
  ganttHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ganttSubHeader: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  ganttMilestoneSection: {
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ganttMilestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ganttMilestoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ganttMilestoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ganttMilestoneName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ganttMilestoneDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ganttMilestoneProgress: {
    alignItems: 'center',
  },
  ganttProgressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ganttProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  ganttTimeline: {
    marginBottom: 12,
  },
  ganttTimelineTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  ganttTimelineFill: {
    height: '100%',
    borderRadius: 3,
  },
  ganttTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 8,
  },
  ganttConnector: {
    width: 24,
    alignItems: 'center',
  },
  ganttVerticalLine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 2,
    backgroundColor: Colors.border,
  },
  ganttDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  ganttTaskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ganttTaskTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  ganttTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  ganttTaskStatus: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  ganttTaskProgress: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  ganttTaskBar: {
    width: 80,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 8,
  },
  ganttTaskBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  ganttNoTasks: {
    padding: 12,
    alignItems: 'center',
  },
  ganttNoTasksText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  ganttSummary: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ganttSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  ganttSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  ganttSummaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ganttSummaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  ganttSummaryTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  ganttSummaryLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ganttSummaryValueBold: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
