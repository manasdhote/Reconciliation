import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/api';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve React compiled files in production, fallback to legacy public dashboard
const frontendDistPath = path.join(process.cwd(), 'frontend/dist');
const legacyPublicPath = path.join(process.cwd(), 'src/public');

app.use(express.static(frontendDistPath));
app.use(express.static(legacyPublicPath));

app.use('/api', apiRoutes);

app.get('*', (_req: Request, res: Response) => {
  const fs = require('fs');
  const reactIndex = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(reactIndex)) {
    res.sendFile(reactIndex);
  } else {
    res.sendFile(path.join(legacyPublicPath, 'index.html'));
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred.',
    error: err.message
  });
});

export default app;
