import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { readBookings, writeBookings, type Booking } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { clientName, clientEmail, clientPhone, serviceCategory, package: pkg, budget, description } = req.body;

  if (!clientName || !clientEmail || !clientPhone || !serviceCategory || !budget || !description) {
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
    serviceCategory: serviceCategory as Booking['serviceCategory'],
    package: pkg || '',
    budget,
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const bookings = readBookings();
  bookings.push(booking);
  writeBookings(bookings);

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
