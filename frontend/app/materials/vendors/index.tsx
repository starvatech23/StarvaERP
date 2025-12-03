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
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vendorsAPI } from '../../../services/api';

export default function VendorsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadVendors();
    }, [])
  );

  const loadVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vendorId: string) => {
    Alert.alert(
      'Delete Vendor',
      'Are you sure you want to delete this vendor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorsAPI.delete(vendorId);
              loadVendors();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete vendor');
            }
          },
        },
      ]
    );
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendors</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/materials/vendors/add' as any)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#718096" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vendors..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#A0AEC0"
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredVendors.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No vendors found' : 'No vendors yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Add vendors to your directory'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/materials/vendors/add' as any)}
              >
                <Text style={styles.emptyButtonText}>Add Vendor</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredVendors.map((vendor) => (
            <View key={vendor.id} style={styles.vendorCard}>
              <View style={styles.vendorHeader}>
                <View style={styles.vendorIcon}>
                  <Ionicons name="business" size={24} color="#3B82F6" />
                </View>
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName}>{vendor.business_name}</Text>
                  {vendor.contact_person && (
                    <Text style={styles.vendorContact}>{vendor.contact_person}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(vendor.id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.vendorDetails}>
                {vendor.phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={16} color="#718096" />
                    <Text style={styles.detailText}>{vendor.phone}</Text>
                  </View>
                )}
                {vendor.email && (
                  <View style={styles.detailRow}>
                    <Ionicons name="mail" size={16} color="#718096" />
                    <Text style={styles.detailText}>{vendor.email}</Text>
                  </View>
                )}
                {vendor.address && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={16} color="#718096" />
                    <Text style={styles.detailText}>{vendor.address}</Text>
                  </View>
                )}
                {vendor.gst_number && (
                  <View style={styles.gstBadge}>
                    <Text style={styles.gstText}>GST: {vendor.gst_number}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1A202C',
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
    color: '#718096',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  vendorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  vendorContact: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  vendorDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#4A5568',
  },
  gstBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  gstText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
});