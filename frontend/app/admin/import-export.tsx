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
  Modal,
  Platform,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface DataType {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  count?: number;
}

const DATA_TYPES: DataType[] = [
  { key: 'leads', name: 'Leads', icon: 'people', color: '#EC4899', description: 'CRM leads and prospects' },
  { key: 'projects', name: 'Projects', icon: 'business', color: '#3B82F6', description: 'Construction projects' },
  { key: 'tasks', name: 'Tasks', icon: 'checkbox', color: '#10B981', description: 'Project tasks' },
  { key: 'vendors', name: 'Vendors', icon: 'storefront', color: '#8B5CF6', description: 'Material suppliers' },
  { key: 'materials', name: 'Materials', icon: 'cube', color: '#F59E0B', description: 'Construction materials' },
  { key: 'workers', name: 'Workers', icon: 'construct', color: '#6366F1', description: 'Labor workforce' },
  { key: 'estimates', name: 'Estimates', icon: 'calculator', color: '#14B8A6', description: 'Project estimates/BOQ' },
];

export default function ImportExportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataCounts, setDataCounts] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [showDataTypeModal, setShowDataTypeModal] = useState(false);
  const [modalMode, setModalMode] = useState<'import' | 'export'>('export');
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    loadDataCounts();
  }, []);

  const loadDataCounts = async () => {
    try {
      const response = await api.get('/admin/export/list');
      setDataCounts(response.data.counts || {});
    } catch (error) {
      console.log('Failed to load counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (dataType: string, format: 'csv' | 'json' = 'csv') => {
    try {
      setExporting(dataType);
      
      const response = await api.get(`/admin/export/${dataType}`, {
        responseType: 'blob',
      });
      
      // Convert blob to base64
      const reader = new FileReader();
      const blob = new Blob([response.data], { type: 'text/csv' });
      
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const filename = `${dataType}_export_${Date.now()}.csv`;
          const fileUri = `${FileSystem.cacheDirectory}${filename}`;
          
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'text/csv',
              dialogTitle: `Export ${dataType}`,
            });
          }
          
          Alert.alert('Success', `${dataType} data exported successfully`);
        } catch (e) {
          console.error('File save error:', e);
        }
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export data');
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadTemplate = async (dataType: string) => {
    try {
      setExporting(dataType);
      
      const response = await api.get(`/admin/export/template/${dataType}`, {
        responseType: 'blob',
      });
      
      const reader = new FileReader();
      const blob = new Blob([response.data], { type: 'text/csv' });
      
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const filename = `${dataType}_template.csv`;
          const fileUri = `${FileSystem.cacheDirectory}${filename}`;
          
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'text/csv',
              dialogTitle: `${dataType} Template`,
            });
          }
        } catch (e) {
          console.error('Template save error:', e);
        }
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error: any) {
      Alert.alert('Error', 'Failed to download template');
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (dataType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setImporting(dataType);
      
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        type: 'text/csv',
        name: result.assets[0].name,
      } as any);

      const response = await api.post(`/admin/import/${dataType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(response.data);
      
      if (response.data.success) {
        Alert.alert(
          'Import Complete',
          `Imported: ${response.data.imported}\nSkipped: ${response.data.skipped}${response.data.errors ? `\nErrors: ${response.data.errors.length}` : ''}`,
          [{ text: 'OK', onPress: () => loadDataCounts() }]
        );
      } else {
        Alert.alert('Import Failed', response.data.message || 'Validation errors found');
      }
      
    } catch (error: any) {
      Alert.alert('Import Error', error.response?.data?.detail || error.message || 'Failed to import data');
    } finally {
      setImporting(null);
    }
  };

  const openModal = (mode: 'import' | 'export') => {
    setModalMode(mode);
    setShowDataTypeModal(true);
  };

  const renderDataTypeCard = (item: DataType) => {
    const count = dataCounts[item.key] || 0;
    const isExporting = exporting === item.key;
    const isImporting = importing === item.key;
    
    return (
      <View key={item.key} style={styles.dataCard}>
        <View style={styles.dataCardHeader}>
          <View style={[styles.dataIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
          </View>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{item.name}</Text>
            <Text style={styles.dataDescription}>{item.description}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count.toLocaleString()}</Text>
          </View>
        </View>
        
        <View style={styles.dataActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.exportBtn]}
            onPress={() => handleExport(item.key)}
            disabled={isExporting || isImporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#10B981" />
                <Text style={[styles.actionText, { color: '#10B981' }]}>Export</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBtn, styles.importBtn]}
            onPress={() => handleImport(item.key)}
            disabled={isExporting || isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <>
                <Ionicons name="upload-outline" size={18} color="#3B82F6" />
                <Text style={[styles.actionText, { color: '#3B82F6' }]}>Import</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBtn, styles.templateBtn]}
            onPress={() => handleDownloadTemplate(item.key)}
            disabled={isExporting || isImporting}
          >
            <Ionicons name="document-outline" size={18} color="#6B7280" />
            <Text style={[styles.actionText, { color: '#6B7280' }]}>Template</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Import & Export</Text>
          <Text style={styles.headerSubtitle}>Manage your data in bulk</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#10B98110' }]}
            onPress={() => openModal('export')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="cloud-download" size={28} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickActionTitle, { color: '#10B981' }]}>Export All</Text>
            <Text style={styles.quickActionDesc}>Download your data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#3B82F610' }]}
            onPress={() => openModal('import')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="cloud-upload" size={28} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickActionTitle, { color: '#3B82F6' }]}>Import Data</Text>
            <Text style={styles.quickActionDesc}>Upload CSV files</Text>
          </TouchableOpacity>
        </View>

        {/* Data Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <Text style={styles.sectionSubtitle}>Select a data type to export or import</Text>
          
          {DATA_TYPES.map(renderDataTypeCard)}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpCard}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Import Guidelines</Text>
              <Text style={styles.helpText}>
                • Download the template first for correct format{'\n'}
                • Use CSV format with UTF-8 encoding{'\n'}
                • First row must contain column headers{'\n'}
                • Duplicate records will be skipped{'\n'}
                • Maximum 10,000 rows per import
              </Text>
            </View>
          </View>
          
          <View style={[styles.helpCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="warning" size={24} color="#B45309" />
            <View style={styles.helpContent}>
              <Text style={[styles.helpTitle, { color: '#92400E' }]}>Important Notes</Text>
              <Text style={[styles.helpText, { color: '#92400E' }]}>
                • Always backup your data before importing{'\n'}
                • Imported data cannot be automatically reversed{'\n'}
                • Large imports may take several minutes
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Data Type Selection Modal */}
      <Modal
        visible={showDataTypeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDataTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'export' ? 'Select Data to Export' : 'Select Data to Import'}
              </Text>
              <TouchableOpacity onPress={() => setShowDataTypeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalList}>
              {DATA_TYPES.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.modalItem}
                  onPress={() => {
                    setShowDataTypeModal(false);
                    if (modalMode === 'export') {
                      handleExport(item.key);
                    } else {
                      handleImport(item.key);
                    }
                  }}
                >
                  <View style={[styles.modalItemIcon, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    <Text style={styles.modalItemDesc}>{item.description}</Text>
                  </View>
                  <Text style={styles.modalItemCount}>{dataCounts[item.key] || 0}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 14 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  
  content: { flex: 1, padding: 16 },
  
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: { fontSize: 16, fontWeight: '700' },
  quickActionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  
  dataCard: {
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
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dataInfo: { flex: 1 },
  dataName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  dataDescription: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  
  dataActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  exportBtn: { backgroundColor: '#10B98110' },
  importBtn: { backgroundColor: '#3B82F610' },
  templateBtn: { backgroundColor: '#F3F4F6' },
  actionText: { fontSize: 13, fontWeight: '600' },
  
  helpSection: { gap: 12 },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  helpContent: { flex: 1 },
  helpTitle: { fontSize: 14, fontWeight: '700', color: '#2C5282', marginBottom: 8 },
  helpText: { fontSize: 13, color: '#2C5282', lineHeight: 20 },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalList: { padding: 16 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  modalItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalItemInfo: { flex: 1 },
  modalItemName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalItemDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  modalItemCount: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
