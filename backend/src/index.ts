import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { connectDB, isDbConnected } from './db.js';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';
import contactRouter from './routes/contact.js';
import resumeRouter from './routes/resume.js';
import graphicsRouter from './routes/graphics.js';
import cryptoRouter from './routes/crypto.js';
import ogRouter from './routes/og.js';
import qrcodeRouter from './routes/qrcode.js';
import salesRouter from './routes/sales.js';
import marketplaceRouter from './routes/marketplace.js';
import marketplaceAdminRouter from './routes/marketplaceAdmin.js';
import schoolsPublicRouter from './routes/schoolsPublic.js';
import schoolsAdminRouter from './routes/schoolsAdmin.js';
import schoolsClientRouter from './routes/schoolsClient.js';
import schoolsPaymentsRouter from './routes/schoolsPayments.js';
import schoolsInvitesRouter from './routes/schoolsInvites.js';
import telegramRouter from './routes/telegram.js';
import { initMarketplace } from './marketplace/init.js';
import { initSchoolClients } from './schools/init.js';
import { setTelegramWebhook } from './services/telegram.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.set('trust proxy', 1);
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.MARKETPLACE_PUBLIC_URL,
  process.env.SCHOOL_CLIENT_PUBLIC_URL,
  process.env.RENDER_EXTERNAL_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean).flatMap((value) => String(value).split(',').map((item) => item.trim())).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({
  limit: '50mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large') {
    console.error(`Payload too large on ${_req.method} ${_req.url}`);
    return res.status(413).json({ error: 'File too large. Maximum 3 images, 5MB each.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    console.error(`JSON parse error on ${_req.method} ${_req.url}`);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  console.error('Unhandled error:', err.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
  next(err);
});

app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/graphics', graphicsRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/og', ogRouter);
app.use('/api/qrcode', qrcodeRouter);
app.use('/api/sales', salesRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/admin/marketplace', marketplaceAdminRouter);
app.use('/api/schools/public', schoolsPublicRouter);
app.use('/api/schools/admin', schoolsAdminRouter);
app.use('/api/schools/client', schoolsClientRouter);
app.use('/api/schools/payments', schoolsPaymentsRouter);
app.use('/api/schools/invite', schoolsInvitesRouter);
app.use('/api/telegram', telegramRouter);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', db: isDbConnected(), timestamp: new Date().toISOString() });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDist = resolve(__dirname, '..', '..', 'frontend', 'dist');

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(resolve(frontendDist, 'index.html'));
  });
}

connectDB().then(async () => {
  await initMarketplace();
  await initSchoolClients();
  void setTelegramWebhook();
  app.listen(PORT, () => {
    console.log(`Gtech Global web service running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err.message);
  console.warn('Starting server without database — writes will fail');
  void setTelegramWebhook();
  app.listen(PORT, () => {
    console.log(`Gtech Global web service running on http://localhost:${PORT} (NO DB)`);
  });
});
