import { Worker, Job } from 'bullmq';
import { redisConnection, isRedisAvailable } from './queue';
import ReconciliationRun from '../models/ReconciliationRun';
import IngestionService from '../services/ingestionService';
import MatchingEngine from '../services/matchingEngine';
import { IPerformanceMetrics } from '../interfaces';

interface IReconcileJobData {
  runId: string;
  userCsvPath: string;
  exchangeCsvPath: string;
  timestampTolerance: number;
  quantityTolerancePct: number;
}

/**
 * Core business logic execution for a reconciliation job.
 * Extracted so it can be run directly (In-Memory Queue) OR in BullMQ background processes!
 */
export const executeReconciliationJob = async (
  data: IReconcileJobData,
  updateProgress: (progress: number) => Promise<void>
): Promise<{ success: boolean; metrics: IPerformanceMetrics }> => {
  const { runId, userCsvPath, exchangeCsvPath, timestampTolerance, quantityTolerancePct } = data;
  const startOverall = process.hrtime();

  try {
    // 1. Ingestion Phase
    console.log(`👷 [Worker] Processing Run: ${runId} - Phase 1: Streaming Ingestion...`);
    await ReconciliationRun.findOneAndUpdate({ runId }, { status: 'INGESTING' });
    await updateProgress(10);

    const userIngest = await IngestionService.ingestCSV(userCsvPath, runId, 'user');
    await updateProgress(30);

    const exchangeIngest = await IngestionService.ingestCSV(exchangeCsvPath, runId, 'exchange');
    await updateProgress(50);

    const totalIngestedRows = userIngest.totalIngested + exchangeIngest.totalIngested;
    const totalIngestionMs = userIngest.durationMs + exchangeIngest.durationMs;
    
    const ingestionThroughput = totalIngestedRows > 0 && totalIngestionMs > 0
      ? Math.round(totalIngestedRows / (totalIngestionMs / 1000))
      : 0;

    // 2. Matching Phase
    console.log(`👷 [Worker] Processing Run: ${runId} - Phase 2: Running Hash-Bucket Matching Engine...`);
    await ReconciliationRun.findOneAndUpdate({ runId }, { status: 'MATCHING' });
    await updateProgress(70);

    const matchStats = await MatchingEngine.reconcile(runId, timestampTolerance, quantityTolerancePct);
    await updateProgress(90);

    const totalValidRows = userIngest.validCount + exchangeIngest.validCount;
    const matchingThroughput = totalValidRows > 0 && matchStats.durationMs > 0
      ? Math.round(totalValidRows / (matchStats.durationMs / 1000))
      : 0;

    // 3. Telemetry & Metrics Processing
    const diffOverall = process.hrtime(startOverall);
    const totalDurationMs = (diffOverall[0] * 1000) + (diffOverall[1] / 1000000);

    const metrics: IPerformanceMetrics = {
      ingestionDurationMs: Math.round(totalIngestionMs),
      matchingDurationMs: Math.round(matchStats.durationMs),
      totalDurationMs: Math.round(totalDurationMs),
      ingestionThroughput,
      matchingThroughput
    };

    const runSummary = {
      totalUserIngested: userIngest.totalIngested,
      totalExchangeIngested: exchangeIngest.totalIngested,
      totalUserValid: userIngest.validCount,
      totalExchangeValid: exchangeIngest.validCount,
      matchedCount: matchStats.matchedCount,
      conflictingCount: matchStats.conflictingCount,
      unmatchedUserCount: matchStats.unmatchedUserCount,
      unmatchedExchangeCount: matchStats.unmatchedExchangeCount
    };

    // 4. Save Final Completion Status
    await ReconciliationRun.findOneAndUpdate({ runId }, {
      status: 'COMPLETED',
      metrics,
      summary: runSummary,
      error: null
    });

    await updateProgress(100);
    console.log(`👷 [Worker] Run ${runId} Completed Successfully! Duration: ${totalDurationMs.toFixed(2)}ms`);

    return { success: true, metrics };
  } catch (error: any) {
    console.error(`🚨 [Worker] Run ${runId} failed: ${error.message}`);

    await ReconciliationRun.findOneAndUpdate({ runId }, {
      status: 'FAILED',
      error: error.message
    });

    throw error;
  }
};

// Initialize BullMQ Worker lazily only if Redis connected successfully
let workerInstance: Worker | null = null;

export const initBullMQWorker = (): void => {
  if (!isRedisAvailable) {
    return; // Don't try starting if Redis is offline to prevent ECONNREFUSED logs
  }

  if (!workerInstance) {
    workerInstance = new Worker<IReconcileJobData>(
      'reconciliation',
      async (job: Job<IReconcileJobData>) => {
        return executeReconciliationJob(job.data, async (progress) => {
          await job.updateProgress(progress);
        });
      },
      {
        connection: redisConnection,
        concurrency: 2
      }
    );

    workerInstance.on('failed', (job, err) => {
      console.error(`🚨 [Worker] Job ${job?.id} permanently failed: ${err.message}`);
    });

    console.log('👷 BullMQ Background Worker Started.');
  }
};
