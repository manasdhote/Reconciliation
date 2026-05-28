import mongoose, { Schema } from 'mongoose';
import { ITransactionDocument } from '../interfaces';

const TransactionSchema = new Schema<ITransactionDocument>({
  runId: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    enum: ['user', 'exchange']
  },
  transaction_id: {
    type: String,
    required: false
  },
  timestamp: {
    type: String,
    required: false
  },
  parsedTimestamp: {
    type: Date,
    required: false
  },
  type: {
    type: String,
    required: false
  },
  asset: {
    type: String,
    required: false
  },
  quantity: {
    type: Number,
    required: false
  },
  price_usd: {
    type: Number,
    required: false
  },
  fee: {
    type: Number,
    required: false
  },
  note: {
    type: String,
    required: false
  },
  normalizedAsset: {
    type: String,
    required: false,
    index: true
  },
  normalizedType: {
    type: String,
    required: false,
    index: true
  },
  validationStatus: {
    type: String,
    required: true,
    enum: ['VALID', 'INVALID'],
    default: 'VALID'
  },
  validationError: {
    type: String,
    required: false
  },
  rawRow: {
    type: Schema.Types.Mixed,
    required: true
  }
});

TransactionSchema.index({ runId: 1, source: 1, validationStatus: 1 });

export default mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);
