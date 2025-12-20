import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';
import Colors from '../../../constants/Colors';
import { workersAPI, projectsAPI, weeklyPaymentsAPI, advancePaymentsAPI } from '../../../services/api';
import { useActivityModal } from '../../../components/ActivityConfirmationModal';

export default function CreatePaymentScreen() {
  const router = useRouter();
  const { showSuccess, showError, showWarning, ActivityModal } = useActivityModal();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<'weekly' | 'advance'>('weekly');
  
  // Form state
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(moment().startOf('week').format('YYYY-MM-DD'));
  const [weekEndDate, setWeekEndDate] = useState(moment().endOf('week').format('YYYY-MM-DD'));
  const [daysWorked, setDaysWorked] = useState('0');
  const [hoursWorked, setHoursWorked] = useState('0');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [baseAmount, setBaseAmount] = useState('0');
  const [overtimeAmount, setOvertimeAmount] = useState('0');
  const [bonusAmount, setBonusAmount] = useState('0');
  const [advanceDeduction, setAdvanceDeduction] = useState('0');
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [deductionNotes, setDeductionNotes] = useState('');
  const [notes, setNotes] = useState('');
  
  // Advance payment fields
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [recoveryMode, setRecoveryMode] = useState('full');
  const [installmentAmount, setInstallmentAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersRes, projectsRes] = await Promise.all([
        workersAPI.getAll(),
        projectsAPI.getAll()
      ]);
      setWorkers(workersRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Loading Failed', 'Failed to load workers and projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateGross = () => {
    const base = parseFloat(baseAmount) || 0;
    const overtime = parseFloat(overtimeAmount) || 0;
    const bonus = parseFloat(bonusAmount) || 0;
    return base + overtime + bonus;
  };

  const calculateNet = () => {
    const gross = calculateGross();
    const advDed = parseFloat(advanceDeduction) || 0;
    const otherDed = parseFloat(otherDeductions) || 0;
    return gross - advDed - otherDed;
  };

  const handleSave = async () => {
    if (!selectedWorker) {
      showError('Missing Information', 'Please select a worker');
      return;
    }
    if (!selectedProject) {
      showError('Missing Information', 'Please select a project');
      return;
    }

    setSaving(true);
    try {
      if (paymentType === 'weekly') {
        const paymentData = {
          worker_id: selectedWorker,
          project_id: selectedProject,
          week_start_date: new Date(weekStartDate).toISOString(),
          week_end_date: new Date(weekEndDate).toISOString(),
          days_worked: parseFloat(daysWorked) || 0,
          hours_worked: parseFloat(hoursWorked) || 0,
          overtime_hours: parseFloat(overtimeHours) || 0,
          base_amount: parseFloat(baseAmount) || 0,
          overtime_amount: parseFloat(overtimeAmount) || 0,
          bonus_amount: parseFloat(bonusAmount) || 0,
          gross_amount: calculateGross(),
          advance_deduction: parseFloat(advanceDeduction) || 0,
          other_deductions: parseFloat(otherDeductions) || 0,
          deduction_notes: deductionNotes,
          net_amount: calculateNet(),
          notes: notes,
        };
        await weeklyPaymentsAPI.create(paymentData);
        showSuccess('Payment Created', 'Weekly payment has been created successfully!', true);
      } else {
        if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
          showError('Invalid Amount', 'Please enter a valid advance amount');
          setSaving(false);
          return;
        }
        if (!advanceReason) {
          showError('Missing Information', 'Please enter a reason for the advance');
          setSaving(false);
          return;
        }
        const advanceData = {
          worker_id: selectedWorker,
          project_id: selectedProject,
          amount: parseFloat(advanceAmount),
          reason: advanceReason,
          recovery_mode: recoveryMode,
          installment_amount: recoveryMode === 'installment' ? parseFloat(installmentAmount) || 0 : null,
          notes: notes,
        };
        await advancePaymentsAPI.create(advanceData);
        showSuccess('Advance Requested', 'Advance payment request has been created successfully!', true);
      }
      setTimeout(() => router.back(), 1500);
    } catch (error: any) {
      console.error('Error saving payment:', error);
      showError('Save Failed', error.response?.data?.detail || 'Failed to save payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityModal />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActivityModal />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Payment Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, paymentType === 'weekly' && styles.toggleButtonActive]}
            onPress={() => setPaymentType('weekly')}
          >
            <Ionicons 
              name="calendar" 
              size={20} 
              color={paymentType === 'weekly' ? Colors.surface : Colors.textSecondary} 
            />
            <Text style={[styles.toggleText, paymentType === 'weekly' && styles.toggleTextActive]}>
              Weekly Payment
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, paymentType === 'advance' && styles.toggleButtonActive]}
            onPress={() => setPaymentType('advance')}
          >
            <Ionicons 
              name="cash" 
              size={20} 
              color={paymentType === 'advance' ? Colors.surface : Colors.textSecondary} 
            />
            <Text style={[styles.toggleText, paymentType === 'advance' && styles.toggleTextActive]}>
              Advance Payment
            </Text>
          </TouchableOpacity>
        </View>

        {/* Common Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Worker & Project</Text>
          
          <Text style={styles.label}>Worker *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedWorker}
              onValueChange={setSelectedWorker}
              style={styles.picker}
              dropdownIconColor={Colors.textPrimary}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Select Worker" value="" color={Colors.textTertiary} />
              {workers.map((worker: any) => (
                <Picker.Item 
                  key={worker.id} 
                  label={worker.full_name} 
                  value={worker.id}
                  color={Colors.textPrimary}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Project *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProject}
              onValueChange={setSelectedProject}
              style={styles.picker}
              dropdownIconColor={Colors.textPrimary}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Select Project" value="" color={Colors.textTertiary} />
              {projects.map((project: any) => (
                <Picker.Item 
                  key={project.id} 
                  label={project.name} 
                  value={project.id}
                  color={Colors.textPrimary}
                />
              ))}
            </Picker>
          </View>
        </View>

        {paymentType === 'weekly' ? (
          <>
            {/* Week Period */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Week Period</Text>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Start Date</Text>
                  <TextInput
                    style={styles.input}
                    value={weekStartDate}
                    onChangeText={setWeekStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>End Date</Text>
                  <TextInput
                    style={styles.input}
                    value={weekEndDate}
                    onChangeText={setWeekEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
            </View>

            {/* Work Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work Details</Text>
              <View style={styles.row}>
                <View style={styles.thirdField}>
                  <Text style={styles.label}>Days Worked</Text>
                  <TextInput
                    style={styles.input}
                    value={daysWorked}
                    onChangeText={setDaysWorked}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thirdField}>
                  <Text style={styles.label}>Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={hoursWorked}
                    onChangeText={setHoursWorked}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thirdField}>
                  <Text style={styles.label}>Overtime Hrs</Text>
                  <TextInput
                    style={styles.input}
                    value={overtimeHours}
                    onChangeText={setOvertimeHours}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Earnings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Earnings</Text>
              <View style={styles.row}>
                <View style={styles.thirdField}>
                  <Text style={styles.label}>Base (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={baseAmount}
                    onChangeText={setBaseAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thirdField}>
                  <Text style={styles.label}>Overtime (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={overtimeAmount}
                    onChangeText={setOvertimeAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thirdField}>
                  <Text style={styles.label}>Bonus (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={bonusAmount}
                    onChangeText={setBonusAmount}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Gross Amount:</Text>
                <Text style={styles.totalValue}>₹{calculateGross().toLocaleString()}</Text>
              </View>
            </View>

            {/* Deductions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deductions</Text>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Advance Deduction (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={advanceDeduction}
                    onChangeText={setAdvanceDeduction}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Other Deductions (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={otherDeductions}
                    onChangeText={setOtherDeductions}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Text style={styles.label}>Deduction Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={deductionNotes}
                onChangeText={setDeductionNotes}
                placeholder="Reason for deductions..."
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Net Amount */}
            <View style={styles.netAmountCard}>
              <Text style={styles.netAmountLabel}>Net Payable Amount</Text>
              <Text style={styles.netAmountValue}>₹{calculateNet().toLocaleString()}</Text>
            </View>
          </>
        ) : (
          <>
            {/* Advance Payment Fields */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Advance Details</Text>
              
              <Text style={styles.label}>Advance Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={advanceAmount}
                onChangeText={setAdvanceAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
              />

              <Text style={styles.label}>Reason *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={advanceReason}
                onChangeText={setAdvanceReason}
                placeholder="Reason for advance..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Recovery Mode</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={recoveryMode}
                  onValueChange={setRecoveryMode}
                  style={styles.picker}
                >
                  <Picker.Item label="Full (Deduct from next payment)" value="full" />
                  <Picker.Item label="Installment" value="installment" />
                </Picker>
              </View>

              {recoveryMode === 'installment' && (
                <>
                  <Text style={styles.label}>Installment Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={installmentAmount}
                    onChangeText={setInstallmentAmount}
                    keyboardType="numeric"
                    placeholder="Amount per week"
                  />
                </>
              )}
            </View>
          </>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={Colors.surface} />
              <Text style={styles.saveButtonText}>
                {paymentType === 'weekly' ? 'Create Payment' : 'Submit Request'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.secondary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.surface,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  pickerItem: {
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  thirdField: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  netAmountCard: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  netAmountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  netAmountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
