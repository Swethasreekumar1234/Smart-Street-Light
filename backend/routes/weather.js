const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

if (!OPENWEATHER_API_KEY) {
  console.warn('OPENWEATHER_API_KEY not found in environment variables');
}

router.get('/', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both lat and lon query parameters are required'
      });
    }

    // Validate latitude and longitude format
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

    if (!OPENWEATHER_API_KEY) {
      return res.status(500).json({
        error: 'Weather service unavailable',
        message: 'OpenWeatherMap API key not configured'
      });
    }

    // Call OpenWeatherMap API
    const weatherUrl = `${OPENWEATHER_BASE_URL}?lat=${latNum}&lon=${lonNum}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await axios.get(weatherUrl);
    const weatherData = response.data;

    // Calculate if it's currently daytime
    const currentTime = Date.now() / 1000; // Current Unix timestamp in seconds
    const isDay = currentTime >= weatherData.sys.sunrise && currentTime <= weatherData.sys.sunset;

    // Return clean, formatted response
    const formattedWeather = {
      city: weatherData.name,
      temperature: Math.round(weatherData.main.temp),
      humidity: weatherData.main.humidity,
      condition: weatherData.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`,
      sunrise: weatherData.sys.sunrise,
      sunset: weatherData.sys.sunset,
      isDay: isDay
    };

    res.json(formattedWeather);

  } catch (error) {
    console.error('Weather API error:', error.message);
    
    if (error.response) {
      // OpenWeatherMap API error
      const statusCode = error.response.status;
      const errorMessage = error.response.data.message || 'Unknown weather API error';
      
      if (statusCode === 401) {
        return res.status(500).json({
          error: 'Weather fetch failed',
          details: 'Invalid OpenWeatherMap API key'
        });
      } else if (statusCode === 404) {
        return res.status(404).json({
          error: 'Weather fetch failed',
          details: 'Location not found'
        });
      }
      
      return res.status(500).json({
        error: 'Weather fetch failed',
        details: errorMessage
      });
    } else if (error.request) {
      // Network error
      return res.status(500).json({
        error: 'Weather fetch failed',
        details: 'Unable to connect to weather service'
      });
    } else {
      // Other error
      return res.status(500).json({
        error: 'Weather fetch failed',
        details: error.message
      });
    }
  }
});

module.exports = router;
