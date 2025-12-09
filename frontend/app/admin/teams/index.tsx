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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { teamsAPI } from '../../../services/api';

export default function TeamsListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const response = await teamsAPI.getAll();
      setTeams(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    Alert.alert(
      'Delete Team',
      `Are you sure you want to delete "${teamName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await teamsAPI.delete(teamId);
              Alert.alert('Success', 'Team deleted successfully');
              loadTeams();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to delete team'
              );
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
          <ActivityIndicator size="large" color="Colors.secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/admin/teams/create' as any)}
        >
          <Ionicons name="add" size={24} color="Colors.surface" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTeams} />
        }
      >
        {teams.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No Teams Yet</Text>
            <Text style={styles.emptyText}>
              Create teams to organize your users by department
            </Text>
          </View>
        ) : (
          <View style={styles.teamsList}>
            <Text style={styles.countText}>{teams.length} team(s)</Text>

            {teams.map((team: any) => (
              <TouchableOpacity
                key={team.id}
                style={styles.teamCard}
                onPress={() => router.push(`/admin/teams/edit/${team.id}` as any)}
              >
                <View style={styles.teamHeader}>
                  <View style={styles.teamIcon}>
                    <Ionicons name="people" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    {team.description && (
                      <Text style={styles.teamDescription} numberOfLines={2}>
                        {team.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.teamActions}>
                    {team.is_active ? (
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    ) : (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.teamFooter}>
                  <View style={styles.memberCount}>
                    <Ionicons name="person" size={16} color="Colors.textSecondary" />
                    <Text style={styles.memberCountText}>
                      {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={styles.footerActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => router.push(`/admin/teams/edit/${team.id}` as any)}
                    >
                      <Ionicons name="create-outline" size={18} color="Colors.primary" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(team.id, team.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
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
    backgroundColor: 'Colors.background',
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
    backgroundColor: 'Colors.surface',
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'Colors.background',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: 'Colors.textSecondary',
    textAlign: 'center',
    marginTop: 8,
  },
  teamsList: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'Colors.textSecondary',
    marginBottom: 12,
  },
  teamCard: {
    backgroundColor: 'Colors.surface',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'Colors.border',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.textPrimary',
  },
  teamDescription: {
    fontSize: 13,
    color: 'Colors.textSecondary',
    marginTop: 4,
  },
  teamActions: {
    marginLeft: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inactiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  teamFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCountText: {
    fontSize: 13,
    color: 'Colors.textSecondary',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.primary',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});