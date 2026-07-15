import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';
import contactRouter from './routes/contact.js';
import resumeRouter from './routes/resume.js';
import graphicsRouter from './routes/graphics.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error(`JSON parse error on ${_req.method} ${_req.url}`);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/graphics', graphicsRouter);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.RENDER === 'true' || process.env.NODE_ENV === 'production') {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const frontendDist = resolve(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(resolve(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Gtech Global API running on http://localhost:${PORT}`);
});
