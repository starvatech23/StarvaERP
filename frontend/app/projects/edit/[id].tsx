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
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { projectsAPI, usersAPI, userManagementAPI } from '../../../services/api';

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
      // Fetch all active users - we'll show all approved users who can be assigned
      const response = await userManagementAPI.getActive();
      console.log('Users loaded for manager selection:', response.data.length);
      setManagers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      // Try fallback to old API
      try {
        const response = await usersAPI.getByRole('project_manager');
        setManagers(response.data);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
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
          <ActivityIndicator size="large" color="#FF6B35" />
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
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
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
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={setStatus}
                style={styles.picker}
              >
                <Picker.Item label="Planning" value="planning" />
                <Picker.Item label="In Progress" value="in_progress" />
                <Picker.Item label="On Hold" value="on_hold" />
                <Picker.Item label="Completed" value="completed" />
                <Picker.Item label="Cancelled" value="cancelled" />
              </Picker>
            </View>
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
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={projectManagerId}
                onValueChange={setProjectManagerId}
                style={styles.picker}
                dropdownIconColor="#1A202C"
              >
                <Picker.Item label="Select Project Manager" value="" style={styles.pickerItem} />
                {managers.map((manager: any) => (
                  <Picker.Item
                    key={manager.id}
                    label={manager.full_name}
                    value={manager.id}
                    style={styles.pickerItem}
                  />
                ))}
              </Picker>
            </View>

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
                <Ionicons name="people" size={24} color="#3B82F6" />
                <View style={styles.manageTeamText}>
                  <Text style={styles.manageTeamTitle}>Manage Project Team</Text>
                  <Text style={styles.manageTeamSubtitle}>
                    Add or remove team members for this project
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#718096" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="camera" size={32} color="#FF6B35" />
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
              <ActivityIndicator color="#FFFFFF" />
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
    backgroundColor: '#F7FAFC',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: '#1A202C',
  },
  pickerItem: {
    color: '#1A202C',
    fontSize: 16,
    backgroundColor: '#FFFFFF',
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
    color: '#3B82F6',
    marginTop: 2,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoButtonText: {
    fontSize: 12,
    color: '#FF6B35',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  updateButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
