import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import nodemailer from 'nodemailer';
import { readBookings, writeBookings, type Booking } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { buildEmailHtml } from '../emailTemplate.js';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'gtechglobal.dev@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'gtechglobal.dev@gmail.com';
const NOTIFY_EMAIL = 'gtechglobal.dev@gmail.com';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { clientName, clientEmail, clientPhone, clientCountry, serviceCategory, package: pkg, description } = req.body;

  if (!clientName || !clientEmail || !clientPhone || !serviceCategory || !description) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  if (description.length < 20) {
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  }

  const booking: Booking = {
    id: uuid(),
    clientName,
    clientEmail,
    clientPhone,
    clientCountry: clientCountry || '',
    serviceCategory: serviceCategory as Booking['serviceCategory'],
    package: pkg || '',
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const bookings = readBookings();
  bookings.push(booking);
  writeBookings(bookings);

  if (SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        requireTLS: true,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: { rejectUnauthorized: false },
      });

      const catLabel = serviceCategory === 'web-development' ? 'Web Development' : 'Graphics Design';
      const text = `New Booking Request\n\n` +
        `Name: ${clientName}\n` +
        `Email: ${clientEmail}\n` +
        `Phone: ${clientPhone}\n` +
        `Country: ${clientCountry || 'N/A'}\n` +
        `Category: ${catLabel}\n` +
        `Package: ${pkg || 'N/A'}\n\n` +
        `Project Description:\n${description}`;

      await transporter.sendMail({
        from: `"Gtech Global" <${EMAIL_FROM}>`,
        to: NOTIFY_EMAIL,
        subject: `New Booking — ${catLabel}${pkg ? ` (${pkg})` : ''}`,
        text,
        html: buildEmailHtml(text, `New Booking — ${catLabel}`),
      });
    } catch (err: any) {
      console.error('Booking notification email failed:', err.message);
    }
  }

  res.status(201).json({ success: true, id: booking.id });
});

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const bookings = readBookings();
  const { status, category } = req.query;

  let filtered = bookings;
  if (status && typeof status === 'string') {
    filtered = filtered.filter((b) => b.status === status);
  }
  if (category && typeof category === 'string') {
    filtered = filtered.filter((b) => b.serviceCategory === category);
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ bookings: filtered, total: filtered.length });
});

router.patch('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const bookings = readBookings();
  const idx = bookings.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const { status } = req.body;
  if (status && ['pending', 'approved', 'completed', 'cancelled'].includes(status)) {
    bookings[idx].status = status;
    writeBookings(bookings);
    res.json({ success: true, booking: bookings[idx] });
  } else {
    res.status(400).json({ error: 'Invalid status value' });
  }
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const bookings = readBookings();
  const idx = bookings.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  bookings.splice(idx, 1);
  writeBookings(bookings);
  res.json({ success: true });
});

export default router;
