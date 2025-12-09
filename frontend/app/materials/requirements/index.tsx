import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { materialRequirementsAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function MaterialRequirementsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      loadRequirements();
    }, [selectedProject, selectedPriority])
  );

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadRequirements = async () => {
    try {
      const params: any = {};
      if (selectedProject) params.project_id = selectedProject;
      if (selectedPriority) params.priority = selectedPriority;
      
      const response = await materialRequirementsAPI.getAll(params);
      setRequirements(response.data || []);
    } catch (error) {
      console.error('Error loading requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      urgent: '#DC2626',
    };
    return colors[priority] || '#6B7280';
  };

  const getFulfillmentColor = (status: string) => {
    const colors: any = {
      pending: '#F59E0B',
      partial: Colors.primary,
      fulfilled: '#10B981',
    };
    return colors[status] || '#6B7280';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.primary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Requirements</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/materials/requirements/create' as any)}
        >
          <Ionicons name="add" size={24} color="Colors.surface" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Project:</Text>
          <View style={{ flex: 1 }}>
            <ModalSelector
              options={[
                { label: 'All Projects', value: '' },
                ...projects.map((p) => ({ label: p.name, value: p.id })),
              ]}
              selectedValue={selectedProject}
              onValueChange={setSelectedProject}
              placeholder="All Projects"
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Priority:</Text>
          <View style={{ flex: 1 }}>
            <ModalSelector
              options={[
                { label: 'All Priorities', value: '' },
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Urgent', value: 'urgent' },
              ]}
              selectedValue={selectedPriority}
              onValueChange={setSelectedPriority}
              placeholder="All Priorities"
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {requirements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No requirements yet</Text>
            <Text style={styles.emptySubtext}>Plan future material needs for projects</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/materials/requirements/create' as any)}
            >
              <Text style={styles.emptyButtonText}>Add Requirement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          requirements.map((req) => (
            <View key={req.id} style={styles.requirementCard}>
              <View style={styles.requirementHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.materialName}>{req.material_name || 'Unknown Material'}</Text>
                  <Text style={styles.projectName}>{req.project_name || 'Unknown Project'}</Text>
                </View>
                <View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(req.priority) }]}>
                    <Text style={styles.badgeText}>{req.priority?.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getFulfillmentColor(req.fulfillment_status) }]}>
                    <Text style={styles.badgeText}>{req.fulfillment_status?.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.requirementDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Required:</Text>
                  <Text style={styles.detailValue}>{req.required_quantity} {req.unit}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fulfilled:</Text>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>
                    {req.fulfilled_quantity || 0} {req.unit}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pending:</Text>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                    {(req.required_quantity || 0) - (req.fulfilled_quantity || 0)} {req.unit}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Required by:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(req.required_by_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${Math.min((req.fulfilled_quantity || 0) / (req.required_quantity || 1) * 100, 100)}%`,
                        backgroundColor: getFulfillmentColor(req.fulfillment_status)
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round((req.fulfilled_quantity || 0) / (req.required_quantity || 1) * 100)}%
                </Text>
              </View>

              {req.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{req.notes}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
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
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    width: 80,
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
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'Colors.textSecondary,
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  requirementCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'Colors.border,
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  projectName: {
    fontSize: 13,
    color: 'Colors.textSecondary,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'Colors.surface,
    textAlign: 'center',
  },
  requirementDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: 'Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    width: 40,
    textAlign: 'right',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
  },
  notesText: {
    fontSize: 12,
    color: 'Colors.textSecondary,
    fontStyle: 'italic',
  },
});