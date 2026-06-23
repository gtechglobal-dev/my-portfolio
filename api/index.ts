import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bookingsRouter from '../backend/src/routes/bookings';
import adminRouter from '../backend/src/routes/admin';
import contactRouter from '../backend/src/routes/contact';
import resumeRouter from '../backend/src/routes/resume';

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
app.use('/api/resume', resumeRouter);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
