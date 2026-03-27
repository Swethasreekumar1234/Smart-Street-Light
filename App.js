// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Text } from 'react-native';

import WeatherScreen from './screens/WeatherScreen';
import ReportScreen from './screens/ReportScreen';
import EnergyScreen from './screens/EnergyScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(null);

  // On app start, load last known location from cache
  useEffect(() => {
    loadCachedLocation();
  }, []);

  const loadCachedLocation = async () => {
    try {
      const cached = await AsyncStorage.getItem('location');
      if (cached) setCurrentLocation(JSON.parse(cached));
    } catch (e) {
      console.log('Cache load failed', e);
    }
  };

  // Generic cache helper passed to child screens
  const cacheData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.log('Cache save failed', e);
    }
  };

  const handleLocationUpdate = (location) => {
    setCurrentLocation(location);
    cacheData('location', location);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              
              if (route.name === 'Weather') {
                iconName = '🌆';
              } else if (route.name === 'Report') {
                iconName = '📋';
              } else if (route.name === 'Energy') {
                iconName = '⚡';
              }

              return <Text style={[styles.tabIcon, { color, fontSize: size }]}>{iconName}</Text>;
            },
            tabBarActiveTintColor: '#F5A623',
            tabBarInactiveTintColor: '#555',
            tabBarStyle: {
              backgroundColor: '#1C2333',
              borderTopColor: '#2A3349',
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            headerStyle: {
              backgroundColor: '#1C2333',
              borderBottomColor: '#2A3349',
              borderBottomWidth: 1,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            tabBarLabelStyle: {
              fontSize: 12,
              marginBottom: 4,
            },
          })}
        >
          <Tab.Screen name="Weather">
            {() => (
              <WeatherScreen
                onLocationUpdate={handleLocationUpdate}
              />
            )}
          </Tab.Screen>

          <Tab.Screen name="Report">
            {() => (
              <ReportScreen
                currentLocation={currentLocation}
                onCache={cacheData}
              />
            )}
          </Tab.Screen>

          <Tab.Screen name="Energy">
            {() => <EnergyScreen />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  tabIcon: {
    marginBottom: 2,
  },
});