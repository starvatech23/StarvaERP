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
import Colors from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI } from '../../services/api';
import moment from 'moment';

const { width } = Dimensions.get('window');

export default function DashboardTimelineScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      // Filter projects that have start and end dates
      const projectsWithDates = response.data.filter(
        (p: any) => p.start_date && p.end_date
      );
      setProjects(projectsWithDates);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load projects timeline');
    } finally {
      setLoading(false);
    }
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

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = moment(startDate);
    const end = moment(endDate);
    const now = moment();
    
    if (now.isBefore(start)) return 0;
    if (now.isAfter(end)) return 100;
    
    const total = end.diff(start, 'days');
    const elapsed = now.diff(start, 'days');
    
    return Math.round((elapsed / total) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = moment(endDate);
    const now = moment();
    const days = end.diff(now, 'days');
    
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    return `${days} days left`;
  };

  const getOverallStats = () => {
    const total = projects.length;
    const planning = projects.filter(p => p.status === 'planning').length;
    const active = projects.filter(p => p.status === 'in_progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const delayed = projects.filter(p => {
      const end = moment(p.end_date);
      return moment().isAfter(end) && p.status !== 'completed';
    }).length;
    
    return { total, planning, active, completed, delayed };
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

  const stats = getOverallStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Projects Timeline</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overall Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: 'Colors.primary }]}>{stats.planning}</Text>
              <Text style={styles.statLabel}>Planning</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </View>
          {stats.delayed > 0 && (
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={styles.alertText}>
                {stats.delayed} project{stats.delayed > 1 ? 's' : ''} delayed
              </Text>
            </View>
          )}
        </View>

        {/* Projects Timeline */}
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Projects with Dates</Text>
            <Text style={styles.emptyText}>
              Projects need start and end dates to appear on the timeline
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((project: any) => {
              const progress = calculateProgress(project.start_date, project.end_date);
              const daysRemaining = getDaysRemaining(project.end_date);
              const isDelayed = daysRemaining === 'Overdue' && project.status !== 'completed';
              
              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => router.push(`/projects/timeline/${project.id}` as any)}
                >
                  {/* Project Header */}
                  <View style={styles.projectHeader}>
                    <View style={styles.projectTitleRow}>
                      <Text style={styles.projectName} numberOfLines={1}>
                        {project.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => router.push(`/projects/timeline/${project.id}` as any)}
                      >
                        <Ionicons name="stats-chart" size={20} color={Colors.secondary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.projectMeta}>
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
                      {isDelayed && (
                        <View style={styles.delayedBadge}>
                          <Ionicons name="warning" size={12} color="#EF4444" />
                          <Text style={styles.delayedText}>Delayed</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Timeline Dates */}
                  <View style={styles.datesRow}>
                    <View style={styles.dateItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.dateText}>
                        {moment(project.start_date).format('MMM DD')}
                      </Text>
                    </View>
                    <View style={styles.dateSeparator} />
                    <View style={styles.dateItem}>
                      <Ionicons name="calendar" size={14} color={Colors.textSecondary} />
                      <Text style={styles.dateText}>
                        {moment(project.end_date).format('MMM DD, YYYY')}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <Text style={styles.progressValue}>{progress}%</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${progress}%`,
                            backgroundColor: getStatusColor(project.status),
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.daysRemaining, isDelayed && { color: '#EF4444' }]}>
                      {daysRemaining}
                    </Text>
                  </View>

                  {/* Project Details */}
                  <View style={styles.projectDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="location" size={14} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>{project.location}</Text>
                    </View>
                    {project.budget && (
                      <View style={styles.detailItem}>
                        <Ionicons name="cash" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>₹{project.budget.toLocaleString()}</Text>
                      </View>
                    )}
                  </View>
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
  statsCard: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  timelineContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  projectCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectHeader: {
    marginBottom: 12,
  },
  projectTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  delayedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  delayedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateSeparator: {
    width: 20,
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  daysRemaining: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  projectDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
