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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { budgetsAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function CreateBudgetScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('labor');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleCreate = async () => {
    if (!projectId) {
      Alert.alert('Error', 'Please select a project');
      return;
    }
    if (!allocatedAmount || parseFloat(allocatedAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    setLoading(true);
    try {
      await budgetsAPI.create({
        project_id: projectId,
        category,
        allocated_amount: parseFloat(allocatedAmount),
        description: description.trim() || null,
        fiscal_year: new Date().getFullYear(),
      });

      Alert.alert('Success', 'Budget created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create budget');
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
          <Text style={styles.headerTitle}>Create Budget</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Project *</Text>
            <ModalSelector
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
              selectedValue={projectId}
              onValueChange={setProjectId}
              placeholder="Select Project"
            />

            <Text style={styles.label}>Category *</Text>
            <ModalSelector
              options={[
                { label: 'Labor', value: 'labor' },
                { label: 'Materials', value: 'materials' },
                { label: 'Equipment', value: 'equipment' },
                { label: 'Subcontractors', value: 'subcontractors' },
                { label: 'Permits', value: 'permits' },
                { label: 'Overhead', value: 'overhead' },
                { label: 'Contingency', value: 'contingency' },
                { label: 'Other', value: 'other' },
              ]}
              selectedValue={category}
              onValueChange={setCategory}
              placeholder="Select Category"
            />

            <Text style={styles.label}>Allocated Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={allocatedAmount}
              onChangeText={setAllocatedAmount}
              keyboardType="numeric"
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
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <Text style={styles.createButtonText}>Create Budget</Text>
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
  createButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});