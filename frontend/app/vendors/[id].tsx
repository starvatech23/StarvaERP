import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vendorsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function VendorDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const canDelete = user?.role === 'admin' || user?.role === 'project_manager';

  useEffect(() => {
    loadVendor();
  }, [id]);

  const loadVendor = async () => {
    try {
      const response = await vendorsAPI.getById(id as string);
      setVendor(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load vendor details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
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
              await vendorsAPI.delete(id as string);
              Alert.alert('Success', 'Vendor deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete vendor');
            }
          },
        },
      ]
    );
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

  if (!vendor) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={48} color="#FF6B35" />
          </View>
          <Text style={styles.companyName}>{vendor.company_name}</Text>
          <Text style={styles.contactPerson}>{vendor.contact_person}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color="#718096" />
            <Text style={styles.infoText}>{vendor.phone}</Text>
          </View>

          {vendor.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={18} color="#718096" />
              <Text style={styles.infoText}>{vendor.email}</Text>
            </View>
          )}

          {vendor.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color="#718096" />
              <Text style={styles.infoText}>{vendor.address}</Text>
            </View>
          )}
        </View>

        {(vendor.payment_terms || vendor.rating) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Additional Details</Text>
            
            {vendor.payment_terms && (
              <View style={styles.infoRow}>
                <Ionicons name="cash" size={18} color="#718096" />
                <Text style={styles.infoText}>{vendor.payment_terms}</Text>
              </View>
            )}

            {vendor.rating && (
              <View style={styles.infoRow}>
                <Ionicons name="star" size={18} color="#F59E0B" />
                <Text style={styles.infoText}>{vendor.rating}/5</Text>
              </View>
            )}
          </View>
        )}

        {canDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Vendor</Text>
          </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
    textAlign: 'center',
  },
  contactPerson: {
    fontSize: 14,
    color: '#718096',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
    alignSelf: 'flex-start',
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});