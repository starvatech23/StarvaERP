import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Colors from '../../constants/Colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DataType {
  id: string;
  name: string;
  description: string;
  count: number;
  fields: number;
}

export default function DataManagementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadDataTypes();
  }, []);

  const loadDataTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/export/list`, {
        headers: {
          'Authorization': `Bearer ${global.userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDataTypes(data.data_types);
      }
    } catch (error) {
      console.error('Error loading data types:', error);
      Alert.alert('Error', 'Failed to load data types');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (dataType: string) => {
    try {
      setExporting(dataType);
      
      const response = await fetch(`${API_URL}/api/admin/export/template/${dataType}`, {
        headers: {
          'Authorization': `Bearer ${global.userToken}`,
        },
      });

      if (response.ok) {
        const csvContent = await response.text();
        
        // Save file
        const fileUri = `${FileSystem.documentDirectory}${dataType}_template.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        
        // Share file
        await Sharing.shareAsync(fileUri);
        
        Alert.alert('Success', `Template downloaded: ${dataType}_template.csv`);
      } else {
        Alert.alert('Error', 'Failed to download template');
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      Alert.alert('Error', 'Failed to download template');
    } finally {
      setExporting(null);
    }
  };

  const exportData = async (dataType: string) => {
    try {
      setExporting(dataType);
      
      const response = await fetch(`${API_URL}/api/admin/export/${dataType}`, {
        headers: {
          'Authorization': `Bearer ${global.userToken}`,
        },
      });

      if (response.ok) {
        const csvContent = await response.text();
        
        // Save file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileUri = `${FileSystem.documentDirectory}${dataType}_export_${timestamp}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        
        // Share file
        await Sharing.shareAsync(fileUri);
        
        Alert.alert('Success', `Data exported: ${dataType}_export_${timestamp}.csv`);
      } else {
        Alert.alert('Error', 'Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setExporting(null);
    }
  };

  const importData = async (dataType: string) => {
    try {
      setImporting(dataType);
      
      // Pick file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setImporting(null);
        return;
      }

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        name: result.assets[0].name,
        type: 'text/csv',
      } as any);

      // Upload
      const response = await fetch(`${API_URL}/api/admin/import/${dataType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${global.userToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Import Complete',
          `Imported: ${data.imported}\nSkipped (duplicates): ${data.skipped}${
            data.errors ? `\nErrors: ${data.errors.length}` : ''
          }`,
          [
            {
              text: 'OK',
              onPress: () => loadDataTypes(), // Reload counts
            },
          ]
        );
      } else {
        Alert.alert(
          'Import Failed',
          `${data.message}\n\nErrors:\n${data.errors.slice(0, 3).join('\n')}\n${
            data.total_errors > 3 ? `\n...and ${data.total_errors - 3} more` : ''
          }`
        );
      }
    } catch (error) {
      console.error('Error importing data:', error);
      Alert.alert('Error', 'Failed to import data');
    } finally {
      setImporting(null);
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={Colors.secondary} />
          <Text style={styles.infoText}>
            Export data to CSV files or import from templates. Templates include sample data and required fields.
          </Text>
        </View>

        {dataTypes.map((dataType) => (
          <View key={dataType.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleSection}>
                <Text style={styles.cardTitle}>{dataType.name}</Text>
                <Text style={styles.cardDescription}>{dataType.description}</Text>
              </View>
              <View style={styles.cardStats}>
                <Text style={styles.cardCount}>{dataType.count}</Text>
                <Text style={styles.cardLabel}>records</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.fieldsText}>{dataType.fields} fields</Text>
            </View>

            <View style={styles.actionsContainer}>
              {/* Download Template */}
              <TouchableOpacity
                style={[styles.actionButton, styles.templateButton]}
                onPress={() => downloadTemplate(dataType.id)}
                disabled={exporting === dataType.id}
              >
                {exporting === dataType.id ? (
                  <ActivityIndicator size="small" color={Colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={18} color={Colors.textPrimary} />
                    <Text style={styles.templateButtonText}>Template</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Export Data */}
              <TouchableOpacity
                style={[styles.actionButton, styles.exportButton]}
                onPress={() => exportData(dataType.id)}
                disabled={exporting === dataType.id || dataType.count === 0}
              >
                {exporting === dataType.id ? (
                  <ActivityIndicator size="small" color={Colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color={Colors.textPrimary} />
                    <Text style={styles.exportButtonText}>Export</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Import Data */}
              <TouchableOpacity
                style={[styles.actionButton, styles.importButton]}
                onPress={() => importData(dataType.id)}
                disabled={importing === dataType.id}
              >
                {importing === dataType.id ? (
                  <ActivityIndicator size="small" color={Colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color={Colors.textPrimary} />
                    <Text style={styles.importButtonText}>Import</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'Colors.secondary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'Colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: 'Colors.textSecondary,
  },
  cardStats: {
    alignItems: 'flex-end',
  },
  cardCount: {
    fontSize: 24,
    fontWeight: '700',
    color: 'Colors.secondary,
  },
  cardLabel: {
    fontSize: 11,
    color: 'Colors.textSecondary,
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
    marginBottom: 16,
  },
  fieldsText: {
    fontSize: 12,
    color: 'Colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  templateButton: {
    backgroundColor: 'Colors.border,
  },
  templateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
  exportButton: {
    backgroundColor: 'Colors.primary,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  importButton: {
    backgroundColor: 'Colors.secondary,
  },
  importButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
});
