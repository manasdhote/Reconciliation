import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '../config';

// Flag to track Redis availability
export let isRedisAvailable = false;

// Create ioredis connection with limited retry attempts to prevent error flooding
export const redisConnection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null, // Required by BullMQ
  showFriendlyErrorStack: false,
  retryStrategy(times) {
    // Attempt connecting a maximum of 2 times
    if (times > 2) {
      console.warn(`⚠️ Redis is unavailable on ${REDIS_HOST}:${REDIS_PORT}. Falling back to clean In-Memory Task Queue.`);
      isRedisAvailable = false;
      return null; // Stop retrying
    }
    // Exponential retry backoff
    return Math.min(times * 100, 1000);
  }
});

// Setup events
redisConnection.on('connect', () => {
  console.log(`📡 Redis Connection Established to ${REDIS_HOST}:${REDIS_PORT}. Using Redis-backed BullMQ.`);
  isRedisAvailable = true;
});

// Capture connection failure gracefully
redisConnection.on('error', (err) => {
  if (isRedisAvailable) {
    console.error(`🚨 Redis connection error: ${err.message}`);
  }
});

// Initialize queue only if Redis is available, using a lazy initializer
let queueInstance: Queue | null = null;

export const getReconciliationQueue = (): Queue | null => {
  if (!isRedisAvailable) return null;
  
  if (!queueInstance) {
    queueInstance = new Queue('reconciliation', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 50
      }
    });
  }
  return queueInstance;
};
