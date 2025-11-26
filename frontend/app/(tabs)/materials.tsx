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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { materialsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MaterialsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canCreate = user?.role !== 'worker';

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const response = await materialsAPI.getAll();
      setMaterials(response.data);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMaterials();
  }, []);

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
        <Text style={styles.headerTitle}>Materials</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/vendors/index' as any)}
          >
            <Ionicons name="people" size={20} color="#FF6B35" />
          </TouchableOpacity>
          {canCreate && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/materials/create' as any)}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
      >
        {materials.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Materials Yet</Text>
            <Text style={styles.emptyText}>
              {canCreate
                ? 'Add materials to track your inventory and manage supplies'
                : 'No materials have been added yet'}
            </Text>
            {canCreate && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/materials/create' as any)}
              >
                <Text style={styles.createButtonText}>Add Material</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.materialsList}>
            {materials.map((material: any) => (
              <TouchableOpacity
                key={material.id}
                style={styles.materialCard}
                onPress={() => router.push(`/materials/${material.id}` as any)}
              >
                <View style={styles.materialHeader}>
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialName}>{material.name}</Text>
                    <Text style={styles.materialCategory}>{material.category}</Text>
                  </View>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>
                      {material.quantity} {material.unit}
                    </Text>
                  </View>
                </View>
                <View style={styles.materialDetails}>
                  {material.vendor_name && (
                    <View style={styles.detailRow}>
                      <Ionicons name="business" size={14} color="#718096" />
                      <Text style={styles.detailText}>{material.vendor_name}</Text>
                    </View>
                  )}
                  {material.project_name && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={14} color="#718096" />
                      <Text style={styles.detailText}>{material.project_name}</Text>
                    </View>
                  )}
                  {material.unit_price && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={14} color="#718096" />
                      <Text style={styles.detailText}>${material.unit_price}/{material.unit}</Text>
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
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
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
  materialsList: {
    gap: 16,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  materialCategory: {
    fontSize: 13,
    color: '#718096',
  },
  quantityBadge: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  materialDetails: {
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