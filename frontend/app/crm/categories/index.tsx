import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { crmCategoriesAPI } from '../../../services/api';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await crmCategoriesAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Categories represent stages in your lead funnel. Drag leads between categories to track progress.
          </Text>
        </View>

        {categories.map((category: any, index) => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryLeft}>
                <View style={[styles.colorDot, { backgroundColor: category.color }]} />
                <View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {category.description && (
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  )}
                </View>
              </View>
              <View style={styles.leadCount}>
                <Text style={styles.leadCountNumber}>{category.lead_count || 0}</Text>
                <Text style={styles.leadCountLabel}>leads</Text>
              </View>
            </View>
            
            {category.is_system && (
              <View style={styles.systemBadge}>
                <Ionicons name="lock-closed" size={12} color="#718096" />
                <Text style={styles.systemBadgeText}>System Category</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.helpCard}>
          <Ionicons name="help-circle" size={20} color="#718096" />
          <Text style={styles.helpText}>
            Custom categories and reordering will be available in the admin panel
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
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
  backButton: { width: 40 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C', flex: 1 },
  content: { padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2C5282',
    lineHeight: 20,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  leadCount: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
  },
  leadCountNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  leadCountLabel: {
    fontSize: 11,
    color: '#718096',
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  systemBadgeText: {
    fontSize: 12,
    color: '#718096',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFAF0',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#744210',
    lineHeight: 18,
  },
});