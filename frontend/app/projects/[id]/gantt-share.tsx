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
  Share,
  Clipboard,
  Platform,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ganttShareAPI } from '../../../services/api';
import GanttShareModal from '../../../components/GanttShareModal';

export default function GanttShareLinksScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    setLoading(true);
    try {
      const response = await ganttShareAPI.list(id as string);
      setShares(response.data || []);
    } catch (error) {
      console.error('Error loading shares:', error);
      Alert.alert('Error', 'Failed to load share links');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = (token: string) => {
    Alert.alert(
      'Revoke Share Link',
      'Are you sure? This link will no longer be accessible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await ganttShareAPI.revoke(id as string, token);
              await loadShares();
              Alert.alert('Success', 'Share link revoked');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to revoke share link');
            }
          },
        },
      ]
    );
  };

  const handleShare = async (shareUrl: string, hasPassword: boolean) => {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 
                   'https://construcsync.preview.emergentagent.com';
    const fullUrl = `${baseUrl}${shareUrl}`;
    try {
      await Share.share({
        message: `View Gantt Chart: ${fullUrl}${hasPassword ? '\n(Password protected)' : ''}`,
        url: fullUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = (shareUrl: string) => {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 
                   'https://construcsync.preview.emergentagent.com';
    const fullUrl = `${baseUrl}${shareUrl}`;
    
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      Alert.alert('Copied', 'Link copied to clipboard');
    } else {
      Clipboard.setString(fullUrl);
      Alert.alert('Copied', 'Link copied to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Links</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {shares.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="share-social-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No share links yet</Text>
            <Text style={styles.emptySubtext}>
              Create a shareable Gantt link for stakeholders
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Generate Link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          shares.map((share) => (
            <View key={share.token} style={styles.shareCard}>
              <View style={styles.shareHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.shareHeaderRow}>
                    <Text style={styles.shareTitle}>Share Link</Text>
                    {share.has_password && (
                      <Ionicons name="lock-closed" size={16} color="#F59E0B" />
                    )}
                  </View>
                  <Text style={styles.shareDate}>
                    Created {formatDate(share.created_at)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRevoke(share.token)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.shareUrl}>
                <Text style={styles.urlText} numberOfLines={1}>
                  {share.share_url}
                </Text>
              </View>

              <View style={styles.shareDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="eye-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{share.views_count} views</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="download-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{share.downloads_count} downloads</Text>
                </View>
                {share.expires_at && (
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>
                      Expires {formatDate(share.expires_at)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.permissionTags}>
                {share.permissions.map((perm: string) => (
                  <View key={perm} style={styles.permissionTag}>
                    <Text style={styles.permissionText}>
                      {perm.replace('_', ' ')}
                    </Text>
                  </View>
                ))}
                {share.show_contacts && (
                  <View style={[styles.permissionTag, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.permissionText, { color: '#92400E' }]}>
                      Contacts visible
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.shareActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCopy(share.share_url)}
                >
                  <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleShare(share.share_url, share.has_password)}
                >
                  <Ionicons name="share-outline" size={18} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              {share.last_viewed_at && (
                <Text style={styles.lastViewed}>
                  Last viewed {formatDate(share.last_viewed_at)}
                </Text>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <GanttShareModal
        visible={showModal}
        projectId={id as string}
        onClose={() => setShowModal(false)}
        onSuccess={loadShares}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
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
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  shareCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  shareDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  shareUrl: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  urlText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  shareDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#4A5568',
  },
  permissionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  permissionTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
    textTransform: 'capitalize',
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  lastViewed: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 8,
    textAlign: 'right',
  },
});
