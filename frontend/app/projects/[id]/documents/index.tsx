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
  Modal,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { documentsAPI } from '../../../../services/api';
import ModalSelector from '../../../../components/ModalSelector';

export default function DocumentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('');
  const [viewingDocument, setViewingDocument] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadDocuments();
    }, [id, filterType])
  );

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.getAll(id as string, filterType || undefined);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentsAPI.delete(documentId);
              loadDocuments();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'contract': return 'document-text';
      case 'blueprint': return 'analytics';
      case 'permit': return 'shield-checkmark';
      case 'invoice': return 'receipt';
      case 'report': return 'stats-chart';
      case 'photo': return 'image';
      default: return 'document';
    }
  };

  const getDocumentColor = (type: string) => {
    switch (type) {
      case 'contract': return '#3B82F6';
      case 'blueprint': return '#8B5CF6';
      case 'permit': return '#10B981';
      case 'invoice': return '#F59E0B';
      case 'report': return '#EF4444';
      case 'photo': return '#EC4899';
      default: return '#6B7280';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (mimeType: string) => {
    return mimeType && mimeType.startsWith('image/');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(`/projects/${id}/documents/upload` as any)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Type:</Text>
        <View style={{ flex: 1 }}>
          <ModalSelector
            options={[
              { label: 'All Types', value: '' },
              { label: 'Contract', value: 'contract' },
              { label: 'Blueprint', value: 'blueprint' },
              { label: 'Permit', value: 'permit' },
              { label: 'Invoice', value: 'invoice' },
              { label: 'Report', value: 'report' },
              { label: 'Photo', value: 'photo' },
              { label: 'Other', value: 'other' },
            ]}
            selectedValue={filterType}
            onValueChange={setFilterType}
            placeholder="All Types"
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {documents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubtext}>Upload documents for this project</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push(`/projects/${id}/documents/upload` as any)}
            >
              <Text style={styles.emptyButtonText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.documentCard}
              onPress={() => setViewingDocument(doc)}
            >
              <View style={[styles.documentIcon, { backgroundColor: getDocumentColor(doc.document_type) + '20' }]}>
                <Ionicons
                  name={getDocumentIcon(doc.document_type) as any}
                  size={24}
                  color={getDocumentColor(doc.document_type)}
                />
              </View>

              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{doc.name}</Text>
                <Text style={styles.documentMeta}>
                  {doc.file_name} • {formatFileSize(doc.file_size)}
                </Text>
                <Text style={styles.documentUploader}>
                  By {doc.uploader_name || 'Unknown'} • {new Date(doc.uploaded_at).toLocaleDateString()}
                </Text>
                {doc.tags && doc.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {doc.tags.slice(0, 3).map((tag: string, index: number) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteIcon}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(doc.id);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal
        visible={viewingDocument !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingDocument(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{viewingDocument?.name}</Text>
              <TouchableOpacity
                onPress={() => setViewingDocument(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1A202C" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {viewingDocument && isImage(viewingDocument.mime_type) ? (
                <Image
                  source={{ uri: viewingDocument.file_data }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.documentPreview}>
                  <Ionicons name="document-text-outline" size={64} color="#CBD5E0" />
                  <Text style={styles.previewText}>Preview not available</Text>
                  <Text style={styles.previewSubtext}>Document type: {viewingDocument?.document_type}</Text>
                </View>
              )}

              {viewingDocument?.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionLabel}>Description:</Text>
                  <Text style={styles.descriptionText}>{viewingDocument.description}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginRight: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  documentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  documentUploader: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  deleteIcon: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  documentImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  documentPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  previewText: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 16,
  },
  previewSubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  descriptionSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#1A202C',
    lineHeight: 20,
  },
});
