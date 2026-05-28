import dotenv from 'dotenv';
dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reconciliation_engine';
export const DEFAULT_TIMESTAMP_TOLERANCE = parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS || '300', 10);
export const DEFAULT_QUANTITY_TOLERANCE = parseFloat(process.env.QUANTITY_TOLERANCE_PCT || '0.01');

// Redis configuration parameters
export const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
