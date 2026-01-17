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
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AdaptiveDropdown from '../../../components/AdaptiveDropdown';
import ActivityConfirmationModal, { useActivityModal } from '../../../components/ActivityConfirmationModal';
import { userManagementAPI, rolesAPI, teamsAPI } from '../../../services/api';

export default function AddUserScreen() {
  const router = useRouter();
  const { modalState, showSuccess, showError, hideModal } = useActivityModal();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesRes, teamsRes, usersRes] = await Promise.all([
        rolesAPI.getAll(true),
        teamsAPI.getAll(true),
        userManagementAPI.getActive(),
      ]);
      setRoles(rolesRes.data);
      setTeams(teamsRes.data);
      setUsers(usersRes.data);
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
      const response = await userManagementAPI.createUser({
        email: email.trim(),
        phone: phone.trim(),
        full_name: fullName.trim(),
        role_id: roleId,
        team_id: teamId,
        reporting_manager_id: reportingManagerId || null,
        address: address.trim() || null,
        password: password.trim() || null,
      });

      const selectedRole = roles.find(r => r.id === roleId);
      const selectedTeam = teams.find(t => t.id === teamId);
      
      showSuccess(
        'User Created Successfully!',
        `${fullName} has been added to the system.\n\nRole: ${selectedRole?.name || 'N/A'}\nTeam: ${selectedTeam?.name || 'N/A'}\n\nThe user can now login with their credentials.`,
        () => router.back()
      );
    } catch (error: any) {
      showError(
        'Failed to Create User',
        error.response?.data?.detail || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add User</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Users created by admin are automatically approved and can access the app immediately.
            </Text>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color={Colors.textSecondary} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <Text style={styles.label}>Official Email ID *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={Colors.textSecondary} style={styles.icon} />
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
              <Ionicons name="call" size={20} color={Colors.textSecondary} style={styles.icon} />
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
              <Ionicons name="location" size={20} color={Colors.textSecondary} style={styles.icon} />
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

            <AdaptiveDropdown
              label="Role *"
              icon="shield-checkmark"
              placeholder="Select role..."
              options={roles.map((role: any) => ({ label: role.name, value: role.id }))}
              selectedValue={roleId}
              onValueChange={setRoleId}
            />

            <View style={{ height: 12 }} />

            <AdaptiveDropdown
              label="Team/Department *"
              icon="people"
              placeholder="Select team..."
              options={teams.map((team: any) => ({ label: team.name, value: team.id }))}
              selectedValue={teamId}
              onValueChange={setTeamId}
            />
          </View>

          {/* Optional Password */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security (Optional)</Text>

            <Text style={styles.label}>Initial Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} style={styles.icon} />
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
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color={Colors.surface} />
                <Text style={styles.createButtonText}>Create User</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success/Error Confirmation Modal */}
      <ActivityConfirmationModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
        onConfirm={modalState.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    backgroundColor: Colors.surface,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: 12,
  },
  picker: {
    flex: 1,
    color: Colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    color: Colors.surface,
  },
});
