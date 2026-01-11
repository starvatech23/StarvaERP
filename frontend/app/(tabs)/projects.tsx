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

type SortOption = 'name' | 'date' | 'region' | 'city' | 'status';

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const canCreateProject = user?.role === 'admin' || user?.role === 'project_manager';

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
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

  // Sort projects based on selected option
  const sortedProjects = [...projects].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'date':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'region':
        return (a.region || '').localeCompare(b.region || '');
      case 'city':
        return (a.location || '').localeCompare(b.location || '');
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      default:
        return 0;
    }
  });

  const sortOptions: { key: SortOption; label: string; icon: string }[] = [
    { key: 'name', label: 'Alphabetical (A-Z)', icon: 'text' },
    { key: 'date', label: 'Date Created', icon: 'calendar' },
    { key: 'region', label: 'Region', icon: 'globe' },
    { key: 'city', label: 'City/Location', icon: 'location' },
    { key: 'status', label: 'Status', icon: 'flag' },
  ];

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

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
      default:
        return '#10B981';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return 'alert-circle';
      case 'high':
        return 'warning';
      case 'medium':
        return 'alert';
      case 'low':
      default:
        return 'checkmark-circle';
    }
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
        <View style={styles.headerActions}>
          {/* Sort Button */}
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Ionicons name="swap-vertical" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          {canCreateProject && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateMenu(!showCreateMenu)}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Create Menu Dropdown */}
      {showCreateMenu && (
        <View style={styles.createMenu}>
          <TouchableOpacity
            style={styles.createMenuItem}
            onPress={() => {
              setShowCreateMenu(false);
              router.push('/projects/create' as any);
            }}
          >
            <Ionicons name="create-outline" size={20} color={Colors.textPrimary} />
            <View style={styles.createMenuText}>
              <Text style={styles.createMenuTitle}>Blank Project</Text>
              <Text style={styles.createMenuSubtitle}>Start from scratch</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.createMenuDivider} />
          <TouchableOpacity
            style={styles.createMenuItem}
            onPress={() => {
              setShowCreateMenu(false);
              router.push('/projects/create-with-templates' as any);
            }}
          >
            <Ionicons name="layers-outline" size={20} color={Colors.secondary} />
            <View style={styles.createMenuText}>
              <Text style={[styles.createMenuTitle, { color: Colors.secondary }]}>With Templates</Text>
              <Text style={styles.createMenuSubtitle}>Auto-generate milestones & tasks</Text>
            </View>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Menu Dropdown */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          <Text style={styles.sortMenuTitle}>Sort by</Text>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
              onPress={() => {
                setSortBy(option.key);
                setShowSortMenu(false);
              }}
            >
              <Ionicons 
                name={option.icon as any} 
                size={18} 
                color={sortBy === option.key ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.sortOptionText, sortBy === option.key && styles.sortOptionTextActive]}>
                {option.label}
              </Text>
              {sortBy === option.key && (
                <Ionicons name="checkmark" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

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
            {sortedProjects.map((project: any) => {
              const completedTasks = project.task_count?.completed || 0;
              const totalTasks = project.task_count?.total || 0;
              const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              
              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => router.push(`/projects/${project.id}` as any)}
                >
                  <View style={styles.projectHeader}>
                    <View style={styles.projectTitleContainer}>
                      <Ionicons name="business" size={20} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.projectName} numberOfLines={1}>
                          {project.name}
                        </Text>
                        {project.project_code && (
                          <Text style={styles.projectCode}>{project.project_code}</Text>
                        )}
                      </View>
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

                  {/* Weekly Budget & Dependency Risk - Hidden for Engineers */}
                  {user?.role !== 'engineer' && (
                    <View style={styles.weeklyBudgetSection}>
                      <View style={styles.weeklyBudgetRow}>
                        <View style={styles.weeklyBudgetItem}>
                          <View style={styles.weeklyBudgetHeader}>
                            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                            <Text style={styles.weeklyBudgetLabel}>This Week</Text>
                          </View>
                          <Text style={styles.weeklyBudgetValue}>
                            ₹{(project.weekly_budget_estimate || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                        </View>
                        <View style={[
                          styles.riskBadge,
                          { backgroundColor: getRiskColor(project.dependency_risk_level) + '15' }
                        ]}>
                          <Ionicons 
                            name={getRiskIcon(project.dependency_risk_level)} 
                            size={14} 
                            color={getRiskColor(project.dependency_risk_level)} 
                          />
                          <Text style={[
                            styles.riskText,
                            { color: getRiskColor(project.dependency_risk_level) }
                          ]}>
                            {project.dependency_risk_count || 0} at risk
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

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
                        // Navigate to estimates list (will show "create new" button if none exist)
                        router.push(`/projects/${project.id}/estimate` as any);
                      }}
                    >
                      <Ionicons name="calculator" size={16} color={Colors.primary} />
                      <Text style={styles.actionButtonText}>Estimates</Text>
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
    paddingBottom: 100, // Extra padding for Android navigation
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
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
  },
  projectCode: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
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
  // Sort Menu Styles
  sortMenu: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sortMenuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  sortOptionActive: {
    backgroundColor: Colors.primaryPale,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sortOptionTextActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
  createMenu: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  createMenuText: {
    flex: 1,
  },
  createMenuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  createMenuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  createMenuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  recommendedBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary,
  },
});