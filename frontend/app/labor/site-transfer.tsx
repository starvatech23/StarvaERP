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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersAPI, projectsAPI, siteTransfersAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';

export default function SiteTransferScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    worker_id: '',
    from_project_id: '',
    to_project_id: '',
    transfer_date: new Date(),
    hours_at_from_site: '',
    hours_at_to_site: '',
    reason: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workersRes, projectsRes] = await Promise.all([
        workersAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      const workersData = workersRes.data || [];
      const projectsData = projectsRes.data || [];
      
      setWorkers(workersData);
      setProjects(projectsData);
      
      if (workersData.length > 0) {
        const firstWorker = workersData[0];
        setFormData((prev) => ({
          ...prev,
          worker_id: firstWorker.id,
          from_project_id: firstWorker.current_site_id || (projectsData[0]?.id || ''),
        }));
      }
      if (projectsData.length > 1) {
        setFormData((prev) => ({
          ...prev,
          to_project_id: projectsData[1].id,
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const selectedWorker = workers.find((w) => w.id === formData.worker_id);

  const handleSubmit = async () => {
    if (!formData.worker_id || !formData.from_project_id || !formData.to_project_id) {
      Alert.alert('Error', 'Please select worker and sites');
      return;
    }

    if (formData.from_project_id === formData.to_project_id) {
      Alert.alert('Error', 'From and To sites must be different');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        worker_id: formData.worker_id,
        from_project_id: formData.from_project_id,
        to_project_id: formData.to_project_id,
        transfer_date: moment(formData.transfer_date).toISOString(),
        reason: formData.reason || 'Site transfer',
      };

      // Add hours if provided
      if (formData.hours_at_from_site) {
        payload.hours_at_from_site = parseFloat(formData.hours_at_from_site);
      }
      if (formData.hours_at_to_site) {
        payload.hours_at_to_site = parseFloat(formData.hours_at_to_site);
      }

      await siteTransfersAPI.create(payload);
      Alert.alert('Success', 'Worker transferred successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error transferring worker:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to transfer worker');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Worker</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Worker *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.worker_id}
                  onValueChange={(value) => {
                    const worker = workers.find((w) => w.id === value);
                    setFormData({
                      ...formData,
                      worker_id: value,
                      from_project_id: worker?.current_site_id || formData.from_project_id,
                    });
                  }}
                  style={styles.picker}
                >
                  {workers.map((worker) => (
                    <Picker.Item
                      key={worker.id}
                      label={`${worker.full_name} - ${worker.skill_group}`}
                      value={worker.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {selectedWorker && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Current Skill:</Text>
                  <Text style={styles.infoValue}>{selectedWorker.skill_group.toUpperCase()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Base Rate:</Text>
                  <Text style={styles.infoValue}>₹{selectedWorker.base_rate}/{selectedWorker.pay_scale}</Text>
                </View>
                {selectedWorker.current_site_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Current Site:</Text>
                    <Text style={styles.infoValue}>{selectedWorker.current_site_name}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>From Site *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.from_project_id}
                  onValueChange={(value) => setFormData({ ...formData, from_project_id: value })}
                  style={styles.picker}
                >
                  {projects.map((project) => (
                    <Picker.Item key={project.id} label={project.name} value={project.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>To Site *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.to_project_id}
                  onValueChange={(value) => setFormData({ ...formData, to_project_id: value })}
                  style={styles.picker}
                >
                  {projects.map((project) => (
                    <Picker.Item key={project.id} label={project.name} value={project.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Transfer Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#FF6B35" />
                <Text style={styles.dateText}>{moment(formData.transfer_date).format('DD MMM YYYY')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.transfer_date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setFormData({ ...formData, transfer_date: selectedDate });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.noteText}>
                Split wage calculation: If you specify hours worked at each site, wages will be
                calculated proportionally based on the worker's daily rate.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hours at From Site (Optional)</Text>
              <View style={styles.hoursInputContainer}>
                <Ionicons name="time-outline" size={20} color="#718096" />
                <TextInput
                  style={styles.hoursInput}
                  value={formData.hours_at_from_site}
                  onChangeText={(text) => setFormData({ ...formData, hours_at_from_site: text })}
                  placeholder="Enter hours"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#CBD5E0"
                />
                <Text style={styles.hoursUnit}>hours</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hours at To Site (Optional)</Text>
              <View style={styles.hoursInputContainer}>
                <Ionicons name="time-outline" size={20} color="#718096" />
                <TextInput
                  style={styles.hoursInput}
                  value={formData.hours_at_to_site}
                  onChangeText={(text) => setFormData({ ...formData, hours_at_to_site: text })}
                  placeholder="Enter hours"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#CBD5E0"
                />
                <Text style={styles.hoursUnit}>hours</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.reason}
                onChangeText={(text) => setFormData({ ...formData, reason: text })}
                placeholder="Enter transfer reason"
                placeholderTextColor="#CBD5E0"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Transferring...' : 'Transfer Worker'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loader: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#1A202C',
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#1A202C',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  hoursInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  hoursInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A202C',
  },
  hoursUnit: {
    fontSize: 14,
    color: '#718096',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A202C',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
