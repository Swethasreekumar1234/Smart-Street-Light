const express = require('express');
const { getDB } = require('../db');
const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Parse and validate days parameter
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter',
        message: 'Days must be a number between 1 and 365'
      });
    }

    // Calculate the start date for the query
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const db = getDB();

    // Fetch light logs for the specified period
    const logs = await db.collection('lightLogs').find({
      timestamp: { $gte: startDate }
    }).toArray();

    // Calculate statistics
    const totalChecks = logs.length;
    const onCount = logs.filter(log => log.lightOn === true).length;
    
    // Calculate percentages
    const lightsOnPct = totalChecks > 0 ? ((onCount / totalChecks) * 100).toFixed(1) : '0.0';
    const savingsPct = totalChecks > 0 ? (100 - parseFloat(lightsOnPct)).toFixed(1) : '0.0';

    // Calculate energy usage (assuming 20W per LED and one log per minute)
    const hoursOn = onCount / 60; // Convert minutes to hours
    const kwhUsed = (20 * hoursOn) / 1000; // Convert watt-hours to kWh
    const kwhSaved = ((totalChecks - onCount) / 60 * 20) / 1000; // Energy saved by being off

    res.json({
      period: `${daysNum} days`,
      totalChecks: totalChecks,
      lightsOnPct: `${lightsOnPct}%`,
      estimatedKwh: Math.round(kwhUsed * 100) / 100, // Round to 2 decimal places
      savedKwh: Math.round(kwhSaved * 100) / 100, // Round to 2 decimal places
      savingsPct: `${savingsPct}%`
    });

  } catch (error) {
    console.error('Error calculating energy summary:', error);
    res.status(500).json({
      error: 'Failed to calculate energy summary',
      details: error.message
    });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, lightId } = req.query;

    // Parse and validate limit parameter
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be a number between 1 and 1000'
      });
    }

    const db = getDB();

    // Build query
    const query = {};
    if (lightId) {
      query.lightId = lightId;
    }

    // Fetch most recent light logs
    const logs = await db.collection('lightLogs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .toArray();

    res.json(logs);

  } catch (error) {
    console.error('Error fetching energy logs:', error);
    res.status(500).json({
      error: 'Failed to fetch energy logs',
      details: error.message
    });
  }
});

router.get('/daily', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Parse and validate days parameter
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      return res.status(400).json({
        error: 'Invalid days parameter',
        message: 'Days must be a number between 1 and 30'
      });
    }

    // Calculate the start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const db = getDB();

    // Aggregate daily statistics
    const dailyStats = await db.collection('lightLogs').aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp"
            }
          },
          totalChecks: { $sum: 1 },
          onCount: {
            $sum: {
              $cond: [{ $eq: ["$lightOn", true] }, 1, 0]
            }
          },
          avgLdr: { $avg: "$ldr" },
          motionCount: {
            $sum: {
              $cond: [{ $eq: ["$motion", true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          date: "$_id",
          totalChecks: 1,
          onCount: 1,
          lightsOnPct: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$onCount", "$totalChecks"] },
                  100
                ]
              },
              1
            ]
          },
          avgLdr: { $round: ["$avgLdr", 0] },
          motionCount: 1,
          kwhUsed: {
            $round: [
              {
                $divide: [
                  { $multiply: [20, { $divide: ["$onCount", 60] }] },
                  1000
                ]
              },
              3
            ]
          }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]).toArray();

    res.json({
      period: `${daysNum} days`,
      data: dailyStats
    });

  } catch (error) {
    console.error('Error calculating daily energy stats:', error);
    res.status(500).json({
      error: 'Failed to calculate daily energy statistics',
      details: error.message
    });
  }
});

router.get('/hourly', async (req, res) => {
  try {
    const { days = 1 } = req.query;

    // Parse and validate days parameter
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 7) {
      return res.status(400).json({
        error: 'Invalid days parameter',
        message: 'Days must be a number between 1 and 7'
      });
    }

    // Calculate the start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const db = getDB();

    // Aggregate hourly statistics
    const hourlyStats = await db.collection('lightLogs').aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$timestamp" },
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$timestamp"
              }
            }
          },
          totalChecks: { $sum: 1 },
          onCount: {
            $sum: {
              $cond: [{ $eq: ["$lightOn", true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          hour: "$_id.hour",
          date: "$_id.date",
          totalChecks: 1,
          onCount: 1,
          lightsOnPct: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$onCount", "$totalChecks"] },
                  100
                ]
              },
              1
            ]
          }
        }
      },
      {
        $sort: { date: 1, hour: 1 }
      }
    ]).toArray();

    res.json({
      period: `${daysNum} days`,
      data: hourlyStats
    });

  } catch (error) {
    console.error('Error calculating hourly energy stats:', error);
    res.status(500).json({
      error: 'Failed to calculate hourly energy statistics',
      details: error.message
    });
  }
});

router.get('/comparison', async (req, res) => {
  try {
    const { period1 = 7, period2 = 7 } = req.query;

    // Parse and validate periods
    const period1Num = parseInt(period1);
    const period2Num = parseInt(period2);

    if (isNaN(period1Num) || isNaN(period2Num) || 
        period1Num < 1 || period1Num > 30 ||
        period2Num < 1 || period2Num > 30) {
      return res.status(400).json({
        error: 'Invalid period parameters',
        message: 'Periods must be numbers between 1 and 30'
      });
    }

    const db = getDB();

    // Calculate dates for both periods
    const now = new Date();
    const period1Start = new Date(now);
    period1Start.setDate(period1Start.getDate() - period1Num);
    
    const period1End = new Date(period1Start);
    period1End.setDate(period1End.getDate() - 1);
    
    const period2Start = new Date(period1End);
    period2Start.setDate(period2Start.getDate() - period2Num);

    // Get stats for both periods
    const getPeriodStats = async (startDate, endDate) => {
      const logs = await db.collection('lightLogs').find({
        timestamp: { 
          $gte: startDate,
          $lt: endDate
        }
      }).toArray();

      const totalChecks = logs.length;
      const onCount = logs.filter(log => log.lightOn === true).length;
      const lightsOnPct = totalChecks > 0 ? ((onCount / totalChecks) * 100).toFixed(1) : '0.0';
      const hoursOn = onCount / 60;
      const kwhUsed = (20 * hoursOn) / 1000;

      return {
        totalChecks,
        onCount,
        lightsOnPct: `${lightsOnPct}%`,
        kwhUsed: Math.round(kwhUsed * 100) / 100
      };
    };

    const [period1Stats, period2Stats] = await Promise.all([
      getPeriodStats(period1Start, now),
      getPeriodStats(period2Start, period1End)
    ]);

    // Calculate improvement
    const improvement = {
      usageChange: Math.round((parseFloat(period1Stats.lightsOnPct) - parseFloat(period2Stats.lightsOnPct)) * 10) / 10,
      energyChange: Math.round((period1Stats.kwhUsed - period2Stats.kwhUsed) * 100) / 100
    };

    res.json({
      period1: {
        label: `Last ${period1Num} days`,
        ...period1Stats
      },
      period2: {
        label: `Previous ${period2Num} days`,
        ...period2Stats
      },
      improvement
    });

  } catch (error) {
    console.error('Error calculating energy comparison:', error);
    res.status(500).json({
      error: 'Failed to calculate energy comparison',
      details: error.message
    });
  }
});

module.exports = router;
