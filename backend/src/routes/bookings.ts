import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import nodemailer from 'nodemailer';
import { readBookings, writeBooking, updateBooking, deleteBooking, type Booking } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { buildEmailHtml } from '../emailTemplate.js';
import { sendBookingWhatsApp } from '../services/whatsapp.js';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'gtechglobal.dev@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'gtechglobal.dev@gmail.com';
const NOTIFY_EMAIL = 'gtechglobal.dev@gmail.com';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { clientName, clientEmail, clientPhone, clientCountry, serviceCategory, package: pkg, description, sampleImage, sampleImages } = req.body;

    if (!clientName || !clientEmail || !clientPhone || !serviceCategory || !description) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (description.length < 20) {
      return res.status(400).json({ error: 'Description must be at least 20 characters' });
    }

    const rawImages: string[] = Array.isArray(sampleImages) ? sampleImages : sampleImage ? [sampleImage] : [];
    const sampleImagesClean = rawImages.slice(0, 3);

    const booking: Booking = {
      id: uuid(),
      clientName,
      clientEmail,
      clientPhone,
      clientCountry: clientCountry || '',
      serviceCategory: serviceCategory as Booking['serviceCategory'],
      package: pkg || '',
      description,
      sampleImages: sampleImagesClean.length > 0 ? sampleImagesClean : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await writeBooking(booking);

    res.status(201).json({ success: true, id: booking.id });

  if (SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    const catLabel = serviceCategory === 'web-development' ? 'Web Development' : 'Graphics Design';

    const adminText = `New Booking Request\n\n` +
      `Name: ${clientName}\n` +
      `Email: ${clientEmail}\n` +
      `Phone: ${clientPhone}\n` +
      `Country: ${clientCountry || 'N/A'}\n` +
      `Category: ${catLabel}\n` +
      `Package: ${pkg || 'N/A'}\n\n` +
      `Project Description:\n${description}` +
      (sampleImagesClean.length > 0 ? `\n\nSample images attached: ${sampleImagesClean.length}` : '');

    transporter.sendMail({
      from: `"Gtech Global" <${EMAIL_FROM}>`,
      to: NOTIFY_EMAIL,
      subject: `New Booking — ${catLabel}${pkg ? ` (${pkg})` : ''}`,
      text: adminText,
      html: buildEmailHtml(adminText, `New Booking — ${catLabel}`),
    }).then(() => console.log('Admin booking email sent'))
      .catch((err) => console.error('Admin booking email failed:', err.message));

    const clientText = `Hi ${clientName},\n\n` +
      `Thank you for reaching out to Gtech Global! We've received your ${catLabel} booking enquiry.\n\n` +
      `Here's what you submitted:\n` +
      `Category: ${catLabel}\n` +
      `Package: ${pkg || 'N/A'}\n` +
      `Description: ${description}\n\n` +
      `Our team will review your request and get back to you within 24 hours.\n\n` +
      `Best regards,\nGtech Global Team`;

    transporter.sendMail({
      from: `"Gtech Global" <${EMAIL_FROM}>`,
      to: clientEmail,
      subject: `Booking Received — ${catLabel} | Gtech Global`,
      text: clientText,
      html: buildEmailHtml(clientText, `Booking Received — ${catLabel}`),
    }).then(() => console.log('Client confirmation email sent'))
      .catch((err) => console.error('Client confirmation email failed:', err.message));
  } else {
    console.warn('SMTP_PASS not set — skipping booking emails');
  }

  sendBookingWhatsApp({
    clientName,
    clientEmail,
    clientPhone,
    serviceCategory,
    pkg: pkg || '',
    description,
  }).catch((err) => console.error('WhatsApp notification failed:', err.message));
  } catch (err: any) {
    console.error('Failed to create booking:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, category } = req.query;
    let bookings = await readBookings();

    if (status && typeof status === 'string') {
      bookings = bookings.filter((b) => b.status === status);
    }
    if (category && typeof category === 'string') {
      bookings = bookings.filter((b) => b.serviceCategory === category);
    }

    res.json({ bookings, total: bookings.length });
  } catch (err: any) {
    console.error('Failed to fetch bookings:', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['pending', 'approved', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updated = await updateBooking(req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ success: true, booking: updated });
  } catch (err: any) {
    console.error('Failed to update booking:', err.message);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await deleteBooking(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete booking:', err.message);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

export default router;
