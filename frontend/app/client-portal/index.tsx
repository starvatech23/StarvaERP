import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ClientPortalIndexScreen() {
  const [projectId, setProjectId] = useState('');

  const handleAccessPortal = () => {
    if (!projectId.trim()) {
      Alert.alert('Error', 'Please enter a valid Project ID');
      return;
    }

    // Navigate to the client portal for this project
    router.push(`/client-portal/${projectId.trim()}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="business-outline" size={48} color="#3B82F6" />
          <Text style={styles.title}>Client Portal</Text>
          <Text style={styles.subtitle}>
            Access your project timeline and chat with your team
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Project ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your project ID"
            value={projectId}
            onChangeText={setProjectId}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHint}>
            Your project ID was provided by your project manager
          </Text>
        </View>

        {/* Access Button */}
        <TouchableOpacity
          style={[styles.accessButton, !projectId.trim() && styles.accessButtonDisabled]}
          onPress={handleAccessPortal}
          disabled={!projectId.trim()}
        >
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          <Text style={styles.accessButtonText}>Access Portal</Text>
        </TouchableOpacity>

        {/* Demo Section */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo Access</Text>
          <Text style={styles.demoText}>
            Try the demo with this sample project ID:
          </Text>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => setProjectId('6927e8f1ba9fff98169f10b2')}
          >
            <Text style={styles.demoButtonText}>6927e8f1ba9fff98169f10b2</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What you can do:</Text>
          <View style={styles.feature}>
            <Ionicons name="calendar-outline" size={20} color="#10B981" />
            <Text style={styles.featureText}>View project timeline and milestones</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
            <Text style={styles.featureText}>Chat with your project team</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="refresh-outline" size={20} color="#F59E0B" />
            <Text style={styles.featureText}>Get real-time project updates</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  accessButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 8,
  },
  accessButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  accessButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  demoSection: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 12,
  },
  demoButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
});