require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { connectDB } = require('./db');
const { startESP32MqttClient } = require('./mqtt/esp32Client');

// Import routes
const weatherRoutes = require('./routes/weather');
const lightsRoutes = require('./routes/lights');
const reportsRoutes = require('./routes/reports');
const energyRoutes = require('./routes/energy');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST']
  }
});

// Store io instance in app for access in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach io instance to request object for routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    status: 'Smart Street Light API running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/weather', weatherRoutes);
app.use('/api/lights', lightsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/energy', energyRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to Smart Street Light System',
    timestamp: new Date().toISOString()
  });

  // Handle client disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Handle manual light control from mobile app
  socket.on('manual_light_control', async (data) => {
    try {
      // Validate data structure
      if (!data.lightId || !data.state) {
        socket.emit('error', {
          message: 'Invalid manual control data',
          required: ['lightId', 'state']
        });
        return;
      }

      // Emit to MQTT client (handled in esp32Client.js)
      // This will be processed by the MQTT message handler
      console.log(`Manual light control received: ${data.lightId} -> ${data.state}`);
      
      // You could emit this to a specific MQTT topic handler
      // For now, this is logged and can be extended
      
      socket.emit('manual_control_ack', {
        lightId: data.lightId,
        state: data.state,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling manual light control:', error);
      socket.emit('error', {
        message: 'Failed to process manual control',
        details: error.message
      });
    }
  });

  // Handle location updates from mobile app
  socket.on('location_update', (data) => {
    try {
      if (!data.lat || !data.lon) {
        socket.emit('error', {
          message: 'Invalid location data',
          required: ['lat', 'lon']
        });
        return;
      }

      console.log(`Location update from ${socket.id}: ${data.lat}, ${data.lon}`);
      
      // Store location in socket session for future use
      socket.location = {
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
        timestamp: new Date()
      };

      socket.emit('location_ack', {
        message: 'Location updated',
        location: socket.location
      });

    } catch (error) {
      console.error('Error handling location update:', error);
      socket.emit('error', {
        message: 'Failed to update location',
        details: error.message
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database first
    await connectDB();
    console.log('Database connected successfully');

    // Start MQTT client
    startESP32MqttClient(io);
    console.log('MQTT client started');

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`Smart Street Light API server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/`);
      console.log('Socket.io server ready for connections');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

/*
REACT NATIVE CONNECTION INSTRUCTIONS:

The React Native app connects to this backend by:

1. HTTP API Calls:
   - Weather: fetch('http://<SERVER_IP>:3000/api/weather?lat=X&lon=Y')
   - Light Status: fetch('http://<SERVER_IP>:3000/api/lights/status?lat=X&lon=Y&motion=true&ldr=150')
   - Register Light: fetch('http://<SERVER_IP>:3000/api/lights/register', { method: 'POST', body: JSON.stringify({...}) })
   - Submit Report: fetch('http://<SERVER_IP>:3000/api/reports', { method: 'POST', body: JSON.stringify({...}) })
   - Energy Summary: fetch('http://<SERVER_IP>:3000/api/energy/summary?days=7')

2. Socket.io Connection:
   import io from 'socket.io-client';
   const socket = io('http://<SERVER_IP>:3000');
   
   socket.on('sensor_update', (data) => {
     // Handle real-time sensor data from ESP32
   });
   
   socket.on('new_report', (report) => {
     // Handle new problem reports
   });
   
   socket.emit('location_update', { lat: userLat, lon: userLon });
   socket.emit('manual_light_control', { lightId: 'LIGHT_001', state: 'ON' });

3. Replace <SERVER_IP> with your actual server IP address when running on a device
   - For local development with emulator: '10.0.2.2' (Android) or 'localhost' (iOS simulator)
   - For physical device: Use your computer's local IP address

4. Make sure to handle network permissions and enable WiFi on the mobile device
*/
