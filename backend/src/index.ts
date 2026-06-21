import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';
import contactRouter from './routes/contact.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error(`❌ JSON parse error on ${_req.method} ${_req.url}`);
    console.error(`   Raw body: ${_req.body?.toString() || 'unavailable'}`);
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

app.listen(PORT, () => {
  console.log(`⚡ Gtech Global API running on http://localhost:${PORT}`);
});
