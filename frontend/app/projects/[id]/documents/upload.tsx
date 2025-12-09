import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { documentsAPI } from '../../../../services/api';
import ModalSelector from '../../../../components/ModalSelector';

export default function UploadDocumentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('other');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile(asset);
        
        // Auto-fill name if empty
        if (!name) {
          setName(asset.name.replace(/\.[^/.]+$/, '')); // Remove extension
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a document name');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }

    setLoading(true);
    try {
      // Read file as base64
      let base64Data;
      
      if (selectedFile.uri.startsWith('file://')) {
        base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64Data = `data:${selectedFile.mimeType};base64,${base64Data}`;
      } else {
        // If it's already a data URI
        base64Data = selectedFile.uri;
      }

      await documentsAPI.create({
        name: name.trim(),
        description: description.trim() || null,
        project_id: id,
        document_type: documentType,
        file_data: base64Data,
        file_name: selectedFile.name,
        file_size: selectedFile.size || null,
        mime_type: selectedFile.mimeType || null,
        uploaded_by: 'current_user', // This will be set by backend
        tags: tags.trim() ? tags.split(',').map(t => t.trim()) : [],
      });

      Alert.alert('Success', 'Document uploaded successfully');
      router.back();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Document</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Document Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter document name"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Document Type</Text>
            <ModalSelector
              options={[
                { label: 'Contract', value: 'contract' },
                { label: 'Blueprint', value: 'blueprint' },
                { label: 'Permit', value: 'permit' },
                { label: 'Invoice', value: 'invoice' },
                { label: 'Report', value: 'report' },
                { label: 'Photo', value: 'photo' },
                { label: 'Other', value: 'other' },
              ]}
              selectedValue={documentType}
              onValueChange={setDocumentType}
              placeholder="Select Type"
            />

            <Text style={styles.label}>Tags (comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., urgent, floor-plan, phase-1"
              value={tags}
              onChangeText={setTags}
            />

            <Text style={styles.label}>File *</Text>
            <TouchableOpacity style={styles.filePickerButton} onPress={pickDocument}>
              <Ionicons name="cloud-upload-outline" size={24} color="Colors.primary" />
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : 'Choose File'}
              </Text>
            </TouchableOpacity>

            {selectedFile && (
              <View style={styles.fileInfo}>
                <Ionicons name="document-text" size={20} color="#10B981" />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="Colors.surface" />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
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
  },
  section: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  filePickerText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  fileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileSize: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
