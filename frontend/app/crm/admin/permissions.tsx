import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackToHome from '../../../components/BackToHome';
import { crmPermissionsAPI } from '../../../services/api';

export default function PermissionsScreen() {
  const router = useRouter();
  const [matrix, setMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      const res = await crmPermissionsAPI.getMatrix();
      setMatrix(res.data.matrix);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only admins can view permissions');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackToHome />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color=Colors.secondary />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackToHome />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Permission Matrix</Text>
        <Text style={styles.headerSubtitle}>Role-based CRM access control</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#10B981" />
          <Text style={styles.infoText}>
            This matrix shows which CRM permissions each role has. Permissions are enforced automatically.
          </Text>
        </View>

        {matrix && matrix.map((rolePermission: any, index: number) => (
          <View key={index} style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <View style={styles.roleIconContainer}>
                <Ionicons name="person" size={20} color=Colors.primary />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleName}>{rolePermission.role}</Text>
                <Text style={styles.roleSubtitle}>
                  {rolePermission.permissions.length} permissions
                </Text>
              </View>
            </View>

            <View style={styles.permissionsList}>
              {rolePermission.permissions.map((permission: string, pIndex: number) => (
                <View key={pIndex} style={styles.permissionBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.permissionText}>
                    {permission.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
              {rolePermission.permissions.length === 0 && (
                <Text style={styles.noPermissions}>No CRM permissions</Text>
              )}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'Colors.background },
  header: {
    padding: 24,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: 'Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#065F46', lineHeight: 20 },
  roleCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  roleSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  permissionsList: { gap: 8 },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  permissionText: {
    fontSize: 13,
    color: '#166534',
    textTransform: 'capitalize',
  },
  noPermissions: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    paddingVertical: 8,
  },
});