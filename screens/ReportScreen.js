// screens/ReportScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function ReportScreen({ currentLocation, onCache }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const submitReport = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a report title.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('latitude', currentLocation?.latitude ?? 'unknown');
      formData.append('longitude', currentLocation?.longitude ?? 'unknown');

      if (image) {
        formData.append('photo', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'report.jpg',
        });
      }

      // Save locally first (offline support)
      const reportData = { title, description, location: currentLocation, timestamp: new Date().toISOString() };
      await onCache('latest_report', reportData);

      // Try submitting to backend
      await axios.post('https://your-backend.com/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 5000,
      });

      Alert.alert('Success', 'Report submitted!');
      setTitle(''); setDescription(''); setImage(null);
    } catch (e) {
      Alert.alert('Saved Offline', 'Report cached locally. Will sync when online.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📋 Submit Report</Text>

      {currentLocation && (
        <Text style={styles.locationText}>
          📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
        </Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Report Title *"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={styles.imageBtnText}>📷 Attach Photo</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image.uri }} style={styles.preview} />
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="white" />
          : <Text style={styles.submitText}>Submit Report</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  locationText: { textAlign: 'center', color: '#666', marginBottom: 15 },
  input: {
    backgroundColor: 'white', borderRadius: 8, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#ddd',
  },
  multiline: { height: 100, textAlignVertical: 'top' },
  imageBtn: {
    backgroundColor: '#e3f2fd', padding: 14, borderRadius: 8,
    alignItems: 'center', marginBottom: 12,
  },
  imageBtnText: { color: '#2196F3', fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  submitBtn: {
    backgroundColor: '#2196F3', padding: 16,
    borderRadius: 8, alignItems: 'center',
  },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});