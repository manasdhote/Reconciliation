import { isRedisAvailable, getReconciliationQueue } from '../queue/queue';
import { executeReconciliationJob, initBullMQWorker } from '../queue/worker';

interface IReconcileJobData {
  runId: string;
  userCsvPath: string;
  exchangeCsvPath: string;
  timestampTolerance: number;
  quantityTolerancePct: number;
}

/**
 * Enterprise Queue Service Router that manages automatic failover routing
 * between BullMQ (Redis-backed) and a robust asynchronous In-Memory Task Queue.
 */
class QueueService {
  /**
   * Initializes the queue worker systems based on Redis status.
   */
  static initialize(): void {
    // We check Redis status shortly after startup to allow ioredis to try connecting
    setTimeout(() => {
      if (isRedisAvailable) {
        initBullMQWorker();
      } else {
        console.log('💡 QueueService Routing: Using Local Async In-Memory Task Queue (Offline Failover Mode).');
      }
    }, 500); // 500ms delay gives ioredis connection time to resolve
  }

  /**
   * Pushes a reconciliation task into the active queue.
   */
  static async addJob(data: IReconcileJobData): Promise<void> {
    const queue = getReconciliationQueue();

    if (isRedisAvailable && queue) {
      await queue.add('reconciliationJob', data);
      console.log(`📦 Task Routing: Queued Run ${data.runId} via BullMQ (Redis-backed).`);
    } else {
      console.log(`📦 Task Routing: Queued Run ${data.runId} via Asynchronous In-Memory Worker (Failover Mode).`);
      
      // Execute asynchronously using setImmediate to unblock Express API main thread
      setImmediate(async () => {
        try {
          await executeReconciliationJob(data, async (progress) => {
            console.log(`[InMemory Queue] Run ${data.runId} progress update: ${progress}%`);
          });
        } catch (err: any) {
          console.error(`🚨 [InMemory Queue] Asynchronous worker run failed for ${data.runId}: ${err.message}`);
        }
      });
    }
  }
}

export default QueueService;
