import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leadsAPI, leadCategoriesAPI } from '../../services/crm-api';

export default function CRMLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsRes, catsRes] = await Promise.all([
        leadsAPI.list({ category_id: selectedCategory, search }),
        leadCategoriesAPI.list()
      ]);
      setLeads(leadsRes.data);
      setCategories(catsRes.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load leads');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (amount: number, currency: string = 'INR') => {
    if (!amount) return 'Not specified';
    const symbol = currency === 'INR' ? '₹' : '$';
    if (amount >= 10000000) return `${symbol}${(amount/10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `${symbol}${(amount/100000).toFixed(2)}L`;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'new': return '#3B82F6';
      case 'contacted': return '#F59E0B';
      case 'qualified': return '#10B981';
      case 'converted': return '#059669';
      case 'lost': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderLeadCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.leadCard}
      onPress={() => router.push(`/crm/leads/${item.id}`)}
    >
      <View style={styles.leadHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.leadName}>{item.name}</Text>
          <Text style={styles.leadCity}>{item.city || 'No city'}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.leadInfo}>
        <Ionicons name="call-outline" size={14} color="#6B7280" />
        <Text style={styles.leadPhone}>{item.primary_phone}</Text>
      </View>

      {item.budget && (
        <View style={styles.leadInfo}>
          <Ionicons name="cash-outline" size={14} color="#6B7280" />
          <Text style={styles.leadBudget}>{formatBudget(item.budget, item.budget_currency)}</Text>
        </View>
      )}

      {item.requirement && (
        <Text style={styles.leadRequirement} numberOfLines={2}>
          {item.requirement}
        </Text>
      )}

      <View style={styles.leadFooter}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {item.last_contacted && (
          <Text style={styles.lastContacted}>
            Last: {new Date(item.last_contacted).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>CRM Leads</Text>
          <Text style={styles.headerSubtitle}>{leads.length} leads</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
        >
          <Ionicons name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} size={24} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crm/leads/create')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadData}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat: any) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
              {cat.name} ({cat.lead_count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={leads}
          renderItem={renderLeadCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={64} color="#CBD5E0" />
              <Text style={styles.emptyText}>No leads found</Text>
              <Text style={styles.emptySubtext}>Create your first lead to get started</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A202C' },
  headerSubtitle: { fontSize: 14, color: '#718096', marginTop: 2 },
  iconButton: { padding: 8, marginRight: 8 },
  addButton: { backgroundColor: '#3B82F6', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', margin: 16, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1A202C' },
  categoriesContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  categoryChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  categoryText: { fontSize: 14, color: '#718096', fontWeight: '500' },
  categoryTextActive: { color: '#FFFFFF' },
  listContainer: { padding: 16 },
  leadCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  leadHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  leadName: { fontSize: 18, fontWeight: '600', color: '#1A202C' },
  leadCity: { fontSize: 14, color: '#718096', marginTop: 2 },
  priorityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  leadInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  leadPhone: { fontSize: 14, color: '#4A5568', marginLeft: 6 },
  leadBudget: { fontSize: 14, color: '#4A5568', marginLeft: 6, fontWeight: '600' },
  leadRequirement: { fontSize: 14, color: '#718096', marginTop: 8, lineHeight: 20 },
  leadFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  lastContacted: { fontSize: 12, color: '#718096' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#718096', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#A0AEC0', marginTop: 8 },
});