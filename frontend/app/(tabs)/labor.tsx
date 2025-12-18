import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { workersAPI, laborAttendanceAPI, siteTransfersAPI, weeklyPaymentsAPI, advancePaymentsAPI } from '../../services/api';
import moment from 'moment';
import { captureRef } from 'react-native-view-shot';

export default function LaborScreen() {
  const router = useRouter();
  const receiptRef = useRef<View>(null);
  const [activeTab, setActiveTab] = useState<'workers' | 'attendance' | 'transfers' | 'payments' | 'reports'>('workers');
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [paymentsByWorker, setPaymentsByWorker] = useState([]);
  const [paymentsByProject, setPaymentsByProject] = useState([]);
  const [paymentView, setPaymentView] = useState<'worker' | 'project'>('worker');
  const [generating, setGenerating] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab])
  );

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'workers') {
        const response = await workersAPI.getAll();
        setWorkers(response.data || []);
      } else if (activeTab === 'attendance') {
        const response = await laborAttendanceAPI.getAll();
        setAttendance(response.data || []);
      } else if (activeTab === 'transfers') {
        const response = await siteTransfersAPI.getAll();
        setTransfers(response.data || []);
      } else if (activeTab === 'payments') {
        const [paymentsRes, advancesRes, byWorkerRes, byProjectRes, summaryRes] = await Promise.all([
          weeklyPaymentsAPI.getAll(),
          advancePaymentsAPI.getAll(),
          weeklyPaymentsAPI.getByWorker(),
          weeklyPaymentsAPI.getByProject(),
          weeklyPaymentsAPI.getSummary()
        ]);
        setPayments(paymentsRes.data || []);
        setAdvances(advancesRes.data || []);
        setPaymentsByWorker(byWorkerRes.data || []);
        setPaymentsByProject(byProjectRes.data || []);
        setPaymentSummary(summaryRes.data || null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [activeTab]);

  const getSkillColor = (skill: string) => {
    const colors: any = {
      mason: '#EF4444',
      carpenter: '#F59E0B',
      electrician: Colors.primary,
      plumber: '#06B6D4',
      painter: '#8B5CF6',
      welder: '#EC4899',
      helper: '#10B981',
      machine_operator: '#F97316',
      supervisor: '#6366F1',
    };
    return colors[skill] || '#6B7280';
  };

  const renderWorkers = () => {
    if (workers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Workers Yet</Text>
          <Text style={styles.emptyText}>Add workers to start managing your labor force</Text>
        </View>
      );
    }

    return workers.map((worker: any) => (
      <TouchableOpacity
        key={worker.id}
        style={styles.card}
        onPress={() => router.push(`/labor/workers/${worker.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.workerInfo}>
            <Ionicons name="person-circle" size={40} color={Colors.secondary} />
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{worker.full_name}</Text>
              <Text style={styles.workerPhone}>{worker.phone}</Text>
            </View>
          </View>
          <View
            style={[
              styles.skillBadge,
              { backgroundColor: getSkillColor(worker.skill_group) + '20' },
            ]}
          >
            <Text
              style={[
                styles.skillText,
                { color: getSkillColor(worker.skill_group) },
              ]}
            >
              {worker.skill_group.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>₹{worker.base_rate}/{worker.pay_scale}</Text>
          </View>
          {worker.current_site_name && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{worker.current_site_name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ));
  };

  const renderAttendance = () => {
    if (attendance.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Attendance Records</Text>
          <Text style={styles.emptyText}>Mark attendance to track worker hours</Text>
        </View>
      );
    }

    // Group by date
    const groupedByDate: any = {};
    attendance.forEach((record: any) => {
      const date = moment(record.attendance_date).format('YYYY-MM-DD');
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(record);
    });

    return Object.keys(groupedByDate).sort().reverse().slice(0, 10).map(date => (
      <View key={date} style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <Ionicons name="calendar" size={20} color={Colors.secondary} />
          <Text style={styles.attendanceDate}>{moment(date).format('DD MMM YYYY')}</Text>
        </View>
        {groupedByDate[date].map((record: any) => (
          <View key={record.id} style={styles.attendanceRow}>
            <View style={styles.attendanceWorker}>
              <Text style={styles.attendanceWorkerName}>{record.worker_name}</Text>
              <Text style={styles.attendanceProject}>{record.project_name}</Text>
            </View>
            <View style={styles.attendanceStatus}>
              <View
                style={[
                  styles.attendanceStatusBadge,
                  {
                    backgroundColor:
                      record.overtime_hours > 0
                        ? '#F59E0B'
                        : record.status === 'present'
                        ? '#10B981'
                        : '#EF4444',
                  },
                ]}
              >
                <Text style={styles.attendanceStatusText}>
                  {record.overtime_hours > 0 ? 'OT' : record.status === 'present' ? 'P' : 'A'}
                </Text>
              </View>
              <Text style={styles.attendanceHours}>{record.hours_worked}h</Text>
            </View>
          </View>
        ))}
      </View>
    ));
  };

  const renderTransfers = () => {
    if (transfers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Site Transfers</Text>
          <Text style={styles.emptyText}>Transfer workers between sites as needed</Text>
        </View>
      );
    }

    return transfers.map((transfer: any) => (
      <View key={transfer.id} style={styles.card}>
        <View style={styles.transferHeader}>
          <View style={styles.transferInfo}>
            <Ionicons name="person-circle" size={32} color={Colors.secondary} />
            <View style={styles.transferDetails}>
              <Text style={styles.transferWorkerName}>{transfer.worker_name}</Text>
              <Text style={styles.transferDate}>
                {moment(transfer.transfer_date).format('DD MMM YYYY')}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.transferRoute}>
          <View style={styles.siteBox}>
            <Text style={styles.siteLabel}>From</Text>
            <Text style={styles.siteName}>{transfer.from_project_name}</Text>
            {transfer.hours_at_from_site > 0 && (
              <Text style={styles.hours}>{transfer.hours_at_from_site}h</Text>
            )}
          </View>
          
          <Ionicons name="arrow-forward" size={24} color={Colors.secondary} />
          
          <View style={styles.siteBox}>
            <Text style={styles.siteLabel}>To</Text>
            <Text style={styles.siteName}>{transfer.to_project_name}</Text>
            {transfer.hours_at_to_site > 0 && (
              <Text style={styles.hours}>{transfer.hours_at_to_site}h</Text>
            )}
          </View>
        </View>
        
        {transfer.reason && (
          <View style={styles.transferReason}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.reasonText}>{transfer.reason}</Text>
          </View>
        )}
        
        {(transfer.wages_from_site || transfer.wages_to_site) && (
          <View style={styles.wagesSection}>
            <Text style={styles.wagesLabel}>Split Wages:</Text>
            <Text style={styles.wagesValue}>
              ₹{transfer.wages_from_site?.toFixed(2) || 0} + ₹{transfer.wages_to_site?.toFixed(2) || 0}
            </Text>
          </View>
        )}
      </View>
    ));
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: any = {
      draft: '#6B7280',
      pending_validation: '#F59E0B',
      validated: '#3B82F6',
      pending_payment: '#F97316',
      otp_sent: '#8B5CF6',
      paid: '#10B981',
      failed: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getAdvanceStatusColor = (status: string) => {
    const colors: any = {
      requested: '#F59E0B',
      approved: '#3B82F6',
      rejected: '#EF4444',
      disbursed: '#8B5CF6',
      recovered: '#10B981',
    };
    return colors[status] || '#6B7280';
  };

  const handleGeneratePayments = async () => {
    setGenerating(true);
    try {
      // Generate for last week (where attendance data likely exists)
      const weekStart = moment().subtract(1, 'week').startOf('week').format('YYYY-MM-DD');
      const weekEnd = moment().subtract(1, 'week').endOf('week').format('YYYY-MM-DD');
      const response = await weeklyPaymentsAPI.generateWeekly(weekStart, weekEnd);
      
      if (response.data?.created_count > 0) {
        Alert.alert('Success', response.data?.message || 'Payments generated');
      } else {
        // Try current week if last week had no data
        const currentWeekStart = moment().startOf('week').format('YYYY-MM-DD');
        const currentWeekEnd = moment().endOf('week').format('YYYY-MM-DD');
        const currentResponse = await weeklyPaymentsAPI.generateWeekly(currentWeekStart, currentWeekEnd);
        Alert.alert('Info', currentResponse.data?.message || 'No new attendance data found for payment generation');
      }
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate payments');
    } finally {
      setGenerating(false);
    }
  };

  const handleValidatePayment = async (paymentId: string) => {
    try {
      await weeklyPaymentsAPI.validate(paymentId);
      Alert.alert('Success', 'Payment validated successfully');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to validate payment');
    }
  };

  const handleSendOTP = async (paymentId: string) => {
    try {
      const response = await weeklyPaymentsAPI.sendOTP(paymentId);
      Alert.alert('OTP Sent', response.data?.message || 'OTP sent to worker\'s mobile');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    }
  };

  const handleMarkPaid = (payment: any) => {
    Alert.alert(
      'Enter OTP',
      `Enter the 6-digit OTP sent to worker's mobile to confirm payment of ₹${payment.net_amount?.toLocaleString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend OTP',
          onPress: async () => {
            try {
              const response = await weeklyPaymentsAPI.sendOTP(payment.id);
              Alert.alert('OTP Resent', response.data?.message || 'New OTP sent to worker\'s mobile');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to resend OTP');
            }
          },
        },
        {
          text: 'Enter OTP',
          onPress: () => {
            Alert.prompt(
              'Verify OTP',
              'Enter 6-digit OTP:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Verify & Pay',
                  onPress: async (otp) => {
                    if (!otp || otp.length !== 6) {
                      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
                      return;
                    }
                    try {
                      const response = await weeklyPaymentsAPI.verifyOTP(payment.id, otp, 'cash');
                      // Show receipt popup
                      if (response.data?.receipt) {
                        setReceiptData(response.data.receipt);
                        setShowReceipt(true);
                        // Schedule screenshot capture after modal is fully visible
                        setTimeout(() => captureAndUploadReceipt(response.data.receipt.payment_id), 500);
                      } else {
                        Alert.alert('Success', 'Payment marked as paid');
                      }
                      loadData();
                    } catch (error: any) {
                      Alert.alert('Error', error.response?.data?.detail || 'Invalid OTP');
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const captureAndUploadReceipt = async (paymentId: string) => {
    if (!receiptRef.current) return;
    
    try {
      setUploadingReceipt(true);
      
      // Capture the receipt modal as base64 image
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 0.8,
        result: 'base64',
      });
      
      // Upload to backend
      await weeklyPaymentsAPI.uploadReceipt(paymentId, `data:image/png;base64,${uri}`);
      console.log('Receipt uploaded successfully');
    } catch (error) {
      console.error('Error capturing receipt:', error);
      // Don't show alert as this is a background operation
    } finally {
      setUploadingReceipt(false);
    }
  };

  const renderPayments = () => {
    const hasData = paymentsByWorker.length > 0 || paymentsByProject.length > 0 || advances.length > 0;
    
    return (
      <View>
        {/* Summary Card */}
        {paymentSummary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{paymentSummary.total_workers || 0}</Text>
                <Text style={styles.summaryLabel}>Workers</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>₹{(paymentSummary.total_net_amount || 0).toLocaleString()}</Text>
                <Text style={styles.summaryLabel}>Total Payable</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryItem, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>{paymentSummary.paid_count || 0}</Text>
                <Text style={styles.summaryLabel}>Paid</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{paymentSummary.pending_count || 0}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
            </View>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, generating && { opacity: 0.7 }]}
          onPress={handleGeneratePayments}
          disabled={generating}
        >
          <Ionicons name="flash" size={18} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>
            {generating ? 'Generating...' : 'Generate Weekly Payments'}
          </Text>
        </TouchableOpacity>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, paymentView === 'worker' && styles.viewToggleBtnActive]}
            onPress={() => setPaymentView('worker')}
          >
            <Ionicons name="person" size={16} color={paymentView === 'worker' ? '#FFF' : Colors.textSecondary} />
            <Text style={[styles.viewToggleText, paymentView === 'worker' && styles.viewToggleTextActive]}>
              By Labour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, paymentView === 'project' && styles.viewToggleBtnActive]}
            onPress={() => setPaymentView('project')}
          >
            <Ionicons name="business" size={16} color={paymentView === 'project' ? '#FFF' : Colors.textSecondary} />
            <Text style={[styles.viewToggleText, paymentView === 'project' && styles.viewToggleTextActive]}>
              By Project
            </Text>
          </TouchableOpacity>
        </View>

        {/* Labour-wise View */}
        {paymentView === 'worker' && (
          <View>
            <Text style={styles.paymentsSectionTitle}>Labour-wise Payments</Text>
            {paymentsByWorker.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="person-outline" size={48} color="#CBD5E0" />
                <Text style={styles.emptyCardText}>No worker payments found</Text>
                <Text style={styles.emptyCardSubtext}>Generate payments from attendance data</Text>
              </View>
            ) : (
              paymentsByWorker.map((worker: any) => (
                <View key={worker.worker_id} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View style={styles.workerInfo}>
                      <Ionicons name="person-circle" size={40} color={Colors.secondary} />
                      <View style={styles.workerDetails}>
                        <Text style={styles.workerName}>{worker.worker_name}</Text>
                        <Text style={styles.workerPhone}>{worker.worker_skill || 'Worker'}</Text>
                      </View>
                    </View>
                    <View style={styles.groupTotals}>
                      <Text style={styles.groupTotalLabel}>Net Payable</Text>
                      <Text style={styles.groupTotalValue}>₹{worker.total_net?.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.groupStats}>
                    <View style={styles.groupStatItem}>
                      <Text style={styles.groupStatValue}>{worker.payments?.length || 0}</Text>
                      <Text style={styles.groupStatLabel}>Weeks</Text>
                    </View>
                    <View style={styles.groupStatItem}>
                      <Text style={[styles.groupStatValue, { color: '#10B981' }]}>₹{worker.paid_amount?.toLocaleString()}</Text>
                      <Text style={styles.groupStatLabel}>Paid</Text>
                    </View>
                    <View style={styles.groupStatItem}>
                      <Text style={[styles.groupStatValue, { color: '#F59E0B' }]}>₹{worker.pending_amount?.toLocaleString()}</Text>
                      <Text style={styles.groupStatLabel}>Pending</Text>
                    </View>
                  </View>
                  {/* Individual Payments */}
                  {worker.payments?.slice(0, 3).map((pmt: any) => (
                    <View key={pmt.id} style={styles.subPaymentItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subPaymentProject}>{pmt.project_name}</Text>
                        <Text style={styles.subPaymentWeek}>
                          {moment(pmt.week_start_date).format('DD MMM')} - {moment(pmt.week_end_date).format('DD MMM')}
                        </Text>
                        <View style={styles.paymentActions}>
                          {pmt.status === 'draft' && (
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#3B82F620' }]}
                              onPress={() => handleValidatePayment(pmt.id)}
                            >
                              <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                              <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Validate</Text>
                            </TouchableOpacity>
                          )}
                          {pmt.status === 'validated' && (
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#8B5CF620' }]}
                              onPress={() => handleSendOTP(pmt.id)}
                            >
                              <Ionicons name="send" size={14} color="#8B5CF6" />
                              <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>Send OTP</Text>
                            </TouchableOpacity>
                          )}
                          {pmt.status === 'otp_sent' && (
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#10B98120' }]}
                              onPress={() => handleMarkPaid(pmt)}
                            >
                              <Ionicons name="cash" size={14} color="#10B981" />
                              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Enter OTP</Text>
                            </TouchableOpacity>
                          )}
                          {pmt.status === 'paid' && (
                            <View style={[styles.actionBtn, { backgroundColor: '#10B98120' }]}>
                              <Ionicons name="checkmark-done" size={14} color="#10B981" />
                              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Paid</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.subPaymentRight}>
                        <Text style={styles.subPaymentAmount}>₹{pmt.net_amount?.toLocaleString()}</Text>
                        <View style={[styles.miniStatusBadge, { backgroundColor: getPaymentStatusColor(pmt.status) + '20' }]}>
                          <Text style={[styles.miniStatusText, { color: getPaymentStatusColor(pmt.status) }]}>
                            {pmt.status?.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* Project-wise View */}
        {paymentView === 'project' && (
          <View>
            <Text style={styles.paymentsSectionTitle}>Project-wise Payments</Text>
            {paymentsByProject.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="business-outline" size={48} color="#CBD5E0" />
                <Text style={styles.emptyCardText}>No project payments found</Text>
                <Text style={styles.emptyCardSubtext}>Generate payments from attendance data</Text>
              </View>
            ) : (
              paymentsByProject.map((project: any) => (
                <View key={project.project_id} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View style={styles.workerInfo}>
                      <Ionicons name="business" size={40} color={Colors.primary} />
                      <View style={styles.workerDetails}>
                        <Text style={styles.workerName}>{project.project_name}</Text>
                        <Text style={styles.workerPhone}>{project.total_workers} workers</Text>
                      </View>
                    </View>
                    <View style={styles.groupTotals}>
                      <Text style={styles.groupTotalLabel}>Total Payable</Text>
                      <Text style={styles.groupTotalValue}>₹{project.total_net?.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.groupStats}>
                    <View style={styles.groupStatItem}>
                      <Text style={styles.groupStatValue}>{project.payments?.length || 0}</Text>
                      <Text style={styles.groupStatLabel}>Payments</Text>
                    </View>
                    <View style={styles.groupStatItem}>
                      <Text style={[styles.groupStatValue, { color: '#10B981' }]}>₹{project.paid_amount?.toLocaleString()}</Text>
                      <Text style={styles.groupStatLabel}>Paid</Text>
                    </View>
                    <View style={styles.groupStatItem}>
                      <Text style={[styles.groupStatValue, { color: '#F59E0B' }]}>₹{project.pending_amount?.toLocaleString()}</Text>
                      <Text style={styles.groupStatLabel}>Pending</Text>
                    </View>
                  </View>
                  {/* Individual Payments */}
                  {project.payments?.slice(0, 3).map((pmt: any) => (
                    <View key={pmt.id} style={styles.subPaymentItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subPaymentProject}>{pmt.worker_name}</Text>
                        <Text style={styles.subPaymentWeek}>
                          {moment(pmt.week_start_date).format('DD MMM')} - {moment(pmt.week_end_date).format('DD MMM')}
                        </Text>
                        <View style={styles.paymentActions}>
                          {pmt.status === 'draft' && (
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#3B82F620' }]}
                              onPress={() => handleValidatePayment(pmt.id)}
                            >
                              <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                              <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Validate</Text>
                            </TouchableOpacity>
                          )}
                          {pmt.status === 'validated' && (
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#8B5CF620' }]}
                              onPress={() => handleSendOTP(pmt.id)}
                            >
                              <Ionicons name="send" size={14} color="#8B5CF6" />
                              <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>Send OTP</Text>
                            </TouchableOpacity>
                          )}
                          {pmt.status === 'otp_sent' && (
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#10B98120' }]}
                              onPress={() => handleMarkPaid(pmt)}
                            >
                              <Ionicons name="cash" size={14} color="#10B981" />
                              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Enter OTP</Text>
                            </TouchableOpacity>
                          )}
                          {pmt.status === 'paid' && (
                            <View style={[styles.actionBtn, { backgroundColor: '#10B98120' }]}>
                              <Ionicons name="checkmark-done" size={14} color="#10B981" />
                              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Paid</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.subPaymentRight}>
                        <Text style={styles.subPaymentAmount}>₹{pmt.net_amount?.toLocaleString()}</Text>
                        <View style={[styles.miniStatusBadge, { backgroundColor: getPaymentStatusColor(pmt.status) + '20' }]}>
                          <Text style={[styles.miniStatusText, { color: getPaymentStatusColor(pmt.status) }]}>
                            {pmt.status?.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* Advances Section */}
        {advances.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.paymentsSectionTitle}>Advance Payments</Text>
            {advances.map((advance: any) => (
              <View key={advance.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.workerInfo}>
                    <Ionicons name="cash" size={36} color="#8B5CF6" />
                    <View style={styles.workerDetails}>
                      <Text style={styles.workerName}>{advance.worker_name}</Text>
                      <Text style={styles.workerPhone}>{advance.project_name}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getAdvanceStatusColor(advance.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getAdvanceStatusColor(advance.status) }]}>
                      {advance.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Amount</Text>
                    <Text style={styles.paymentValue}>₹{advance.amount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Recovered</Text>
                    <Text style={styles.paymentValue}>₹{advance.recovered_amount?.toLocaleString() || 0}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderReports = () => {
    return (
      <View style={styles.reportsContainer}>
        <Ionicons name="stats-chart" size={80} color={Colors.secondary} />
        <Text style={styles.reportsTitle}>Labour Wage Reports</Text>
        <Text style={styles.reportsText}>
          View weekly and monthly wage reports, site-wise breakdowns, and individual labourer earnings
        </Text>
        <TouchableOpacity
          style={styles.viewReportsButton}
          onPress={() => router.push('/labor/reports' as any)}
        >
          <Ionicons name="document-text" size={20} color={Colors.surface} />
          <Text style={styles.viewReportsText}>View Reports</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Labor Management</Text>
        <View style={styles.headerButtons}>
          {activeTab === 'attendance' && (
            <TouchableOpacity
              style={styles.weeklyButton}
              onPress={() => router.push('/labor/weekly-attendance' as any)}
            >
              <Ionicons name="calendar" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (activeTab === 'workers') {
                router.push('/labor/add-worker' as any);
              } else if (activeTab === 'attendance') {
                router.push('/labor/mark-attendance' as any);
              } else if (activeTab === 'transfers') {
                router.push('/labor/site-transfer' as any);
              } else if (activeTab === 'payments') {
                router.push('/labor/payments/create' as any);
              } else {
                router.push('/labor/reports' as any);
              }
            }}
          >
            <Ionicons name="add" size={24} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workers' && styles.activeTab]}
          onPress={() => setActiveTab('workers')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'workers' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'workers' && styles.activeTabText,
            ]}
          >
            Workers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
          onPress={() => setActiveTab('attendance')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={activeTab === 'attendance' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'attendance' && styles.activeTabText,
            ]}
          >
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'transfers' && styles.activeTab]}
          onPress={() => setActiveTab('transfers')}
        >
          <Ionicons
            name="swap-horizontal"
            size={20}
            color={activeTab === 'transfers' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'transfers' && styles.activeTabText,
            ]}
          >
            Transfers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
          onPress={() => setActiveTab('payments')}
        >
          <Ionicons
            name="wallet"
            size={20}
            color={activeTab === 'payments' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'payments' && styles.activeTabText,
            ]}
          >
            Payments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'reports' ? Colors.secondary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'reports' && styles.activeTabText,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.secondary} style={styles.loader} />
        ) : (
          <>
            {activeTab === 'workers' && renderWorkers()}
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'transfers' && renderTransfers()}
            {activeTab === 'payments' && renderPayments()}
            {activeTab === 'reports' && renderReports()}
          </>
        )}
      </ScrollView>

      {/* Payment Receipt Modal */}
      <Modal
        visible={showReceipt}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceipt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptModal}>
            {/* Header */}
            <View style={styles.receiptHeader}>
              <Ionicons name="checkmark-circle" size={60} color="#10B981" />
              <Text style={styles.receiptTitle}>Payment Successful!</Text>
            </View>

            {/* Receipt Content */}
            <View style={styles.receiptContent}>
              {/* Worker Name */}
              <View style={styles.receiptMainInfo}>
                <Ionicons name="person" size={24} color={Colors.secondary} />
                <Text style={styles.receiptWorkerName}>{receiptData?.worker_name}</Text>
              </View>

              {/* Amount */}
              <View style={styles.receiptAmountBox}>
                <Text style={styles.receiptAmountLabel}>Amount Paid</Text>
                <Text style={styles.receiptAmount}>₹{receiptData?.amount?.toLocaleString()}</Text>
              </View>

              {/* Details */}
              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Project</Text>
                  <Text style={styles.receiptValue}>{receiptData?.project_name}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Period</Text>
                  <Text style={styles.receiptValue}>
                    {receiptData?.week_start ? moment(receiptData.week_start).format('DD MMM') : ''} - {receiptData?.week_end ? moment(receiptData.week_end).format('DD MMM YYYY') : ''}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment Method</Text>
                  <Text style={styles.receiptValue}>{receiptData?.payment_method?.toUpperCase()}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Date & Time</Text>
                  <Text style={styles.receiptValue}>
                    {receiptData?.paid_at ? moment(receiptData.paid_at).format('DD MMM YYYY, hh:mm A') : ''}
                  </Text>
                </View>
              </View>

              {/* Paid By & Approved By Stamps */}
              <View style={styles.stampSection}>
                <View style={styles.stampBox}>
                  <Text style={styles.stampLabel}>Paid By</Text>
                  <Text style={styles.stampName}>{receiptData?.paid_by || 'Project Engineer'}</Text>
                  <Text style={styles.stampRole}>Project Engineer</Text>
                </View>
                <View style={styles.stampBox}>
                  <Text style={styles.stampLabel}>Approved By</Text>
                  <Text style={styles.stampName}>{receiptData?.approved_by || 'Manager'}</Text>
                  <Text style={styles.stampRole}>Project Manager</Text>
                </View>
              </View>

              {/* Received Stamp */}
              <View style={styles.receivedStamp}>
                <Text style={styles.stampText}>✓ RECEIVED</Text>
              </View>

              {/* Notification Info */}
              <View style={styles.notificationInfo}>
                <Ionicons name="notifications" size={16} color={Colors.textSecondary} />
                <Text style={styles.notificationText}>
                  Project Manager has been notified with receipt
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.receiptCloseBtn}
              onPress={() => setShowReceipt(false)}
            >
              <Text style={styles.receiptCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  weeklyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.secondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  skillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  attendanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  attendanceDate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attendanceWorker: {
    flex: 1,
  },
  attendanceWorkerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  attendanceProject: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendanceStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface,
  },
  attendanceHours: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reportsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  reportsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  reportsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  viewReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  viewReportsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transferInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transferDetails: {
    flex: 1,
  },
  transferWorkerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  transferDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  transferRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  siteBox: {
    flex: 1,
    alignItems: 'center',
  },
  siteLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  siteName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  hours: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 4,
  },
  transferReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
  },
  wagesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  wagesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  wagesValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  // Payments styles
  paymentsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  paymentDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  emptyCardSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.secondary,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupTotals: {
    alignItems: 'flex-end',
  },
  groupTotalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  groupTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  groupStats: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  groupStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  groupStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  groupStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subPaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  subPaymentProject: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  subPaymentWeek: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subPaymentRight: {
    alignItems: 'flex-end',
  },
  subPaymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Receipt Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptModal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  receiptHeader: {
    backgroundColor: '#10B981',
    padding: 24,
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  receiptContent: {
    padding: 20,
  },
  receiptMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  receiptWorkerName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  receiptAmountBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  receiptAmountLabel: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 4,
  },
  receiptAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10B981',
  },
  receiptDetails: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  receiptLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  stampSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  stampBox: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  stampLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  stampName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  stampRole: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2,
  },
  receivedStamp: {
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    transform: [{ rotate: '-5deg' }],
    marginBottom: 16,
  },
  stampText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 2,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
  },
  notificationText: {
    fontSize: 13,
    color: '#92400E',
  },
  receiptCloseBtn: {
    backgroundColor: Colors.secondary,
    padding: 16,
    alignItems: 'center',
  },
  receiptCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
