import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leadsAPI, leadCategoriesAPI } from '../../services/crm-api';

const { width } = Dimensions.get('window');

export default function CRMReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leadsRes, catsRes] = await Promise.all([
        leadsAPI.list(),
        leadCategoriesAPI.list()
      ]);
      setLeads(leadsRes.data);
      setCategories(catsRes.data);
      calculateStats(leadsRes.data, catsRes.data);
    } catch (error) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leadsData: any[], catsData: any[]) => {
    const total = leadsData.length;
    const byStatus = leadsData.reduce((acc: any, lead: any) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    const byPriority = leadsData.reduce((acc: any, lead: any) => {
      acc[lead.priority] = (acc[lead.priority] || 0) + 1;
      return acc;
    }, {});
    const byCity = leadsData.reduce((acc: any, lead: any) => {
      if (lead.city) acc[lead.city] = (acc[lead.city] || 0) + 1;
      return acc;
    }, {});
    const totalBudget = leadsData.reduce((sum, lead) => sum + (lead.budget || 0), 0);
    const avgBudget = total > 0 ? totalBudget / total : 0;
    const contacted = leadsData.filter(l => l.last_contacted).length;
    const contactRate = total > 0 ? (contacted / total * 100).toFixed(1) : 0;

    setStats({
      total,
      byStatus,
      byPriority,
      byCity,
      totalBudget,
      avgBudget,
      contacted,
      contactRate,
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount/10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount/100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString()}`;
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

  const topCities = Object.entries(stats.byCity || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRM Reports</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="people" size={32} color="#FFFFFF" />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
            <Text style={styles.statValue}>{stats.contacted}</Text>
            <Text style={styles.statLabel}>Contacted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="cash" size={32} color="#FFFFFF" />
            <Text style={styles.statValue}>{formatCurrency(stats.totalBudget)}</Text>
            <Text style={styles.statLabel}>Total Budget</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
            <Ionicons name="trending-up" size={32} color="#FFFFFF" />
            <Text style={styles.statValue}>{stats.contactRate}%</Text>
            <Text style={styles.statLabel}>Contact Rate</Text>
          </View>
        </View>

        {/* By Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leads by Status</Text>
          <View style={styles.chartContainer}>
            {Object.entries(stats.byStatus || {}).map(([status, count]: any) => (
              <View key={status} style={styles.chartRow}>
                <Text style={styles.chartLabel}>{status.replace('_', ' ')}</Text>
                <View style={styles.chartBar}>
                  <View
                    style={[
                      styles.chartBarFill,
                      { width: `${(count / stats.total * 100)}%`, backgroundColor: '#3B82F6' }
                    ]}
                  />
                </View>
                <Text style={styles.chartValue}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* By Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leads by Priority</Text>
          <View style={styles.chartContainer}>
            {Object.entries(stats.byPriority || {}).map(([priority, count]: any) => {
              const colors: any = { urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280' };
              return (
                <View key={priority} style={styles.chartRow}>
                  <Text style={styles.chartLabel}>{priority}</Text>
                  <View style={styles.chartBar}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { width: `${(count / stats.total * 100)}%`, backgroundColor: colors[priority] }
                      ]}
                    />
                  </View>
                  <Text style={styles.chartValue}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Cities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Cities</Text>
          <View style={styles.cityList}>
            {topCities.map(([city, count]: any, index) => (
              <View key={city} style={styles.cityRow}>
                <View style={styles.cityRank}>
                  <Text style={styles.cityRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.cityName}>{city}</Text>
                <Text style={styles.cityCount}>{count} leads</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leads by Category</Text>
          <View style={styles.categoryList}>
            {categories.map((cat: any) => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: cat.color || '#3B82F6' }]} />
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryCount}>{cat.lead_count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A202C', flex: 1, marginLeft: 16 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  statCard: { width: (width - 48) / 2, padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#FFFFFF', marginTop: 4, opacity: 0.9 },
  section: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 16 },
  chartContainer: { gap: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chartLabel: { width: 80, fontSize: 14, color: '#4A5568', textTransform: 'capitalize' },
  chartBar: { flex: 1, height: 24, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  chartBarFill: { height: '100%', borderRadius: 4 },
  chartValue: { width: 40, fontSize: 14, fontWeight: '600', color: '#1A202C', textAlign: 'right' },
  cityList: { gap: 12 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cityRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  cityRankText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  cityName: { flex: 1, fontSize: 14, color: '#1A202C' },
  cityCount: { fontSize: 14, fontWeight: '600', color: '#718096' },
  categoryList: { gap: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { flex: 1, fontSize: 14, color: '#1A202C' },
  categoryCount: { fontSize: 14, fontWeight: '600', color: '#718096' },
});