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
  Switch,
} from 'react-native';
import Colors from '../../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdaptiveDropdown from '../../../../components/AdaptiveDropdown';
import { userManagementAPI, rolesAPI, teamsAPI } from '../../../../services/api';

export default function EditUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [rolesRes, teamsRes, userRes] = await Promise.all([
        rolesAPI.getAll(true),
        teamsAPI.getAll(true),
        userManagementAPI.getUser(id as string),
      ]);
      
      setRoles(rolesRes.data);
      setTeams(teamsRes.data);
      
      const user = userRes.data;
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRoleId(user.role_id || '');
      setTeamId(user.team_id || '');
      setAddress(user.address || '');
      setIsActive(user.is_active !== false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load user data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email address');
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

    setSaving(true);
    try {
      await userManagementAPI.updateUser(id as string, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role_id: roleId,
        team_id: teamId,
        address: address.trim() || null,
        is_active: isActive,
      });

      Alert.alert('Success', 'User updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading user...</Text>
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
          <Text style={styles.headerTitle}>Edit User</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
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

            <Text style={styles.label}>Mobile Number</Text>
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

            <Text style={styles.label}>Role *</Text>
            <View style={styles.pickerContainer}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.textSecondary} style={styles.icon} />
              <Picker
                selectedValue={roleId}
                onValueChange={setRoleId}
                style={styles.picker}
                dropdownIconColor={Colors.textPrimary}
              >
                <Picker.Item label="Select role..." value="" color="#9CA3AF" />
                {roles.map((role: any) => (
                  <Picker.Item key={role.id} label={role.name} value={role.id} color={Colors.textPrimary} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Team/Department *</Text>
            <View style={styles.pickerContainer}>
              <Ionicons name="people" size={20} color={Colors.textSecondary} style={styles.icon} />
              <Picker
                selectedValue={teamId}
                onValueChange={setTeamId}
                style={styles.picker}
                dropdownIconColor={Colors.textPrimary}
              >
                <Picker.Item label="Select team..." value="" color="#9CA3AF" />
                {teams.map((team: any) => (
                  <Picker.Item key={team.id} label={team.name} value={team.id} color={Colors.textPrimary} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Status</Text>
            
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="checkmark-circle" size={20} color={isActive ? '#10B981' : Colors.textSecondary} />
                <Text style={styles.switchText}>Active Account</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                thumbColor={Colors.surface}
              />
            </View>
            <Text style={styles.helperText}>
              {isActive ? 'User can access the app' : 'User is blocked from accessing the app'}
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={Colors.surface} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
