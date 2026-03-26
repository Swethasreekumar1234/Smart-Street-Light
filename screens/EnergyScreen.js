// screens/EnergyScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryLine, VictoryAxis } from 'victory-native';

const weeklyData = [
  { day: 'Mon', kwh: 4.2 }, { day: 'Tue', kwh: 3.8 },
  { day: 'Wed', kwh: 5.1 }, { day: 'Thu', kwh: 4.7 },
  { day: 'Fri', kwh: 6.3 }, { day: 'Sat', kwh: 7.0 },
  { day: 'Sun', kwh: 5.5 },
];

const monthlyData = [
  { x: 1, y: 120 }, { x: 2, y: 98 }, { x: 3, y: 135 },
  { x: 4, y: 110 }, { x: 5, y: 142 }, { x: 6, y: 128 },
];

export default function EnergyScreen() {
  const [view, setView] = useState('weekly'); // 'weekly' | 'monthly'

  const total = weeklyData.reduce((sum, d) => sum + d.kwh, 0).toFixed(1);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>⚡ Energy Usage</Text>

      {/* Toggle buttons */}
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
      <View style={styles.card}>
        {view === 'weekly' ? (
          <>
            <Text style={styles.chartTitle}>Daily kWh — This Week</Text>
            <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
              <VictoryAxis tickValues={weeklyData.map(d => d.day)} />
              <VictoryAxis dependentAxis />
              <VictoryBar
                data={weeklyData}
                x="day" y="kwh"
                style={{ data: { fill: '#2196F3', width: 20 } }}
              />
            </VictoryChart>
          </>
        ) : (
          <>
            <Text style={styles.chartTitle}>Monthly kWh — Last 6 Months</Text>
            <VictoryChart theme={VictoryTheme.material}>
              <VictoryLine
                data={monthlyData}
                style={{ data: { stroke: '#4CAF50', strokeWidth: 3 } }}
              />
            </VictoryChart>
          </>
        )}
      </View>

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.label}>📊 Weekly Summary</Text>
        <Text>Total: {total} kWh</Text>
        <Text>Daily Average: {(total / 7).toFixed(2)} kWh</Text>
        <Text>Peak Day: Friday (6.3 kWh)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  toggle: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15, gap: 10 },
  toggleBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#2196F3',
  },
  activeBtn: { backgroundColor: '#2196F3' },
  toggleText: { color: '#2196F3', fontWeight: '600' },
  activeText: { color: 'white' },
  card: {
    backgroundColor: 'white', padding: 15, marginBottom: 12,
    borderRadius: 10, elevation: 2,
  },
  chartTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 5, color: '#333' },
  label: { fontWeight: 'bold', fontSize: 16, marginBottom: 6, color: '#2196F3' },
});