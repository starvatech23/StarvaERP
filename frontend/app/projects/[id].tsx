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
  Modal,
  TextInput,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI, tasksAPI, statusUpdatesAPI, siteMaterialsAPI, materialTransfersAPI, milestonesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TimelineCard from '../../components/TimelineCard';
import WeeklyGanttPreview from '../../components/WeeklyGanttPreview';

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

// Transfer Modal Component
function TransferModal({ material, projects, onClose, onTransfer }: {
  material: any;
  projects: any[];
  onClose: () => void;
  onTransfer: (destination: string, destProjectId: string | undefined, quantity: number, mediaUrls: string[], notes: string) => void;
}) {
  const [destination, setDestination] = useState<'project' | 'hq' | 'maintenance'>('project');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [quantity, setQuantity] = useState(String(material.quantity));
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handlePickImage = async () => {
    const ImagePicker = require('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newUrls = result.assets.map((asset: any) => {
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          return `data:${mimeType};base64,${asset.base64}`;
        }
        return asset.uri;
      });
      setMediaUrls([...mediaUrls, ...newUrls]);
    }
  };

  const handleTakePhoto = async () => {
    const ImagePicker = require('expo-image-picker');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType || 'image/jpeg';
        setMediaUrls([...mediaUrls, `data:${mimeType};base64,${asset.base64}`]);
      } else {
        setMediaUrls([...mediaUrls, asset.uri]);
      }
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleTransfer = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    if (qty > material.quantity) {
      Alert.alert('Error', 'Quantity exceeds available amount');
      return;
    }
    if (destination === 'project' && !selectedProject) {
      Alert.alert('Error', 'Please select a destination project');
      return;
    }
    onTransfer(destination, selectedProject?.id, qty, mediaUrls, notes);
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={transferStyles.overlay}>
        <View style={transferStyles.content}>
          <View style={transferStyles.header}>
            <Text style={transferStyles.title}>Transfer Material</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={transferStyles.materialInfo}>
            {material.material_type} - {material.quantity} {material.unit} available
          </Text>

          {/* Destination Type */}
          <Text style={transferStyles.label}>Transfer To</Text>
          <View style={transferStyles.destOptions}>
            {(['project', 'hq', 'maintenance'] as const).map((dest) => (
              <TouchableOpacity
                key={dest}
                style={[transferStyles.destOption, destination === dest && transferStyles.destOptionActive]}
                onPress={() => setDestination(dest)}
              >
                <Ionicons
                  name={dest === 'project' ? 'business' : dest === 'hq' ? 'home' : 'construct'}
                  size={20}
                  color={destination === dest ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[transferStyles.destText, destination === dest && transferStyles.destTextActive]}>
                  {dest === 'project' ? 'Project' : dest === 'hq' ? 'HQ' : 'Maintenance'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Project Picker */}
          {destination === 'project' && (
            <>
              <Text style={transferStyles.label}>Select Project</Text>
              <TouchableOpacity
                style={transferStyles.picker}
                onPress={() => setShowProjectPicker(!showProjectPicker)}
              >
                <Text style={selectedProject ? transferStyles.pickerText : transferStyles.pickerPlaceholder}>
                  {selectedProject?.name || 'Select destination project'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {showProjectPicker && (
                <ScrollView style={transferStyles.projectList}>
                  {projects.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={transferStyles.projectItem}
                      onPress={() => {
                        setSelectedProject(p);
                        setShowProjectPicker(false);
                      }}
                    >
                      <Text style={transferStyles.projectName}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}

          {/* Quantity */}
          <Text style={transferStyles.label}>Quantity</Text>
          <View style={transferStyles.qtyRow}>
            <TextInput
              style={transferStyles.qtyInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
            <Text style={transferStyles.unit}>{material.unit}</Text>
          </View>

          {/* Photo/Video Capture */}
          <Text style={transferStyles.label}>Photo/Video (Optional)</Text>
          <View style={transferStyles.mediaSection}>
            <View style={transferStyles.mediaButtons}>
              <TouchableOpacity style={transferStyles.mediaBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color={Colors.primary} />
                <Text style={transferStyles.mediaBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={transferStyles.mediaBtn} onPress={handlePickImage}>
                <Ionicons name="images" size={20} color={Colors.primary} />
                <Text style={transferStyles.mediaBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            {mediaUrls.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={transferStyles.mediaPreview}>
                {mediaUrls.map((url, index) => (
                  <View key={index} style={transferStyles.mediaItem}>
                    <Image source={{ uri: url }} style={transferStyles.mediaImage} />
                    <TouchableOpacity style={transferStyles.removeMedia} onPress={() => removeMedia(index)}>
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Notes */}
          <Text style={transferStyles.label}>Notes (Optional)</Text>
          <TextInput
            style={transferStyles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about the transfer..."
            multiline
            numberOfLines={2}
          />

          {/* Actions */}
          <View style={transferStyles.actions}>
            <TouchableOpacity style={transferStyles.cancelBtn} onPress={onClose}>
              <Text style={transferStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={transferStyles.transferBtn} onPress={handleTransfer}>
              <Ionicons name="swap-horizontal" size={20} color="#fff" />
              <Text style={transferStyles.transferText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const transferStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  materialInfo: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 12 },
  destOptions: { flexDirection: 'row', gap: 10 },
  destOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  destOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  destText: { fontSize: 13, color: Colors.textSecondary },
  destTextActive: { color: Colors.primary, fontWeight: '600' },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: '#fff' },
  pickerText: { fontSize: 15, color: Colors.textPrimary },
  pickerPlaceholder: { fontSize: 15, color: Colors.textSecondary },
  projectList: { maxHeight: 150, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginTop: 8 },
  projectItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  projectName: { fontSize: 14, color: Colors.textPrimary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 16 },
  unit: { fontSize: 14, color: Colors.textSecondary, minWidth: 50 },
  mediaSection: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 },
  mediaButtons: { flexDirection: 'row', gap: 10 },
  mediaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, backgroundColor: Colors.primary + '10' },
  mediaBtnText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  mediaPreview: { marginTop: 12 },
  mediaItem: { marginRight: 10, position: 'relative' },
  mediaImage: { width: 70, height: 70, borderRadius: 8 },
  removeMedia: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
  notesInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top', backgroundColor: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  transferBtn: { flex: 1, flexDirection: 'row', gap: 8, padding: 14, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  transferText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

export default function ProjectDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [siteMaterials, setSiteMaterials] = useState<any[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  const canEdit = user?.role === 'admin' || user?.role === 'project_manager';

  useEffect(() => {
    loadProject();
    loadTasks();
    loadMilestones();
    loadStatusUpdates();
    loadSiteMaterials();
    loadIncomingTransfers();
    loadAllProjects();
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

  const loadMilestones = async () => {
    try {
      const response = await milestonesAPI.getAll(id as string);
      setMilestones(response.data || []);
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  // Group tasks by milestone
  const getTasksByMilestone = () => {
    const grouped: { [key: string]: any[] } = { unassigned: [] };
    milestones.forEach(m => { grouped[m.id] = []; });
    
    tasks.forEach((task: any) => {
      if (task.milestone_id && grouped[task.milestone_id]) {
        grouped[task.milestone_id].push(task);
      } else {
        grouped['unassigned'].push(task);
      }
    });
    
    return grouped;
  };

  const loadSiteMaterials = async () => {
    try {
      const response = await siteMaterialsAPI.list({ project_id: id as string });
      setSiteMaterials(response.data || []);
    } catch (error) {
      console.log('Site materials not available');
    }
  };

  const loadIncomingTransfers = async () => {
    try {
      const response = await materialTransfersAPI.list({ 
        project_id: id as string, 
        direction: 'incoming',
        status: 'pending'
      });
      setIncomingTransfers(response.data || []);
    } catch (error) {
      console.log('Transfers not available');
    }
  };

  const loadAllProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setAllProjects(response.data?.filter((p: any) => p.id !== id) || []);
    } catch (error) {
      console.log('Projects not available');
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    try {
      await materialTransfersAPI.accept(transferId);
      Alert.alert('Success', 'Transfer accepted. Material added to inventory.');
      loadIncomingTransfers();
      loadSiteMaterials();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept transfer');
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    Alert.alert(
      'Reject Transfer',
      'Are you sure you want to reject this transfer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await materialTransfersAPI.reject(transferId, 'Rejected by recipient');
              Alert.alert('Transfer Rejected');
              loadIncomingTransfers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to reject transfer');
            }
          }
        }
      ]
    );
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

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return '#10B981';
      case 'good': return '#3B82F6';
      case 'fair': return '#F59E0B';
      case 'damaged': return '#EF4444';
      case 'needs_repair': return '#8B5CF6';
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
            <View style={{ flex: 1 }}>
              <Text style={styles.projectName}>{project.name}</Text>
              {project.project_code && (
                <Text style={styles.projectCode}>{project.project_code}</Text>
              )}
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

        {/* Construction Details Card */}
        {(project.number_of_floors || project.built_up_area || project.parking_spaces) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Construction Details</Text>
              <TouchableOpacity onPress={() => router.push(`/projects/${id}/construction-details` as any)}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.constructionGrid}>
              {project.number_of_floors && (
                <View style={styles.constructionItem}>
                  <Ionicons name="layers" size={20} color="#F59E0B" />
                  <Text style={styles.constructionValue}>{project.number_of_floors}</Text>
                  <Text style={styles.constructionLabel}>Floors</Text>
                </View>
              )}
              {project.basement_floors > 0 && (
                <View style={styles.constructionItem}>
                  <Ionicons name="caret-down" size={20} color="#6B7280" />
                  <Text style={styles.constructionValue}>{project.basement_floors}</Text>
                  <Text style={styles.constructionLabel}>Basement</Text>
                </View>
              )}
              {project.parking_spaces && (
                <View style={styles.constructionItem}>
                  <Ionicons name="car" size={20} color="#3B82F6" />
                  <Text style={styles.constructionValue}>{project.parking_spaces}</Text>
                  <Text style={styles.constructionLabel}>Parking</Text>
                </View>
              )}
              {project.built_up_area && (
                <View style={styles.constructionItem}>
                  <Ionicons name="resize" size={20} color="#10B981" />
                  <Text style={styles.constructionValue}>{project.built_up_area.toLocaleString()}</Text>
                  <Text style={styles.constructionLabel}>Built Up (sqft)</Text>
                </View>
              )}
              {project.super_built_up_area && (
                <View style={styles.constructionItem}>
                  <Ionicons name="expand" size={20} color="#8B5CF6" />
                  <Text style={styles.constructionValue}>{project.super_built_up_area.toLocaleString()}</Text>
                  <Text style={styles.constructionLabel}>Super Built Up</Text>
                </View>
              )}
            </View>
          </View>
        )}

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

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push({ pathname: '/finance/po-requests/create', params: { projectId: id, projectName: project?.name } } as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="cart" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.quickActionLabel}>Raise PO</Text>
              <Text style={styles.quickActionSubtext}>Request purchase</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/construction-details` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="layers" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionLabel}>Floors</Text>
              <Text style={styles.quickActionSubtext}>Construction info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/budget` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="wallet" size={24} color="#059669" />
              </View>
              <Text style={styles.quickActionLabel}>Budget</Text>
              <Text style={styles.quickActionSubtext}>Costs & Deviations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push(`/projects/${id}/share-access` as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="key" size={24} color="#7C3AED" />
              </View>
              <Text style={styles.quickActionLabel}>Client Portal</Text>
              <Text style={styles.quickActionSubtext}>Share access link</Text>
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

        {/* Project Timeline - Weekly Gantt Preview */}
        <WeeklyGanttPreview
          projectId={id as string}
          tasks={tasks}
        />

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

        {/* Project Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Project Schedule</Text>
            {canEdit && (
              <TouchableOpacity
                style={styles.addTaskButton}
                onPress={() => router.push(`/projects/${id}/milestones` as any)}
              >
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={[styles.addTaskText, { color: Colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>

          {milestones.length === 0 && tasks.length === 0 ? (
            <Text style={styles.emptyText}>No schedule defined yet</Text>
          ) : (
            <View style={styles.scheduleList}>
              {/* Milestones with expandable tasks */}
              {milestones.map((milestone: any) => {
                const milestoneTasks = getTasksByMilestone()[milestone.id] || [];
                const isExpanded = expandedMilestones.has(milestone.id);
                const completedTasks = milestoneTasks.filter((t: any) => t.status === 'completed').length;
                
                return (
                  <View key={milestone.id} style={styles.milestoneItem}>
                    <TouchableOpacity 
                      style={styles.milestoneHeader}
                      onPress={() => toggleMilestone(milestone.id)}
                    >
                      <View style={styles.milestoneLeft}>
                        <Ionicons 
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={18} 
                          color={Colors.textSecondary} 
                        />
                        <Ionicons name="flag" size={18} color="#F59E0B" />
                        <Text style={styles.milestoneName} numberOfLines={1}>{milestone.name}</Text>
                      </View>
                      <View style={styles.milestoneRight}>
                        <Text style={styles.milestoneTaskCount}>
                          {completedTasks}/{milestoneTasks.length}
                        </Text>
                        <View style={[
                          styles.milestoneStatusDot,
                          { backgroundColor: milestone.status === 'completed' ? '#10B981' : milestone.status === 'in_progress' ? '#3B82F6' : '#F59E0B' }
                        ]} />
                      </View>
                    </TouchableOpacity>
                    
                    {isExpanded && milestoneTasks.length > 0 && (
                      <View style={styles.milestoneTasks}>
                        {milestoneTasks.map((task: any) => (
                          <TouchableOpacity
                            key={task.id}
                            style={styles.scheduleTaskItem}
                            onPress={() => router.push(`/tasks/${task.id}` as any)}
                          >
                            <View style={styles.scheduleTaskLeft}>
                              <Ionicons 
                                name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} 
                                size={16} 
                                color={task.status === 'completed' ? '#10B981' : Colors.textSecondary} 
                              />
                              <Text style={[
                                styles.scheduleTaskTitle,
                                task.status === 'completed' && styles.scheduleTaskCompleted
                              ]} numberOfLines={1}>
                                {task.title}
                              </Text>
                            </View>
                            <View style={[
                              styles.taskStatusBadge,
                              { backgroundColor: getTaskStatusColor(task.status) + '20' },
                            ]}>
                              <Text style={[styles.taskStatusText, { color: getTaskStatusColor(task.status) }]}>
                                {getStatusLabel(task.status)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    
                    {isExpanded && milestoneTasks.length === 0 && (
                      <View style={styles.milestoneTasks}>
                        <Text style={styles.noTasksText}>No tasks in this milestone</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Unassigned tasks */}
              {getTasksByMilestone()['unassigned']?.length > 0 && (
                <View style={styles.milestoneItem}>
                  <TouchableOpacity 
                    style={styles.milestoneHeader}
                    onPress={() => toggleMilestone('unassigned')}
                  >
                    <View style={styles.milestoneLeft}>
                      <Ionicons 
                        name={expandedMilestones.has('unassigned') ? 'chevron-down' : 'chevron-forward'} 
                        size={18} 
                        color={Colors.textSecondary} 
                      />
                      <Ionicons name="list" size={18} color="#6B7280" />
                      <Text style={styles.milestoneName}>Other Tasks</Text>
                    </View>
                    <View style={styles.milestoneRight}>
                      <Text style={styles.milestoneTaskCount}>
                        {getTasksByMilestone()['unassigned'].length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {expandedMilestones.has('unassigned') && (
                    <View style={styles.milestoneTasks}>
                      {getTasksByMilestone()['unassigned'].map((task: any) => (
                        <TouchableOpacity
                          key={task.id}
                          style={styles.scheduleTaskItem}
                          onPress={() => router.push(`/tasks/${task.id}` as any)}
                        >
                          <View style={styles.scheduleTaskLeft}>
                            <Ionicons 
                              name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} 
                              size={16} 
                              color={task.status === 'completed' ? '#10B981' : Colors.textSecondary} 
                            />
                            <Text style={[
                              styles.scheduleTaskTitle,
                              task.status === 'completed' && styles.scheduleTaskCompleted
                            ]} numberOfLines={1}>
                              {task.title}
                            </Text>
                          </View>
                          <View style={[
                            styles.taskStatusBadge,
                            { backgroundColor: getTaskStatusColor(task.status) + '20' },
                          ]}>
                            <Text style={[styles.taskStatusText, { color: getTaskStatusColor(task.status) }]}>
                              {getStatusLabel(task.status)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Site Materials Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Site Materials ({siteMaterials.filter(m => m.status === 'approved').length})</Text>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => router.push(`/materials/site/add?projectId=${id}` as any)}
            >
              <Ionicons name="add" size={20} color={Colors.secondary} />
              <Text style={styles.addTaskText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Incoming Transfers Alert */}
          {incomingTransfers.length > 0 && (
            <View style={styles.transferAlert}>
              <Ionicons name="swap-horizontal" size={20} color="#F59E0B" />
              <Text style={styles.transferAlertText}>
                {incomingTransfers.length} incoming transfer(s) pending your acceptance
              </Text>
            </View>
          )}

          {/* Incoming Transfers */}
          {incomingTransfers.map((transfer: any) => (
            <View key={transfer.id} style={styles.transferCard}>
              <View style={styles.transferHeader}>
                <Text style={styles.transferMaterial}>{transfer.material_type}</Text>
                <View style={styles.transferBadge}>
                  <Text style={styles.transferBadgeText}>Incoming</Text>
                </View>
              </View>
              <Text style={styles.transferInfo}>
                {transfer.quantity} {transfer.unit} from {transfer.source_project_name}
              </Text>
              <View style={styles.transferActions}>
                <TouchableOpacity
                  style={styles.rejectTransferBtn}
                  onPress={() => handleRejectTransfer(transfer.id)}
                >
                  <Ionicons name="close" size={18} color="#EF4444" />
                  <Text style={styles.rejectTransferText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptTransferBtn}
                  onPress={() => handleAcceptTransfer(transfer.id)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.acceptTransferText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Site Materials List */}
          {siteMaterials.filter(m => m.status === 'approved').length === 0 ? (
            <Text style={styles.emptyText}>No approved materials at this site</Text>
          ) : (
            <View style={styles.materialsList}>
              {siteMaterials.filter(m => m.status === 'approved').map((material: any) => (
                <View key={material.id} style={styles.materialCard}>
                  <View style={styles.materialHeader}>
                    <Text style={styles.materialName}>{material.material_type}</Text>
                    <View style={[styles.conditionBadge, { borderColor: getConditionColor(material.condition) }]}>
                      <Text style={[styles.conditionText, { color: getConditionColor(material.condition) }]}>
                        {material.condition?.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.materialQty}>{material.quantity} {material.unit}</Text>
                  {material.cost && (
                    <Text style={styles.materialCost}>₹{material.cost?.toLocaleString()}</Text>
                  )}
                  <View style={styles.materialActions}>
                    <TouchableOpacity
                      style={styles.transferButton}
                      onPress={() => {
                        setSelectedMaterial(material);
                        setShowTransferModal(true);
                      }}
                    >
                      <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
                      <Text style={styles.transferButtonText}>Transfer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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

      {/* Transfer Modal */}
      {showTransferModal && selectedMaterial && (
        <TransferModal
          material={selectedMaterial}
          projects={allProjects}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedMaterial(null);
          }}
          onTransfer={async (destination, destProjectId, quantity, mediaUrls, notes) => {
            try {
              await materialTransfersAPI.create({
                site_material_id: selectedMaterial.id,
                destination_type: destination,
                destination_project_id: destProjectId,
                quantity: quantity,
                notes: notes || undefined,
                media_urls: mediaUrls.length > 0 ? mediaUrls : undefined
              });
              Alert.alert('Success', 'Transfer request sent. Waiting for acceptance.');
              setShowTransferModal(false);
              setSelectedMaterial(null);
              loadSiteMaterials();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to create transfer');
            }
          }}
        />
      )}
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
    marginRight: 12,
  },
  projectCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
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
  // Project Schedule styles
  scheduleList: {
    gap: 8,
  },
  milestoneItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  milestoneRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  milestoneTaskCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  milestoneStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  milestoneTasks: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scheduleTaskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 26,
  },
  scheduleTaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scheduleTaskTitle: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  scheduleTaskCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  noTasksText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 26,
    paddingVertical: 8,
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
  // Data integrity warning styles
  dataWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  dataWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  // Site Materials styles
  materialsList: {
    gap: 12,
  },
  materialCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  materialQty: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  materialCost: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  materialActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
  },
  transferButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Transfer alert styles
  transferAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  transferAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  transferCard: {
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  transferMaterial: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  transferBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  transferBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  transferInfo: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  transferActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  rejectTransferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  rejectTransferText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptTransferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  acceptTransferText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});