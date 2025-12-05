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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { crmLeadsAPI, crmActivitiesAPI } from '../../../services/api';

export default function LeadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [leadRes, activitiesRes] = await Promise.all([
        crmLeadsAPI.getById(id as string),
        crmActivitiesAPI.getByLead(id as string),
      ]);
      setLead(leadRes.data);
      setActivities(activitiesRes.data);
    } catch (error) {
      console.error('Error loading lead:', error);
      Alert.alert('Error', 'Failed to load lead details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCall = () => {
    if (lead?.primary_phone) {
      Alert.alert(
        'Make a Call',
        `Call ${lead.primary_phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: async () => {
              await Linking.openURL(`tel:${lead.primary_phone}`);
              // Log call activity
              await crmActivitiesAPI.logCall(id as string, {
                duration: 0,
                outcome: 'connected',
                notes: 'Called from mobile app',
              });
              loadData();
            },
          },
        ]
      );
    }
  };

  const handleWhatsApp = () => {
    if (lead?.primary_phone && lead?.whatsapp_consent) {
      const message = `Hello ${lead.name}, thank you for your interest!`;
      Linking.openURL(`whatsapp://send?phone=${lead.primary_phone}&text=${encodeURIComponent(message)}`);
    } else if (!lead?.whatsapp_consent) {
      Alert.alert('No Consent', 'This lead has not consented to WhatsApp messages');
    }
  };

  const handleEmail = () => {
    if (lead?.email) {
      Linking.openURL(`mailto:${lead.email}`);
    }
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

  if (!lead) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead Not Found</Text>
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
        <Text style={styles.headerTitle}>{lead.name}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={20} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {/* Category Badge */}
        {lead.category_name && (
          <View style={[styles.categoryBadge, { backgroundColor: lead.category_color + '30' }]}>
            <View style={[styles.categoryDot, { backgroundColor: lead.category_color }]} />
            <Text style={[styles.categoryText, { color: lead.category_color }]}>
              {lead.category_name}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Ionicons name="call" size={24} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
          
          {lead.whatsapp_consent && (
            <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={24} color="#10B981" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          
          {lead.email && (
            <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
              <Ionicons name="mail" size={24} color="#F59E0B" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Move to Project Button */}
        {!lead.converted_to_project_id && (
          <TouchableOpacity
            style={styles.moveToProjectButton}
            onPress={() => router.push(`/crm/leads/${id}/move-to-project`)}
          >
            <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" />
            <Text style={styles.moveToProjectText}>Convert to Project</Text>
          </TouchableOpacity>
        )}

        {lead.converted_to_project_id && (
          <View style={styles.convertedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.convertedText}>Converted to Project</Text>
          </View>
        )}

        {/* Lead Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#718096" />
            <Text style={styles.infoLabel}>Primary Phone:</Text>
            <Text style={styles.infoValue}>{lead.primary_phone}</Text>
          </View>

          {lead.alternate_phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color="#718096" />
              <Text style={styles.infoLabel}>Alternate:</Text>
              <Text style={styles.infoValue}>{lead.alternate_phone}</Text>
            </View>
          )}

          {lead.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={16} color="#718096" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{lead.email}</Text>
            </View>
          )}

          {lead.city && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color="#718096" />
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>{lead.city}</Text>
            </View>
          )}
        </View>

        {/* Project Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Project Details</Text>
          
          {lead.budget && (
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={16} color="#718096" />
              <Text style={styles.infoLabel}>Budget:</Text>
              <Text style={styles.infoValue}>
                {lead.budget_currency} {lead.budget.toLocaleString()}
              </Text>
            </View>
          )}

          {lead.requirement && (
            <View style={styles.requirementSection}>
              <Text style={styles.infoLabel}>Requirement:</Text>
              <Text style={styles.requirementText}>{lead.requirement}</Text>
            </View>
          )}

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(lead.status) }]}>
                {lead.status.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { borderColor: getPriorityColor(lead.priority), borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: getPriorityColor(lead.priority) }]}>
                {lead.priority.toUpperCase()}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{lead.source.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Activity Timeline */}
        <View style={styles.card}>
          <View style={styles.timelineHeader}>
            <Text style={styles.cardTitle}>Activity Timeline</Text>
            <Text style={styles.activityCount}>{activities.length} activities</Text>
          </View>
          
          {activities.length === 0 ? (
            <Text style={styles.emptyText}>No activities yet</Text>
          ) : (
            activities.map((activity: any, index) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={getActivityIcon(activity.activity_type)}
                    size={20}
                    color={getActivityColor(activity.activity_type)}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  {activity.description && (
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                  )}
                  <Text style={styles.activityMeta}>
                    {activity.performed_by_name} • {new Date(activity.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  const colors: any = {
    new: '#3B82F6',
    contacted: '#8B5CF6',
    qualified: '#F59E0B',
    proposal: '#FF6B35',
    negotiation: '#EC4899',
    won: '#10B981',
    lost: '#EF4444',
  };
  return colors[status] || '#6B7280';
};

const getPriorityColor = (priority: string) => {
  const colors: any = {
    urgent: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#6B7280',
  };
  return colors[priority] || '#6B7280';
};

const getActivityIcon = (type: string) => {
  const icons: any = {
    call: 'call',
    whatsapp: 'logo-whatsapp',
    email: 'mail',
    meeting: 'calendar',
    note: 'document-text',
    site_visit: 'location',
    status_change: 'swap-horizontal',
    field_update: 'create',
  };
  return icons[type] || 'ellipse';
};

const getActivityColor = (type: string) => {
  const colors: any = {
    call: '#3B82F6',
    whatsapp: '#10B981',
    email: '#F59E0B',
    meeting: '#8B5CF6',
    note: '#6B7280',
    site_visit: '#EC4899',
    status_change: '#FF6B35',
    field_update: '#6366F1',
  };
  return colors[type] || '#6B7280';
};

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
  editButton: { width: 40, alignItems: 'flex-end' },
  content: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 16,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryText: { fontSize: 14, fontWeight: '600' },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#4A5568',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A202C',
    flex: 1,
  },
  requirementSection: {
    marginTop: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#4A5568',
    marginTop: 4,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A5568',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityCount: {
    fontSize: 14,
    color: '#718096',
  },
  emptyText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    paddingVertical: 20,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
  },
  activityMeta: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  moveToProjectButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  moveToProjectText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  convertedBanner: {
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  convertedText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});