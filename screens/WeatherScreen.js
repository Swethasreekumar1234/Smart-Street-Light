import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;// 🔑 Replace this

export default function WeatherScreen({ onLocationUpdate }) {
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [sunData, setSunData] = useState(null);
  const [lightStatus, setLightStatus] = useState('CHECKING...');
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
        Alert.alert('Permission Denied', 'Location access is needed for weather data.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = loc.coords;
      setLocation(coords);
      onLocationUpdate(coords);

      await Promise.all([
        fetchWeather(coords),
        fetchSun(coords),
        fetchLightStatus(coords),
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch data. Check your connection.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (coords) => {
    const { data } = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
          appid: WEATHER_API_KEY,
          units: 'metric',
        },
      }
    );
    setWeather(data);
  };

  const fetchSun = async (coords) => {
    const { data } = await axios.get(
      `https://api.sunrisesunset.io/json?lat=${coords.latitude}&lng=${coords.longitude}&formatted=0`
    );
    setSunData(data.results);
  };

  const fetchLightStatus = async (coords) => {
    try {
      const { data } = await axios.get('https://your-backend.com/light-status', {
        params: { lat: coords.latitude, lng: coords.longitude },
        timeout: 3000,
      });
      setLightStatus(data.status);
    } catch {
      const hour = new Date().getHours();
      setLightStatus(hour >= 18 || hour < 6 ? 'ON' : 'OFF');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 10 }}>Fetching location & weather...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🌤 Weather & Light Control</Text>

      {location && (
        <View style={styles.card}>
          <Text style={styles.label}>📍 Location</Text>
          <Text>Lat: {location.latitude.toFixed(5)}</Text>
          <Text>Lng: {location.longitude.toFixed(5)}</Text>
        </View>
      )}

      {weather && (
        <View style={styles.card}>
          <Text style={styles.label}>🌡 Weather — {weather.name}</Text>
          <Text>Temperature: {weather.main.temp}°C</Text>
          <Text>Feels like: {weather.main.feels_like}°C</Text>
          <Text>Humidity: {weather.main.humidity}%</Text>
          <Text>Condition: {weather.weather[0].description}</Text>
        </View>
      )}

      {sunData && (
        <View style={styles.card}>
          <Text style={styles.label}>☀️ Sun Times</Text>
          <Text>Sunrise: {sunData.sunrise}</Text>
          <Text>Sunset: {sunData.sunset}</Text>
          <Text>Day Length: {sunData.day_length}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>💡 IoT Light Status</Text>
        <Text style={[styles.lightText, lightStatus === 'ON' && styles.lightOn]}>
          {lightStatus}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  card: {
    backgroundColor: 'white', padding: 15, marginBottom: 12,
    borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  label: { fontWeight: 'bold', fontSize: 16, marginBottom: 6, color: '#2196F3' },
  lightText: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#999' },
  lightOn: { color: '#4CAF50' },
});