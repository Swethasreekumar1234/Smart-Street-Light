import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, Alert, ScrollView,
  ActivityIndicator, StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URL } from '../config';

export default function ReportScreen({ currentLocation }) {
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
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const submitReport = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a report title.');
      return;
    }
    if (!currentLocation) {
      Alert.alert('Location needed', 'Waiting for your location...');
      return;
    }
    setSubmitting(true);
    try {
      const reportData = {
        lat: currentLocation.latitude,
        lon: currentLocation.longitude,
        issueType: 'other',
        description: `${title}${description ? ' - ' + description : ''}`,
        userId: null
      };

      await axios.post(`${API_URL}/api/reports`, reportData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      Alert.alert('✅ Submitted', 'Report sent successfully!');
      setTitle('');
      setDescription('');
      setImage(null);
    } catch (error) {
      console.log(error);
      Alert.alert('❌ Failed', 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📋</Text>
        <Text style={styles.headerTitle}>Submit Report</Text>
        {currentLocation && (
          <Text style={styles.headerSub}>
            📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Form */}
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>REPORT TITLE *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Street Light 3 is flickering"
          placeholderTextColor="#444"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.fieldLabel}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describe the issue in detail..."
          placeholderTextColor="#444"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Image Picker */}
        <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
          <Text style={styles.imageBtnText}>📷  Attach Photo</Text>
        </TouchableOpacity>

        {image && (
          <View style={styles.imagePreviewWrapper}>
            <Image source={{ uri: image.uri }} style={styles.preview} />
            <TouchableOpacity style={styles.removeImg} onPress={() => setImage(null)}>
              <Text style={{ color: '#FF453A', fontWeight: '700' }}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#0D1117" />
            : <Text style={styles.submitText}>Submit Report →</Text>}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#0D1117' },
  container: { padding: 16, paddingBottom: 30 },

  header: { alignItems: 'center', paddingVertical: 24 },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  headerSub: { fontSize: 12, color: '#F5A623', marginTop: 6, fontWeight: '500' },

  formCard: {
    backgroundColor: '#1C2333', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#2A3349',
  },
  fieldLabel: { fontSize: 11, color: '#F5A623', fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: '#0D1117', borderRadius: 10, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#2A3349',
    color: '#FFFFFF', fontSize: 14,
  },
  multiline: { height: 110, textAlignVertical: 'top' },

  imageBtn: {
    borderWidth: 1, borderColor: '#F5A623', borderStyle: 'dashed',
    borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  imageBtnText: { color: '#F5A623', fontWeight: '600', fontSize: 14 },

  imagePreviewWrapper: { marginBottom: 16 },
  preview: { width: '100%', height: 180, borderRadius: 10, marginBottom: 8 },
  removeImg: { alignItems: 'center' },

  submitBtn: {
    backgroundColor: '#F5A623', padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  submitText: { color: '#0D1117', fontWeight: '800', fontSize: 16 },
});