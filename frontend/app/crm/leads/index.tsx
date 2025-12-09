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
  Linking,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { crmLeadsAPI, crmCategoriesAPI } from '../../../services/api';

export default function LeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leadsRes, catsRes] = await Promise.all([
        crmLeadsAPI.getAll(),
        crmCategoriesAPI.getAll(),
      ]);
      setLeads(leadsRes.data);
      setCategories(catsRes.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only admins and project managers can access CRM');
      } else {
        console.error('Error loading leads:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleCall = (phone: string) => {
    Alert.alert(
      'Make a Call',
      `Call ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
      ]
    );
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const message = `Hello ${name}, thank you for your interest!`;
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/')}
          >
            <Ionicons name="home" size={20} color={Colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leads</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crm/leads/create' as any)}
        >
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />
        }
      >
        {leads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Leads Yet</Text>
            <Text style={styles.emptyText}>
              Start by adding your first lead to track potential clients
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/crm/leads/create' as any)}
            >
              <Text style={styles.createButtonText}>Add First Lead</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.leadsList}>
            {leads.map((lead: any) => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadCard}
                onPress={() => router.push(`/crm/leads/${lead.id}` as any)}
              >
                <View style={styles.leadHeader}>
                  <Text style={styles.leadName}>{lead.name}</Text>
                  {lead.category_color && (
                    <View style={[styles.categoryBadge, { backgroundColor: lead.category_color + '30' }]}>
                      <View style={[styles.categoryDot, { backgroundColor: lead.category_color }]} />
                      <Text style={[styles.categoryText, { color: lead.category_color }]}>
                        {lead.category_name}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.leadInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{lead.primary_phone}</Text>
                    <TouchableOpacity
                      onPress={() => handleCall(lead.primary_phone)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="call-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    {lead.whatsapp_consent && (
                      <TouchableOpacity
                        onPress={() => handleWhatsApp(lead.primary_phone, lead.name)}
                        style={styles.actionButton}
                      >
                        <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {lead.email && (
                    <View style={styles.infoRow}>
                      <Ionicons name="mail" size={16} color={Colors.textSecondary} />
                      <Text style={styles.infoText}>{lead.email}</Text>
                    </View>
                  )}

                  {lead.budget && (
                    <View style={styles.infoRow}>
                      <Ionicons name="cash" size={16} color={Colors.textSecondary} />
                      <Text style={styles.infoText}>
                        {lead.budget_currency} {lead.budget.toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {lead.assigned_to_name && (
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={16} color={Colors.textSecondary} />
                      <Text style={styles.infoText}>{lead.assigned_to_name}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.leadFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
                      {lead.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { borderColor: getPriorityColor(lead.priority) }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(lead.priority) }]}>
                      {lead.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new': return Colors.primary;
    case 'contacted': return '#8B5CF6';
    case 'qualified': return '#F59E0B';
    case 'proposal': return Colors.secondary;
    case 'negotiation': return '#EC4899';
    case 'won': return '#10B981';
    case 'lost': return '#EF4444';
    default: return '#6B7280';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return '#EF4444';
    case 'high': return '#F59E0B';
    case 'medium': return Colors.primary;
    case 'low': return '#6B7280';
    default: return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: 'Colors.textPrimary },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  createButton: { backgroundColor: Colors.secondary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  createButtonText: { color: Colors.surface, fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  leadsList: { gap: 16 },
  leadCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  leadName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  categoryText: { fontSize: 11, fontWeight: '600' },
  leadInfo: { gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  actionButton: { padding: 4 },
  leadFooter: { flexDirection: 'row', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  priorityText: { fontSize: 11, fontWeight: '600' },
});