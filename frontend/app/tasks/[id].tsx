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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'project_manager' || user?.role === 'engineer';

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      const response = await tasksAPI.getById(id as string);
      setTask(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load task details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tasksAPI.delete(id as string);
              Alert.alert('Success', 'Task deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await tasksAPI.update(id as string, { status: newStatus });
      setTask({ ...task, status: newStatus });
      Alert.alert('Success', 'Task status updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

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
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'urgent': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(task.status) }]}>
                {getStatusLabel(task.status)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
              <Text style={[styles.badgeText, { color: getPriorityColor(task.priority) }]}>
                {task.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          {task.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          
          {task.due_date && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color="#718096" />
              <Text style={styles.infoText}>
                Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color="#718096" />
            <Text style={styles.infoText}>Created by: {task.created_by_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={18} color="#718096" />
            <Text style={styles.infoText}>
              Created: {format(new Date(task.created_at), 'MMM dd, yyyy')}
            </Text>
          </View>
        </View>

        {task.assigned_users && task.assigned_users.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned To</Text>
            {task.assigned_users.map((user: any) => (
              <View key={user.id} style={styles.userChip}>
                <Ionicons name="person-circle" size={24} color="#FF6B35" />
                <Text style={styles.userName}>{user.name}</Text>
              </View>
            ))}
          </View>
        )}

        {canEdit && task.status !== 'completed' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {task.status !== 'in_progress' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleStatusChange('in_progress')}
                >
                  <Ionicons name="play-circle" size={24} color="#3B82F6" />
                  <Text style={styles.actionText}>Start Task</Text>
                </TouchableOpacity>
              )}
              {task.status !== 'completed' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleStatusChange('completed')}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.actionText}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {canEdit && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Task</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
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
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionContainer: {
    padding: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFF5F2',
    borderRadius: 8,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
