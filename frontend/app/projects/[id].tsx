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
  Image,
  Dimensions,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI, tasksAPI, statusUpdatesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TimelineCard from '../../components/TimelineCard';

const { width } = Dimensions.get('window');

interface StatusUpdate {
  id: string;
  title: string;
  frequency: string;
  photos: string[];
  overall_progress: number;
  created_at: string;
  created_by_name?: string;
}

export default function ProjectDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'project_manager';

  useEffect(() => {
    loadProject();
    loadTasks();
    loadStatusUpdates();
  }, [id]);

  const loadStatusUpdates = async () => {
    try {
      const response = await statusUpdatesAPI.getByProject(id as string, undefined, 5);
      setStatusUpdates(response.data || []);
    } catch (error) {
      console.log('Status updates not available');
    }
  };

  const loadProject = async () => {
    try {
      const response = await projectsAPI.getById(id as string);
      setProject(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load project details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await tasksAPI.getAll(id as string);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsAPI.delete(id as string);
              Alert.alert('Success', 'Project deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return Colors.primary;
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'on_hold': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return Colors.primary;
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push(`/projects/${id}/chat` as any)}
          >
            <Ionicons name="chatbubbles" size={20} color={Colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push(`/projects/timeline/${id}` as any)}
          >
            <Ionicons name="stats-chart" size={20} color={Colors.secondary} />
          </TouchableOpacity>
          {canEdit && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push(`/projects/edit/${id}` as any)}
            >
              <Ionicons name="create" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.projectName}>{project.name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(project.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                {getStatusLabel(project.status)}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{project.location}</Text>
            </View>
            {project.address && (
              <View style={styles.infoRow}>
                <Ionicons name="map" size={18} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{project.address}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{project.client_name}</Text>
          </View>
          {project.client_contact && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{project.client_contact}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Project Details</Text>
          {project.budget && (
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={18} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                Budget: ${project.budget.toLocaleString()}
              </Text>
            </View>
          )}
          {project.project_manager_name && (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase" size={18} color={Colors.textSecondary} />
              <Text style={styles.infoText}>PM: {project.project_manager_name}</Text>
            </View>
          )}
          {project.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>{project.description}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/contacts` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="people" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Contacts</Text>
              <Text style={styles.quickActionSubtext}>Manage hierarchy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/gantt-share` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="share-social" size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionLabel}>Share Gantt</Text>
              <Text style={styles.quickActionSubtext}>Generate links</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/status` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="megaphone" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionLabel}>Status Update</Text>
              <Text style={styles.quickActionSubtext}>Share progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/milestones` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="flag" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionLabel}>Milestones</Text>
              <Text style={styles.quickActionSubtext}>Track progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/project-chart` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="git-branch" size={24} color="#6366F1" />
              </View>
              <Text style={styles.quickActionLabel}>Project Chart</Text>
              <Text style={styles.quickActionSubtext}>Gantt & Kanban</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/documents` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="documents" size={24} color="#EF4444" />
              </View>
              <Text style={styles.quickActionLabel}>Documents</Text>
              <Text style={styles.quickActionSubtext}>Files & docs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {project.photos && project.photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosContainer}>
                {project.photos.map((photo: string, index: number) => (
                  <Image key={index} source={{ uri: photo }} style={styles.photo} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Saved Status Updates Card */}
        {statusUpdates.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Saved Updates ({statusUpdates.length})</Text>
              <TouchableOpacity onPress={() => router.push(`/projects/${id}/status` as any)}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {statusUpdates.map((update) => (
                <TouchableOpacity
                  key={update.id}
                  style={styles.savedUpdateCard}
                  onPress={() => router.push(`/projects/${id}/status` as any)}
                >
                  {update.photos && update.photos.length > 0 && (
                    <Image 
                      source={{ uri: update.photos[0] }} 
                      style={styles.savedUpdateImage}
                    />
                  )}
                  <View style={styles.savedUpdateContent}>
                    <View style={[styles.savedUpdateBadge, {
                      backgroundColor: update.frequency === 'daily' ? '#DBEAFE' :
                        update.frequency === 'weekly' ? '#D1FAE5' : '#FEF3C7'
                    }]}>
                      <Text style={[styles.savedUpdateBadgeText, {
                        color: update.frequency === 'daily' ? '#1D4ED8' :
                          update.frequency === 'weekly' ? '#047857' : '#B45309'
                      }]}>
                        {update.frequency.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.savedUpdateTitle} numberOfLines={2}>{update.title}</Text>
                    <View style={styles.savedUpdateProgress}>
                      <View style={styles.savedUpdateProgressBar}>
                        <View style={[styles.savedUpdateProgressFill, { width: `${update.overall_progress}%` }]} />
                      </View>
                      <Text style={styles.savedUpdateProgressText}>{update.overall_progress}%</Text>
                    </View>
                    <Text style={styles.savedUpdateDate}>
                      {new Date(update.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Project Timeline Card */}
        {tasks.length > 0 && (
          <TimelineCard
            projectId={id as string}
            projectName={project.name}
            tasks={tasks}
            onRefresh={() => {
              loadProject();
              loadTasks();
            }}
          />
        )}

        {/* Team Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Team Members ({project?.team_members?.length || 0})</Text>
            {canEdit && (
              <TouchableOpacity
                style={styles.addTaskButton}
                onPress={() => router.push(`/projects/${id}/team` as any)}
              >
                <Ionicons name="people" size={20} color={Colors.primary} />
                <Text style={[styles.addTaskText, { color: Colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Data Integrity Warning - Show if some team members couldn't be loaded */}
          {project?.team_member_ids?.length > 0 && 
           project?.team_members?.length < project?.team_member_ids?.length && (
            <View style={styles.dataWarningBanner}>
              <Ionicons name="warning" size={16} color="#B45309" />
              <Text style={styles.dataWarningText}>
                {project.team_member_ids.length - project.team_members.length} team member(s) could not be loaded (may have been removed)
              </Text>
            </View>
          )}

          {project?.team_members?.length === 0 ? (
            <Text style={styles.emptyText}>No team members assigned</Text>
          ) : (
            <View style={styles.teamList}>
              {project?.team_members?.map((member: any) => (
                <View key={member.user_id} style={styles.teamMemberCard}>
                  <View style={styles.teamMemberAvatar}>
                    <Ionicons name="person" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.teamMemberInfo}>
                    <Text style={styles.teamMemberName}>{member.full_name}</Text>
                    {member.role_name && (
                      <Text style={styles.teamMemberRole}>{member.role_name}</Text>
                    )}
                  </View>
                  {member.phone && (
                    <TouchableOpacity
                      style={styles.teamCallButton}
                      onPress={() => {
                        Alert.alert(
                          'Call Team Member',
                          `Call ${member.full_name}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Call',
                              onPress: () => {
                                const { Linking } = require('react-native');
                                Linking.openURL(`tel:${member.phone}`).catch(() => {
                                  Alert.alert('Error', 'Unable to make call');
                                });
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="call" size={16} color="#10B981" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tasks Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tasks ({tasks.length})</Text>
            {canEdit && (
              <TouchableOpacity
                style={styles.addTaskButton}
                onPress={() => router.push(`/tasks/create?projectId=${id}` as any)}
              >
                <Ionicons name="add" size={20} color={Colors.secondary} />
                <Text style={styles.addTaskText}>Add Task</Text>
              </TouchableOpacity>
            )}
          </View>

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
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <View
                      style={[
                        styles.taskStatusBadge,
                        { backgroundColor: getTaskStatusColor(task.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.taskStatusText,
                          { color: getTaskStatusColor(task.status) },
                        ]}
                      >
                        {getStatusLabel(task.status)}
                      </Text>
                    </View>
                  </View>
                  {task.assigned_users && task.assigned_users.length > 0 && (
                    <Text style={styles.taskAssignees}>
                      Assigned to: {task.assigned_users.map((u: any) => u.name).join(', ')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {canEdit && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Project</Text>
          </TouchableOpacity>
        )}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  descriptionContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTaskText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
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
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  taskStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taskAssignees: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  teamList: {
    gap: 12,
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    gap: 12,
  },
  teamMemberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  teamMemberRole: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  teamCallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Saved Updates styles
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  savedUpdateCard: {
    width: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  savedUpdateImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  savedUpdateContent: {
    padding: 10,
  },
  savedUpdateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  savedUpdateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  savedUpdateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  savedUpdateProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  savedUpdateProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  savedUpdateProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  savedUpdateProgressText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  savedUpdateDate: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});