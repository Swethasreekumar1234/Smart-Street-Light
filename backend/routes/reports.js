const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { lat, lon, lightId, issueType, description, userId } = req.body;

    // Validate required fields
    if (!lat || !lon || !issueType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'lat, lon, and issueType are required'
      });
    }

    // Validate issue type
    const validIssueTypes = ['broken_bulb', 'not_working', 'flickering', 'other'];
    if (!validIssueTypes.includes(issueType)) {
      return res.status(400).json({
        error: 'Invalid issue type',
        message: 'issueType must be one of: broken_bulb, not_working, flickering, other'
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

    // Create report document
    const db = getDB();
    const newReport = {
      lat: latNum,
      lon: lonNum,
      lightId: lightId || null,
      issueType: issueType,
      description: description || '',
      userId: userId || null,
      status: 'open',
      createdAt: new Date()
    };

    const result = await db.collection('reports').insertOne(newReport);

    // Get the complete report document with its ID
    const completeReport = {
      _id: result.insertedId,
      ...newReport
    };

    // Emit Socket.io event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('new_report', completeReport);
    }

    res.status(201).json({
      id: result.insertedId,
      message: 'Report submitted successfully'
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      error: 'Failed to submit report',
      details: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status = 'open', limit = 100 } = req.query;

    // Validate status parameter
    const validStatuses = ['open', 'in_progress', 'resolved', 'all'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status parameter',
        message: 'Status must be one of: open, in_progress, resolved, all'
      });
    }

    // Parse limit
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be a number between 1 and 1000'
      });
    }

    const db = getDB();
    
    // Build query
    const query = status === 'all' ? {} : { status };
    
    // Fetch reports
    const reports = await db.collection('reports')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .toArray();

    res.json(reports);

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: open, in_progress, resolved'
      });
    }

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid report ID',
        message: 'Report ID must be a valid ObjectId'
      });
    }

    const db = getDB();
    const result = await db.collection('reports').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: status,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'Report not found',
        message: `No report found with ID ${id}`
      });
    }

    res.json({
      message: 'Status updated',
      id: id,
      status: status
    });

  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      error: 'Failed to update report status',
      details: error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid report ID',
        message: 'Report ID must be a valid ObjectId'
      });
    }

    const db = getDB();
    const result = await db.collection('reports').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Report not found',
        message: `No report found with ID ${id}`
      });
    }

    res.json({
      message: 'Report deleted',
      id: id
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      error: 'Failed to delete report',
      details: error.message
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const db = getDB();
    
    // Get report counts by status
    const statusStats = await db.collection('reports').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get report counts by issue type
    const issueStats = await db.collection('reports').aggregate([
      {
        $group: {
          _id: '$issueType',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get total reports
    const totalReports = await db.collection('reports').countDocuments();

    // Get reports from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentReports = await db.collection('reports').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      total: totalReports,
      last30Days: recentReports,
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byIssueType: issueStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      error: 'Failed to fetch report statistics',
      details: error.message
    });
  }
});

module.exports = router;
