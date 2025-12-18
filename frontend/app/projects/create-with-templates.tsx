import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Colors from '../../constants/Colors';
import { projectsAPI, templatesAPI, usersAPI } from '../../services/api';
import moment from 'moment';

export default function CreateProjectWithTemplates() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [creationResult, setCreationResult] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    location: '',
    description: '',
    number_of_floors: 1,
    building_type: 'residential',
    total_built_area: '',
    planned_start_date: moment().add(7, 'days').format('YYYY-MM-DD'),
    project_manager_id: '',
  });

  useEffect(() => {
    loadTemplates();
    loadManagers();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await templatesAPI.getMilestones();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await usersAPI.getAll();
      const pmUsers = (response.data || []).filter((u: any) => 
        ['admin', 'project_manager'].includes(u.role)
      );
      setManagers(pmUsers);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...formData,
        number_of_floors: parseInt(formData.number_of_floors.toString()) || 1,
        total_built_area: parseFloat(formData.total_built_area) || 0,
        planned_start_date: new Date(formData.planned_start_date).toISOString(),
      };

      const response = await projectsAPI.createWithTemplates(payload);
      setCreationResult(response.data);
      setStep(4); // Success step
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const calculateTotalTasks = () => {
    let total = 0;
    const floors = parseInt(formData.number_of_floors.toString()) || 1;
    templates.forEach(t => {
      if (t.is_floor_based) {
        total += (t.tasks?.length || 0) * floors;
      } else {
        total += t.tasks?.length || 0;
      }
    });
    return total;
  };

  const calculateTotalDuration = () => {
    let days = 0;
    const floors = parseInt(formData.number_of_floors.toString()) || 1;
    templates.forEach(t => {
      if (t.is_floor_based) {
        days += t.default_duration_days * floors;
      } else {
        days += t.default_duration_days;
      }
    });
    return days;
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Enter project details</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Project Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData({...formData, name: text})}
          placeholder="e.g., Villa Construction - Phase 1"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Client Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.client_name}
          onChangeText={(text) => setFormData({...formData, client_name: text})}
          placeholder="Client/Owner name"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={formData.location}
          onChangeText={(text) => setFormData({...formData, location: text})}
          placeholder="Site address"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Project Manager</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.project_manager_id}
            onValueChange={(value) => setFormData({...formData, project_manager_id: value})}
            style={styles.picker}
          >
            <Picker.Item label="Select Manager" value="" />
            {managers.map((m: any) => (
              <Picker.Item key={m.id} label={m.full_name} value={m.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({...formData, description: text})}
          placeholder="Project description"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Building Configuration</Text>
      <Text style={styles.stepSubtitle}>Define building specifications</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Building Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.building_type}
            onValueChange={(value) => setFormData({...formData, building_type: value})}
            style={styles.picker}
          >
            <Picker.Item label="Residential" value="residential" />
            <Picker.Item label="Commercial" value="commercial" />
            <Picker.Item label="Industrial" value="industrial" />
            <Picker.Item label="Mixed Use" value="mixed_use" />
          </Picker>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Number of Floors</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity 
            style={styles.counterBtn}
            onPress={() => setFormData({...formData, number_of_floors: Math.max(1, formData.number_of_floors - 1)})}
          >
            <Ionicons name="remove" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.counterValue}>{formData.number_of_floors}</Text>
          <TouchableOpacity 
            style={styles.counterBtn}
            onPress={() => setFormData({...formData, number_of_floors: Math.min(10, formData.number_of_floors + 1)})}
          >
            <Ionicons name="add" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Structure phase tasks will be repeated for each floor</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Total Built Area (sqft)</Text>
        <TextInput
          style={styles.input}
          value={formData.total_built_area}
          onChangeText={(text) => setFormData({...formData, total_built_area: text})}
          placeholder="e.g., 2000"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Planned Start Date</Text>
        <TextInput
          style={styles.input}
          value={formData.planned_start_date}
          onChangeText={(text) => setFormData({...formData, planned_start_date: text})}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Auto-Generated Plan</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="flag" size={24} color={Colors.secondary} />
            <Text style={styles.summaryValue}>{templates.length + (formData.number_of_floors - 1)}</Text>
            <Text style={styles.summaryLabel}>Milestones</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="checkbox" size={24} color="#10B981" />
            <Text style={styles.summaryValue}>{calculateTotalTasks()}</Text>
            <Text style={styles.summaryLabel}>Tasks</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="calendar" size={24} color="#F59E0B" />
            <Text style={styles.summaryValue}>{calculateTotalDuration()}</Text>
            <Text style={styles.summaryLabel}>Days</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Milestones</Text>
      <Text style={styles.stepSubtitle}>These milestones will be auto-created</Text>

      <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
        {templates.map((template, index) => {
          const iterations = template.is_floor_based ? formData.number_of_floors : 1;
          return (
            <View key={index} style={styles.templateCard}>
              <View style={[styles.templateColor, { backgroundColor: template.color }]} />
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                {template.is_floor_based && (
                  <Text style={styles.floorBadge}>× {iterations} floors</Text>
                )}
                <Text style={styles.templateDesc}>{template.description}</Text>
                <View style={styles.templateMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="checkbox-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{template.tasks?.length || 0} tasks</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{template.default_duration_days * iterations} days</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.noteCard}>
        <Ionicons name="information-circle" size={20} color="#3B82F6" />
        <Text style={styles.noteText}>
          All milestones, tasks, dates, and estimates are fully editable after creation.
        </Text>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Project Created!</Text>
        <Text style={styles.successSubtitle}>
          Your project has been set up with templates
        </Text>

        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Project Code</Text>
            <Text style={styles.resultValue}>{creationResult?.project_code}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Milestones Created</Text>
            <Text style={styles.resultValue}>{creationResult?.milestones_created}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Tasks Created</Text>
            <Text style={styles.resultValue}>{creationResult?.tasks_created}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Planned Cost</Text>
            <Text style={styles.resultValue}>₹{creationResult?.total_planned_cost?.toLocaleString()}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Duration</Text>
            <Text style={styles.resultValue}>
              {moment(creationResult?.planned_start_date).format('DD MMM')} - {moment(creationResult?.planned_end_date).format('DD MMM YYYY')}
            </Text>
          </View>
        </View>

        {/* Client Portal Access Section */}
        <View style={styles.clientPortalSection}>
          <View style={styles.clientPortalHeader}>
            <Ionicons name="key" size={20} color={Colors.secondary} />
            <Text style={styles.clientPortalTitle}>Client Portal Access</Text>
          </View>
          <Text style={styles.clientPortalSubtitle}>
            Share project access with your client
          </Text>
          
          <TouchableOpacity 
            style={styles.sendCredentialsBtn}
            onPress={() => router.push(`/projects/${creationResult?.project_id}/share-access` as any)}
          >
            <Ionicons name="send" size={18} color="#FFF" />
            <Text style={styles.sendCredentialsBtnText}>Send Client Credentials</Text>
          </TouchableOpacity>
          
          <View style={styles.credentialChannels}>
            <View style={styles.channelBadge}>
              <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
              <Text style={styles.channelText}>WhatsApp</Text>
            </View>
            <View style={styles.channelBadge}>
              <Ionicons name="chatbubble" size={14} color="#3B82F6" />
              <Text style={styles.channelText}>SMS</Text>
            </View>
            <View style={styles.channelBadge}>
              <Ionicons name="mail" size={14} color="#EF4444" />
              <Text style={styles.channelText}>Email</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.viewProjectBtn}
          onPress={() => router.push(`/projects/${creationResult?.project_id}`)}
        >
          <Text style={styles.viewProjectBtnText}>View Project</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 && step < 4 ? setStep(step - 1) : router.back()}>
            <Ionicons name={step > 1 && step < 4 ? "arrow-back" : "close"} size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Project with Templates</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Steps */}
        {step < 4 && (
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={styles.progressStep}>
                <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
                  {step > s ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  ) : (
                    <Text style={[styles.progressNumber, step >= s && styles.progressNumberActive]}>{s}</Text>
                  )}
                </View>
                <Text style={[styles.progressLabel, step >= s && styles.progressLabelActive]}>
                  {s === 1 ? 'Basic Info' : s === 2 ? 'Configuration' : 'Review'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>

        {/* Footer Buttons */}
        {step < 4 && (
          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.nextBtn, step === 1 && { flex: 1 }]}
              onPress={() => step < 3 ? setStep(step + 1) : handleCreate()}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>{step < 3 ? 'Next' : 'Create Project'}</Text>
                  <Ionicons name={step < 3 ? "arrow-forward" : "checkmark"} size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  progressStep: { alignItems: 'center', width: 80 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDotActive: { backgroundColor: Colors.secondary },
  progressNumber: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  progressNumberActive: { color: '#FFF' },
  progressLabel: { fontSize: 11, color: Colors.textSecondary },
  progressLabelActive: { color: Colors.secondary, fontWeight: '500' },
  content: { flex: 1 },
  stepContent: { padding: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: { height: 50 },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: { fontSize: 32, fontWeight: '700', color: Colors.secondary, minWidth: 50, textAlign: 'center' },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  summaryCard: {
    backgroundColor: Colors.secondary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: Colors.secondary, marginBottom: 12, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary },
  templateList: { maxHeight: 400 },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  templateColor: { width: 6 },
  templateInfo: { flex: 1, padding: 14 },
  templateName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  floorBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  templateDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  templateMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#3B82F610',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  noteText: { flex: 1, fontSize: 13, color: '#3B82F6' },
  successContainer: { alignItems: 'center', paddingVertical: 32 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  successSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 24,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultLabel: { fontSize: 14, color: Colors.textSecondary },
  resultValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  viewProjectBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  viewProjectBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    flex: 0.4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  nextBtn: {
    flex: 0.6,
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
