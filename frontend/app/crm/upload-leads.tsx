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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { read, utils } from 'xlsx';
import { bulkLeadsAPI } from '../../services/api';

export default function UploadLeadsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setFileName(file.name);

      // Read file
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Parse Excel
      const workbook = read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = utils.sheet_to_json(worksheet);

      // Validate and transform data
      const transformedData = data.map((row: any) => ({
        client_name: row.client_name || row['Client Name'] || '',
        contact: row.contact || row['Contact'] || '',
        email: row.email || row['Email'] || '',
        source: row.source || row['Source'] || '',
        estimated_value: row.estimated_value || row['Estimated Value'] || null,
        notes: row.notes || row['Notes'] || '',
      }));

      // Validate required fields
      const invalidRows = transformedData.filter(
        (row) => !row.client_name || !row.contact
      );

      if (invalidRows.length > 0) {
        Alert.alert(
          'Validation Error',
          `${invalidRows.length} rows are missing required fields (Client Name and Contact)`
        );
        return;
      }

      setParsedData(transformedData);
      Alert.alert(
        'Success',
        `Successfully parsed ${transformedData.length} leads from the file`
      );
    } catch (error: any) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to read the Excel file');
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      Alert.alert('Error', 'Please select and parse an Excel file first');
      return;
    }

    setLoading(true);
    try {
      await bulkLeadsAPI.upload(parsedData);
      
      Alert.alert(
        'Success',
        `Successfully uploaded ${parsedData.length} leads`,
        [
          {
            text: 'OK',
            onPress: () => {
              setParsedData([]);
              setFileName('');
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to upload leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Leads</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionHeader}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <Text style={styles.instructionTitle}>Instructions</Text>
          </View>
          <Text style={styles.instructionText}>
            1. Prepare an Excel file (.xlsx or .xls) with the following columns:
          </Text>
          <View style={styles.columnList}>
            <Text style={styles.columnItem}>• <Text style={styles.bold}>client_name</Text> (Required)</Text>
            <Text style={styles.columnItem}>• <Text style={styles.bold}>contact</Text> (Required)</Text>
            <Text style={styles.columnItem}>• email (Optional)</Text>
            <Text style={styles.columnItem}>• source (Optional)</Text>
            <Text style={styles.columnItem}>• estimated_value (Optional)</Text>
            <Text style={styles.columnItem}>• notes (Optional)</Text>
          </View>
          <Text style={styles.instructionText}>
            2. Click "Choose File" to select your Excel file
          </Text>
          <Text style={styles.instructionText}>
            3. Review the parsed data count
          </Text>
          <Text style={styles.instructionText}>
            4. Click "Upload Leads" to import
          </Text>
        </View>

        {/* File Picker */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={pickDocument}
          disabled={loading}
        >
          <Ionicons name="document-attach" size={48} color="#FF6B35" />
          <Text style={styles.pickerText}>
            {fileName || 'Choose Excel File'}
          </Text>
          {fileName && (
            <View style={styles.fileBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          )}
        </TouchableOpacity>

        {/* Parsed Data Preview */}
        {parsedData.length > 0 && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="list" size={24} color="#10B981" />
              <Text style={styles.previewTitle}>Ready to Upload</Text>
            </View>
            <Text style={styles.previewCount}>
              {parsedData.length} leads parsed successfully
            </Text>
            <View style={styles.sampleData}>
              <Text style={styles.sampleTitle}>Sample (First Lead):</Text>
              <Text style={styles.sampleText}>
                Client: {parsedData[0].client_name}
              </Text>
              <Text style={styles.sampleText}>
                Contact: {parsedData[0].contact}
              </Text>
              {parsedData[0].email && (
                <Text style={styles.sampleText}>
                  Email: {parsedData[0].email}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Sample Template Download Info */}
        <View style={styles.templateCard}>
          <Ionicons name="download" size={24} color="#718096" />
          <View style={styles.templateText}>
            <Text style={styles.templateTitle}>Need a template?</Text>
            <Text style={styles.templateDesc}>
              Create an Excel file with the columns mentioned above
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Upload Button */}
      {parsedData.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>
                  Upload {parsedData.length} Leads
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  instructionsCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  instructionText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
  },
  columnList: {
    marginLeft: 12,
    marginBottom: 8,
  },
  columnItem: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFE5DC',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginTop: 12,
  },
  fileBadge: {
    marginTop: 8,
  },
  previewCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  previewCount: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 12,
  },
  sampleData: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  sampleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 12,
    color: '#1A202C',
    marginBottom: 4,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateText: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 12,
    color: '#718096',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  uploadButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
