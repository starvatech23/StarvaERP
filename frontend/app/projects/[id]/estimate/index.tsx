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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../../constants/Colors';
import { estimationAPI } from '../../../../services/api';

export default function EstimateListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const projectId = params.id as string;
  
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('EstimateListScreen - params:', params);
    console.log('EstimateListScreen - projectId:', projectId);
    
    if (projectId) {
      loadEstimates();
    } else {
      console.error('No project ID found in params');
      setLoading(false);
      Alert.alert('Error', 'Project ID not found');
    }
  }, [projectId]);

  const loadEstimates = async () => {
    try {
      console.log('Loading estimates for project:', projectId);
      const response = await estimationAPI.getByProject(projectId);
      console.log('Estimates loaded:', response.data?.length || 0);
      setEstimates(response.data || []);
    } catch (error: any) {
      console.error('Failed to load estimates:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return Colors.warning;
      case 'approved': return Colors.success;
      case 'revised': return Colors.info;
      case 'archived': return Colors.textTertiary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estimates</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push(`/projects/${projectId}/estimate/create` as any)}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {estimates.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calculator-outline" size={64} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Estimates Yet</Text>
            <Text style={styles.emptyText}>
              Create your first estimate to calculate construction costs
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push(`/projects/${projectId}/estimate/create` as any)}
            >
              <Ionicons name="add-circle" size={20} color={Colors.white} />
              <Text style={styles.createButtonText}>Create Estimate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.estimatesList}>
            {estimates.map((estimate) => (
              <TouchableOpacity
                key={estimate.id}
                style={styles.estimateCard}
                onPress={() => router.push(`/projects/${projectId}/estimate/${estimate.id}` as any)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Ionicons name="calculator" size={24} color={Colors.primary} />
                    <View>
                      <Text style={styles.versionName}>
                        {estimate.version_name || `Version ${estimate.version}`}
                      </Text>
                      <Text style={styles.versionDate}>
                        {new Date(estimate.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(estimate.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(estimate.status) }]}>
                      {getStatusLabel(estimate.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.costSection}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Total Cost</Text>
                    <Text style={styles.costValue}>₹{estimate.grand_total.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Cost per sqft</Text>
                    <Text style={styles.costPerSqft}>₹{Math.round(estimate.cost_per_sqft)}/sqft</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <Ionicons name="resize" size={14} color={Colors.textSecondary} />
                    <Text style={styles.footerText}>{estimate.built_up_area_sqft || 0} sqft</Text>
                  </View>
                  <View style={styles.footerDivider} />
                  <View style={styles.footerItem}>
                    <Ionicons name="layers" size={14} color={Colors.textSecondary} />
                    <Text style={styles.footerText}>{estimate.num_floors || 1} floor(s)</Text>
                  </View>
                  {estimate.package_type && (
                    <>
                      <View style={styles.footerDivider} />
                      <View style={styles.footerItem}>
                        <Ionicons name="pricetag" size={14} color={Colors.textSecondary} />
                        <Text style={styles.footerText}>{estimate.package_type.toUpperCase()}</Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  estimatesList: {
    padding: 16,
  },
  estimateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  versionName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  versionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  costSection: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  costValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  costPerSqft: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
});
