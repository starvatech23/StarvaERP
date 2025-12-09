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
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackToHome from '../../../components/BackToHome';
import { crmFunnelsAPI } from '../../../services/api';

export default function FunnelsScreen() {
  const router = useRouter();
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunnels();
  }, []);

  const loadFunnels = async () => {
    try {
      const res = await crmFunnelsAPI.getAll();
      setFunnels(res.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only admins and managers can manage funnels');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClone = (funnel: any) => {
    Alert.prompt(
      'Clone Funnel',
      'Enter a name for the cloned funnel:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clone',
          onPress: async (newName) => {
            if (newName) {
              try {
                await crmFunnelsAPI.clone(funnel.id, newName);
                loadFunnels();
                Alert.alert('Success', 'Funnel cloned successfully');
              } catch (error) {
                Alert.alert('Error', 'Failed to clone funnel');
              }
            }
          },
        },
      ],
      'plain-text',
      `${funnel.name} (Copy)`
    );
  };

  const handleDelete = (funnel: any) => {
    Alert.alert(
      'Delete Funnel',
      `Are you sure you want to delete "${funnel.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await crmFunnelsAPI.delete(funnel.id);
              loadFunnels();
              Alert.alert('Success', 'Funnel deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete funnel');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackToHome />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackToHome />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sales Funnels</Text>
          <Text style={styles.headerSubtitle}>{funnels.length} funnels configured</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crm/admin/create-funnel' as any)}
        >
          <Ionicons name="add" size={24} color="Colors.surface" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#8B5CF6" />
          <Text style={styles.infoText}>
            Funnels work alongside categories. Assign funnels to specific workflows, teams, or project types.
          </Text>
        </View>

        {funnels.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="git-network-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Funnels Yet</Text>
            <Text style={styles.emptyText}>
              Create custom sales funnels to track leads through specific workflows
            </Text>
          </View>
        ) : (
          funnels.map((funnel: any) => (
            <View key={funnel.id} style={styles.funnelCard}>
              <View style={styles.funnelHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.funnelName}>{funnel.name}</Text>
                  {funnel.description && (
                    <Text style={styles.funnelDescription}>{funnel.description}</Text>
                  )}
                  {funnel.category_names && funnel.category_names.length > 0 && (
                    <View style={styles.categoriesRow}>
                      <Ionicons name="pricetags" size={14} color="Colors.textSecondary" />
                      <Text style={styles.categoriesText}>
                        {funnel.category_names.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={20} color="Colors.primary" />
                  <Text style={styles.statValue}>{funnel.lead_count}</Text>
                  <Text style={styles.statLabel}>Leads</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="layers" size={20} color="#8B5CF6" />
                  <Text style={styles.statValue}>{funnel.stages?.length || 0}</Text>
                  <Text style={styles.statLabel}>Stages</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="trending-up" size={20} color="#10B981" />
                  <Text style={styles.statValue}>{funnel.conversion_rate?.toFixed(1)}%</Text>
                  <Text style={styles.statLabel}>Conversion</Text>
                </View>
              </View>

              {funnel.stages && funnel.stages.length > 0 && (
                <View style={styles.stagesContainer}>
                  <Text style={styles.stagesLabel}>Stages:</Text>
                  <View style={styles.stagesList}>
                    {funnel.stages.map((stage: any, index: number) => (
                      <View key={index} style={styles.stageBadge}>
                        <Text style={styles.stageText}>{stage.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.funnelActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#8B5CF620' }]}
                  onPress={() => Alert.alert('Coming Soon', 'Analytics view will be available soon')}
                >
                  <Ionicons name="analytics" size={16} color="#8B5CF6" />
                  <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.primary20 }]}
                  onPress={() => handleClone(funnel)}
                >
                  <Ionicons name="copy" size={16} color="Colors.primary" />
                  <Text style={[styles.actionButtonText, { color: 'Colors.primary }]}>Clone</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
                  onPress={() => handleDelete(funnel)}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: 'Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: 'Colors.textSecondary, marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#5B21B6', lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: 'Colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 14, color: 'Colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  funnelCard: {
    backgroundColor: 'Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  funnelHeader: { marginBottom: 16 },
  funnelName: { fontSize: 18, fontWeight: '700', color: 'Colors.textPrimary },
  funnelDescription: { fontSize: 14, color: 'Colors.textSecondary, marginTop: 4 },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  categoriesText: {
    fontSize: 13,
    color: 'Colors.textSecondary,
    fontWeight: '500',
  },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'Colors.background, padding: 12, borderRadius: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: 'Colors.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 11, color: 'Colors.textSecondary, marginTop: 2 },
  stagesContainer: { marginBottom: 16 },
  stagesLabel: { fontSize: 13, fontWeight: '600', color: 'Colors.textSecondary, marginBottom: 8 },
  stagesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stageBadge: { backgroundColor: '#EBF8FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  stageText: { fontSize: 12, fontWeight: '600', color: '#2C5282' },
  funnelActions: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
});