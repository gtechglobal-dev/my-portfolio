import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import bookingsRouter from '../../backend/src/routes/bookings';
import adminRouter from '../../backend/src/routes/admin';
import contactRouter from '../../backend/src/routes/contact';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const base = serverless(app);

export const handler = async (event: any, context: any) => {
  event.path = event.headers['x-netlify-original-pathname'] || event.path;
  return base(event, context);
};
