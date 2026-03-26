import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import { API_URL } from '../config';

const screenWidth = Dimensions.get('window').width - 48;

const chartConfig = {
  backgroundGradientFrom: '#1C2333',
  backgroundGradientTo: '#1C2333',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(245, 166, 35, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(150, 150, 150, ${opacity})`,
  propsForBackgroundLines: { stroke: '#2A3349' },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#F5A623' },
};

const fallbackWeekly = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{ data: [4.2, 3.8, 5.1, 4.7, 6.3, 7.0, 5.5] }],
};

const fallbackMonthly = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{ data: [120, 98, 135, 110, 142, 128] }],
};

export default function EnergyScreen() {
  const [view, setView] = useState('weekly');
  const [weeklyData, setWeeklyData] = useState(fallbackWeekly);
  const [monthlyData, setMonthlyData] = useState(fallbackMonthly);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnergyData();
  }, []);

  const fetchEnergyData = async () => {
    setLoading(true);
    try {
      const [summaryRes, weeklyRes, monthlyRes] = await Promise.all([
        axios.get(`${API_URL}/api/energy/summary`, { params: { days: 7 }, timeout: 5000 }),
        axios.get(`${API_URL}/api/energy/daily`, { params: { days: 7 }, timeout: 5000 }),
        axios.get(`${API_URL}/api/energy/daily`, { params: { days: 30 }, timeout: 5000 }),
      ]);

      // Set summary stats
      setSummary(summaryRes.data);

      // Process weekly chart data
      if (weeklyRes.data?.data?.length > 0) {
        const daily = weeklyRes.data.data;
        setWeeklyData({
          labels: daily.map(d => {
            const date = new Date(d.date);
            return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
          }),
          datasets: [{ data: daily.map(d => d.kwhUsed || 0) }],
        });
      }

      // Process monthly chart data — group by week
      if (monthlyRes.data?.data?.length > 0) {
        const daily = monthlyRes.data.data;
        // Group into weeks
        const weeks = {};
        daily.forEach(d => {
          const date = new Date(d.date);
          const weekNum = Math.floor(date.getDate() / 7);
          const key = `W${weekNum + 1}`;
          if (!weeks[key]) weeks[key] = 0;
          weeks[key] += d.kwhUsed || 0;
        });
        setMonthlyData({
          labels: Object.keys(weeks),
          datasets: [{ data: Object.values(weeks).map(v => Math.round(v * 100) / 100) }],
        });
      }

    } catch (error) {
      console.log('Energy fetch failed, using fallback data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentData = view === 'weekly' ? weeklyData : monthlyData;
  const values = currentData.datasets[0].data;
  const total = values.reduce((a, b) => a + b, 0);
  const peak = Math.max(...values);
  const peakLabel = currentData.labels[values.indexOf(peak)];

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>⚡</Text>
        <Text style={styles.headerTitle}>Energy Usage</Text>
        <Text style={styles.headerSub}>Smart Street Light Network</Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#F5A623" />
          <Text style={styles.loadingText}>Loading energy data...</Text>
        </View>
      ) : (
        <>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>
                {summary ? summary.estimatedKwh : total.toFixed(1)}
              </Text>
              <Text style={styles.statUnit}>kWh</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>
                {summary ? summary.savedKwh : '—'}
              </Text>
              <Text style={styles.statUnit}>kWh</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: '#FF453A' }]}>{peak.toFixed(1)}</Text>
              <Text style={styles.statUnit}>kWh</Text>
              <Text style={styles.statLabel}>Peak ({peakLabel})</Text>
            </View>
          </View>

          {/* Savings Badge */}
          {summary && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>
                🌱 {summary.savingsPct} energy saved — lights on {summary.lightsOnPct} of the time
              </Text>
            </View>
          )}
        </>
      )}

      {/* Toggle */}
      <View style={styles.toggle}>
        {['weekly', 'monthly'].map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.toggleBtn, view === v && styles.activeBtn]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.toggleText, view === v && styles.activeText]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          {view === 'weekly' ? 'Daily kWh — This Week' : 'Weekly kWh — This Month'}
        </Text>
        {view === 'weekly' ? (
          <BarChart
            data={weeklyData}
            width={screenWidth}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            withInnerLines
            fromZero
          />
        ) : (
          <LineChart
            data={monthlyData}
            width={screenWidth}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            bezier
            withInnerLines
            fromZero
          />
        )}
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
  headerSub: { fontSize: 13, color: '#F5A623', marginTop: 4, fontWeight: '500' },

  loadingCard: {
    backgroundColor: '#1C2333', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#2A3349',
    flexDirection: 'row', gap: 12, justifyContent: 'center',
  },
  loadingText: { color: '#888', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#1C2333', borderRadius: 16,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A3349',
  },
  statVal: { fontSize: 24, fontWeight: '800', color: '#F5A623' },
  statUnit: { fontSize: 11, color: '#666', fontWeight: '600' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },

  savingsBadge: {
    backgroundColor: '#0D2B1A', borderRadius: 12, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#1A4D2E',
  },
  savingsText: { color: '#4CD964', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  toggle: {
    flexDirection: 'row', backgroundColor: '#1C2333',
    borderRadius: 12, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: '#2A3349',
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  activeBtn: { backgroundColor: '#F5A623' },
  toggleText: { color: '#666', fontWeight: '600', fontSize: 14 },
  activeText: { color: '#0D1117' },

  chartCard: {
    backgroundColor: '#1C2333', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2A3349',
  },
  chartTitle: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  chart: { borderRadius: 12, marginLeft: -10 },
});
