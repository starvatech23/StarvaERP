import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRScanner from '../../components/QRScanner';
import { materialsAPI, inventoryAPI } from '../../services/api';

export default function MaterialScanScreen() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [materialInfo, setMaterialInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const handleScan = async (data: string) => {
    setScannedData(data);
    await lookupMaterial(data);
  };

  const lookupMaterial = async (code: string) => {
    setLoading(true);
    try {
      // Try to find material by code or ID
      const response = await materialsAPI.getAll();
      const material = response.data?.find((m: any) => 
        m.id === code || m.material_code === code || m.name.toLowerCase().includes(code.toLowerCase())
      );
      
      if (material) {
        setMaterialInfo(material);
        // Get inventory info
        try {
          const invResponse = await inventoryAPI.getAll();
          const inventory = invResponse.data?.find((inv: any) => inv.material_id === material.id);
          if (inventory) {
            setMaterialInfo({ ...material, current_stock: inventory.quantity });
          }
        } catch (error) {
          console.error('Error fetching inventory:', error);
        }
      } else {
        Alert.alert('Not Found', 'Material not found in database');
      }
    } catch (error) {
      console.error('Error looking up material:', error);
      Alert.alert('Error', 'Failed to lookup material');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!materialInfo || !quantity) {
      Alert.alert('Error', 'Please scan a material and enter quantity');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      // Update inventory
      const transactionData = {
        material_id: materialInfo.id,
        quantity: action === 'add' ? qty : -qty,
        transaction_type: action === 'add' ? 'in' : 'out',
        notes: notes || `Scanned transaction - ${action === 'add' ? 'Added' : 'Removed'} ${qty} ${materialInfo.unit}`,
      };

      // Call transaction API
      await inventoryAPI.createTransaction(transactionData);
      
      Alert.alert(
        'Success',
        `${action === 'add' ? 'Added' : 'Removed'} ${qty} ${materialInfo.unit} ${action === 'add' ? 'to' : 'from'} inventory`,
        [
          {
            text: 'Scan Another',
            onPress: () => {
              setScannedData('');
              setMaterialInfo(null);
              setQuantity('');
              setNotes('');
              setShowScanner(true);
            },
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error updating inventory:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Material</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Scan Button */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setShowScanner(true)}
        >
          <Ionicons name="qr-code-outline" size={48} color="Colors.surface" />
          <Text style={styles.scanButtonText}>Tap to Scan QR Code</Text>
        </TouchableOpacity>

        {/* Manual Entry Option */}
        <View style={styles.orDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Enter Material ID or Code</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={scannedData}
              onChangeText={setScannedData}
              placeholder="Material ID or code"
              placeholderTextColor="#A0AEC0"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => lookupMaterial(scannedData)}
              disabled={!scannedData || loading}
            >
              <Ionicons name="search" size={20} color="Colors.surface" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Material Info */}
        {materialInfo && (
          <View style={styles.materialCard}>
            <View style={styles.materialHeader}>
              <Ionicons name="cube" size={32} color="#8B5CF6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.materialName}>{materialInfo.name}</Text>
                <Text style={styles.materialCategory}>{materialInfo.category}</Text>
              </View>
            </View>

            <View style={styles.materialDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Unit:</Text>
                <Text style={styles.detailValue}>{materialInfo.unit}</Text>
              </View>
              {materialInfo.current_stock !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Stock:</Text>
                  <Text style={[styles.detailValue, { fontWeight: '700', color: '#10B981' }]}>
                    {materialInfo.current_stock} {materialInfo.unit}
                  </Text>
                </View>
              )}
              {materialInfo.material_code && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Code:</Text>
                  <Text style={styles.detailValue}>{materialInfo.material_code}</Text>
                </View>
              )}
            </View>

            {/* Action Selection */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  action === 'add' && styles.actionButtonActive,
                  { backgroundColor: action === 'add' ? '#10B981' : '#D1FAE5' },
                ]}
                onPress={() => setAction('add')}
              >
                <Ionicons name="add" size={20} color={action === 'add' ? Colors.surface : '#10B981'} />
                <Text
                  style={[
                    styles.actionButtonText,
                    action === 'add' && { color: Colors.surface },
                  ]}
                >
                  Add Stock
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  action === 'remove' && styles.actionButtonActive,
                  { backgroundColor: action === 'remove' ? '#EF4444' : '#FEE2E2' },
                ]}
                onPress={() => setAction('remove')}
              >
                <Ionicons name="remove" size={20} color={action === 'remove' ? Colors.surface : '#EF4444'} />
                <Text
                  style={[
                    styles.actionButtonText,
                    action === 'remove' && { color: Colors.surface },
                  ]}
                >
                  Remove Stock
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quantity Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity *</Text>
              <View style={styles.quantityRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>{materialInfo.unit}</Text>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes (optional)"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
                { backgroundColor: action === 'add' ? '#10B981' : '#EF4444' },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing...' : `${action === 'add' ? 'Add' : 'Remove'} Stock`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <QRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title="Scan Material QR Code"
      />
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
    padding: 16,
  },
  scanButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scanButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  materialName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  materialCategory: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  materialDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingRight: 12,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  submitButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  submitButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
