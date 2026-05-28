import app from './app';
import connectDB from './database/db';
import { PORT } from './config';
import mongoose from 'mongoose';
import { redisConnection } from './queue/queue';
import QueueService from './services/queueService';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    // 2. Initialize Queue Manager Failovers (lazy loads BullMQ workers if Redis is up)
    QueueService.initialize();

    // 3. Start Express server
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Transaction Reconciliation Engine Running!`);
      console.log(`📡 Server Address: http://localhost:${PORT}`);
      console.log(`====================================================`);
    });

    // --- Graceful Shutdown Handler (Ensures all ports and connections close cleanly) ---
    const handleShutdown = async (signal: string) => {
      console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
      
      // Close Express Server Port
      server.close(() => {
        console.log('🛑 Express HTTP server closed.');
      });

      try {
        // Close MongoDB Connection
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
          console.log('🛑 MongoDB connection closed cleanly.');
        }

        // Close Redis Connection
        if (redisConnection && (redisConnection.status === 'ready' || redisConnection.status === 'connecting')) {
          await redisConnection.quit();
          console.log('🛑 Redis connection closed cleanly.');
        }

        console.log('👋 Clean exit successful.');
        process.exit(0);
      } catch (err: any) {
        console.error(`🚨 Error during graceful shutdown: ${err.message}`);
        process.exit(1);
      }
    };

    // Bind shutdown events
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error: any) {
    console.error(`Application startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
