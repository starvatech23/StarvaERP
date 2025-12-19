import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI, projectTemplatesAPI } from '../../../services/api';

export default function ConstructionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  
  // Form state
  const [numberOfFloors, setNumberOfFloors] = useState('1');
  const [basementFloors, setBasementFloors] = useState('0');
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [superBuiltUpArea, setSuperBuiltUpArea] = useState('');
  const [plotArea, setPlotArea] = useState('');
  const [regenerateMilestones, setRegenerateMilestones] = useState(true);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getById(id as string);
      const projectData = response.data;
      setProject(projectData);
      
      // Populate form with existing values
      if (projectData.number_of_floors) setNumberOfFloors(String(projectData.number_of_floors));
      if (projectData.basement_floors) setBasementFloors(String(projectData.basement_floors));
      if (projectData.parking_spaces) setParkingSpaces(String(projectData.parking_spaces));
      if (projectData.built_up_area) setBuiltUpArea(String(projectData.built_up_area));
      if (projectData.super_built_up_area) setSuperBuiltUpArea(String(projectData.super_built_up_area));
      if (projectData.plot_area) setPlotArea(String(projectData.plot_area));
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Error', 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const floors = parseInt(numberOfFloors) || 1;
    const basement = parseInt(basementFloors) || 0;
    
    if (floors < 1) {
      Alert.alert('Validation Error', 'Number of floors must be at least 1');
      return;
    }

    try {
      setSaving(true);

      // First update the basic project details
      await projectsAPI.update(id as string, {
        number_of_floors: floors,
        basement_floors: basement,
        parking_spaces: parkingSpaces ? parseInt(parkingSpaces) : null,
        built_up_area: builtUpArea ? parseFloat(builtUpArea) : null,
        super_built_up_area: superBuiltUpArea ? parseFloat(superBuiltUpArea) : null,
        plot_area: plotArea ? parseFloat(plotArea) : null,
      });

      // Then update floors and optionally regenerate milestones
      const floorResponse = await projectTemplatesAPI.updateProjectFloors(id as string, {
        number_of_floors: floors,
        basement_floors: basement,
        regenerate_milestones: regenerateMilestones,
      });

      const message = regenerateMilestones 
        ? `Construction details updated! Created ${floorResponse.data.milestones_created} milestones and ${floorResponse.data.tasks_created} tasks.`
        : 'Construction details updated!';

      Alert.alert('Success', message, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to save construction details';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate super built up area automatically
  const calculateSuperBuiltUp = () => {
    const builtUp = parseFloat(builtUpArea) || 0;
    const parking = parseInt(parkingSpaces) || 0;
    // Typical loading factor is 1.25-1.35 for super built up
    // Add parking area (avg 120 sqft per car space)
    const parkingArea = parking * 120;
    const superBuiltUp = Math.round((builtUp * 1.25) + parkingArea);
    setSuperBuiltUpArea(String(superBuiltUp));
  };

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
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Construction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Info */}
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{project?.name}</Text>
          <Text style={styles.projectLocation}>{project?.location || project?.address}</Text>
        </View>

        {/* Floor Configuration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Floor Configuration</Text>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of Floors *</Text>
              <Text style={styles.inputHint}>Including ground floor</Text>
              <TextInput
                style={styles.input}
                value={numberOfFloors}
                onChangeText={setNumberOfFloors}
                placeholder="1"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Basement Floors</Text>
              <Text style={styles.inputHint}>Underground levels</Text>
              <TextInput
                style={styles.input}
                value={basementFloors}
                onChangeText={setBasementFloors}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Floor Preview */}
          <View style={styles.floorPreview}>
            <Text style={styles.floorPreviewTitle}>Floor Structure Preview</Text>
            <View style={styles.floorList}>
              {/* Basement floors */}
              {Array.from({ length: parseInt(basementFloors) || 0 }, (_, i) => (
                <View key={`basement-${i}`} style={[styles.floorItem, styles.basementFloor]}>
                  <Ionicons name="caret-down" size={14} color="#6B7280" />
                  <Text style={styles.floorItemText}>Basement {(parseInt(basementFloors) || 0) - i}</Text>
                </View>
              ))}
              {/* Ground and upper floors */}
              {Array.from({ length: parseInt(numberOfFloors) || 1 }, (_, i) => (
                <View key={`floor-${i}`} style={[styles.floorItem, i === 0 && styles.groundFloor]}>
                  <Ionicons name={i === 0 ? 'home' : 'layers'} size={14} color={i === 0 ? '#10B981' : Colors.primary} />
                  <Text style={styles.floorItemText}>
                    {i === 0 ? 'Ground Floor' : `Floor ${i}`}
                  </Text>
                </View>
              )).reverse()}
            </View>
          </View>
        </View>

        {/* Area Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="resize" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Area Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Plot Area (sq.ft)</Text>
            <TextInput
              style={styles.input}
              value={plotArea}
              onChangeText={setPlotArea}
              placeholder="Enter plot area"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Built Up Area (sq.ft)</Text>
            <TextInput
              style={styles.input}
              value={builtUpArea}
              onChangeText={setBuiltUpArea}
              placeholder="Enter built up area"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Parking Spaces</Text>
            <TextInput
              style={styles.input}
              value={parkingSpaces}
              onChangeText={setParkingSpaces}
              placeholder="Number of car parking spaces"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.superBuiltUpHeader}>
              <View>
                <Text style={styles.inputLabel}>Super Built Up Area (sq.ft)</Text>
                <Text style={styles.inputHint}>Including common areas & parking</Text>
              </View>
              <TouchableOpacity style={styles.calcButton} onPress={calculateSuperBuiltUp}>
                <Ionicons name="calculator" size={16} color={Colors.primary} />
                <Text style={styles.calcButtonText}>Auto Calculate</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={superBuiltUpArea}
              onChangeText={setSuperBuiltUpArea}
              placeholder="Enter or calculate"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Milestone Generation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-branch" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Milestone Generation</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Regenerate Floor-Based Milestones</Text>
              <Text style={styles.toggleHint}>
                Creates milestones and tasks for each floor (Column work, Beam work, Slab work, etc.)
              </Text>
            </View>
            <Switch
              value={regenerateMilestones}
              onValueChange={setRegenerateMilestones}
              trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
              thumbColor={regenerateMilestones ? Colors.primary : '#f4f3f4'}
            />
          </View>

          {regenerateMilestones && (
            <View style={styles.warningCard}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                This will delete existing floor-based milestones and create new ones based on the floor count. 
                Non-floor milestones (Preplanning, Finishing) will not be affected.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Construction Details</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
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
    padding: 16,
  },
  projectInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  projectLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  floorPreview: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  floorPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  floorList: {
    gap: 6,
  },
  floorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groundFloor: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  basementFloor: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
  },
  floorItemText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  superBuiltUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  calcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '15',
    borderRadius: 6,
  },
  calcButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  warningCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
