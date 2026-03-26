// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: 'white',
          tabBarActiveTintColor: '#2196F3',
          tabBarIcon: ({ color, size }) => {
            const icons = {
              Weather: 'cloud-outline',
              Report: 'document-text-outline',
              Energy: 'flash-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Weather">
          {() => (
            <WeatherScreen
              onLocationUpdate={(loc) => {
                setCurrentLocation(loc);
                cacheData('location', loc);
              }}
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
  );
}