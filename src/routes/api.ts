import express from 'express';
const router = express.Router();
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ReconcileController from '../controllers/reconcileController';

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: 'uploads/' });

const csvUploadFields = upload.fields([
  { name: 'userCsv', maxCount: 1 },
  { name: 'exchangeCsv', maxCount: 1 }
]);

// Execute reconciliation run
router.post('/reconcile', csvUploadFields, ReconcileController.executeReconcile);

// Get list of previous runs
router.get('/runs', ReconcileController.getRuns);

// Get details of a specific run
router.get('/report/:runId', ReconcileController.getReport);

// Get summary stats of a specific run
router.get('/report/:runId/summary', ReconcileController.getReportSummary);

// Get only unmatched transactions
router.get('/report/:runId/unmatched', ReconcileController.getUnmatched);

// Download report as CSV
router.get('/report/:runId/download', ReconcileController.downloadReportCSV);

export default router;
