import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URL } from '../config';

export default function ReportScreen({ currentLocation, onCache }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [placeName, setPlaceName] = useState('Getting location...');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      reverseGeocode(currentLocation.lat, currentLocation.lon);
    }
  }, [currentLocation]);

  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
        {
          headers: {
            'User-Agent': 'SmartStreetLightApp/1.0'
          }
        }
      );
      
      const { address } = response.data;
      const place = [
        address.city || address.town || address.village,
        address.state || address.region,
        address.country
      ].filter(Boolean).join(', ');
      
      setPlaceName(place || 'Unknown location');
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      setPlaceName('Location found');
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work! Please enable photo access in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Detailed Image Picker Error: ", error);
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again or check your permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Report title is required');
      return false;
    }
    if (!currentLocation) {
      Alert.alert('Error', 'Location is required. Please enable location services.');
      return false;
    }
    return true;
  };

  const submitReport = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      const reportData = {
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        issueType: 'other',
        description: `${title.trim()} - ${description.trim()}`,
      };

      const response = await axios.post(`${API_URL}/api/reports`, reportData);
      
      if (response.status === 201) {
        Alert.alert(
          'Success',
          'Report submitted successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear form
                setTitle('');
                setDescription('');
                setImage(null);
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('Submit report error:', err);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle="light-content" />

      {/* Location Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>� Report Location</Text>
        <Text style={styles.locationText}>{placeName}</Text>
      </View>

      {/* Report Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Report Details</Text>
        
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Report Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Broken street light"
            placeholderTextColor="#666666"
            multiline
            numberOfLines={2}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Provide additional details about the issue..."
            placeholderTextColor="#666666"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Image Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Attach Photo (Optional)</Text>
          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.image} />
              <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
                <Text style={styles.removeButtonText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Text style={styles.imagePickerText}>📷 Choose Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (!title.trim() || submitting) && styles.submitButtonDisabled]}
        onPress={submitReport}
        disabled={!title.trim() || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Report Guidelines</Text>
        <Text style={styles.infoText}>
          • Provide clear and specific titles{'\n'}
          • Include relevant details in description{'\n'}
          • Attach photos when possible{'\n'}
          • Reports will be reviewed by maintenance team
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#1C2333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3349',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  locationText: {
    color: '#F5A623',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#2A3349',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 50,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imagePickerButton: {
    backgroundColor: '#0D1117',
    borderWidth: 2,
    borderColor: '#2A3349',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  imagePickerText: {
    color: '#F5A623',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#F5A623',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#2A3349',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#1C2333',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A3349',
  },
  infoTitle: {
    color: '#F5A623',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 20,
  },
});