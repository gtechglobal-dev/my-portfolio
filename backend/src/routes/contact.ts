import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { readMessages, writeMessage, markMessageRead, type Message } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
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

  await writeMessage(msg);

  res.status(201).json({ success: true, id: msg.id });
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const messages = await readMessages();
  const unread = messages.filter((m) => !m.read).length;
  res.json({ messages, unread });
});

router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  const updated = await markMessageRead(req.params.id);
  if (!updated) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json({ success: true });
});

export default router;
