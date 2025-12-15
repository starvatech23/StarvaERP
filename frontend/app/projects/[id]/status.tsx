import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { statusUpdatesAPI, projectsAPI, tasksAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'updates' | 'gantt';
type GanttView = 'daily' | 'weekly' | 'monthly';
type FrequencyFilter = 'all' | 'daily' | 'weekly' | 'monthly';

interface Task {
  id: string;
  title: string;
  status: string;
  progress_percentage: number;
  milestone_name?: string;
}

interface StatusUpdate {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  photos: string[];
  overall_progress: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_pending: number;
  budget_spent?: number;
  budget_remaining?: number;
  issues?: string;
  next_steps?: string;
  weather?: string;
  selected_tasks?: string[];
  created_by_name?: string;
  created_at: string;
}

interface GanttItem {
  id: string;
  type: string;
  name: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  color?: string;
  parent_id?: string;
}

export default function ProjectStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('updates');
  const [ganttView, setGanttView] = useState<GanttView>('weekly');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [project, setProject] = useState<any>(null);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ganttData, setGanttData] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Create form state
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    description: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    photos: [] as string[],
    issues: '',
    next_steps: '',
    weather: '',
    is_public: false,
    selected_tasks: [] as string[],
  });
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, frequencyFilter])
  );

  const loadData = async () => {
    try {
      const [projectRes, updatesRes, tasksRes] = await Promise.all([
        projectsAPI.getById(id as string),
        statusUpdatesAPI.getByProject(
          id as string, 
          frequencyFilter === 'all' ? undefined : frequencyFilter
        ),
        tasksAPI.getAll(id as string),
      ]);
      setProject(projectRes.data);
      setUpdates(updatesRes.data || []);
      setTasks(tasksRes.data || []);
      
      // Load Gantt data
      const ganttRes = await statusUpdatesAPI.getGanttData(id as string, ganttView);
      setGanttData(ganttRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGanttData = async (view: GanttView) => {
    try {
      const ganttRes = await statusUpdatesAPI.getGanttData(id as string, view);
      setGanttData(ganttRes.data);
    } catch (error) {
      console.error('Error loading Gantt data:', error);
    }
  };

  const handleGanttViewChange = (view: GanttView) => {
    setGanttView(view);
    loadGanttData(view);
  };

  // Compress image to save space
  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Resize to max 1200px width
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return `data:image/jpeg;base64,${manipulated.base64}`;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      // Compress each image
      const compressedPhotos = await Promise.all(
        result.assets.map(async (asset) => await compressImage(asset.uri))
      );
      setNewUpdate(prev => ({
        ...prev,
        photos: [...prev.photos, ...compressedPhotos].slice(0, 10),
      }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      // Compress the photo
      const compressedPhoto = await compressImage(result.assets[0].uri);
      setNewUpdate(prev => ({
        ...prev,
        photos: [...prev.photos, compressedPhoto].slice(0, 10),
      }));
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setNewUpdate(prev => ({
      ...prev,
      selected_tasks: prev.selected_tasks.includes(taskId)
        ? prev.selected_tasks.filter(id => id !== taskId)
        : [...prev.selected_tasks, taskId],
    }));
  };

  const getSelectedTasksSummary = () => {
    const selected = tasks.filter(t => newUpdate.selected_tasks.includes(t.id));
    return selected.map(t => t.title).join(', ');
  };

  const removePhoto = (index: number) => {
    setNewUpdate(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleCreateUpdate = async () => {
    if (!newUpdate.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setCreating(true);
    try {
      await statusUpdatesAPI.create(id as string, {
        ...newUpdate,
        project_id: id,
      });
      
      Alert.alert('Success', 'Status update shared successfully');
      setShowCreateModal(false);
      setNewUpdate({
        title: '',
        description: '',
        frequency: 'daily',
        photos: [],
        issues: '',
        next_steps: '',
        weather: '',
        is_public: false,
        selected_tasks: [],
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create update');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    Alert.alert(
      'Delete Update',
      'Are you sure you want to delete this status update?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await statusUpdatesAPI.delete(updateId);
              setUpdates(updates.filter(u => u.id !== updateId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete update');
            }
          },
        },
      ]
    );
  };

  const openPhotoViewer = (photos: string[], index: number = 0) => {
    setSelectedPhotos(photos);
    setCurrentPhotoIndex(index);
    setShowPhotoViewer(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'delayed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderUpdatesView = () => (
    <ScrollView style={styles.content}>
      {/* Frequency Filter */}
      <View style={styles.filterRow}>
        {(['all', 'daily', 'weekly', 'monthly'] as FrequencyFilter[]).map(freq => (
          <TouchableOpacity
            key={freq}
            style={[styles.filterChip, frequencyFilter === freq && styles.filterChipActive]}
            onPress={() => setFrequencyFilter(freq)}
          >
            <Text style={[styles.filterChipText, frequencyFilter === freq && styles.filterChipTextActive]}>
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {updates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyText}>No status updates yet</Text>
          <Text style={styles.emptySubtext}>Share your project progress with photos</Text>
        </View>
      ) : (
        updates.map(update => (
          <View key={update.id} style={styles.updateCard}>
            <View style={styles.updateHeader}>
              <View style={styles.updateHeaderLeft}>
                <View style={[styles.frequencyBadge, { backgroundColor: 
                  update.frequency === 'daily' ? '#DBEAFE' : 
                  update.frequency === 'weekly' ? '#D1FAE5' : '#FEF3C7' 
                }]}>
                  <Text style={[styles.frequencyText, { color: 
                    update.frequency === 'daily' ? '#1D4ED8' : 
                    update.frequency === 'weekly' ? '#047857' : '#B45309' 
                  }]}>
                    {update.frequency.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.updateDate}>{formatDate(update.created_at)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteUpdate(update.id)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <Text style={styles.updateTitle}>{update.title}</Text>
            {update.description && (
              <Text style={styles.updateDescription}>{update.description}</Text>
            )}

            {/* Progress Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{update.overall_progress}%</Text>
                <Text style={styles.statLabel}>Progress</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{update.tasks_completed}</Text>
                <Text style={styles.statLabel}>Done</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{update.tasks_in_progress}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#6B7280' }]}>{update.tasks_pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>

            {/* Photos */}
            {update.photos && update.photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
                {update.photos.map((photo, index) => (
                  <TouchableOpacity 
                    key={index} 
                    onPress={() => openPhotoViewer(update.photos, index)}
                  >
                    <Image source={{ uri: photo }} style={styles.photoThumb} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Additional Info */}
            {(update.issues || update.next_steps || update.weather) && (
              <View style={styles.additionalInfo}>
                {update.weather && (
                  <View style={styles.infoItem}>
                    <Ionicons name="cloud" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>{update.weather}</Text>
                  </View>
                )}
                {update.issues && (
                  <View style={styles.infoItem}>
                    <Ionicons name="warning" size={14} color="#EF4444" />
                    <Text style={styles.infoText}>{update.issues}</Text>
                  </View>
                )}
                {update.next_steps && (
                  <View style={styles.infoItem}>
                    <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
                    <Text style={styles.infoText}>{update.next_steps}</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.createdBy}>By {update.created_by_name}</Text>
          </View>
        ))
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderGanttView = () => (
    <ScrollView style={styles.content}>
      {/* Gantt View Selector */}
      <View style={styles.ganttViewSelector}>
        {(['daily', 'weekly', 'monthly'] as GanttView[]).map(view => (
          <TouchableOpacity
            key={view}
            style={[styles.ganttViewButton, ganttView === view && styles.ganttViewButtonActive]}
            onPress={() => handleGanttViewChange(view)}
          >
            <Text style={[styles.ganttViewText, ganttView === view && styles.ganttViewTextActive]}>
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {ganttData && (
        <>
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Project Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{ganttData.summary?.total_milestones || 0}</Text>
                <Text style={styles.summaryLabel}>Milestones</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{ganttData.summary?.total_tasks || 0}</Text>
                <Text style={styles.summaryLabel}>Tasks</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  {ganttData.summary?.completed_tasks || 0}
                </Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                  {ganttData.summary?.in_progress_tasks || 0}
                </Text>
                <Text style={styles.summaryLabel}>In Progress</Text>
              </View>
            </View>
          </View>

          {/* Gantt Items */}
          {ganttData.items?.map((item: GanttItem) => (
            <View 
              key={item.id} 
              style={[
                styles.ganttItem,
                item.type === 'milestone' && styles.ganttMilestone,
                item.parent_id && styles.ganttTask
              ]}
            >
              <View style={styles.ganttItemHeader}>
                {item.type === 'milestone' ? (
                  <Ionicons name="flag" size={18} color={item.color || '#8B5CF6'} />
                ) : (
                  <View style={[styles.ganttTaskDot, { backgroundColor: getStatusColor(item.status) }]} />
                )}
                <Text style={[
                  styles.ganttItemName,
                  item.type === 'milestone' && styles.ganttMilestoneName
                ]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={[styles.ganttStatusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.ganttStatusText, { color: getStatusColor(item.status) }]}>
                    {item.status?.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.ganttProgressContainer}>
                <View style={styles.ganttProgressBar}>
                  <View 
                    style={[
                      styles.ganttProgressFill, 
                      { 
                        width: `${item.progress || 0}%`,
                        backgroundColor: item.type === 'milestone' ? (item.color || '#8B5CF6') : getStatusColor(item.status)
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.ganttProgressText}>{item.progress || 0}%</Text>
              </View>

              {/* Dates */}
              {(item.start_date || item.end_date) && (
                <View style={styles.ganttDates}>
                  {item.start_date && (
                    <Text style={styles.ganttDateText}>
                      Start: {new Date(item.start_date).toLocaleDateString()}
                    </Text>
                  )}
                  {item.end_date && (
                    <Text style={styles.ganttDateText}>
                      End: {new Date(item.end_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

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
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Project Status</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{project?.name}</Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="share-social" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewTabs}>
        <TouchableOpacity
          style={[styles.viewTab, viewMode === 'updates' && styles.viewTabActive]}
          onPress={() => setViewMode('updates')}
        >
          <Ionicons 
            name="document-text" 
            size={18} 
            color={viewMode === 'updates' ? Colors.primary : '#6B7280'} 
          />
          <Text style={[styles.viewTabText, viewMode === 'updates' && styles.viewTabTextActive]}>
            Updates
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, viewMode === 'gantt' && styles.viewTabActive]}
          onPress={() => setViewMode('gantt')}
        >
          <Ionicons 
            name="bar-chart" 
            size={18} 
            color={viewMode === 'gantt' ? Colors.primary : '#6B7280'} 
          />
          <Text style={[styles.viewTabText, viewMode === 'gantt' && styles.viewTabTextActive]}>
            Gantt Chart
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'updates' ? renderUpdatesView() : renderGanttView()}

      {/* Create Status Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Status Update</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Foundation work completed"
                placeholderTextColor="#9CA3AF"
                value={newUpdate.title}
                onChangeText={(text) => setNewUpdate(prev => ({ ...prev, title: text }))}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the progress..."
                placeholderTextColor="#9CA3AF"
                value={newUpdate.description}
                onChangeText={(text) => setNewUpdate(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencySelector}>
                {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      newUpdate.frequency === freq && styles.frequencyOptionActive
                    ]}
                    onPress={() => setNewUpdate(prev => ({ ...prev, frequency: freq }))}
                  >
                    <Text style={[
                      styles.frequencyOptionText,
                      newUpdate.frequency === freq && styles.frequencyOptionTextActive
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Task Selector */}
              <Text style={styles.inputLabel}>Select Tasks to Include ({newUpdate.selected_tasks.length} selected)</Text>
              <TouchableOpacity 
                style={styles.taskSelectorButton}
                onPress={() => setShowTaskSelector(true)}
              >
                <Ionicons name="checkbox-outline" size={20} color={Colors.primary} />
                <Text style={styles.taskSelectorButtonText} numberOfLines={1}>
                  {newUpdate.selected_tasks.length > 0 
                    ? getSelectedTasksSummary() 
                    : 'Tap to select tasks'
                  }
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Photos ({newUpdate.photos.length}/10) - Auto-compressed</Text>
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Ionicons name="images" size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {newUpdate.photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreviewRow}>
                  {newUpdate.photos.map((photo, index) => (
                    <View key={index} style={styles.photoPreview}>
                      <Image source={{ uri: photo }} style={styles.photoPreviewImage} />
                      <TouchableOpacity 
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.inputLabel}>Weather (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Sunny, 32°C"
                placeholderTextColor="#9CA3AF"
                value={newUpdate.weather}
                onChangeText={(text) => setNewUpdate(prev => ({ ...prev, weather: text }))}
              />

              <Text style={styles.inputLabel}>Issues/Blockers (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any issues or blockers..."
                placeholderTextColor="#9CA3AF"
                value={newUpdate.issues}
                onChangeText={(text) => setNewUpdate(prev => ({ ...prev, issues: text }))}
                multiline
              />

              <Text style={styles.inputLabel}>Next Steps (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Planned activities..."
                placeholderTextColor="#9CA3AF"
                value={newUpdate.next_steps}
                onChangeText={(text) => setNewUpdate(prev => ({ ...prev, next_steps: text }))}
                multiline
              />

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateUpdate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Share Update</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal visible={showPhotoViewer} animationType="fade" transparent>
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity 
            style={styles.photoViewerClose}
            onPress={() => setShowPhotoViewer(false)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedPhotos.length > 0 && (
            <Image 
              source={{ uri: selectedPhotos[currentPhotoIndex] }} 
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.photoViewerNav}>
            <TouchableOpacity 
              onPress={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
              disabled={currentPhotoIndex === 0}
            >
              <Ionicons name="chevron-back" size={32} color={currentPhotoIndex === 0 ? '#666' : '#FFF'} />
            </TouchableOpacity>
            <Text style={styles.photoViewerCounter}>
              {currentPhotoIndex + 1} / {selectedPhotos.length}
            </Text>
            <TouchableOpacity 
              onPress={() => setCurrentPhotoIndex(Math.min(selectedPhotos.length - 1, currentPhotoIndex + 1))}
              disabled={currentPhotoIndex === selectedPhotos.length - 1}
            >
              <Ionicons name="chevron-forward" size={32} color={currentPhotoIndex === selectedPhotos.length - 1 ? '#666' : '#FFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  shareButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  viewTabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  viewTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  viewTabActive: { borderBottomColor: Colors.primary },
  viewTabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  viewTabTextActive: { color: Colors.primary, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  filterChipTextActive: { color: '#FFFFFF' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#4B5563', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  updateCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  updateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  updateHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  frequencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  frequencyText: { fontSize: 10, fontWeight: '700' },
  updateDate: { fontSize: 12, color: '#6B7280' },
  updateTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  updateDescription: { fontSize: 14, color: '#4B5563', marginBottom: 12 },
  statsRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  photosRow: { marginBottom: 12 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  additionalInfo: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginBottom: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#4B5563' },
  createdBy: { fontSize: 12, color: '#9CA3AF' },
  // Gantt Styles
  ganttViewSelector: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 4, marginBottom: 16 },
  ganttViewButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  ganttViewButtonActive: { backgroundColor: Colors.primary },
  ganttViewText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  ganttViewTextActive: { color: '#FFFFFF' },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  summaryStats: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  summaryLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  ganttItem: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  ganttMilestone: { borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  ganttTask: { marginLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E5E7EB' },
  ganttItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ganttTaskDot: { width: 8, height: 8, borderRadius: 4 },
  ganttItemName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' },
  ganttMilestoneName: { fontWeight: '700' },
  ganttStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  ganttStatusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  ganttProgressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ganttProgressBar: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  ganttProgressFill: { height: '100%', borderRadius: 3 },
  ganttProgressText: { fontSize: 12, fontWeight: '600', color: '#4B5563', width: 36 },
  ganttDates: { flexDirection: 'row', gap: 16, marginTop: 8 },
  ganttDateText: { fontSize: 11, color: '#6B7280' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalScroll: { padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  frequencySelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  frequencyOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  frequencyOptionActive: { backgroundColor: '#EEF2FF', borderColor: Colors.primary },
  frequencyOptionText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  frequencyOptionTextActive: { color: Colors.primary },
  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: '#EEF2FF', borderRadius: 10, borderWidth: 1, borderColor: Colors.primary },
  photoButtonText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  photoPreviewRow: { marginBottom: 16 },
  photoPreview: { position: 'relative', marginRight: 8 },
  photoPreviewImage: { width: 100, height: 100, borderRadius: 8 },
  removePhotoButton: { position: 'absolute', top: -8, right: -8 },
  createButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  // Photo Viewer
  photoViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  photoViewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  photoViewerImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  photoViewerNav: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 20 },
  photoViewerCounter: { color: '#FFFFFF', fontSize: 16 },
});
