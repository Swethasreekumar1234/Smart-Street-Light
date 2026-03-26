const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    db = client.db('smartstreetlight');
    
    // Create indexes for better performance
    await db.collection('lightLogs').createIndex({ timestamp: -1 });
    await db.collection('sensorReadings').createIndex({ timestamp: -1 });
    await db.collection('reports').createIndex({ createdAt: -1 });
    await db.collection('streetLights').createIndex({ lightId: 1 });
    
    console.log('Database indexes created');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

async function closeDB() {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};
