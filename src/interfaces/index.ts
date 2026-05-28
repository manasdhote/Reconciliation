import { Document } from 'mongoose';

export interface ITransaction {
  runId: string;
  source: 'user' | 'exchange';
  transaction_id: string | null;
  timestamp: string | null;
  parsedTimestamp?: Date | null;
  type: string | null;
  asset: string | null;
  quantity: number | null;
  price_usd: number | null;
  fee: number | null;
  note: string | null;
  normalizedAsset?: string | null;
  normalizedType?: string | null;
  validationStatus: 'VALID' | 'INVALID';
  validationError?: string | null;
  rawRow: Record<string, any>;
}

export interface ITransactionDocument extends ITransaction, Document {}

export interface IPerformanceMetrics {
  ingestionDurationMs: number;
  matchingDurationMs: number;
  totalDurationMs: number;
  ingestionThroughput: number; // rows/sec
  matchingThroughput: number;  // rows/sec
}

export interface IReconciliationRun {
  runId: string;
  timestamp?: Date;
  timestampToleranceUsed: number;
  quantityTolerancePctUsed: number;
  status: 'PENDING' | 'INGESTING' | 'MATCHING' | 'COMPLETED' | 'FAILED';
  error?: string | null;
  metrics?: IPerformanceMetrics | null;
  summary: {
    totalUserIngested: number;
    totalExchangeIngested: number;
    totalUserValid: number;
    totalExchangeValid: number;
    matchedCount: number;
    conflictingCount: number;
    unmatchedUserCount: number;
    unmatchedExchangeCount: number;
  };
}

export interface IReconciliationRunDocument extends IReconciliationRun, Document {}

export interface IAuditTrail {
  decisionType: 'MATCHED' | 'CONFLICTING' | 'UNMATCHED_USER' | 'UNMATCHED_EXCHANGE';
  timeDifferenceSec: number;
  quantityDifferencePct: number;
  matchingRuleApplied: string;
  tolerancesConfigured: {
    time: number;
    quantity: number;
  };
}

export interface IReconciliationReport {
  runId: string;
  category: 'MATCHED' | 'CONFLICTING' | 'UNMATCHED_USER' | 'UNMATCHED_EXCHANGE';
  reason: string;
  userTransaction: ITransaction | null;
  exchangeTransaction: ITransaction | null;
  auditTrail: IAuditTrail;
}

export interface IReconciliationReportDocument extends IReconciliationReport, Document {}

export interface IToleranceOverrides {
  timestampTolerance?: number;
  quantityTolerancePct?: number;
}

export interface IMatchStats {
  matchedCount: number;
  conflictingCount: number;
  unmatchedUserCount: number;
  unmatchedExchangeCount: number;
}

export interface ICSVRow {
  transaction_id?: string;
  timestamp?: string;
  type?: string;
  asset?: string;
  quantity?: string;
  price_usd?: string;
  fee?: string;
  note?: string;
  [key: string]: any;
}
