import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator,
  ScrollView, StatusBar
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { API_URL } from '../config';

export default function WeatherScreen({ onLocationUpdate }) {
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [sunData, setSunData] = useState(null);
  const [lightStatus, setLightStatus] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = loc.coords;
      setLocation(coords);
      onLocationUpdate(coords);

      const place = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (place.length > 0) {
        const p = place[0];
        setPlaceName(`${p.city || p.district || p.name}, ${p.region}, ${p.country}`);
      }

      await Promise.all([fetchWeather(coords), fetchSun(coords), fetchLightStatus(coords)]);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (coords) => {
    const { data } = await axios.get(`${API_URL}/api/weather`, {
      params: { lat: coords.latitude, lon: coords.longitude },
    });
    setWeather(data);
  };

  const fetchSun = async (coords) => {
    const { data } = await axios.get(
      `https://api.sunrisesunset.io/json?lat=${coords.latitude}&lng=${coords.longitude}&formatted=0`
    );
    setSunData(data.results);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchLightStatus = async (coords) => {
    try {
      const hour = new Date().getHours();
      const defaultStatus = hour >= 18 || hour < 6 ? 'ON' : 'OFF';
      const { data } = await axios.get(`${API_URL}/api/lights/status`, {
        params: { lat: coords.latitude, lon: coords.longitude, motion: false, ldr: 500 },
        timeout: 3000,
      });
      setLightStatus(data.lightOn ? 'ON' : 'OFF');
    } catch {
      const hour = new Date().getHours();
      setLightStatus(hour >= 18 || hour < 6 ? 'ON' : 'OFF');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#F5A623" />
        <Text style={styles.loadingText}>Fetching data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🌆</Text>
        <Text style={styles.headerTitle}>Smart Street Light</Text>
        {placeName ? <Text style={styles.headerPlace}>📍 {placeName}</Text> : null}
      </View>

      {/* Weather Big Card */}
      {weather && (
        <View style={styles.weatherBig}>
          <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°C</Text>
          <Text style={styles.weatherDesc}>{weather.condition.toUpperCase()}</Text>
          <View style={styles.weatherRow}>
            <View style={styles.weatherStat}>
              <Text style={styles.weatherStatVal}>{weather.humidity}%</Text>
              <Text style={styles.weatherStatLabel}>Humidity</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherStat}>
              <Text style={styles.weatherStatVal}>{weather.isDay ? '☀️ Day' : '🌙 Night'}</Text>
              <Text style={styles.weatherStatLabel}>Period</Text>
            </View>
          </View>
        </View>
      )}

      {/* Sun Times */}
      {sunData && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>☀️ Sun Times</Text>
          <View style={styles.sunRow}>
            <View style={styles.sunItem}>
              <Text style={styles.sunEmoji}>🌅</Text>
              <Text style={styles.sunLabel}>Sunrise</Text>
              <Text style={styles.sunTime}>{formatTime(sunData.sunrise)}</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.sunItem}>
              <Text style={styles.sunEmoji}>🌇</Text>
              <Text style={styles.sunLabel}>Sunset</Text>
              <Text style={styles.sunTime}>{formatTime(sunData.sunset)}</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.sunItem}>
              <Text style={styles.sunEmoji}>🌓</Text>
              <Text style={styles.sunLabel}>Day Length</Text>
              <Text style={styles.sunTime}>{sunData.day_length}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Street Light */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💡 Street Light Status</Text>
        <View style={styles.lightRow}>
          <View style={styles.lightLeft}>
            <View style={[
              styles.lightDot,
              { backgroundColor: lightStatus === 'ON' ? '#4CD964' : '#555' }
            ]} />
            <Text style={styles.lightName}>Street Light 1</Text>
          </View>
          <View style={[
            styles.lightBadge,
            lightStatus === 'ON' ? styles.badgeOn : styles.badgeOff
          ]}>
            <Text style={[
              styles.lightBadgeText,
              { color: lightStatus === 'ON' ? '#4CD964' : '#888' }
            ]}>
              {lightStatus || '...'}
            </Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#0D1117' },
  container: { padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 12, fontSize: 14 },

  header: { alignItems: 'center', paddingVertical: 24 },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  headerPlace: { fontSize: 13, color: '#F5A623', marginTop: 4, fontWeight: '500' },

  weatherBig: {
    backgroundColor: '#1C2333', borderRadius: 20, padding: 24,
    marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2A3349',
  },
  weatherTemp: { fontSize: 72, fontWeight: '800', color: '#FFFFFF', lineHeight: 80 },
  weatherDesc: { fontSize: 13, color: '#F5A623', letterSpacing: 3, marginBottom: 20, fontWeight: '600' },
  weatherRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' },
  weatherStat: { alignItems: 'center' },
  weatherStatVal: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  weatherStatLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  weatherDivider: { width: 1, height: 30, backgroundColor: '#2A3349' },

  card: {
    backgroundColor: '#1C2333', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#2A3349',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },

  sunRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  sunItem: { alignItems: 'center', flex: 1 },
  sunEmoji: { fontSize: 22, marginBottom: 4 },
  sunLabel: { fontSize: 11, color: '#666', fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  sunTime: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },

  lightRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  lightLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lightDot: { width: 8, height: 8, borderRadius: 4 },
  lightName: { fontSize: 14, color: '#CCC', fontWeight: '500' },
  lightBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeOn: { backgroundColor: '#0D2B1A' },
  badgeOff: { backgroundColor: '#1E1E1E' },
  lightBadgeText: { fontSize: 12, fontWeight: '700' },
});