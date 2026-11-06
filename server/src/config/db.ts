import mongoose from 'mongoose';
import { env } from './env';

/**
 * Connect to MongoDB with production-grade pooling and connection handling.
 */
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,                 // Maintain up to 10 active socket connections
      minPoolSize: 2,                  // Keep minimum 2 warm sockets to eliminate cold-start latency
      serverSelectionTimeoutMS: 8000,  // Fail after 8s if cluster cannot be reached
      socketTimeoutMS: 45000,          // Close inactive sockets after 45s
    });

    console.log(`✅ [Database] MongoDB Connected to host: ${conn.connection.host}`);
    console.log(`✅ [Database] Target Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ [Database] Connection failed:', error);
    process.exit(1);
  }

  // Monitor connection health events
  mongoose.connection.on('error', (err) => {
    console.error('❌ [Database] Runtime connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ [Database] Connection lost. Reconnecting...');
  });
};

/**
 * Gracefully close database connection on application shutdown or test teardown.
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('🔌 [Database] MongoDB connection closed gracefully.');
  } catch (err) {
    console.error('❌ [Database] Error closing MongoDB connection:', err);
  }
};

