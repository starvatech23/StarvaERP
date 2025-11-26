import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leadsAPI, quotationsAPI } from '../../services/api';

export default function CRMScreen() {
  const [activeTab, setActiveTab] = useState<'leads' | 'quotations'>('leads');
  const [leads, setLeads] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'leads') {
        const response = await leadsAPI.getAll();
        setLeads(response.data);
      } else {
        const response = await quotationsAPI.getAll();
        setQuotations(response.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only admins and project managers can access CRM');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#3B82F6';
      case 'contacted': return '#8B5CF6';
      case 'qualified': return '#F59E0B';
      case 'proposal': return '#FF6B35';
      case 'won': return '#10B981';
      case 'lost': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CRM</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/crm/create-lead' as any)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leads' && styles.tabActive]}
          onPress={() => setActiveTab('leads')}
        >
          <Text style={activeTab === 'leads' ? styles.tabTextActive : styles.tabText}>
            Leads
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quotations' && styles.tabActive]}
          onPress={() => setActiveTab('quotations')}
        >
          <Text style={activeTab === 'quotations' ? styles.tabTextActive : styles.tabText}>
            Quotations
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
      >
        {activeTab === 'leads' ? (
          leads.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#CBD5E0" />
              <Text style={styles.emptyTitle}>No Leads Yet</Text>
              <Text style={styles.emptyText}>
                Add leads to track potential clients and manage quotations
              </Text>
              <TouchableOpacity style={styles.createButton}>
                <Text style={styles.createButtonText}>Add Lead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {leads.map((lead: any) => (
                <View key={lead.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{lead.client_name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(lead.status) + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
                        {getStatusLabel(lead.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={14} color="#718096" />
                      <Text style={styles.detailText}>{lead.contact}</Text>
                    </View>
                    {lead.estimated_value && (
                      <View style={styles.detailRow}>
                        <Ionicons name="cash" size={14} color="#718096" />
                        <Text style={styles.detailText}>
                          ${lead.estimated_value.toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {lead.assigned_to_name && (
                      <View style={styles.detailRow}>
                        <Ionicons name="person" size={14} color="#718096" />
                        <Text style={styles.detailText}>{lead.assigned_to_name}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          quotations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#CBD5E0" />
              <Text style={styles.emptyTitle}>No Quotations Yet</Text>
              <Text style={styles.emptyText}>
                Create quotations for your leads
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {quotations.map((quot: any) => (
                <View key={quot.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{quot.lead_name}</Text>
                    <Text style={styles.amountText}>${quot.total_amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="document" size={14} color="#718096" />
                      <Text style={styles.detailText}>{quot.project_type}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={14} color="#718096" />
                      <Text style={styles.detailText}>
                        {quot.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FF6B35',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  createButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  itemDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#718096',
  },
});
