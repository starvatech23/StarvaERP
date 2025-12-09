import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { projectsAPI, usersAPI, userManagementAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function EditProjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadProject();
    loadManagers();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await projectsAPI.getById(id as string);
      const project = response.data;
      
      setName(project.name);
      setLocation(project.location);
      setAddress(project.address || '');
      setClientName(project.client_name);
      setClientContact(project.client_contact || '');
      setBudget(project.budget ? project.budget.toString() : '');
      setDescription(project.description || '');
      setStatus(project.status);
      setProjectManagerId(project.project_manager_id || '');
      setPhotos(project.photos || []);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load project details');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      console.log('🔍 [Edit] Loading managers from API...');
      // Fetch all active users - we'll show all approved users who can be assigned
      const response = await userManagementAPI.getActive();
      console.log('✅ [Edit] Users loaded:', response.data.length, 'users');
      console.log('📋 [Edit] User details:', JSON.stringify(response.data.slice(0, 3), null, 2));
      
      if (response.data && response.data.length > 0) {
        setManagers(response.data);
      } else {
        console.warn('⚠️ [Edit] No users returned from API');
        Alert.alert('Warning', 'No users available for Project Manager selection.');
      }
    } catch (error: any) {
      console.error('❌ [Edit] Error loading users:', error);
      console.error('[Edit] Error details:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to load users: ${error.response?.data?.detail || error.message}`);
      
      // Try fallback to old API
      try {
        console.log('🔄 [Edit] Trying fallback API...');
        const response = await usersAPI.getByRole('project_manager');
        console.log('✅ [Edit] Fallback successful:', response.data.length);
        setManagers(response.data);
      } catch (fallbackError: any) {
        console.error('❌ [Edit] Fallback also failed:', fallbackError);
      }
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos([...photos, base64Image]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleUpdate = async () => {
    if (!name || !location || !clientName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await projectsAPI.update(id as string, {
        name,
        location,
        address,
        client_name: clientName,
        client_contact: clientContact || null,
        status,
        budget: budget ? parseFloat(budget) : null,
        description: description || null,
        project_manager_id: projectManagerId || null,
        photos,
      });

      Alert.alert('Success', 'Project updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Project</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Project Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter project name"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="City, State"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.label}>Full Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street address"
              value={address}
              onChangeText={setAddress}
              multiline
            />

            <Text style={styles.label}>Status</Text>
            <ModalSelector
              options={[
                { label: 'Planning', value: 'planning' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'On Hold', value: 'on_hold' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
              selectedValue={status}
              onValueChange={setStatus}
              placeholder="Select Status"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>

            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter client name"
              value={clientName}
              onChangeText={setClientName}
            />

            <Text style={styles.label}>Client Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone or email"
              value={clientContact}
              onChangeText={setClientContact}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Details</Text>

            <Text style={styles.label}>Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter budget"
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Project Manager</Text>
            <ModalSelector
              options={managers.map((manager: any) => ({
                label: manager.full_name,
                value: manager.id,
              }))}
              selectedValue={projectManagerId}
              onValueChange={setProjectManagerId}
              placeholder="Select Project Manager"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter project description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Management</Text>
            
            <TouchableOpacity
              style={styles.manageTeamButton}
              onPress={() => router.push(`/projects/${id}/team` as any)}
            >
              <View style={styles.manageTeamContent}>
                <Ionicons name="people" size={24} color="Colors.primary" />
                <View style={styles.manageTeamText}>
                  <Text style={styles.manageTeamTitle}>Manage Project Team</Text>
                  <Text style={styles.manageTeamSubtitle}>
                    Add or remove team members for this project
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="Colors.textSecondary" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="camera" size={32} color="Colors.secondary" />
                <Text style={styles.photoButtonText}>Add Photo</Text>
              </TouchableOpacity>

              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <Text style={styles.updateButtonText}>Update Project</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background',
  },
  keyboardView: {
    flex: 1,
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
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'Colors.surface',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'Colors.textPrimary',
    borderWidth: 1,
    borderColor: 'Colors.border',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  manageTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  manageTeamContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  manageTeamText: {
    marginLeft: 12,
    flex: 1,
  },
  manageTeamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  manageTeamSubtitle: {
    fontSize: 13,
    color: 'Colors.primary',
    marginTop: 2,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'Colors.secondary',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoButtonText: {
    fontSize: 12,
    color: 'Colors.secondary',
    marginTop: 8,
    fontWeight: '600',
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'Colors.surface',
    borderRadius: 12,
  },
  updateButton: {
    backgroundColor: 'Colors.secondary',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  updateButtonText: {
    color: 'Colors.surface',
    fontSize: 16,
    fontWeight: '600',
  },
});
