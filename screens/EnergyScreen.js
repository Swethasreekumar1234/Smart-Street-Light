import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, StatusBar
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 48;

const weeklyData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{ data: [4.2, 3.8, 5.1, 4.7, 6.3, 7.0, 5.5] }],
};

const monthlyData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{ data: [120, 98, 135, 110, 142, 128] }],
};

const chartConfig = {
  backgroundGradientFrom: '#1C2333',
  backgroundGradientTo: '#1C2333',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(245, 166, 35, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(150, 150, 150, ${opacity})`,
  propsForBackgroundLines: { stroke: '#2A3349' },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#F5A623' },
};

const total = weeklyData.datasets[0].data.reduce((a, b) => a + b, 0);
const peak = Math.max(...weeklyData.datasets[0].data);
const peakDay = weeklyData.labels[weeklyData.datasets[0].data.indexOf(peak)];

export default function EnergyScreen() {
  const [view, setView] = useState('weekly');

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>⚡</Text>
        <Text style={styles.headerTitle}>Energy Usage</Text>
        <Text style={styles.headerSub}>Smart Street Light Network</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{total.toFixed(1)}</Text>
          <Text style={styles.statUnit}>kWh</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{(total / 7).toFixed(1)}</Text>
          <Text style={styles.statUnit}>kWh</Text>
          <Text style={styles.statLabel}>Daily Avg</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#FF453A' }]}>{peak}</Text>
          <Text style={styles.statUnit}>kWh</Text>
          <Text style={styles.statLabel}>Peak ({peakDay})</Text>
        </View>
      </View>

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
          {view === 'weekly' ? 'Daily kWh — This Week' : 'Monthly kWh — Last 6 Months'}
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

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#1C2333', borderRadius: 16,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A3349',
  },
  statVal: { fontSize: 24, fontWeight: '800', color: '#F5A623' },
  statUnit: { fontSize: 11, color: '#666', fontWeight: '600' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },

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