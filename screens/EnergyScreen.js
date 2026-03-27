import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import { API_URL } from '../config';

const { width: screenWidth } = Dimensions.get('window');

export default function EnergyScreen() {
  // RULE 1: Initialize ALL array states with empty arrays, not null
  const [summary, setSummary] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEnergyData = async () => {
    try {
      setError(null);
      
      // Fetch summary
      const summaryResponse = await axios.get(`${API_URL}/api/energy/summary?days=7`);
      setSummary(summaryResponse.data);

      // RULE 2: Safe extraction with optional chaining and fallback arrays
      // Fetch weekly data
      const weeklyResponse = await axios.get(`${API_URL}/api/energy/daily?days=7`);
      console.log('Weekly response:', weeklyResponse.data);
      setWeeklyData(weeklyResponse.data?.data || []);

      // Fetch monthly data
      const monthlyResponse = await axios.get(`${API_URL}/api/energy/daily?days=30`);
      console.log('Monthly response:', monthlyResponse.data);
      
      // Group monthly data into weeks
      const monthlyDataToGroup = monthlyResponse.data?.data || [];
      const groupedMonthly = groupDataByWeeks(monthlyDataToGroup);
      setMonthlyData(groupedMonthly);

    } catch (err) {
      console.error('Energy data fetch error:', err);
      setError('Failed to load energy data');
      
      // Use fallback data
      setSummary({
        period: '7 days',
        totalChecks: 1008,
        lightsOnPct: '34.2%',
        estimatedKwh: 3.8,
        savedKwh: 7.3,
        savingsPct: '65.8%'
      });
      
      const fallbackWeekly = generateFallbackData('weekly');
      setWeeklyData(fallbackWeekly);
      setMonthlyData(generateFallbackData('monthly'));
    } finally {
      setLoading(false);
    }
  };

  const groupDataByWeeks = (data) => {
    // RULE 3: Safe mapping with array check
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    const weeks = [];
    for (let i = 0; i < data.length; i += 7) {
      const weekData = data.slice(i, i + 7);
      const totalKwh = weekData.reduce((sum, day) => sum + (day.kwhUsed || 0), 0);
      weeks.push({
        date: `Week ${Math.floor(i / 7) + 1}`,
        kwhUsed: Math.round(totalKwh * 100) / 100
      });
    }
    return weeks;
  };

  const generateFallbackData = (type) => {
    if (type === 'weekly') {
      return [
        { date: 'Mon', kwhUsed: 0.5 },
        { date: 'Tue', kwhUsed: 0.8 },
        { date: 'Wed', kwhUsed: 0.3 },
        { date: 'Thu', kwhUsed: 0.6 },
        { date: 'Fri', kwhUsed: 0.4 },
        { date: 'Sat', kwhUsed: 0.7 },
        { date: 'Sun', kwhUsed: 0.5 },
      ];
    } else {
      return [
        { date: 'Week 1', kwhUsed: 3.2 },
        { date: 'Week 2', kwhUsed: 2.8 },
        { date: 'Week 3', kwhUsed: 3.5 },
        { date: 'Week 4', kwhUsed: 2.9 },
      ];
    }
  };

  useEffect(() => {
    fetchEnergyData();
  }, []);

  const chartConfig = {
    backgroundColor: '#1C2333',
    backgroundGradientFrom: '#1C2333',
    backgroundGradientTo: '#1C2333',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(245, 166, 35, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: () => ({
      r: '4',
      strokeWidth: '2',
      stroke: '#F5A623',
    }),
  };

  const currentData = viewMode === 'weekly' ? weeklyData : monthlyData;
  
  // RULE 3: Safe mapping with array check and optional chaining
  const chartData = Array.isArray(currentData) ? currentData?.map(item => ({
    name: item.date,
    kwh: item.kwhUsed || 0
  })) : [];

  const renderChart = () => {
    if (!Array.isArray(currentData) || currentData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No chart data available</Text>
        </View>
      );
    }

    // RULE 4: Chart library safety with fallback empty arrays
    const safeChartData = {
      labels: Array.isArray(chartData) ? chartData.map(item => item.name) : [],
      datasets: [{
        data: Array.isArray(chartData) ? chartData.map(item => item.kwh) : []
      }]
    };

    if (viewMode === 'weekly') {
      return (
        <BarChart
          data={safeChartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          showValuesOnTopOfBars={true}
          fromZero={true}
        />
      );
    } else {
      return (
        <LineChart
          data={safeChartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          withDots={true}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          fromZero={true}
        />
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#F5A623" />
        <Text style={styles.loadingText}>Loading energy data...</Text>
      </View>
    );
  }

  // RULE 3: Safe mapping for peak calculation
  const peakKwh = Array.isArray(currentData) && currentData.length > 0 
    ? Math.max(...currentData?.map(d => d.kwhUsed || 0))
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle="light-content" />

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>This Week kWh</Text>
          <Text style={styles.statValue}>
            {summary ? summary.estimatedKwh?.toFixed(1) || '--' : '--'}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Saved kWh</Text>
          <Text style={styles.statValue}>
            {summary ? summary.savedKwh?.toFixed(1) || '--' : '--'}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Peak kWh</Text>
          <Text style={styles.statValue}>
            {peakKwh > 0 ? peakKwh.toFixed(1) : '--'}
          </Text>
        </View>
      </View>

      {/* Savings Badge */}
      {summary && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>🌱 {summary.savingsPct} energy saved</Text>
        </View>
      )}

      {/* Chart Controls */}
      <View style={styles.chartControls}>
        <TouchableOpacity
          style={[styles.controlButton, viewMode === 'weekly' && styles.controlButtonActive]}
          onPress={() => setViewMode('weekly')}
        >
          <Text style={[styles.controlButtonText, viewMode === 'weekly' && styles.controlButtonTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, viewMode === 'monthly' && styles.controlButtonActive]}
          onPress={() => setViewMode('monthly')}
        >
          <Text style={[styles.controlButtonText, viewMode === 'monthly' && styles.controlButtonTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {viewMode === 'weekly' ? '📊 Weekly Usage' : '📈 Monthly Trend'}
        </Text>
        {renderChart()}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Energy Insights</Text>
        <Text style={styles.infoText}>
          • Smart street lights use 20W LEDs{'\n'}
          • Lights activate based on motion & ambient light{'\n'}
          • Average savings: 65-70% vs traditional lights{'\n'}
          • Data updates every minute when active
        </Text>
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#1C2333',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3349',
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: '#F5A623',
    fontSize: 20,
    fontWeight: 'bold',
  },
  savingsBadge: {
    backgroundColor: '#0D2B1A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CD964',
  },
  savingsText: {
    color: '#4CD964',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartControls: {
    flexDirection: 'row',
    backgroundColor: '#1C2333',
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3349',
  },
  controlButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#F5A623',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controlButtonTextActive: {
    color: '#0D1117',
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
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C2333',
    borderRadius: 16,
  },
  noDataText: {
    color: '#888888',
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: '#1C2333',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A3349',
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: '#2D1B1B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    textAlign: 'center',
  },
});
