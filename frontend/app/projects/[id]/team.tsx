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
  Linking,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { projectsAPI, userManagementAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export default function ProjectTeamScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'project_manager';

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [projectRes, usersRes] = await Promise.all([
        projectsAPI.getById(id as string),
        userManagementAPI.getActive(),
      ]);

      setProject(projectRes.data);
      setAllUsers(usersRes.data);
      setSelectedUserIds(projectRes.data.team_member_ids || []);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await projectsAPI.updateTeam(id as string, selectedUserIds);
      Alert.alert('Success', 'Team updated successfully');
      setIsEditMode(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleCall = (phone: string, name: string) => {
    Alert.alert('Call Team Member', `Call ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: () => {
          Linking.openURL(`tel:${phone}`).catch(() => {
            Alert.alert('Error', 'Unable to make call');
          });
        },
      },
    ]);
  };

  const currentTeamMembers = project?.team_members || [];
  const availableUsers = allUsers.filter(
    (user) => !selectedUserIds.includes(user.id)
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Project Team</Text>
          <Text style={styles.headerSubtitle}>{project?.name}</Text>
        </View>
        {canEdit && !isEditMode && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditMode(true)}
          >
            <Ionicons name="create" size={20} color={Colors.surface} />
          </TouchableOpacity>
        )}
        {!canEdit && <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.content}>
        {/* Current Team Section */}
        {!isEditMode && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team Members</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{currentTeamMembers.length}</Text>
              </View>
            </View>

            {/* Data Integrity Warning */}
            {project?.team_member_ids?.length > 0 && 
             currentTeamMembers.length < project?.team_member_ids?.length && (
              <View style={styles.dataWarningBanner}>
                <Ionicons name="warning" size={18} color="#B45309" />
                <View style={styles.dataWarningContent}>
                  <Text style={styles.dataWarningTitle}>Some members unavailable</Text>
                  <Text style={styles.dataWarningText}>
                    {project.team_member_ids.length - currentTeamMembers.length} team member(s) could not be loaded. 
                    They may have been removed from the system. Consider updating the team list.
                  </Text>
                </View>
              </View>
            )}

            {currentTeamMembers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#CBD5E0" />
                <Text style={styles.emptyTitle}>No Team Members</Text>
                <Text style={styles.emptyText}>
                  Add team members to collaborate on this project
                </Text>
              </View>
            ) : (
              currentTeamMembers.map((member: any) => (
                <View key={member.user_id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Ionicons name="person" size={24} color={Colors.primary} />
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.full_name}</Text>
                    {member.role_name && (
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{member.role_name}</Text>
                      </View>
                    )}

                    {member.phone && (
                      <View style={styles.contactRow}>
                        <Ionicons name="call" size={14} color={Colors.textSecondary} />
                        <Text style={styles.contactText}>{member.phone}</Text>
                      </View>
                    )}

                    {member.email && (
                      <View style={styles.contactRow}>
                        <Ionicons name="mail" size={14} color={Colors.textSecondary} />
                        <Text style={styles.contactText}>{member.email}</Text>
                      </View>
                    )}
                  </View>

                  {member.phone && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCall(member.phone, member.full_name)}
                    >
                      <Ionicons name="call" size={20} color="#10B981" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Edit Mode */}
        {isEditMode && (
          <>
            {/* Selected Members */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Selected Team Members ({selectedUserIds.length})
              </Text>

              {selectedUserIds.length === 0 ? (
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={20} color={Colors.primary} />
                  <Text style={styles.infoText}>
                    Select users from the list below to add them to the team
                  </Text>
                </View>
              ) : (
                selectedUserIds.map((userId) => {
                  const user = allUsers.find((u) => u.id === userId);
                  if (!user) return null;

                  return (
                    <View key={userId} style={styles.selectedUserCard}>
                      <View style={styles.selectedUserInfo}>
                        <Ionicons name="person" size={20} color="#10B981" />
                        <Text style={styles.selectedUserName}>{user.full_name}</Text>
                        {user.role_name && (
                          <Text style={styles.selectedUserRole}>· {user.role_name}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => toggleUserSelection(userId)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>

            {/* Available Users */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Team Members</Text>

              {availableUsers.length === 0 ? (
                <View style={styles.infoCard}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.infoText}>
                    All available users have been added to the team
                  </Text>
                </View>
              ) : (
                availableUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userCard}
                    onPress={() => toggleUserSelection(user.id)}
                  >
                    <View style={styles.userAvatar}>
                      <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name}</Text>
                      {user.role_name && (
                        <Text style={styles.userRole}>{user.role_name}</Text>
                      )}
                    </View>
                    <View style={styles.addButton}>
                      <Ionicons name="add-circle" size={28} color="#10B981" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedUserIds(project?.team_member_ids || []);
                  setIsEditMode(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.surface} />
                    <Text style={styles.saveButtonText}>Save Team</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
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
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.surface,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  selectedUserRole: {
    fontSize: 13,
    color: '#10B981',
  },
  removeButton: {
    padding: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  userRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
