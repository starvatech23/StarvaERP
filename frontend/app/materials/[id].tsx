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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { materialsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MaterialDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const canDelete = user?.role === 'admin' || user?.role === 'project_manager';

  useEffect(() => {
    loadMaterial();
  }, [id]);

  const loadMaterial = async () => {
    try {
      const response = await materialsAPI.getById(id as string);
      setMaterial(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load material details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Material',
      'Are you sure you want to delete this material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await materialsAPI.delete(id as string);
              Alert.alert('Success', 'Material deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete material');
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

  if (!material) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.materialName}>{material.name}</Text>
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>
                {material.quantity} {material.unit}
              </Text>
            </View>
          </View>
          <Text style={styles.category}>{material.category}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          
          {material.unit_price && (
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={18} color="#718096" />
              <Text style={styles.infoText}>
                ${material.unit_price}/{material.unit}
              </Text>
            </View>
          )}

          {material.vendor_name && (
            <View style={styles.infoRow}>
              <Ionicons name="business" size={18} color="#718096" />
              <Text style={styles.infoText}>Vendor: {material.vendor_name}</Text>
            </View>
          )}

          {material.project_name && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color="#718096" />
              <Text style={styles.infoText}>Project: {material.project_name}</Text>
            </View>
          )}

          {material.location && (
            <View style={styles.infoRow}>
              <Ionicons name="map" size={18} color="#718096" />
              <Text style={styles.infoText}>Location: {material.location}</Text>
            </View>
          )}

          {material.reorder_level && (
            <View style={styles.infoRow}>
              <Ionicons name="alert-circle" size={18} color="#F59E0B" />
              <Text style={styles.infoText}>
                Reorder at: {material.reorder_level} {material.unit}
              </Text>
            </View>
          )}
        </View>

        {material.photos && material.photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosContainer}>
                {material.photos.map((photo: string, index: number) => (
                  <Image key={index} source={{ uri: photo }} style={styles.photo} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {canDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Material</Text>
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
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  materialName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    flex: 1,
    marginRight: 12,
  },
  quantityBadge: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
  },
  category: {
    fontSize: 14,
    color: '#718096',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 12,
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