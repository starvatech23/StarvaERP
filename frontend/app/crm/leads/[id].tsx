import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leadsAPI, leadActivitiesAPI, contactActionsAPI, leadCategoriesAPI } from '../../../services/crm-api';

export default function LeadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadRes, activitiesRes, catsRes] = await Promise.all([
        leadsAPI.get(id as string),
        leadActivitiesAPI.list(id as string),
        leadCategoriesAPI.list()
      ]);
      setLead(leadRes.data);
      setActivities(activitiesRes.data);
      setCategories(catsRes.data);
      setEditData(leadRes.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load lead details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await leadsAPI.update(id as string, editData);
      setLead({ ...lead, ...editData });
      setEditing(false);
      Alert.alert('Success', 'Lead updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleCall = async () => {
    const phoneNumber = lead.primary_phone;
    if (Platform.OS === 'web') {
      // For web, attempt to call API
      try {
        await contactActionsAPI.initiateCall(id as string);
        Alert.alert('Call Initiated', 'Opening dialer...');
        window.open(`tel:${phoneNumber}`, '_self');
      } catch (error) {
        Alert.alert('Mock Call', `Would call: ${phoneNumber}\n(Configure telephony in admin settings)`);
      }
    } else {
      // For mobile, use native dialer
      const url = `tel:${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        // Log activity
        contactActionsAPI.initiateCall(id as string).catch(() => {});
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    }
  };

  const handleWhatsApp = async () => {
    if (!lead.whatsapp_consent) {
      Alert.alert('Consent Required', 'Lead has not consented to WhatsApp messages');
      return;
    }
    const phoneNumber = lead.primary_phone.replace('+', '');
    const message = `Hi ${lead.name}, thank you for your interest!`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      // Log activity
      contactActionsAPI.sendWhatsApp(id as string, { message }).catch(() => {});
    } else {
      Alert.alert('Error', 'WhatsApp is not installed on this device');
    }
  };

  const formatBudget = (amount: number, currency: string = 'INR') => {
    if (!amount) return 'Not specified';
    const symbol = currency === 'INR' ? '₹' : '$';
    if (amount >= 10000000) return `${symbol}${(amount/10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `${symbol}${(amount/100000).toFixed(2)}L`;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'call': return 'call';
      case 'whatsapp': return 'logo-whatsapp';
      case 'email': return 'mail';
      case 'meeting': return 'calendar';
      case 'note': return 'document-text';
      default: return 'information-circle';
    }
  };

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit Lead' : 'Lead Details'}</Text>
        <TouchableOpacity onPress={() => {
          if (editing) {
            handleSave();
          } else {
            setEditing(true);
          }
        }}>
          <Ionicons name={editing ? 'checkmark' : 'create-outline'} size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Contact Actions */}
        {!editing && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.emailButton]} onPress={() => Linking.openURL(`mailto:${lead.email}`)}>
              <Ionicons name="mail" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lead Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name *</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholder="Lead name"
              />
            ) : (
              <Text style={styles.fieldValue}>{lead.name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Primary Phone *</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.primary_phone}
                onChangeText={(text) => setEditData({ ...editData, primary_phone: text })}
                placeholder="+91XXXXXXXXXX"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{lead.primary_phone}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Alternate Phone</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.alternate_phone}
                onChangeText={(text) => setEditData({ ...editData, alternate_phone: text })}
                placeholder="+91XXXXXXXXXX"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{lead.alternate_phone || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.email}
                onChangeText={(text) => setEditData({ ...editData, email: text })}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.fieldValue}>{lead.email || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>City</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.city}
                onChangeText={(text) => setEditData({ ...editData, city: text })}
                placeholder="City name"
              />
            ) : (
              <Text style={styles.fieldValue}>{lead.city || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Budget</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.budget?.toString()}
                onChangeText={(text) => setEditData({ ...editData, budget: parseFloat(text) || 0 })}
                placeholder="Amount in INR"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>{formatBudget(lead.budget, lead.budget_currency)}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Requirement</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editData.requirement}
                onChangeText={(text) => setEditData({ ...editData, requirement: text })}
                placeholder="Project requirements"
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.fieldValue}>{lead.requirement || 'Not provided'}</Text>
            )}
          </View>
        </View>

        {/* Activity Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Timeline</Text>
          {activities.length === 0 ? (
            <Text style={styles.emptyText}>No activities yet</Text>
          ) : (
            activities.map((activity: any) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name={getActivityIcon(activity.activity_type)} size={16} color="#3B82F6" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  {activity.description && (
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                  )}
                  <Text style={styles.activityTime}>
                    {new Date(activity.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {editing && saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A202C', flex: 1, marginLeft: 16 },
  content: { flex: 1 },
  actionsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 6 },
  callButton: { backgroundColor: '#10B981' },
  whatsappButton: { backgroundColor: '#25D366' },
  emailButton: { backgroundColor: '#3B82F6' },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  section: { backgroundColor: '#FFFFFF', marginBottom: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 16 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#718096', marginBottom: 6, textTransform: 'uppercase' },
  fieldValue: { fontSize: 16, color: '#1A202C' },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1A202C' },
  textArea: { height: 100, textAlignVertical: 'top' },
  activityItem: { flexDirection: 'row', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#1A202C', marginBottom: 4 },
  activityDescription: { fontSize: 14, color: '#718096', marginBottom: 4 },
  activityTime: { fontSize: 12, color: '#A0AEC0' },
  emptyText: { fontSize: 14, color: '#A0AEC0', textAlign: 'center', paddingVertical: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  savingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  savingText: { color: '#FFFFFF', marginTop: 12, fontSize: 16 },
});