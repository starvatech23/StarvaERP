import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';
import { tasksAPI } from '../services/api';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  assigned_to?: string;
  assigned_users?: any[];
  priority?: string;
}

interface TimelineCardProps {
  projectId: string;
  projectName: string;
  tasks: Task[];
  onRefresh: () => void;
  users?: any[];
}

export default function TimelineCard({
  projectId,
  projectName,
  tasks,
  onRefresh,
  users = [],
}: TimelineCardProps) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editPriority, setEditPriority] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditStatus(task.status);
    setEditDueDate(task.due_date ? moment(task.due_date).format('YYYY-MM-DD') : '');
    setEditAssignedTo(task.assigned_to || '');
    setEditPriority(task.priority || 'medium');
    setEditModalVisible(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    if (!editTitle.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    setLoading(true);
    try {
      await tasksAPI.update(selectedTask.id, {
        title: editTitle,
        status: editStatus,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
        assigned_to: editAssignedTo || null,
        priority: editPriority,
      });

      Alert.alert('Success', 'Task updated successfully');
      setEditModalVisible(false);
      onRefresh();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const upcomingTasks = sortedTasks.filter(t => 
    t.status !== 'completed' && t.status !== 'cancelled'
  ).slice(0, 5);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={20} color="#FF6B35" />
          <Text style={styles.headerTitle}>{projectName} Timeline</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.timeline}>
          {upcomingTasks.map((task, index) => {
            const isOverdue = task.due_date && moment(task.due_date).isBefore(moment(), 'day');
            const daysUntil = task.due_date ? moment(task.due_date).diff(moment(), 'days') : null;

            return (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => openEditModal(task)}
              >
                {/* Status Indicator */}
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(task.status) },
                  ]}
                />

                {/* Task Info */}
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle} numberOfLines={2}>
                    {task.title}
                  </Text>

                  {task.due_date && (
                    <View style={styles.taskMeta}>
                      <Ionicons 
                        name="calendar-outline" 
                        size={12} 
                        color={isOverdue ? '#EF4444' : '#718096'} 
                      />
                      <Text 
                        style={[
                          styles.taskDate,
                          isOverdue && styles.overdueText
                        ]}
                      >
                        {moment(task.due_date).format('MMM DD')}
                        {daysUntil !== null && (
                          isOverdue 
                            ? ` (${Math.abs(daysUntil)}d overdue)`
                            : ` (${daysUntil}d left)`
                        )}
                      </Text>
                    </View>
                  )}

                  {task.assigned_users && task.assigned_users.length > 0 && (
                    <View style={styles.taskMeta}>
                      <Ionicons name="person-outline" size={12} color="#718096" />
                      <Text style={styles.taskAssignee} numberOfLines={1}>
                        {task.assigned_users.map((u: any) => u.name).join(', ')}
                      </Text>
                    </View>
                  )}

                  {task.priority && (
                    <View 
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(task.priority) + '20' }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(task.priority) }
                        ]}
                      >
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Edit Icon */}
                <View style={styles.editIcon}>
                  <Ionicons name="create-outline" size={16} color="#FF6B35" />
                </View>
              </TouchableOpacity>
            );
          })}

          {tasks.length > 5 && (
            <View style={styles.moreCard}>
              <Text style={styles.moreText}>+{tasks.length - 5} more</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Task Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Task</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1A202C" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Task Title *</Text>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter task title"
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editStatus}
                    onValueChange={setEditStatus}
                    style={styles.picker}
                  >
                    <Picker.Item label="Pending" value="pending" />
                    <Picker.Item label="In Progress" value="in_progress" />
                    <Picker.Item label="Completed" value="completed" />
                    <Picker.Item label="Cancelled" value="cancelled" />
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editPriority}
                    onValueChange={setEditPriority}
                    style={styles.picker}
                  >
                    <Picker.Item label="Low" value="low" />
                    <Picker.Item label="Medium" value="medium" />
                    <Picker.Item label="High" value="high" />
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                  placeholder="2024-12-31"
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              {users.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Assign To</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editAssignedTo}
                      onValueChange={setEditAssignedTo}
                      style={styles.picker}
                    >
                      <Picker.Item label="Unassigned" value="" />
                      {users.map((user: any) => (
                        <Picker.Item
                          key={user.id}
                          label={user.full_name}
                          value={user.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleUpdateTask}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  timeline: {
    flexDirection: 'row',
    gap: 12,
  },
  taskCard: {
    width: 180,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  taskContent: {
    marginTop: 8,
    gap: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    lineHeight: 18,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDate: {
    fontSize: 11,
    color: '#718096',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  taskAssignee: {
    fontSize: 11,
    color: '#718096',
    flex: 1,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  editIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCard: {
    width: 120,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A202C',
  },
  pickerContainer: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#1A202C',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
