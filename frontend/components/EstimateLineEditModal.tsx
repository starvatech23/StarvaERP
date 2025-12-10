import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface EstimateLineEditModalProps {
  visible: boolean;
  line: any | null;
  onClose: () => void;
  onSave: (lineId: string, quantity: number, rate: number) => Promise<void>;
}

export default function EstimateLineEditModal({
  visible,
  line,
  onClose,
  onSave,
}: EstimateLineEditModalProps) {
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (line) {
      setQuantity(line.quantity.toString());
      setRate(line.rate.toString());
      setError('');
    }
  }, [line]);

  const calculateAmount = () => {
    const q = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    return q * r;
  };

  const handleSave = async () => {
    // Validation
    const q = parseFloat(quantity);
    const r = parseFloat(rate);

    if (isNaN(q) || q <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }

    if (isNaN(r) || r <= 0) {
      setError('Please enter a valid rate greater than 0');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(line.id, q, r);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!line) return false;
    const q = parseFloat(quantity);
    const r = parseFloat(rate);
    return q !== line.quantity || r !== line.rate;
  };

  if (!line) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Line Item</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Item Info */}
            <View style={styles.infoCard}>
              <Text style={styles.itemName}>{line.item_name}</Text>
              {line.description && (
                <Text style={styles.itemDescription}>{line.description}</Text>
              )}
              
              {line.formula_used && (
                <View style={styles.formulaBox}>
                  <Ionicons name="calculator-outline" size={14} color={Colors.textTertiary} />
                  <Text style={styles.formulaText}>Original: {line.formula_used}</Text>
                </View>
              )}
            </View>

            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <Text style={styles.warningText}>
                Editing will override the auto-calculated values. This change will be tracked.
              </Text>
            </View>

            {/* Quantity Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Quantity <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="Enter quantity"
                />
                <Text style={styles.unit}>{line.unit}</Text>
              </View>
              <Text style={styles.hint}>
                Original: {line.quantity.toLocaleString('en-IN')} {line.unit}
              </Text>
            </View>

            {/* Rate Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Rate <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="numeric"
                  placeholder="Enter rate"
                />
                <Text style={styles.unit}>/{line.unit}</Text>
              </View>
              <Text style={styles.hint}>
                Original: ₹{line.rate.toLocaleString('en-IN')}/{line.unit}
              </Text>
            </View>

            {/* Calculated Amount */}
            <View style={styles.amountCard}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>New Amount:</Text>
                <Text style={styles.amountValue}>
                  ₹{calculateAmount().toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Original Amount:</Text>
                <Text style={styles.originalAmount}>
                  ₹{line.amount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              {hasChanges() && (
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Difference:</Text>
                  <Text style={[
                    styles.differenceAmount,
                    { color: calculateAmount() > line.amount ? Colors.error : Colors.success }
                  ]}>
                    {calculateAmount() > line.amount ? '+' : ''}
                    ₹{(calculateAmount() - line.amount).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              )}
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                (!hasChanges() || saving) && styles.buttonDisabled
              ]}
              onPress={handleSave}
              disabled={!hasChanges() || saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  formulaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 6,
  },
  formulaText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  unit: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  amountCard: {
    backgroundColor: Colors.primaryPale,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  originalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  differenceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.errorLight,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.secondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
