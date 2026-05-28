import mongoose, { Schema } from 'mongoose';
import { IReconciliationReportDocument } from '../interfaces';

const ReconciliationReportSchema = new Schema<IReconciliationReportDocument>({
  runId: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['MATCHED', 'CONFLICTING', 'UNMATCHED_USER', 'UNMATCHED_EXCHANGE']
  },
  reason: {
    type: String,
    required: true
  },
  userTransaction: {
    type: Schema.Types.Mixed,
    required: false
  },
  exchangeTransaction: {
    type: Schema.Types.Mixed,
    required: false
  },
  auditTrail: {
    type: Schema.Types.Mixed,
    required: true
  }
});

ReconciliationReportSchema.index({ runId: 1, category: 1 });

export default mongoose.model<IReconciliationReportDocument>('ReconciliationReport', ReconciliationReportSchema);
