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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { milestonesAPI } from '../../../../../services/api';
import ModalSelector from '../../../../../components/ModalSelector';

export default function EditMilestoneScreen() {
  const router = useRouter();
  const { milestoneId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState('pending');
  const [completionPercentage, setCompletionPercentage] = useState('0');

  useEffect(() => {
    loadMilestone();
  }, [milestoneId]);

  const loadMilestone = async () => {
    try {
      const response = await milestonesAPI.getById(milestoneId as string);
      const milestone = response.data;
      
      setName(milestone.name);
      setDescription(milestone.description || '');
      setDueDate(new Date(milestone.due_date));
      setStatus(milestone.status);
      setCompletionPercentage(milestone.completion_percentage.toString());
    } catch (error) {
      Alert.alert('Error', 'Failed to load milestone');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a milestone name');
      return;
    }

    setLoading(true);
    try {
      await milestonesAPI.update(milestoneId as string, {
        name: name.trim(),
        description: description.trim() || null,
        due_date: dueDate.toISOString(),
        status,
        completion_percentage: parseFloat(completionPercentage) || 0,
      });

      Alert.alert('Success', 'Milestone updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update milestone');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
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
          <Text style={styles.headerTitle}>Edit Milestone</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Milestone Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter milestone name"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="Colors.textSecondary" />
              <Text style={styles.dateText}>{dueDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDueDate(selectedDate);
                }}
              />
            )}

            <Text style={styles.label}>Status</Text>
            <ModalSelector
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Completed', value: 'completed' },
                { label: 'Delayed', value: 'delayed' },
              ]}
              selectedValue={status}
              onValueChange={setStatus}
              placeholder="Select Status"
            />

            <Text style={styles.label}>Completion Percentage</Text>
            <TextInput
              style={styles.input}
              placeholder="0-100"
              value={completionPercentage}
              onChangeText={setCompletionPercentage}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <Text style={styles.updateButtonText}>Update Milestone</Text>
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
    backgroundColor: Colors.background,
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
