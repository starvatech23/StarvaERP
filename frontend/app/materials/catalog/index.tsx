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
import { materialsAPI } from '../../../services/api';

export default function MaterialCatalogScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadMaterials();
    }, [])
  );

  const loadMaterials = async () => {
    try {
      const response = await materialsAPI.getAll();
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (materialId: string) => {
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
              await materialsAPI.delete(materialId);
              loadMaterials();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete material');
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: any = {
      cement: '#6B7280',
      steel: '#EF4444',
      sand: '#F59E0B',
      aggregate: '#8B5CF6',
      bricks: '#DC2626',
      wood: '#92400E',
      paint: '#3B82F6',
      electrical: '#FBBF24',
      plumbing: '#2563EB',
      other: '#10B981',
    };
    return colors[category] || '#6B7280';
  };

  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
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
        <Text style={styles.headerTitle}>Material Catalog</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/materials/catalog/add' as any)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#718096" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search materials..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#A0AEC0"
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredMaterials.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No materials found' : 'No materials yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Add materials to your catalog'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/materials/catalog/add' as any)}
              >
                <Text style={styles.emptyButtonText}>Add Material</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredMaterials.map((material) => (
            <View key={material.id} style={styles.materialCard}>
              <View style={styles.materialHeader}>
                <View style={styles.materialLeft}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryColor(material.category) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: getCategoryColor(material.category) },
                      ]}
                    >
                      {material.category.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.materialName}>{material.name}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(material.id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.materialDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unit:</Text>
                  <Text style={styles.detailValue}>{material.unit}</Text>
                </View>
                {material.description && (
                  <Text style={styles.materialDescription}>{material.description}</Text>
                )}
                {material.minimum_stock && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Min Stock:</Text>
                    <Text style={styles.detailValue}>{material.minimum_stock} {material.unit}</Text>
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
    backgroundColor: '#10B981',
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
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  materialLeft: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  materialDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#718096',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A202C',
  },
  materialDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
  },
});