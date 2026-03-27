const mqtt = require('mqtt');
const { getDB } = require('../db');

function startESP32MqttClient(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  
  const client = mqtt.connect(brokerUrl, {
    clientId: 'smart-street-light-server',
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  });

  client.on('connect', () => {
    console.log('MQTT connected to Mosquitto broker');
    
    // Subscribe to ESP32 sensor data topic
    client.subscribe('streetlight/sensors', (err) => {
      if (err) {
        console.error('Failed to subscribe to streetlight/sensors:', err);
      } else {
        console.log('Subscribed to streetlight/sensors');
      }
    });

    // Subscribe to manual command topic
    client.subscribe('streetlight/command', (err) => {
      if (err) {
        console.error('Failed to subscribe to streetlight/command:', err);
      } else {
        console.log('Subscribed to streetlight/command');
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      
      if (topic === 'streetlight/sensors') {
        // Handle sensor data from ESP32
        await handleSensorData(payload, io, client);
      } else if (topic === 'streetlight/command') {
        // Handle manual commands from mobile app
        await handleManualCommand(payload, io, client);
      }
    } catch (error) {
      console.error(`Error processing MQTT message from topic ${topic}:`, error);
    }
  });

  let mqttErrorLogged = false;

  client.on('error', (err) => {
    if (!mqttErrorLogged) {
      console.warn('MQTT broker not available - running without ESP32 support. Will retry in background.');
      mqttErrorLogged = true;
    }
  });

  client.on('offline', () => {
    // Silenced - no broker running
  });

  client.on('reconnect', () => {
    // Silenced - no broker running
  });

  return client;
}

async function handleSensorData(payload, io, mqttClient) {
  try {
    // Validate required fields
    const requiredFields = ['lightId', 'motion', 'ldr', 'temperature', 'humidity', 'lat', 'lon'];
    for (const field of requiredFields) {
      if (payload[field] === undefined) {
        console.error(`Missing required field in sensor data: ${field}`);
        return;
      }
    }

    // Add timestamp to payload
    const sensorData = {
      ...payload,
      timestamp: new Date()
    };

    // Store raw sensor reading in database
    const db = getDB();
    await db.collection('sensorReadings').insertOne(sensorData);

    // Emit real-time update to connected mobile apps
    io.emit('sensor_update', sensorData);

    // Determine if LED should be ON based on sensor logic
    const isDim = payload.ldr < 300;
    const shouldBeOn = payload.motion === true || isDim === true;

    // Publish LED control command back to ESP32
    const ledCommand = {
      lightId: payload.lightId,
      state: shouldBeOn ? 'ON' : 'OFF',
      reason: shouldBeOn ? (payload.motion ? 'motion_detected' : 'low_light') : 'no_trigger'
    };

    mqttClient.publish('streetlight/led', JSON.stringify(ledCommand));
    
    console.log(`LED control sent to ${payload.lightId}: ${ledCommand.state} (${ledCommand.reason})`);

  } catch (error) {
    console.error('Error handling sensor data:', error);
  }
}

async function handleManualCommand(payload, io, mqttClient) {
  try {
    // Validate manual command structure
    if (!payload.lightId || !payload.state) {
      console.error('Invalid manual command structure:', payload);
      return;
    }

    // Forward manual command to specific ESP32
    mqttClient.publish(`streetlight/led/${payload.lightId}`, JSON.stringify({
      state: payload.state,
      source: 'manual_command'
    }));

    console.log(`Manual command sent to ${payload.lightId}: ${payload.state}`);

  } catch (error) {
    console.error('Error handling manual command:', error);
  }
}

module.exports = {
  startESP32MqttClient
};
