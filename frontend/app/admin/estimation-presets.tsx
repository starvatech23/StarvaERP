import React, { useState, useEffect } from 'react';
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
import Colors from '../../constants/Colors';
import { estimationAPI } from '../../services/api';

export default function EstimationPresetsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<any[]>([]);
  
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await estimationAPI.getMaterialPresets();
      setPresets(response.data || []);
    } catch (error: any) {
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Estimation Presets</Text>
          <Text style={styles.headerSubtitle}>{presets.length} preset(s) available</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/admin/estimation-presets/create')}
          style={styles.createButton}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {presets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calculator-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Presets Created</Text>
            <Text style={styles.emptyText}>Create your first estimation preset to get started</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/admin/estimation-presets/create')}
            >
              <Ionicons name="add-circle" size={20} color={Colors.white} />
              <Text style={styles.emptyButtonText}>Create Preset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          presets.map((preset) => (
            <TouchableOpacity 
              key={preset.id}
              style={styles.presetCard}
              onPress={() => Alert.alert('Coming Soon', 'Edit preset functionality coming soon')}
            >
              <View style={styles.presetHeader}>
                <View style={styles.presetIcon}>
                  <Ionicons name="calculator" size={24} color={Colors.primary} />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={styles.presetName}>{preset.name}</Text>
                  {preset.description && (
                    <Text style={styles.presetDescription}>{preset.description}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.presetDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cost per Sqft Ranges:</Text>
                </View>
                <View style={styles.costGrid}>
                  {preset.cost_per_sqft_basic && (
                    <View style={styles.costItem}>
                      <Text style={styles.costLabel}>Basic</Text>
                      <Text style={styles.costValue}>₹{preset.cost_per_sqft_basic}/sqft</Text>
                    </View>
                  )}
                  {preset.cost_per_sqft_standard && (
                    <View style={styles.costItem}>
                      <Text style={styles.costLabel}>Standard</Text>
                      <Text style={styles.costValue}>₹{preset.cost_per_sqft_standard}/sqft</Text>
                    </View>
                  )}
                  {preset.cost_per_sqft_premium && (
                    <View style={styles.costItem}>
                      <Text style={styles.costLabel}>Premium</Text>
                      <Text style={styles.costValue}>₹{preset.cost_per_sqft_premium}/sqft</Text>
                    </View>
                  )}
                  {preset.cost_per_sqft_luxury && (
                    <View style={styles.costItem}>
                      <Text style={styles.costLabel}>Luxury</Text>
                      <Text style={styles.costValue}>₹{preset.cost_per_sqft_luxury}/sqft</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.presetFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="construct" size={14} color={Colors.textSecondary} />
                  <Text style={styles.footerText}>Cement: {preset.cement_per_cum} bags/cum</Text>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="flash" size={14} color={Colors.textSecondary} />
                  <Text style={styles.footerText}>Steel: {preset.steel_kg_per_cum_slab} kg/cum</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// OLD CODE STARTS HERE - REMOVE ALL BELOW
const _oldCode = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Material Preset State
  const [materialPreset, setMaterialPreset] = useState({
    name: 'Standard Mix',
    cement_per_cum: '7.0',
    sand_per_cum: '0.42',
    aggregate_per_cum: '0.84',
    steel_kg_per_cum_foundation: '80.0',
    steel_kg_per_cum_column: '150.0',
    steel_kg_per_cum_beam: '120.0',
    steel_kg_per_cum_slab: '100.0',
    blocks_per_sqm: '12.5',
    mortar_per_sqm: '0.02',
    concrete_wastage: '0.05',
    steel_wastage: '0.08',
    block_wastage: '0.05',
  });

  // Rate Table State
  const [rateTable, setRateTable] = useState({
    name: 'Standard Rates 2025',
    location: 'Default',
    cement_per_bag: '400',
    sand_per_cum: '1200',
    aggregate_per_cum: '1400',
    steel_per_kg: '65',
    // Masonry - Blocks
    block_4inch_per_unit: '28',
    block_6inch_per_unit: '38',
    block_8inch_per_unit: '45',
    block_10inch_per_unit: '52',
    block_12inch_per_unit: '60',
    // Masonry - Brick Types
    brick_wirecut_red_per_unit: '12',
    brick_standard_per_unit: '8',
    brick_hollow_per_unit: '15',
    brick_solid_per_unit: '10',
    brick_flyash_per_unit: '9',
    brick_aac_per_unit: '35',
    brick_eco_per_unit: '7',
    // Services
    labour_per_sqft: '45',
    electrical_per_sqft: '120',
    plumbing_per_sqft: '80',
    painting_per_sqft: '35',
    contractor_overhead_percent: '10',
  });

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      console.log('Loading presets from API...');
      
      // Load material preset
      const materialResponse = await estimationAPI.getDefaultMaterialPreset();
      console.log('Material preset loaded:', materialResponse.data);
      
      if (materialResponse.data) {
        const mp = materialResponse.data;
        setMaterialPreset({
          name: mp.name || 'Standard Mix',
          cement_per_cum: mp.cement_per_cum?.toString() || '7.0',
          sand_per_cum: mp.sand_per_cum?.toString() || '0.42',
          aggregate_per_cum: mp.aggregate_per_cum?.toString() || '0.84',
          steel_kg_per_cum_foundation: mp.steel_kg_per_cum_foundation?.toString() || '80.0',
          steel_kg_per_cum_column: mp.steel_kg_per_cum_column?.toString() || '150.0',
          steel_kg_per_cum_beam: mp.steel_kg_per_cum_beam?.toString() || '120.0',
          steel_kg_per_cum_slab: mp.steel_kg_per_cum_slab?.toString() || '100.0',
          blocks_per_sqm: mp.blocks_per_sqm?.toString() || '12.5',
          mortar_per_sqm: mp.mortar_per_sqm?.toString() || '0.02',
          concrete_wastage: mp.concrete_wastage?.toString() || '0.05',
          steel_wastage: mp.steel_wastage?.toString() || '0.08',
          block_wastage: mp.block_wastage?.toString() || '0.05',
        });
      }
      
      // Load rate table
      const rateResponse = await estimationAPI.getDefaultRateTable();
      console.log('Rate table loaded:', rateResponse.data);
      
      if (rateResponse.data) {
        const rt = rateResponse.data;
        setRateTable({
          name: rt.name || 'Standard Rates 2025',
          location: rt.location || 'Default',
          cement_per_bag: rt.cement_per_bag?.toString() || '400',
          sand_per_cum: rt.sand_per_cum?.toString() || '1200',
          aggregate_per_cum: rt.aggregate_per_cum?.toString() || '1400',
          steel_per_kg: rt.steel_per_kg?.toString() || '65',
          block_8inch_per_unit: rt.block_8inch_per_unit?.toString() || '45',
          brick_per_unit: rt.brick_per_unit?.toString() || '8',
          labour_per_sqft: rt.labour_per_sqft?.toString() || '45',
          electrical_per_sqft: rt.electrical_per_sqft?.toString() || '120',
          plumbing_per_sqft: rt.plumbing_per_sqft?.toString() || '80',
          painting_per_sqft: rt.painting_per_sqft?.toString() || '35',
          contractor_overhead_percent: rt.contractor_overhead_percent?.toString() || '10',
        });
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load presets:', error);
      Alert.alert('Info', 'Loading default presets. No custom presets found yet.');
      setLoading(false);
    }
  };

  const updateMaterialField = (field: string, value: string) => {
    setMaterialPreset(prev => ({ ...prev, [field]: value }));
  };

  const updateRateField = (field: string, value: string) => {
    setRateTable(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate inputs
      const materialValues = Object.entries(materialPreset);
      const rateValues = Object.entries(rateTable);
      
      for (const [key, value] of [...materialValues, ...rateValues]) {
        if (key !== 'name' && key !== 'location') {
          const num = parseFloat(value as string);
          if (isNaN(num) || num < 0) {
            Alert.alert('Validation Error', `Invalid value for ${key}`);
            setSaving(false);
            return;
          }
        }
      }

      console.log('Saving material preset...');
      // Convert strings to numbers for material preset
      const materialData = {
        name: materialPreset.name,
        cement_per_cum: parseFloat(materialPreset.cement_per_cum),
        sand_per_cum: parseFloat(materialPreset.sand_per_cum),
        aggregate_per_cum: parseFloat(materialPreset.aggregate_per_cum),
        steel_kg_per_cum_foundation: parseFloat(materialPreset.steel_kg_per_cum_foundation),
        steel_kg_per_cum_column: parseFloat(materialPreset.steel_kg_per_cum_column),
        steel_kg_per_cum_beam: parseFloat(materialPreset.steel_kg_per_cum_beam),
        steel_kg_per_cum_slab: parseFloat(materialPreset.steel_kg_per_cum_slab),
        blocks_per_sqm: parseFloat(materialPreset.blocks_per_sqm),
        mortar_per_sqm: parseFloat(materialPreset.mortar_per_sqm),
        concrete_wastage: parseFloat(materialPreset.concrete_wastage),
        steel_wastage: parseFloat(materialPreset.steel_wastage),
        block_wastage: parseFloat(materialPreset.block_wastage),
      };
      
      await estimationAPI.updateDefaultMaterialPreset(materialData);
      console.log('Material preset saved successfully');

      console.log('Saving rate table...');
      // Convert strings to numbers for rate table
      const rateData = {
        name: rateTable.name,
        location: rateTable.location,
        cement_per_bag: parseFloat(rateTable.cement_per_bag),
        sand_per_cum: parseFloat(rateTable.sand_per_cum),
        aggregate_per_cum: parseFloat(rateTable.aggregate_per_cum),
        steel_per_kg: parseFloat(rateTable.steel_per_kg),
        block_8inch_per_unit: parseFloat(rateTable.block_8inch_per_unit),
        brick_per_unit: parseFloat(rateTable.brick_per_unit),
        labour_per_sqft: parseFloat(rateTable.labour_per_sqft),
        electrical_per_sqft: parseFloat(rateTable.electrical_per_sqft),
        plumbing_per_sqft: parseFloat(rateTable.plumbing_per_sqft),
        painting_per_sqft: parseFloat(rateTable.painting_per_sqft),
        contractor_overhead_percent: parseFloat(rateTable.contractor_overhead_percent),
      };
      
      await estimationAPI.updateDefaultRateTable(rateData);
      console.log('Rate table saved successfully');

      Alert.alert(
        'Success',
        'Presets saved successfully! These will be used as defaults for all new estimates.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save presets');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all values to factory defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            loadPresets();
            Alert.alert('Success', 'Presets reset to defaults');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Estimation Presets</Text>
          <Text style={styles.headerSubtitle}>Configure calculation defaults</Text>
        </View>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Material Coefficients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Material Coefficients</Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Preset Name"
              value={materialPreset.name}
              onChangeText={(val) => updateMaterialField('name', val)}
              placeholder="e.g., Standard Mix"
            />

            <Text style={styles.groupTitle}>Concrete Mix (per cum)</Text>
            <InputField
              label="Cement (bags)"
              value={materialPreset.cement_per_cum}
              onChangeText={(val) => updateMaterialField('cement_per_cum', val)}
              keyboardType="numeric"
              hint="Bags of cement per cubic meter"
            />
            <InputField
              label="Sand (cum)"
              value={materialPreset.sand_per_cum}
              onChangeText={(val) => updateMaterialField('sand_per_cum', val)}
              keyboardType="numeric"
              hint="Cubic meters of sand per cum concrete"
            />
            <InputField
              label="Aggregate (cum)"
              value={materialPreset.aggregate_per_cum}
              onChangeText={(val) => updateMaterialField('aggregate_per_cum', val)}
              keyboardType="numeric"
              hint="Cubic meters of aggregate per cum concrete"
            />

            <Text style={styles.groupTitle}>Steel Requirements (kg/cum)</Text>
            <InputField
              label="Foundation Steel"
              value={materialPreset.steel_kg_per_cum_foundation}
              onChangeText={(val) => updateMaterialField('steel_kg_per_cum_foundation', val)}
              keyboardType="numeric"
            />
            <InputField
              label="Column Steel"
              value={materialPreset.steel_kg_per_cum_column}
              onChangeText={(val) => updateMaterialField('steel_kg_per_cum_column', val)}
              keyboardType="numeric"
            />
            <InputField
              label="Beam Steel"
              value={materialPreset.steel_kg_per_cum_beam}
              onChangeText={(val) => updateMaterialField('steel_kg_per_cum_beam', val)}
              keyboardType="numeric"
            />
            <InputField
              label="Slab Steel"
              value={materialPreset.steel_kg_per_cum_slab}
              onChangeText={(val) => updateMaterialField('steel_kg_per_cum_slab', val)}
              keyboardType="numeric"
            />

            <Text style={styles.groupTitle}>Masonry</Text>
            <InputField
              label="Blocks per sqm"
              value={materialPreset.blocks_per_sqm}
              onChangeText={(val) => updateMaterialField('blocks_per_sqm', val)}
              keyboardType="numeric"
            />
            <InputField
              label="Mortar per sqm (cum)"
              value={materialPreset.mortar_per_sqm}
              onChangeText={(val) => updateMaterialField('mortar_per_sqm', val)}
              keyboardType="numeric"
            />

            <Text style={styles.groupTitle}>Wastage Factors (%)</Text>
            <InputField
              label="Concrete Wastage"
              value={(parseFloat(materialPreset.concrete_wastage) * 100).toString()}
              onChangeText={(val) => updateMaterialField('concrete_wastage', (parseFloat(val) / 100).toString())}
              keyboardType="numeric"
              hint="Percentage (e.g., 5 for 5%)"
            />
            <InputField
              label="Steel Wastage"
              value={(parseFloat(materialPreset.steel_wastage) * 100).toString()}
              onChangeText={(val) => updateMaterialField('steel_wastage', (parseFloat(val) / 100).toString())}
              keyboardType="numeric"
              hint="Percentage (e.g., 8 for 8%)"
            />
            <InputField
              label="Block Wastage"
              value={(parseFloat(materialPreset.block_wastage) * 100).toString()}
              onChangeText={(val) => updateMaterialField('block_wastage', (parseFloat(val) / 100).toString())}
              keyboardType="numeric"
              hint="Percentage (e.g., 5 for 5%)"
            />
          </View>
        </View>

        {/* Rate Table Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={24} color={Colors.success} />
            <Text style={styles.sectionTitle}>Rate Table</Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Rate Table Name"
              value={rateTable.name}
              onChangeText={(val) => updateRateField('name', val)}
              placeholder="e.g., Standard Rates 2025"
            />
            <InputField
              label="Location"
              value={rateTable.location}
              onChangeText={(val) => updateRateField('location', val)}
              placeholder="e.g., Bangalore, Mumbai"
            />

            <Text style={styles.groupTitle}>Material Rates (₹)</Text>
            <InputField
              label="Cement per bag (50kg)"
              value={rateTable.cement_per_bag}
              onChangeText={(val) => updateRateField('cement_per_bag', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="Sand per cum"
              value={rateTable.sand_per_cum}
              onChangeText={(val) => updateRateField('sand_per_cum', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="Aggregate per cum"
              value={rateTable.aggregate_per_cum}
              onChangeText={(val) => updateRateField('aggregate_per_cum', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="Steel per kg"
              value={rateTable.steel_per_kg}
              onChangeText={(val) => updateRateField('steel_per_kg', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="8-inch Block per unit"
              value={rateTable.block_8inch_per_unit}
              onChangeText={(val) => updateRateField('block_8inch_per_unit', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="Brick per unit"
              value={rateTable.brick_per_unit}
              onChangeText={(val) => updateRateField('brick_per_unit', val)}
              keyboardType="numeric"
              prefix="₹"
            />

            <Text style={styles.groupTitle}>Service Rates (₹/sqft)</Text>
            <InputField
              label="Labour per sqft"
              value={rateTable.labour_per_sqft}
              onChangeText={(val) => updateRateField('labour_per_sqft', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="Electrical per sqft"
              value={rateTable.electrical_per_sqft}
              onChangeText={(val) => updateRateField('electrical_per_sqft', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="Plumbing per sqft"
              value={rateTable.plumbing_per_sqft}
              onChangeText={(val) => updateRateField('plumbing_per_sqft', val)}
              keyboardType="numeric"
              prefix="₹"
            />
            <InputField
              label="Painting per sqft"
              value={rateTable.painting_per_sqft}
              onChangeText={(val) => updateRateField('painting_per_sqft', val)}
              keyboardType="numeric"
              prefix="₹"
            />

            <Text style={styles.groupTitle}>Overhead</Text>
            <InputField
              label="Contractor Overhead (%)"
              value={rateTable.contractor_overhead_percent}
              onChangeText={(val) => updateRateField('contractor_overhead_percent', val)}
              keyboardType="numeric"
              hint="Percentage (e.g., 10 for 10%)"
            />
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
              <Text style={styles.saveButtonText}>Save Presets</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  hint?: string;
  prefix?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  hint,
  prefix,
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, prefix && styles.inputWithPrefix]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor={Colors.textTertiary}
        />
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
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
  resetButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    position: 'absolute',
    left: 14,
    fontSize: 15,
    color: Colors.textSecondary,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputWithPrefix: {
    paddingLeft: 28,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
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
