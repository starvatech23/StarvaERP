import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { estimationAPI } from '../../../services/api';

export default function CreatePresetScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  // Preset Info
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  
  // Cost per Sqft Estimates
  const [costPerSqft, setCostPerSqft] = useState({
    basic: '1800',
    standard: '2200',
    premium: '2800',
    luxury: '3500',
  });

  // Material Coefficients
  const [materialPreset, setMaterialPreset] = useState({
    cement_per_cum: '7.0',
    sand_per_cum: '0.42',
    aggregate_per_cum: '0.84',
    steel_kg_per_cum_foundation: '80.0',
    steel_kg_per_cum_column: '150.0',
    steel_kg_per_cum_beam: '120.0',
    steel_kg_per_cum_slab: '100.0',
    blocks_per_sqm: '12.5',
    mortar_per_sqm: '0.02',
    concrete_wastage: '5',
    steel_wastage: '8',
    block_wastage: '5',
  });

  // Rate Table
  const [rateTable, setRateTable] = useState({
    location: 'Default',
    cement_per_bag: '400',
    sand_per_cum: '1200',
    aggregate_per_cum: '1400',
    steel_per_kg: '65',
    block_8inch_per_unit: '45',
    labour_per_sqft: '45',
    electrical_per_sqft: '120',
    plumbing_per_sqft: '80',
    painting_per_sqft: '35',
    contractor_overhead_percent: '10',
  });

  const handleSave = async () => {
    if (!presetName.trim()) {
      Alert.alert('Validation Error', 'Please enter a preset name');
      return;
    }

    setSaving(true);
    try {
      const presetData = {
        name: presetName,
        description: presetDescription,
        cost_per_sqft_basic: parseFloat(costPerSqft.basic),
        cost_per_sqft_standard: parseFloat(costPerSqft.standard),
        cost_per_sqft_premium: parseFloat(costPerSqft.premium),
        cost_per_sqft_luxury: parseFloat(costPerSqft.luxury),
        cement_per_cum: parseFloat(materialPreset.cement_per_cum),
        sand_per_cum: parseFloat(materialPreset.sand_per_cum),
        aggregate_per_cum: parseFloat(materialPreset.aggregate_per_cum),
        steel_kg_per_cum_foundation: parseFloat(materialPreset.steel_kg_per_cum_foundation),
        steel_kg_per_cum_column: parseFloat(materialPreset.steel_kg_per_cum_column),
        steel_kg_per_cum_beam: parseFloat(materialPreset.steel_kg_per_cum_beam),
        steel_kg_per_cum_slab: parseFloat(materialPreset.steel_kg_per_cum_slab),
        blocks_per_sqm: parseFloat(materialPreset.blocks_per_sqm),
        mortar_per_sqm: parseFloat(materialPreset.mortar_per_sqm),
        concrete_wastage: parseFloat(materialPreset.concrete_wastage) / 100,
        steel_wastage: parseFloat(materialPreset.steel_wastage) / 100,
        block_wastage: parseFloat(materialPreset.block_wastage) / 100,
        location: rateTable.location,
        cement_per_bag: parseFloat(rateTable.cement_per_bag),
        sand_per_cum: parseFloat(rateTable.sand_per_cum),
        aggregate_per_cum: parseFloat(rateTable.aggregate_per_cum),
        steel_per_kg: parseFloat(rateTable.steel_per_kg),
        block_8inch_per_unit: parseFloat(rateTable.block_8inch_per_unit),
        labour_per_sqft: parseFloat(rateTable.labour_per_sqft),
        electrical_per_sqft: parseFloat(rateTable.electrical_per_sqft),
        plumbing_per_sqft: parseFloat(rateTable.plumbing_per_sqft),
        painting_per_sqft: parseFloat(rateTable.painting_per_sqft),
        contractor_overhead_percent: parseFloat(rateTable.contractor_overhead_percent),
      };

      await estimationAPI.createPreset(presetData);
      
      Alert.alert('Success', 'Estimation preset created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create preset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Estimation Preset</Text>
          <Text style={styles.headerSubtitle}>Define rates and coefficients</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Preset Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preset Information</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preset Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Bangalore Premium 2025"
                value={presetName}
                onChangeText={setPresetName}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe this preset (optional)"
                multiline
                numberOfLines={3}
                value={presetDescription}
                onChangeText={setPresetDescription}
              />
            </View>
          </View>
        </View>

        {/* Cost per Sqft */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Estimated Cost per Sqft (₹)</Text>
          <View style={styles.card}>
            <Text style={styles.hint}>These are rough estimates used for quick budgeting</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Basic Package</Text>
              <TextInput
                style={styles.input}
                placeholder="1800"
                keyboardType="numeric"
                value={costPerSqft.basic}
                onChangeText={(val) => setCostPerSqft(prev => ({ ...prev, basic: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Standard Package</Text>
              <TextInput
                style={styles.input}
                placeholder="2200"
                keyboardType="numeric"
                value={costPerSqft.standard}
                onChangeText={(val) => setCostPerSqft(prev => ({ ...prev, standard: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Premium Package</Text>
              <TextInput
                style={styles.input}
                placeholder="2800"
                keyboardType="numeric"
                value={costPerSqft.premium}
                onChangeText={(val) => setCostPerSqft(prev => ({ ...prev, premium: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Luxury Package</Text>
              <TextInput
                style={styles.input}
                placeholder="3500"
                keyboardType="numeric"
                value={costPerSqft.luxury}
                onChangeText={(val) => setCostPerSqft(prev => ({ ...prev, luxury: val }))}
              />
            </View>
          </View>
        </View>

        {/* Masonry Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧱 Masonry Rates (₹ per unit)</Text>
          <View style={styles.card}>
            <Text style={styles.groupTitle}>Block Sizes</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>4-inch Block</Text>
              <TextInput
                style={styles.input}
                placeholder="28"
                keyboardType="numeric"
                value={rateTable.block_4inch_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, block_4inch_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>6-inch Block</Text>
              <TextInput
                style={styles.input}
                placeholder="38"
                keyboardType="numeric"
                value={rateTable.block_6inch_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, block_6inch_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>8-inch Block</Text>
              <TextInput
                style={styles.input}
                placeholder="45"
                keyboardType="numeric"
                value={rateTable.block_8inch_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, block_8inch_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>10-inch Block</Text>
              <TextInput
                style={styles.input}
                placeholder="52"
                keyboardType="numeric"
                value={rateTable.block_10inch_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, block_10inch_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>12-inch Block</Text>
              <TextInput
                style={styles.input}
                placeholder="60"
                keyboardType="numeric"
                value={rateTable.block_12inch_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, block_12inch_per_unit: val }))}
              />
            </View>

            <Text style={styles.groupTitle}>Brick Types</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wire-cut Red Bricks</Text>
              <TextInput
                style={styles.input}
                placeholder="12"
                keyboardType="numeric"
                value={rateTable.brick_wirecut_red_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, brick_wirecut_red_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Standard Bricks</Text>
              <TextInput
                style={styles.input}
                placeholder="8"
                keyboardType="numeric"
                value={rateTable.brick_standard_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, brick_standard_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hollow Bricks</Text>
              <TextInput
                style={styles.input}
                placeholder="15"
                keyboardType="numeric"
                value={rateTable.brick_hollow_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, brick_hollow_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Solid Bricks</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                keyboardType="numeric"
                value={rateTable.brick_solid_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, brick_solid_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fly Ash Bricks</Text>
              <TextInput
                style={styles.input}
                placeholder="9"
                keyboardType="numeric"
                value={rateTable.brick_flyash_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, brick_flyash_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>AAC Blocks</Text>
              <TextInput
                style={styles.input}
                placeholder="35"
                keyboardType="numeric"
                value={rateTable.brick_aac_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, brick_aac_per_unit: val }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Eco Bricks</Text>
              <TextInput
                style={styles.input}
                placeholder="7"
                keyboardType="numeric"
                value={rateTable.brick_eco_per_unit}
                onChangeText={(val) => setRateTable(prev => ({ ...prev, brick_eco_per_unit: val }))}
              />
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Create Preset</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  footer: {
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
    backgroundColor: Colors.secondary,
    padding: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
