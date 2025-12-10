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
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { projectsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canCreateProject = user?.role === 'admin' || user?.role === 'project_manager';

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      console.log('Projects loaded:', response.data);
      console.log('First project:', JSON.stringify(response.data[0], null, 2));
      setProjects(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return '#3B82F6';
      case 'in_progress':
        return '#F59E0B';
      case 'completed':
        return '#10B981';
      case 'on_hold':
        return '#6B7280';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        {canCreateProject && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/projects/create' as any)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color={Colors.secondaryLight} />
            <Text style={styles.emptyTitle}>No Projects Yet</Text>
            <Text style={styles.emptyText}>
              {canCreateProject
                ? 'Create your first project to start managing construction sites'
                : 'No projects have been created yet'}
            </Text>
            {canCreateProject && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/projects/create' as any)}
              >
                <Text style={styles.createButtonText}>Create Project</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.projectsList}>
            {projects.map((project: any) => {
              const completedTasks = project.task_count?.completed || 0;
              const totalTasks = project.task_count?.total || 0;
              const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              
              // Debug logging
              console.log(`Project ${project.name}:`, {
                has_manager_id: !!project.project_manager_id,
                manager_name: project.project_manager_name,
                manager_phone: project.manager_phone,
                client_portal_link: project.client_portal_link,
                has_client_portal_link: !!project.client_portal_link,
                status: project.status
              });
              
              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => router.push(`/projects/${project.id}` as any)}
                >
                  <View style={styles.projectHeader}>
                    <View style={styles.projectTitleContainer}>
                      <Ionicons name="business" size={20} color={Colors.primary} />
                      <Text style={styles.projectName} numberOfLines={1}>
                        {project.name}
                      </Text>
                    </View>
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

                  <View style={styles.projectDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={14} color="#718096" />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {project.location}
                      </Text>
                    </View>
                    
                    {/* Project Manager/Engineer with Call Button */}
                    {project.project_manager_name && (
                      <View style={styles.managerRow}>
                        <View style={styles.managerInfo}>
                          <Ionicons name="person" size={14} color="#1A202C" />
                          <Text style={styles.managerText}>{project.project_manager_name}</Text>
                        </View>
                        {project.manager_phone && (
                          <TouchableOpacity
                            style={styles.callButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              const phoneUrl = `tel:${project.manager_phone}`;
                              Alert.alert(
                                'Call Engineer',
                                `Call ${project.project_manager_name}?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { 
                                    text: 'Call', 
                                    onPress: () => {
                                      Linking.openURL(phoneUrl).catch(err => {
                                        Alert.alert('Error', 'Unable to make call');
                                      });
                                    }
                                  },
                                ]
                              );
                            }}
                          >
                            <Ionicons name="call" size={16} color="#10B981" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    
                    {/* Budget - Hidden for Engineers */}
                    {project.budget && user?.role !== 'engineer' && (
                      <View style={styles.detailRow}>
                        <Ionicons name="cash" size={14} color="#718096" />
                        <Text style={styles.detailText}>
                          ₹{project.budget.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${progressPercent}%`,
                            backgroundColor: progressPercent === 100 ? Colors.success : Colors.primary
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressTasks}>
                      {completedTasks} of {totalTasks} tasks completed
                    </Text>
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButtonSmall}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${project.id}/estimate/create` as any);
                      }}
                    >
                      <Ionicons name="calculator" size={16} color={Colors.primary} />
                      <Text style={styles.actionButtonText}>Estimate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButtonSmall}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${project.id}` as any);
                      }}
                    >
                      <Ionicons name="eye" size={16} color={Colors.primary} />
                      <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Client Portal Link - Only show for confirmed projects */}
                  {project.client_portal_link && typeof project.client_portal_link === 'string' && project.client_portal_link.trim() && (
                    <View style={styles.clientLinkSection}>
                      <View style={styles.clientLinkHeader}>
                        <Ionicons name="link" size={16} color={Colors.secondary} />
                        <Text style={styles.clientLinkLabel}>Client Portal Link</Text>
                      </View>
                      <View style={styles.clientLinkRow}>
                        <Text style={styles.clientLinkText} numberOfLines={1}>
                          {String(project.client_portal_link)}
                        </Text>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={async (e) => {
                            e.stopPropagation();
                            await Clipboard.setStringAsync(String(project.client_portal_link));
                            Alert.alert(
                              'Link Copied',
                              'Client portal link has been copied to clipboard',
                              [{ text: 'OK' }]
                            );
                          }}
                        >
                          <Ionicons name="copy-outline" size={16} color={Colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectsList: {
    gap: 16,
  },
  projectCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  projectDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  managerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  managerText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTasks: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  clientLinkSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clientLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  clientLinkLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
  },
  clientLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clientLinkText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});