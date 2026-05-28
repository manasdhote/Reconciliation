import fs from 'fs';
import csv from 'csv-parser';
import Transaction from '../models/Transaction';
import { ICSVRow } from '../interfaces';

interface IValidationResult {
  isValid: boolean;
  errorReason?: string;
  parsedTimestamp?: Date;
  quantity?: number;
  priceUsd?: number | null;
  fee?: number | null;
}

/**
 * High-performance service to handle ingestion and validation of CSV transaction files
 * utilizing stream-based batch processing for O(1) memory complexity.
 */
class IngestionService {
  /**
   * Parses and validates a CSV file, saving rows to MongoDB in batches of 1,000.
   */
  static async ingestCSV(
    filePath: string,
    runId: string,
    source: 'user' | 'exchange'
  ): Promise<{ totalIngested: number; validCount: number; durationMs: number }> {
    return new Promise((resolve, reject) => {
      const startTime = process.hrtime();
      let totalIngested = 0;
      let validCount = 0;
      
      // Batch buffer variables
      let buffer: any[] = [];
      const BATCH_SIZE = 1000;

      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase()
        }));

      stream.on('data', async (row: ICSVRow) => {
        totalIngested++;
        const validation = this.validateRow(row);

        const txData: any = {
          runId,
          source,
          transaction_id: row.transaction_id || null,
          timestamp: row.timestamp || null,
          type: row.type || null,
          asset: row.asset || null,
          note: row.note || null,
          rawRow: row,
          validationStatus: validation.isValid ? 'VALID' : 'INVALID',
          validationError: validation.isValid ? null : validation.errorReason
        };

        if (validation.isValid) {
          validCount++;
          txData.parsedTimestamp = validation.parsedTimestamp;
          txData.quantity = validation.quantity;
          txData.price_usd = validation.priceUsd;
          txData.fee = validation.fee;
        } else {
          txData.quantity = isNaN(parseFloat(row.quantity || '')) ? null : parseFloat(row.quantity || '');
          txData.price_usd = isNaN(parseFloat(row.price_usd || '')) ? null : parseFloat(row.price_usd || '');
          txData.fee = isNaN(parseFloat(row.fee || '')) ? null : parseFloat(row.fee || '');
        }

        buffer.push(txData);

        // If buffer reaches BATCH_SIZE, pause stream and perform bulk insert
        if (buffer.length >= BATCH_SIZE) {
          stream.pause();
          try {
            const batchToInsert = [...buffer];
            buffer = []; // Clean memory reference instantly
            await Transaction.insertMany(batchToInsert);
            stream.resume();
          } catch (dbErr) {
            stream.destroy();
            reject(dbErr);
          }
        }
      });

      stream.on('end', async () => {
        try {
          // Flush any remaining records in the buffer
          if (buffer.length > 0) {
            await Transaction.insertMany(buffer);
            buffer = [];
          }

          const diffTime = process.hrtime(startTime);
          const durationMs = (diffTime[0] * 1000) + (diffTime[1] / 1000000);

          console.log(`Streamed Ingestion complete for ${source}. ${totalIngested} rows in ${durationMs.toFixed(2)}ms.`);
          resolve({ totalIngested, validCount, durationMs });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Validates a single transaction row.
   */
  static validateRow(row: ICSVRow): IValidationResult {
    const txId = row.transaction_id ? row.transaction_id.trim() : '';
    if (!txId) {
      return { isValid: false, errorReason: 'Missing transaction_id' };
    }

    const timestampStr = row.timestamp ? row.timestamp.trim() : '';
    if (!timestampStr) {
      return { isValid: false, errorReason: 'Missing timestamp' };
    }

    const parsedTimestamp = new Date(timestampStr);
    if (isNaN(parsedTimestamp.getTime())) {
      return { isValid: false, errorReason: `Malformed timestamp: "${timestampStr}"` };
    }

    const qtyStr = row.quantity ? row.quantity.trim() : '';
    if (!qtyStr) {
      return { isValid: false, errorReason: 'Missing quantity' };
    }

    const quantity = parseFloat(qtyStr);
    if (isNaN(quantity)) {
      return { isValid: false, errorReason: `Invalid quantity (not a number): "${qtyStr}"` };
    }

    if (quantity < 0) {
      return { isValid: false, errorReason: `Negative quantity: ${quantity}` };
    }

    const asset = row.asset ? row.asset.trim() : '';
    if (!asset) {
      return { isValid: false, errorReason: 'Missing asset type' };
    }

    const priceUsd = row.price_usd && row.price_usd.trim() !== '' ? parseFloat(row.price_usd) : null;
    const fee = row.fee && row.fee.trim() !== '' ? parseFloat(row.fee) : null;

    return {
      isValid: true,
      parsedTimestamp,
      quantity,
      priceUsd: isNaN(priceUsd as number) ? null : priceUsd,
      fee: isNaN(fee as number) ? null : fee
    };
  }
}

export default IngestionService;
