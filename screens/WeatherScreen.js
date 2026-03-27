import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { API_URL } from '../config';

export default function WeatherScreen({ onLocationUpdate }) {
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState('Getting location...');
  const [weather, setWeather] = useState(null);
  const [sunTimes, setSunTimes] = useState(null);
  const [lightStatus, setLightStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      const locationData = { lat: latitude, lon: longitude };
      setLocation(locationData);
      
      // Reverse geocode to get place name
      await reverseGeocode(latitude, longitude);
      
      // Update parent component
      if (onLocationUpdate) {
        onLocationUpdate(locationData);
      }

      return locationData;
    } catch (err) {
      setError('Failed to get location');
      console.error('Location error:', err);
      return null;
    }
  };

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

  const fetchWeather = async (lat, lon) => {
    try {
      const response = await axios.get(`${API_URL}/api/weather?lat=${lat}&lon=${lon}`);
      setWeather(response.data);
    } catch (err) {
      console.error('Weather fetch error:', err);
      // Don't show error for weather, just use fallback
    }
  };

  const fetchSunTimes = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lon}&formatted=0`
      );
      
      const { results } = response.data;
      const sunrise = new Date(results.sunrise).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const sunset = new Date(results.sunset).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      setSunTimes({ sunrise, sunset });
    } catch (err) {
      console.error('Sun times fetch error:', err);
      // Use fallback
      setSunTimes({ sunrise: '6:30 AM', sunset: '6:30 PM' });
    }
  };

  const fetchLightStatus = async (lat, lon) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/lights/status?lat=${lat}&lon=${lon}&motion=false&ldr=500`
      );
      setLightStatus(response.data);
    } catch (err) {
      console.error('Light status fetch error:', err);
      // Don't show error, just use fallback
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loc = await getLocationPermission();
      if (loc) {
        await Promise.all([
          fetchWeather(loc.lat, loc.lon),
          fetchSunTimes(loc.lat, loc.lon),
          fetchLightStatus(loc.lat, loc.lon),
        ]);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A623" />
      }
    >
      <StatusBar barStyle="light-content" />

      {/* Location Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Current Location</Text>
        <Text style={styles.locationText}>{placeName}</Text>
      </View>

      {/* Weather Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌤️ Weather</Text>
        {weather ? (
          <View>
            <View style={styles.weatherHeader}>
              <View>
                <Text style={styles.temperature}>{weather.temperature}°C</Text>
                <Text style={styles.condition}>{weather.condition}</Text>
                <Text style={styles.city}>{weather.city}</Text>
              </View>
              {weather.icon && (
                <Image source={{ uri: weather.icon }} style={styles.weatherIcon} />
              )}
            </View>
            <View style={styles.weatherDetails}>
              <Text style={styles.detailText}>💧 Humidity: {weather.humidity}%</Text>
              <Text style={styles.detailText}>
                {weather.isDay ? '☀️ Daytime' : '🌙 Nighttime'}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.fallbackText}>Weather data unavailable</Text>
        )}
      </View>

      {/* Sun Times Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌅 Sun Times</Text>
        {sunTimes ? (
          <View style={styles.sunTimesContainer}>
            <View style={styles.sunTimeItem}>
              <Text style={styles.sunTimeLabel}>Sunrise</Text>
              <Text style={styles.sunTimeValue}>{sunTimes.sunrise}</Text>
            </View>
            <View style={styles.sunTimeItem}>
              <Text style={styles.sunTimeLabel}>Sunset</Text>
              <Text style={styles.sunTimeValue}>{sunTimes.sunset}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.fallbackText}>Sun times unavailable</Text>
        )}
      </View>

      {/* Street Light Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Street Light Status</Text>
        <View style={styles.lightContainer}>
          <Text style={styles.lightName}>Street Light 1</Text>
          {lightStatus ? (
            <View style={[
              styles.statusBadge,
              lightStatus.lightOn ? styles.onBadge : styles.offBadge
            ]}>
              <Text style={[
                styles.statusText,
                lightStatus.lightOn ? styles.onText : styles.offText
              ]}>
                {lightStatus.lightOn ? 'ON' : 'OFF'}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.offBadge]}>
              <Text style={styles.offText}>UNKNOWN</Text>
            </View>
          )}
        </View>
        {lightStatus && (
          <Text style={styles.reasonText}>Reason: {lightStatus.reason}</Text>
        )}
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
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
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  temperature: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  condition: {
    color: '#888888',
    fontSize: 16,
    marginTop: 4,
  },
  city: {
    color: '#F5A623',
    fontSize: 14,
    marginTop: 2,
  },
  weatherIcon: {
    width: 60,
    height: 60,
  },
  weatherDetails: {
    gap: 8,
  },
  detailText: {
    color: '#888888',
    fontSize: 14,
  },
  sunTimesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sunTimeItem: {
    alignItems: 'center',
  },
  sunTimeLabel: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 4,
  },
  sunTimeValue: {
    color: '#F5A623',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lightName: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  onBadge: {
    backgroundColor: '#0D2B1A',
    borderWidth: 1,
    borderColor: '#4CD964',
  },
  offBadge: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#888888',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  onText: {
    color: '#4CD964',
  },
  offText: {
    color: '#888888',
  },
  reasonText: {
    color: '#888888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  fallbackText: {
    color: '#888888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  errorText: {
    color: '#FF453A',
    textAlign: 'center',
  },
});