import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ReconciliationRun from '../models/ReconciliationRun';
import Transaction from '../models/Transaction';
import ReconciliationReport from '../models/ReconciliationReport';
import QueueService from '../services/queueService';
import * as config from '../config';

/**
 * Controller to handle all reconciliation API requests.
 */
class ReconcileController {
  /**
   * Executes the CSV parsing, ingestion, matching, and creates a new run.
   */
  static async executeReconcile(req: Request, res: Response): Promise<Response> {
    try {
      const timestampTolerance = parseInt(
        (req.body.timestampTolerance || req.query.timestampTolerance || '').toString(),
        10
      ) || config.DEFAULT_TIMESTAMP_TOLERANCE;
      
      const quantityTolerancePct = parseFloat(
        (req.body.quantityTolerancePct || req.query.quantityTolerancePct || '').toString()
      ) || config.DEFAULT_QUANTITY_TOLERANCE;

      let userCsvPath = '';
      let exchangeCsvPath = '';

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Note: If files are uploaded, they will be cleaned up by the background BullMQ Worker
      if (files && files.userCsv && files.exchangeCsv) {
        userCsvPath = files.userCsv[0].path;
        exchangeCsvPath = files.exchangeCsv[0].path;
      } else {
        userCsvPath = path.resolve(process.cwd(), 'src/public/user_transactions.csv');
        // Let's also check root folder as fallback
        if (!fs.existsSync(userCsvPath)) {
          userCsvPath = path.resolve(process.cwd(), 'user_transactions.csv');
        }
        exchangeCsvPath = path.resolve(process.cwd(), 'src/public/exchange_transactions.csv');
        if (!fs.existsSync(exchangeCsvPath)) {
          exchangeCsvPath = path.resolve(process.cwd(), 'exchange_transactions.csv');
        }
      }

      if (!fs.existsSync(userCsvPath) || !fs.existsSync(exchangeCsvPath)) {
        return res.status(400).json({
          success: false,
          message: 'CSV datasets are missing. Please upload them or ensure user_transactions.csv and exchange_transactions.csv exist in the project root.'
        });
      }

      const runId = uuidv4();

      console.log(`Queueing Reconciliation Run: ${runId}`);
      console.log(`Tolerances queued - Time: ${timestampTolerance}s, Qty: ${quantityTolerancePct}%`);

      // Initialize the run state as PENDING in MongoDB
      const newRun = new ReconciliationRun({
        runId,
        timestampToleranceUsed: timestampTolerance,
        quantityTolerancePctUsed: quantityTolerancePct,
        status: 'PENDING',
        summary: {
          totalUserIngested: 0,
          totalExchangeIngested: 0,
          totalUserValid: 0,
          totalExchangeValid: 0,
          matchedCount: 0,
          conflictingCount: 0,
          unmatchedUserCount: 0,
          unmatchedExchangeCount: 0
        }
      });

      await newRun.save();

      await QueueService.addJob({
        runId,
        userCsvPath,
        exchangeCsvPath,
        timestampTolerance,
        quantityTolerancePct
      });

      return res.status(202).json({
        success: true,
        message: 'Reconciliation process successfully queued in the background.',
        runId,
        run: newRun
      });
    } catch (error: any) {
      console.error(`Reconciliation queueing failed: ${error.stack}`);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while queueing the reconciliation job.',
        error: error.message
      });
    }
  }

  /**
   * Retrieves a list of all reconciliation runs.
   */
  static async getRuns(_req: Request, res: Response): Promise<Response> {
    try {
      const runs = await ReconciliationRun.find().sort({ timestamp: -1 });
      return res.status(200).json({
        success: true,
        count: runs.length,
        runs
      });
    } catch (error: any) {
      console.error(`Failed to fetch runs: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve reconciliation runs.',
        error: error.message
      });
    }
  }

  /**
   * Retrieves the full report for a specific run.
   */
  static async getReport(req: Request, res: Response): Promise<Response> {
    try {
      const { runId } = req.params;
      
      const run = await ReconciliationRun.findOne({ runId });
      if (!run) {
        return res.status(404).json({ success: false, message: 'Reconciliation run not found.' });
      }

      const report = await ReconciliationReport.find({ runId });
      const invalidTxs = await Transaction.find({ runId, validationStatus: 'INVALID' });

      return res.status(200).json({
        success: true,
        run,
        summary: run.summary,
        reportCount: report.length,
        report,
        invalidCount: invalidTxs.length,
        invalidTransactions: invalidTxs
      });
    } catch (error: any) {
      console.error(`Failed to fetch report: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve reconciliation report.',
        error: error.message
      });
    }
  }

  /**
   * Returns counts of matched, conflicting, and unmatched records.
   */
  static async getReportSummary(req: Request, res: Response): Promise<Response> {
    try {
      const { runId } = req.params;
      const run = await ReconciliationRun.findOne({ runId });
      if (!run) {
        return res.status(404).json({ success: false, message: 'Reconciliation run not found.' });
      }
      return res.status(200).json({
        success: true,
        runId,
        summary: run.summary
      });
    } catch (error: any) {
      console.error(`Failed to fetch summary: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve run summary.',
        error: error.message
      });
    }
  }

  /**
   * Returns only unmatched transactions (unmatched user, unmatched exchange).
   */
  static async getUnmatched(req: Request, res: Response): Promise<Response> {
    try {
      const { runId } = req.params;
      
      const run = await ReconciliationRun.findOne({ runId });
      if (!run) {
        return res.status(404).json({ success: false, message: 'Reconciliation run not found.' });
      }

      const report = await ReconciliationReport.find({
        runId,
        category: { $in: ['UNMATCHED_USER', 'UNMATCHED_EXCHANGE'] }
      });

      return res.status(200).json({
        success: true,
        count: report.length,
        report
      });
    } catch (error: any) {
      console.error(`Failed to fetch unmatched: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve unmatched transactions.',
        error: error.message
      });
    }
  }

  /**
   * Generates and downloads the reconciliation report as a CSV.
   */
  static async downloadReportCSV(req: Request, res: Response): Promise<any> {
    try {
      const { runId } = req.params;
      
      const run = await ReconciliationRun.findOne({ runId });
      if (!run) {
        return res.status(404).send('Reconciliation run not found.');
      }

      const report = await ReconciliationReport.find({ runId });

      const headers = [
        'category',
        'reason',
        'user_transaction_id',
        'user_timestamp',
        'user_type',
        'user_asset',
        'user_quantity',
        'user_price_usd',
        'user_fee',
        'user_note',
        'exchange_transaction_id',
        'exchange_timestamp',
        'exchange_type',
        'exchange_asset',
        'exchange_quantity',
        'exchange_price_usd',
        'exchange_fee',
        'exchange_note'
      ];

      let csvContent = headers.join(',') + '\n';

      for (const entry of report) {
        const u = (entry.userTransaction || {}) as any;
        const e = (entry.exchangeTransaction || {}) as any;

        const csvValue = (val: any) => {
          if (val === undefined || val === null) return '';
          let str = String(val).trim();
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            str = str.replace(/"/g, '""');
            return `"${str}"`;
          }
          return str;
        };

        const row = [
          csvValue(entry.category),
          csvValue(entry.reason),
          csvValue(u.transaction_id),
          csvValue(u.timestamp),
          csvValue(u.type),
          csvValue(u.asset),
          csvValue(u.quantity),
          csvValue(u.price_usd),
          csvValue(u.fee),
          csvValue(u.note),
          csvValue(e.transaction_id),
          csvValue(e.timestamp),
          csvValue(e.type),
          csvValue(e.asset),
          csvValue(e.quantity),
          csvValue(e.price_usd),
          csvValue(e.fee),
          csvValue(e.note)
        ];

        csvContent += row.join(',') + '\n';
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=reconciliation_report_${runId}.csv`);
      return res.status(200).send(csvContent);
    } catch (error: any) {
      console.error(`Failed to download report: ${error.stack}`);
      return res.status(500).send('Failed to generate CSV report file.');
    }
  }
}

export default ReconcileController;
