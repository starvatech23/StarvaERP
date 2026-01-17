import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import BackToHome from '../../../components/BackToHome';
import { crmLeadsAPI } from '../../../services/api';

export default function ImportExportScreen() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importHistory, setImportHistory] = useState<any[]>([]);

  const handleCSVImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setImporting(true);
      
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      
      // Parse CSV (basic parsing, production would use a proper CSV parser)
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const leads = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const lead: any = {};
          headers.forEach((header, index) => {
            lead[header] = values[index];
          });
          leads.push(lead);
        }
      }

      // Send to backend - Note: This requires proper implementation on backend
      // For now, we'll create each lead individually
      for (const lead of leads) {
        try {
          await crmLeadsAPI.create(lead);
        } catch (err) {
          console.log('Failed to import lead:', lead.name);
        }
      }
      
      Alert.alert('Success', `Successfully imported ${leads.length} leads`);
      
      // Add to import history
      setImportHistory([...importHistory, {
        date: new Date().toISOString(),
        count: leads.length,
        source: 'CSV',
        filename: result.assets[0].name,
      }]);
      
    } catch (error: any) {
      Alert.alert('Import Error', error.message || 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  const handleMetaImport = () => {
    Alert.alert(
      'Meta Import',
      'Meta lead import requires API credentials. Would you like to configure Meta integration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Configure',
          onPress: () => Alert.alert('Coming Soon', 'Meta integration setup will be available soon'),
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      // Fetch all leads from backend
      const response = await crmLeadsAPI.getAll({ limit: 10000 });
      const leads = response.data.leads || [];

      if (leads.length === 0) {
        Alert.alert('No Data', 'There are no leads to export');
        return;
      }

      // Generate CSV content
      const headers = ['name', 'email', 'phone', 'category', 'status', 'source', 'created_at'];
      let csvContent = headers.join(',') + '\n';
      
      leads.forEach((lead: any) => {
        const row = headers.map(header => {
          const value = lead[header] || '';
          // Escape commas and quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvContent += row.join(',') + '\n';
      });

      // Save to file
      const fileUri = FileSystem.documentDirectory + `leads_export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Alert.alert('Success', `Exported ${leads.length} leads`);
      } else {
        Alert.alert('Export Complete', `File saved to: ${fileUri}`);
      }
      
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      
      const response = await crmLeadsAPI.getAll({ limit: 10000 });
      const leads = response.data.leads || [];

      if (leads.length === 0) {
        Alert.alert('No Data', 'There are no leads to export');
        return;
      }

      const jsonContent = JSON.stringify(leads, null, 2);
      const fileUri = FileSystem.documentDirectory + `leads_export_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Alert.alert('Success', `Exported ${leads.length} leads`);
      } else {
        Alert.alert('Export Complete', `File saved to: ${fileUri}`);
      }
      
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackToHome />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Import & Export</Text>
          <Text style={styles.headerSubtitle}>Manage lead data in bulk</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Import Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EC489920' }]}>
              <Ionicons name="cloud-download" size={28} color="#EC4899" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Import Leads</Text>
              <Text style={styles.sectionSubtitle}>Add leads from external sources</Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleCSVImport}
              disabled={importing}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: Colors.primary20 }]}>
                  <Ionicons name="document-text" size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>CSV File</Text>
                  <Text style={styles.optionDescription}>Upload a CSV file with lead data</Text>
                </View>
              </View>
              {importing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="cloud-upload" size={28} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Export Leads</Text>
              <Text style={styles.sectionSubtitle}>Download your lead database</Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleExportCSV}
              disabled={exporting}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="document-text" size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Export as CSV</Text>
                  <Text style={styles.optionDescription}>Excel-compatible format</Text>
                </View>
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleExportJSON}
              disabled={exporting}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="code-slash" size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Export as JSON</Text>
                  <Text style={styles.optionDescription}>Developer-friendly format</Text>
                </View>
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Import History */}
        {importHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.historyTitle}>Recent Imports</Text>
            {importHistory.reverse().slice(0, 5).map((item, index) => (
              <View key={index} style={styles.historyCard}>
                <Ionicons name="time" size={20} color={Colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyText}>
                    {item.count} leads from {item.source}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.date).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Ionicons name="help-circle" size={24} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>CSV Format Guidelines</Text>
            <Text style={styles.helpText}>
              • Required columns: name, email, phone{"\n"}
              • Optional: category, status, source, notes{"\n"}
              • Use comma-separated values{"\n"}
              • First row should contain column headers
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: 24,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sectionSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  optionsContainer: { gap: 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  optionDescription: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  historyText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  historyDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  helpTitle: { fontSize: 14, fontWeight: '700', color: '#2C5282', marginBottom: 8 },
  helpText: { fontSize: 13, color: '#2C5282', lineHeight: 20 },
});
