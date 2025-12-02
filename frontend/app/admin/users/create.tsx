import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { userManagementAPI, rolesAPI, teamsAPI } from '../../../services/api';

export default function AddUserScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesRes, teamsRes] = await Promise.all([
        rolesAPI.getAll(true),
        teamsAPI.getAll(true),
      ]);
      setRoles(rolesRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load roles and teams');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter mobile number');
      return;
    }

    if (!roleId) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    if (!teamId) {
      Alert.alert('Error', 'Please select a team');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await userManagementAPI.createUser({
        email: email.trim(),
        phone: phone.trim(),
        full_name: fullName.trim(),
        role_id: roleId,
        team_id: teamId,
        address: address.trim() || null,
        password: password.trim() || null,
      });

      Alert.alert('Success', 'User created successfully and auto-approved', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add User</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Users created by admin are automatically approved and can access the app immediately.
            </Text>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#718096" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <Text style={styles.label}>Official Email ID *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#718096" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Mobile Number *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call" size={20} color="#718096" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.label}>Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location" size={20} color="#718096" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter address (optional)"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Role and Team */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Role & Team Assignment</Text>

            <Text style={styles.label}>Role *</Text>
            <View style={styles.pickerContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#718096" style={styles.icon} />
              <Picker
                selectedValue={roleId}
                onValueChange={setRoleId}
                style={styles.picker}
                dropdownIconColor="#1A202C"
              >
                <Picker.Item label="Select role..." value="" color="#9CA3AF" />
                {roles.map((role: any) => (
                  <Picker.Item key={role.id} label={role.name} value={role.id} color="#1A202C" />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Team/Department *</Text>
            <View style={styles.pickerContainer}>
              <Ionicons name="people" size={20} color="#718096" style={styles.icon} />
              <Picker
                selectedValue={teamId}
                onValueChange={setTeamId}
                style={styles.picker}
                dropdownIconColor="#1A202C"
              >
                <Picker.Item label="Select team..." value="" color="#9CA3AF" />
                {teams.map((team: any) => (
                  <Picker.Item key={team.id} label={team.name} value={team.id} color="#1A202C" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Optional Password */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security (Optional)</Text>

            <Text style={styles.label}>Initial Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#718096" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Leave blank to set later"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            <Text style={styles.helperText}>
              User can set or change password later
            </Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create User</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  keyboardView: {
    flex: 1,
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
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  section: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: 12,
  },
  picker: {
    flex: 1,
    color: '#1A202C',
  },
  helperText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
