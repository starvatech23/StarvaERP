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
} from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { vendorsAPI } from '../../services/api';

export default function VendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVendors();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color=Colors.secondary />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color=Colors.textPrimary />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendors</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/vendors/create' as any)}
        >
          <Ionicons name="add" size={24} color=Colors.surface />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor=Colors.secondary />
        }
      >
        {vendors.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Vendors Yet</Text>
            <Text style={styles.emptyText}>
              Add vendors to manage your suppliers
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/vendors/create' as any)}
            >
              <Text style={styles.createButtonText}>Add Vendor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.vendorsList}>
            {vendors.map((vendor: any) => (
              <TouchableOpacity
                key={vendor.id}
                style={styles.vendorCard}
                onPress={() => router.push(`/vendors/${vendor.id}` as any)}
              >
                <View style={styles.vendorHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="business" size={24} color=Colors.secondary />
                  </View>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{vendor.company_name}</Text>
                    <Text style={styles.contactPerson}>{vendor.contact_person}</Text>
                  </View>
                </View>
                <View style={styles.vendorDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={14} color=Colors.textSecondary />
                    <Text style={styles.detailText}>{vendor.phone}</Text>
                  </View>
                  {vendor.email && (
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={14} color=Colors.textSecondary />
                      <Text style={styles.detailText}>{vendor.email}</Text>
                    </View>
                  )}
                  {vendor.rating && (
                    <View style={styles.detailRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.detailText}>{vendor.rating}/5</Text>
                    </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  createButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  vendorsList: {
    gap: 16,
  },
  vendorCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  contactPerson: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  vendorDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});