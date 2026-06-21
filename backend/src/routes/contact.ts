import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { readMessages, writeMessages, type Message } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const msg: Message = {
    id: uuid(),
    name,
    email,
    subject,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const messages = readMessages();
  messages.push(msg);
  writeMessages(messages);

  res.status(201).json({ success: true, id: msg.id });
});

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const messages = readMessages();
  const unread = messages.filter((m) => !m.read).length;
  messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ messages, unread });
});

router.patch('/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const messages = readMessages();
  const idx = messages.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Message not found' });
  }
  messages[idx].read = true;
  writeMessages(messages);
  res.json({ success: true });
});

export default router;
