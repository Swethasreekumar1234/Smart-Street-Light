const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const suncalc = require('suncalc');
const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const { lat, lon, motion, ldr } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both lat and lon query parameters are required'
      });
    }

    // Parse and validate coordinates
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const motionBool = motion === 'true';
    const ldrNum = ldr ? parseFloat(ldr) : 0;

    if (isNaN(latNum) || isNaN(lonNum) || 
        latNum < -90 || latNum > 90 || 
        lonNum < -180 || lonNum > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
      });
    }

    if (isNaN(ldrNum) || ldrNum < 0 || ldrNum > 4095) {
      return res.status(400).json({
        error: 'Invalid LDR value',
        message: 'LDR must be a number between 0 and 4095'
      });
    }

    // Calculate sunrise and sunset for the given location
    const now = new Date();
    const times = suncalc.getTimes(now, latNum, lonNum);
    
    const sunrise = times.sunrise;
    const sunset = times.sunset;
    
    // Determine if it's currently dark
    const isDark = now < sunrise || now > sunset;
    
    // Determine if light level is low enough to need lighting
    const isDim = ldrNum < 300;
    
    // Determine if light should be ON
    const lightOn = isDark && (motionBool || isDim);
    
    // Determine the reason for the light state
    let reason;
    if (!isDark) {
      reason = 'daytime';
    } else if (motionBool) {
      reason = 'motion_detected';
    } else if (isDim) {
      reason = 'low_light';
    } else {
      reason = 'no_trigger';
    }

    // Log this decision to the database
    const db = getDB();
    const logEntry = {
      timestamp: new Date(),
      lat: latNum,
      lon: lonNum,
      lightOn: lightOn,
      motion: motionBool,
      ldr: ldrNum,
      isDark: isDark,
      reason: reason
    };

    await db.collection('lightLogs').insertOne(logEntry);

    // Return the decision
    res.json({
      lightOn: lightOn,
      reason: reason,
      sunrise: sunrise,
      sunset: sunset
    });

  } catch (error) {
    console.error('Light status calculation error:', error);
    res.status(500).json({
      error: 'Light status calculation failed',
      details: error.message
    });
  }
});

router.get('/all', async (req, res) => {
  try {
    const db = getDB();
    const streetLights = await db.collection('streetLights').find({}).toArray();
    
    res.json(streetLights);

  } catch (error) {
    console.error('Error fetching street lights:', error);
    res.status(500).json({
      error: 'Failed to fetch street lights',
      details: error.message
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { lightId, lat, lon, location_description } = req.body;

    // Validate required fields
    if (!lightId || !lat || !lon) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'lightId, lat, and lon are required'
      });
    }

    // Parse and validate coordinates
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum) || 
        latNum < -90 || latNum > 90 || 
        lonNum < -180 || lonNum > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
      });
    }

    // Check if lightId already exists
    const db = getDB();
    const existingLight = await db.collection('streetLights').findOne({ lightId });
    
    if (existingLight) {
      return res.status(409).json({
        error: 'Light already registered',
        message: `Light with ID ${lightId} is already registered`
      });
    }

    // Create new street light document
    const newLight = {
      lightId,
      lat: latNum,
      lon: lonNum,
      location_description: location_description || '',
      status: 'active',
      createdAt: new Date(),
      lastSeen: new Date()
    };

    const result = await db.collection('streetLights').insertOne(newLight);

    // Return the created document with its ID
    res.status(201).json({
      _id: result.insertedId,
      ...newLight
    });

  } catch (error) {
    console.error('Error registering street light:', error);
    res.status(500).json({
      error: 'Failed to register street light',
      details: error.message
    });
  }
});

router.patch('/:lightId/status', async (req, res) => {
  try {
    const { lightId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: active, inactive, maintenance'
      });
    }

    const db = getDB();
    const result = await db.collection('streetLights').updateOne(
      { lightId },
      { 
        $set: { 
          status: status,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'Light not found',
        message: `No light found with ID ${lightId}`
      });
    }

    res.json({
      message: 'Light status updated successfully',
      lightId: lightId,
      status: status
    });

  } catch (error) {
    console.error('Error updating light status:', error);
    res.status(500).json({
      error: 'Failed to update light status',
      details: error.message
    });
  }
});

module.exports = router;
