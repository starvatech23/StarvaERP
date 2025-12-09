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
} from 'react-native';
import Colors from '../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { tasksAPI, projectsAPI, usersAPI } from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateTaskScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(projectId as string || '');
  const [status, setStatus] = useState('pending');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const [engineers, workers] = await Promise.all([
        usersAPI.getByRole('engineer'),
        usersAPI.getByRole('worker'),
      ]);
      setUsers([...engineers.data, ...workers.data]);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const addAssignedUser = () => {
    if (selectedUser && !assignedTo.includes(selectedUser)) {
      setAssignedTo([...assignedTo, selectedUser]);
      setSelectedUser('');
    }
  };

  const removeAssignedUser = (userId: string) => {
    setAssignedTo(assignedTo.filter(id => id !== userId));
  };

  const getAssignedUserNames = () => {
    return assignedTo.map(userId => {
      const user = users.find((u: any) => u.id === userId);
      return user ? user.name : '';
    }).filter(Boolean);
  };

  const handleCreate = async () => {
    if (!title || !selectedProjectId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      await tasksAPI.create({
        title,
        description: description || null,
        project_id: selectedProjectId,
        status,
        priority,
        due_date: dueDate.toISOString(),
        assigned_to: assignedTo,
        attachments: [],
      });

      Alert.alert('Success', 'Task created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Create Task</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task title"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter task description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Project *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedProjectId}
                onValueChange={setSelectedProjectId}
                style={styles.picker}
              >
                <Picker.Item label="Select Project" value="" />
                {projects.map((project: any) => (
                  <Picker.Item key={project.id} label={project.name} value={project.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={setStatus}
                style={styles.picker}
              >
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item label="In Progress" value="in_progress" />
                <Picker.Item label="Completed" value="completed" />
                <Picker.Item label="Cancelled" value="cancelled" />
              </Picker>
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={priority}
                onValueChange={setPriority}
                style={styles.picker}
              >
                <Picker.Item label="Low" value="low" />
                <Picker.Item label="Medium" value="medium" />
                <Picker.Item label="High" value="high" />
                <Picker.Item label="Urgent" value="urgent" />
              </Picker>
            </View>

            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="Colors.textSecondary" />
              <Text style={styles.dateText}>{dueDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assign Users</Text>
            
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedUser}
                onValueChange={setSelectedUser}
                style={styles.picker}
              >
                <Picker.Item label="Select User" value="" />
                {users.map((user: any) => (
                  <Picker.Item key={user.id} label={user.name} value={user.id} />
                ))}
              </Picker>
            </View>

            {selectedUser && (
              <TouchableOpacity style={styles.addUserButton} onPress={addAssignedUser}>
                <Ionicons name="add-circle" size={20} color="Colors.secondary" />
                <Text style={styles.addUserText}>Add User</Text>
              </TouchableOpacity>
            )}

            {assignedTo.length > 0 && (
              <View style={styles.assignedUsersContainer}>
                <Text style={styles.assignedLabel}>Assigned Users:</Text>
                {getAssignedUserNames().map((name, index) => (
                  <View key={index} style={styles.assignedUserChip}>
                    <Text style={styles.assignedUserName}>{name}</Text>
                    <TouchableOpacity onPress={() => removeAssignedUser(assignedTo[index])}>
                      <Ionicons name="close-circle" size={20} color="Colors.textSecondary" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <Text style={styles.createButtonText}>Create Task</Text>
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
    backgroundColor: 'Colors.background,
  },
  keyboardView: {
    flex: 1,
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
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'Colors.textPrimary,
    borderWidth: 1,
    borderColor: 'Colors.border,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: 'Colors.textPrimary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'Colors.border,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: 'Colors.textPrimary,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addUserText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.secondary,
  },
  assignedUsersContainer: {
    marginTop: 16,
  },
  assignedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 12,
  },
  assignedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  assignedUserName: {
    fontSize: 14,
    color: 'Colors.secondary,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: 'Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  createButtonText: {
    color: 'Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
