import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { materialsAPI, vendorsAPI, projectsAPI } from '../../services/api';

export default function CreateMaterialScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [unitPrice, setUnitPrice] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [location, setLocation] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vendorsRes, projectsRes] = await Promise.all([
        vendorsAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setVendors(vendorsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos([...photos, base64Image]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name || !category || !quantity || !unit) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await materialsAPI.create({
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        unit_price: unitPrice ? parseFloat(unitPrice) : null,
        vendor_id: vendorId || null,
        project_id: projectId || null,
        location: location || null,
        reorder_level: reorderLevel ? parseFloat(reorderLevel) : null,
        photos,
      });

      Alert.alert('Success', 'Material added successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="Colors.textPrimary" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Material</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Material Information</Text>

            <Text style={styles.label}>Material Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cement, Steel Bars, Bricks"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Category *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Building Materials, Tools, Equipment"
              value={category}
              onChangeText={setCategory}
            />

            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Unit *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={unit}
                onValueChange={setUnit}
                style={styles.picker}
              >
                <Picker.Item label="Pieces (pcs)" value="pcs" />
                <Picker.Item label="Kilograms (kg)" value="kg" />
                <Picker.Item label="Bags" value="bags" />
                <Picker.Item label="Tons" value="tons" />
                <Picker.Item label="Meters (m)" value="m" />
                <Picker.Item label="Square Meters (sqm)" value="sqm" />
                <Picker.Item label="Cubic Meters (cum)" value="cum" />
                <Picker.Item label="Liters (l)" value="l" />
              </Picker>
            </View>

            <Text style={styles.label}>Unit Price</Text>
            <TextInput
              style={styles.input}
              placeholder="Price per unit"
              value={unitPrice}
              onChangeText={setUnitPrice}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Reorder Level</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum quantity before reorder"
              value={reorderLevel}
              onChangeText={setReorderLevel}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignment</Text>

            <Text style={styles.label}>Vendor</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={vendorId}
                onValueChange={setVendorId}
                style={styles.picker}
              >
                <Picker.Item label="Select Vendor" value="" />
                {vendors.map((vendor: any) => (
                  <Picker.Item
                    key={vendor.id}
                    label={vendor.company_name}
                    value={vendor.id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Project</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={projectId}
                onValueChange={setProjectId}
                style={styles.picker}
              >
                <Picker.Item label="Select Project" value="" />
                {projects.map((project: any) => (
                  <Picker.Item
                    key={project.id}
                    label={project.name}
                    value={project.id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Storage location"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="camera" size={32} color="Colors.secondary" />
                <Text style={styles.photoButtonText}>Add Photo</Text>
              </TouchableOpacity>

              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="Colors.surface" />
            ) : (
              <Text style={styles.createButtonText}>Add Material</Text>
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
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: Colors.textPrimary,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoButtonText: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 8,
    fontWeight: '600',
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  createButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  createButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});