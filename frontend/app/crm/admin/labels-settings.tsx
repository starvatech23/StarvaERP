import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackToHome from '../../../components/BackToHome';

export default function LabelsSettingsScreen() {
  const [labels, setLabels] = useState({
    leadSingular: 'Lead',
    leadPlural: 'Leads',
    funnelSingular: 'Funnel',
    funnelPlural: 'Funnels',
    stageSingular: 'Stage',
    stagePlural: 'Stages',
    newLeadButton: 'New Lead',
    moveToProjectButton: 'Move to Project',
    assignLeadButton: 'Assign Lead',
    contactInfoSection: 'Contact Information',
    customFieldsSection: 'Custom Fields',
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleLabelChange = (key: string, value: string) => {
    setLabels({ ...labels, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    Alert.alert('Success', 'System labels updated successfully');
    setHasChanges(false);
    // In production, this would call an API to save labels
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all labels to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setLabels({
              leadSingular: 'Lead',
              leadPlural: 'Leads',
              funnelSingular: 'Funnel',
              funnelPlural: 'Funnels',
              stageSingular: 'Stage',
              stagePlural: 'Stages',
              newLeadButton: 'New Lead',
              moveToProjectButton: 'Move to Project',
              assignLeadButton: 'Assign Lead',
              contactInfoSection: 'Contact Information',
              customFieldsSection: 'Custom Fields',
            });
            setHasChanges(true);
            Alert.alert('Success', 'Labels reset to defaults');
          },
        },
      ]
    );
  };

  const labelGroups = [
    {
      title: 'Entity Names',
      icon: 'pricetags',
      color: '#F59E0B',
      items: [
        { key: 'leadSingular', label: 'Lead (Singular)', placeholder: 'e.g., Lead, Prospect, Contact' },
        { key: 'leadPlural', label: 'Lead (Plural)', placeholder: 'e.g., Leads, Prospects, Contacts' },
        { key: 'funnelSingular', label: 'Funnel (Singular)', placeholder: 'e.g., Funnel, Pipeline, Workflow' },
        { key: 'funnelPlural', label: 'Funnel (Plural)', placeholder: 'e.g., Funnels, Pipelines, Workflows' },
        { key: 'stageSingular', label: 'Stage (Singular)', placeholder: 'e.g., Stage, Phase, Step' },
        { key: 'stagePlural', label: 'Stage (Plural)', placeholder: 'e.g., Stages, Phases, Steps' },
      ],
    },
    {
      title: 'Action Buttons',
      icon: 'flash',
      color: '#8B5CF6',
      items: [
        { key: 'newLeadButton', label: 'New Lead Button', placeholder: 'e.g., New Lead, Create Lead, Add Contact' },
        { key: 'moveToProjectButton', label: 'Move to Project Button', placeholder: 'e.g., Convert to Project, Start Project' },
        { key: 'assignLeadButton', label: 'Assign Lead Button', placeholder: 'e.g., Assign, Transfer, Delegate' },
      ],
    },
    {
      title: 'Section Headers',
      icon: 'list',
      color: Colors.primary,
      items: [
        { key: 'contactInfoSection', label: 'Contact Info Section', placeholder: 'e.g., Contact Information, Details' },
        { key: 'customFieldsSection', label: 'Custom Fields Section', placeholder: 'e.g., Additional Details, Extra Info' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BackToHome />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>System Labels</Text>
          <Text style={styles.headerSubtitle}>Customize terminology for your team</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color="Colors.textSecondary" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#F59E0B" />
          <Text style={styles.infoText}>
            Customize the terminology used throughout the CRM to match your business vocabulary.
          </Text>
        </View>

        {labelGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.groupContainer}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupIconContainer, { backgroundColor: group.color + '20' }]}>
                <Ionicons name={group.icon as any} size={20} color={group.color} />
              </View>
              <Text style={styles.groupTitle}>{group.title}</Text>
            </View>

            {group.items.map((item) => (
              <View key={item.key} style={styles.labelItem}>
                <Text style={styles.labelItemLabel}>{item.label}</Text>
                <TextInput
                  style={styles.labelInput}
                  value={labels[item.key as keyof typeof labels]}
                  onChangeText={(text) => handleLabelChange(item.key, text)}
                  placeholder={item.placeholder}
                  placeholderTextColor="#CBD5E0"
                />
              </View>
            ))}
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {hasChanges && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Ionicons name="checkmark-circle" size={24} color="Colors.surface" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: { flex: 1, padding: 16 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#92400E', lineHeight: 20 },
  groupContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  labelItem: { marginBottom: 16 },
  labelItemLabel: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  labelInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: Colors.surface },
});