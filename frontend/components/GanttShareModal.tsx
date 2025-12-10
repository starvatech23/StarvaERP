import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Share,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ganttShareAPI } from '../services/api';

interface GanttShareModalProps {
  visible: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GanttShareModal({ visible, projectId, onClose, onSuccess }: GanttShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    view_only: true,
    downloadable: false,
    embeddable: false,
  });
  const [showContacts, setShowContacts] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const selectedPermissions = Object.entries(permissions)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      const expiresAt = expiresInDays
        ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const response = await ganttShareAPI.create(projectId, {
        permissions: selectedPermissions,
        show_contacts: showContacts,
        password: password || null,
        expires_at: expiresAt,
      });

      // Debug logging
      console.log('Full response:', JSON.stringify(response, null, 2));
      console.log('Response data:', response.data);
      console.log('Share URL from response:', response.data?.share_url);

      // Get base URL from environment variable
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 
                     'https://budget-wizard-67.preview.emergentagent.com';
      
      // Check if share_url exists in response
      const shareUrl = response.data?.share_url || response.data?.shareUrl || `/projects/${projectId}/gantt-share/${response.data?.token}`;
      console.log('Final share URL:', shareUrl);
      
      const fullUrl = `${baseUrl}${shareUrl}`;
      console.log('Full URL:', fullUrl);
      
      setGeneratedLink(fullUrl);
      Alert.alert('Success', 'Share link generated successfully!');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error generating share link:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!generatedLink) return;
    
    try {
      await Share.share({
        message: `View Gantt Chart: ${generatedLink}${password ? `\nPassword: ${password}` : ''}`,
        url: generatedLink,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    
    // Use React Native Clipboard
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedLink);
      Alert.alert('Copied', 'Link copied to clipboard');
    } else {
      Clipboard.setString(generatedLink);
      Alert.alert('Copied', 'Link copied to clipboard');
    }
  };

  const handleReset = () => {
    setGeneratedLink(null);
    setPassword('');
    setPermissions({ view_only: true, downloadable: false, embeddable: false });
    setShowContacts(false);
    setExpiresInDays('30');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {generatedLink ? 'Share Link Generated' : 'Generate Gantt Share Link'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#1A202C" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {!generatedLink ? (
              <>
                {/* Permissions */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Permissions</Text>
                  
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>View Only</Text>
                      <Text style={styles.switchDescription}>Allow viewing the Gantt chart</Text>
                    </View>
                    <Switch
                      value={permissions.view_only}
                      onValueChange={(value) => setPermissions({ ...permissions, view_only: value })}
                      disabled
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>Downloadable</Text>
                      <Text style={styles.switchDescription}>Allow PDF/PNG/CSV downloads</Text>
                    </View>
                    <Switch
                      value={permissions.downloadable}
                      onValueChange={(value) => setPermissions({ ...permissions, downloadable: value })}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>Embeddable</Text>
                      <Text style={styles.switchDescription}>Allow embedding in other sites</Text>
                    </View>
                    <Switch
                      value={permissions.embeddable}
                      onValueChange={(value) => setPermissions({ ...permissions, embeddable: value })}
                    />
                  </View>
                </View>

                {/* Contact Visibility */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>Show Contacts</Text>
                      <Text style={styles.switchDescription}>Include contact hierarchy in shared view</Text>
                    </View>
                    <Switch
                      value={showContacts}
                      onValueChange={setShowContacts}
                    />
                  </View>
                </View>

                {/* Password Protection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Password Protection (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password (leave empty for no password)"
                    placeholderTextColor="#A0AEC0"
                    secureTextEntry
                  />
                </View>

                {/* Expiration */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Link Expiration</Text>
                  <TextInput
                    style={styles.input}
                    value={expiresInDays}
                    onChangeText={setExpiresInDays}
                    placeholder="Days until expiration (e.g., 30)"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>Leave empty for no expiration</Text>
                </View>
              </>
            ) : (
              <>
                {/* Generated Link Display */}
                <View style={styles.linkContainer}>
                  <Text style={styles.linkLabel}>Share URL:</Text>
                  <View style={styles.linkBox}>
                    <Text style={styles.linkText} numberOfLines={2}>{generatedLink}</Text>
                  </View>
                  
                  <View style={styles.linkActions}>
                    <TouchableOpacity style={styles.linkButton} onPress={handleCopy}>
                      <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                      <Text style={styles.linkButtonText}>Copy</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.linkButton} onPress={handleShare}>
                      <Ionicons name="share-outline" size={20} color="#3B82F6" />
                      <Text style={styles.linkButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  {password && (
                    <View style={styles.passwordInfo}>
                      <Ionicons name="lock-closed" size={16} color="#F59E0B" />
                      <Text style={styles.passwordText}>
                        Password: <Text style={styles.passwordValue}>{password}</Text>
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <Text style={styles.infoText}>
                      Share this link with stakeholders to give them access to the project Gantt chart.
                      {password && ' Don\'t forget to share the password separately!'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {!generatedLink ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.generateButton, loading && styles.disabledButton]}
                  onPress={handleGenerate}
                  disabled={loading}
                >
                  <Text style={styles.generateButtonText}>
                    {loading ? 'Generating...' : 'Generate Link'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleReset}
                >
                  <Text style={styles.cancelButtonText}>Generate Another</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.generateButton]}
                  onPress={onClose}
                >
                  <Text style={styles.generateButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
  },
  switchDescription: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A202C',
  },
  helperText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  linkContainer: {
    gap: 16,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  linkBox: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
  },
  linkText: {
    fontSize: 13,
    color: '#3B82F6',
    fontFamily: 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  passwordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
  },
  passwordText: {
    fontSize: 13,
    color: '#92400E',
  },
  passwordValue: {
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  generateButton: {
    backgroundColor: '#3B82F6',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#CBD5E0',
  },
});
