import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator,
  ScrollView, StatusBar
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

const STREET_LIGHTS = [
  { id: 1, name: 'Street Light 1' },
  { id: 2, name: 'Street Light 2' },
  { id: 3, name: 'Street Light 3' },
  { id: 4, name: 'Street Light 4' },
  { id: 5, name: 'Street Light 5' },
];

export default function WeatherScreen({ onLocationUpdate }) {
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [sunData, setSunData] = useState(null);
  const [lightStatuses, setLightStatuses] = useState({});
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

      await Promise.all([fetchWeather(coords), fetchSun(coords), fetchAllLightStatuses(coords)]);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (coords) => {
    const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat: coords.latitude, lon: coords.longitude, appid: WEATHER_API_KEY, units: 'metric' },
    });
    setWeather(data);
  };

  const fetchSun = async (coords) => {
    const { data } = await axios.get(
      `https://api.sunrisesunset.io/json?lat=${coords.latitude}&lng=${coords.longitude}&formatted=0`
    );
    setSunData(data.results);
  };

  const fetchAllLightStatuses = async (coords) => {
    const hour = new Date().getHours();
    const defaultStatus = hour >= 18 || hour < 6 ? 'ON' : 'OFF';
    const statuses = {};
    for (const light of STREET_LIGHTS) {
      try {
        const { data } = await axios.get('https://your-backend.com/light-status', {
          params: { lat: coords.latitude, lng: coords.longitude, id: light.id },
          timeout: 3000,
        });
        statuses[light.id] = data.status;
      } catch {
        statuses[light.id] = defaultStatus;
      }
    }
    setLightStatuses(statuses);
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
        {placeName ? <Text style={styles.headerPlace}>{placeName}</Text> : null}
      </View>

      {/* Weather Big Card */}
      {weather && (
        <View style={styles.weatherBig}>
          <Text style={styles.weatherTemp}>{Math.round(weather.main.temp)}°C</Text>
          <Text style={styles.weatherDesc}>{weather.weather[0].description.toUpperCase()}</Text>
          <View style={styles.weatherRow}>
            <View style={styles.weatherStat}>
              <Text style={styles.weatherStatVal}>{weather.main.feels_like}°</Text>
              <Text style={styles.weatherStatLabel}>Feels Like</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherStat}>
              <Text style={styles.weatherStatVal}>{weather.main.humidity}%</Text>
              <Text style={styles.weatherStatLabel}>Humidity</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherStat}>
              <Text style={styles.weatherStatVal}>{weather.wind?.speed} m/s</Text>
              <Text style={styles.weatherStatLabel}>Wind</Text>
            </View>
          </View>
        </View>
      )}

      {/* Location + Sun Row */}
      <View style={styles.row}>
        {location && (
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={styles.cardTitle}>Location</Text>
            <Text style={styles.cardSmall}>{location.latitude.toFixed(4)}°N</Text>
            <Text style={styles.cardSmall}>{location.longitude.toFixed(4)}°E</Text>
          </View>
        )}
        {sunData && (
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardIcon}>☀️</Text>
            <Text style={styles.cardTitle}>Sun Times</Text>
            <Text style={styles.cardSmall}>↑ {sunData.sunrise}</Text>
            <Text style={styles.cardSmall}>↓ {sunData.sunset}</Text>
          </View>
        )}
      </View>

      {/* Street Lights */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💡 Street Light Status</Text>
        {STREET_LIGHTS.map((light, index) => (
          <View
            key={light.id}
            style={[styles.lightRow, index === STREET_LIGHTS.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={styles.lightLeft}>
              <View style={[
                styles.lightDot,
                { backgroundColor: lightStatuses[light.id] === 'ON' ? '#4CD964' : '#555' }
              ]} />
              <Text style={styles.lightName}>{light.name}</Text>
            </View>
            <View style={[
              styles.lightBadge,
              lightStatuses[light.id] === 'ON' ? styles.badgeOn : styles.badgeOff
            ]}>
              <Text style={[
                styles.lightBadgeText,
                { color: lightStatuses[light.id] === 'ON' ? '#4CD964' : '#888' }
              ]}>
                {lightStatuses[light.id] || '...'}
              </Text>
            </View>
          </View>
        ))}
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

  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfCard: { flex: 1 },

  card: {
    backgroundColor: '#1C2333', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#2A3349',
  },
  cardIcon: { fontSize: 22, marginBottom: 6 },
  cardTitle: { fontSize: 12, color: '#666', fontWeight: '600', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  cardSmall: { fontSize: 13, color: '#CCC', marginBottom: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },

  lightRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A3349',
  },
  lightLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lightDot: { width: 8, height: 8, borderRadius: 4 },
  lightName: { fontSize: 14, color: '#CCC', fontWeight: '500' },
  lightBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeOn: { backgroundColor: '#0D2B1A' },
  badgeOff: { backgroundColor: '#1E1E1E' },
  lightBadgeText: { fontSize: 12, fontWeight: '700' },
});