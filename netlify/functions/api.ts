import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend', '.env') });
import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { connectDB } from '../../backend/src/db';
import bookingsRouter from '../../backend/src/routes/bookings';
import adminRouter from '../../backend/src/routes/admin';
import contactRouter from '../../backend/src/routes/contact';
import resumeRouter from '../../backend/src/routes/resume';
import qrcodeRouter from '../../backend/src/routes/qrcode';
import salesRouter from '../../backend/src/routes/sales';
import marketplaceRouter from '../../backend/src/routes/marketplace';
import marketplaceAdminRouter from '../../backend/src/routes/marketplaceAdmin';
import schoolsPublicRouter from '../../backend/src/routes/schoolsPublic';
import schoolsAdminRouter from '../../backend/src/routes/schoolsAdmin';
import schoolsClientRouter from '../../backend/src/routes/schoolsClient';
import schoolsPaymentsRouter from '../../backend/src/routes/schoolsPayments';
import schoolsInvitesRouter from '../../backend/src/routes/schoolsInvites';
import { initMarketplace } from '../../backend/src/marketplace/init';
import { initSchoolClients } from '../../backend/src/schools/init';

await connectDB();
await initMarketplace();
await initSchoolClients();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb', verify: (req: any, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/qrcode', qrcodeRouter);
app.use('/api/sales', salesRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/admin/marketplace', marketplaceAdminRouter);
app.use('/api/schools/public', schoolsPublicRouter);
app.use('/api/schools/admin', schoolsAdminRouter);
app.use('/api/schools/client', schoolsClientRouter);
app.use('/api/schools/payments', schoolsPaymentsRouter);
app.use('/api/schools/invite', schoolsInvitesRouter);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const base = serverless(app);

const PREFIX = '/.netlify/functions/api';

export const handler = async (event: any, context: any) => {
  if (event.path.startsWith(PREFIX)) {
    event.path = '/api' + event.path.slice(PREFIX.length);
  }
  return base(event, context);
};
