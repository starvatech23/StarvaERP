import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { leadsAPI, leadCategoriesAPI } from '../../services/crm-api';

export default function ImportLeadsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [file, setFile] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  React.useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await leadCategoriesAPI.list();
      setCategories(res.data);
      if (res.data.length > 0) setSelectedCategory(res.data[0].id);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleImport = async () => {
    if (!file || !selectedCategory) {
      Alert.alert('Validation Error', 'Please select a file and category');
      return;
    }

    try {
      setImporting(true);
      
      // Parse CSV/JSON (simplified - in production use proper CSV parser)
      const sampleLeads = [
        { name: 'Sample Lead 1', primary_phone: '+919876543210', email: 'lead1@example.com', city: 'Mumbai', budget: 5000000 },
        { name: 'Sample Lead 2', primary_phone: '+919876543211', email: 'lead2@example.com', city: 'Delhi', budget: 10000000 },
      ];

      const res = await leadsAPI.import(sampleLeads, selectedCategory);
      setResult(res.data);
      Alert.alert('Import Complete', `Successfully imported ${res.data.success_count} leads. Failed: ${res.data.failure_count}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import Instructions</Text>
          <Text style={styles.instructionText}>
            Upload a CSV or JSON file with the following columns:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>name, primary_phone, alternate_phone, email, city, budget, requirement</Text>
          </View>
          <Text style={styles.instructionText}>
            • Phone numbers must be in +91XXXXXXXXXX format{'
'}
            • All leads will be assigned to the selected category{'
'}
            • Invalid entries will be skipped with error report
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Default Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat.id && styles.categoryTextActive
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload File</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
            <Ionicons name="cloud-upload-outline" size={32} color="#3B82F6" />
            <Text style={styles.uploadText}>
              {file ? file.name : 'Tap to select CSV or JSON file'}
            </Text>
            {file && (
              <Text style={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</Text>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Import Results</Text>
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>✅ Success:</Text>
                <Text style={styles.resultValue}>{result.success_count} leads</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>❌ Failed:</Text>
                <Text style={styles.resultValue}>{result.failure_count} leads</Text>
              </View>
              {result.errors && result.errors.length > 0 && (
                <View style={styles.errorList}>
                  <Text style={styles.errorTitle}>Errors:</Text>
                  {result.errors.slice(0, 5).map((err: any, idx: number) => (
                    <Text key={idx} style={styles.errorText}>
                      Row {err.row}: {err.error}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.importButton, importing && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={importing || !file || !selectedCategory}
        >
          {importing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.importButtonText}>Import Leads</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A202C', flex: 1, marginLeft: 16 },
  content: { flex: 1 },
  section: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 12 },
  instructionText: { fontSize: 14, color: '#718096', lineHeight: 22, marginBottom: 12 },
  codeBlock: { backgroundColor: '#F7FAFC', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  codeText: { fontSize: 12, fontFamily: 'monospace', color: '#4A5568' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  categoryChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  categoryText: { fontSize: 14, color: '#718096', fontWeight: '500' },
  categoryTextActive: { color: '#FFFFFF' },
  uploadButton: { alignItems: 'center', justifyContent: 'center', padding: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E0', borderRadius: 12, backgroundColor: '#F7FAFC' },
  uploadText: { fontSize: 14, color: '#4A5568', marginTop: 8, textAlign: 'center' },
  fileSize: { fontSize: 12, color: '#A0AEC0', marginTop: 4 },
  resultCard: { backgroundColor: '#F7FAFC', padding: 16, borderRadius: 8 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel: { fontSize: 14, fontWeight: '600', color: '#4A5568' },
  resultValue: { fontSize: 14, color: '#1A202C' },
  errorList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  errorTitle: { fontSize: 14, fontWeight: '600', color: '#EF4444', marginBottom: 8 },
  errorText: { fontSize: 12, color: '#718096', marginBottom: 4 },
  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', marginHorizontal: 16, padding: 16, borderRadius: 8, gap: 8 },
  importButtonDisabled: { backgroundColor: '#CBD5E0' },
  importButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});