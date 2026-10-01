import mongoose from 'mongoose';
import env from '@/lib/env.js';

/**
 * MongoDB connection helper optimized for Next.js App Router and serverless environments.
 * Reuses existing connections across hot reloads and handles serverless freeze/thaw cycles gracefully.
 */

const getMongoUri = () => {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    env.MONGODB_URI ||
    env.MONGO_URI ||
    (process.env.NODE_ENV === 'production' ? '' : 'mongodb://127.0.0.1:27017/genai_chatgpt')
  );
};

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const uri = getMongoUri();

  if (!uri) {
    throw new Error(
      'MongoDB connection failed: Neither MONGODB_URI nor MONGO_URI is defined in your environment variables. Please configure your MongoDB Atlas connection string in your deployment settings.'
    );
  }

  // If we have an existing connection and it's connected (readyState === 1), reuse it
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection dropped/disconnected, clear cached promise and connection
  if (mongoose.connection.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`[MongoDB] Connected successfully to ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
