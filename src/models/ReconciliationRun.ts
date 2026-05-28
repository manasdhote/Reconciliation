import mongoose, { Schema } from 'mongoose';
import { IReconciliationRunDocument } from '../interfaces';

const ReconciliationRunSchema = new Schema<IReconciliationRunDocument>({
  runId: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  timestampToleranceUsed: {
    type: Number,
    required: true
  },
  quantityTolerancePctUsed: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'INGESTING', 'MATCHING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  error: {
    type: String,
    required: false,
    default: null
  },
  metrics: {
    type: Schema.Types.Mixed,
    required: false,
    default: null
  },
  summary: {
    totalUserIngested: { type: Number, default: 0 },
    totalExchangeIngested: { type: Number, default: 0 },
    totalUserValid: { type: Number, default: 0 },
    totalExchangeValid: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    conflictingCount: { type: Number, default: 0 },
    unmatchedUserCount: { type: Number, default: 0 },
    unmatchedExchangeCount: { type: Number, default: 0 }
  }
});

export default mongoose.model<IReconciliationRunDocument>('ReconciliationRun', ReconciliationRunSchema);
