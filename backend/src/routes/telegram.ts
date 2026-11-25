import { Router, Request, Response } from 'express';
import { constantTimeEqual } from '../marketplace/types.js';
import { hashToken, makeId, type ClientDoc, type DocumentDoc, type FileDoc, type MessageDoc } from '../schools/types.js';
import { findOne, insert, update, notify } from '../schools/store.js';
import { getTelegramFile, sendTelegramText } from '../services/telegram.js';

const router = Router();

function senderName(from: any): string {
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim();
  return name || from?.username || 'Telegram user';
}

async function storeTelegramDocument(projectId: string, fileName: string, mimeType: string, data: Buffer, caption: string) {
  const now = new Date().toISOString();
  const documentId = makeId();
  const fileId = makeId();
  const file: FileDoc = {
    id: fileId, projectId, documentId, fileName, mimeType, size: data.length,
    data: data.toString('base64'), uploadedBy: 'telegram', createdAt: now,
  };
  const doc: DocumentDoc = {
    id: documentId, projectId, category: 'other', title: caption || fileName,
    fileId, fileName, mimeType, size: data.length,
    url: `/api/schools/admin/documents/${documentId}/file`,
    uploadedBy: 'telegram', clientVisible: true, createdAt: now,
  };
  await insert('sc_files', file);
  await insert('sc_documents', doc);
  return { file, doc };
}

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    if (!secret) return res.status(503).json({ error: 'Telegram webhook not configured' });
    const header = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    if (!constantTimeEqual(header, secret)) return res.status(401).json({ error: 'Invalid secret' });

    const message = req.body?.message || req.body?.edited_message;
    if (!message) return res.json({ ok: true });
    const chatId = String(message.chat?.id || '');
    const from = message.from || {};
    const name = senderName(from);

    if (typeof message.text === 'string' && message.text.startsWith('/start ')) {
      const code = message.text.slice('/start '.length).trim();
      if (code) {
        const client = await findOne<ClientDoc>('sc_clients', { telegramBindCodeHash: hashToken(code) });
        if (client?.telegramBindCodeExpiresAt && new Date(client.telegramBindCodeExpiresAt).getTime() > Date.now()) {
          const now = new Date().toISOString();
          await update<ClientDoc>('sc_clients', 'id', client.id, {
            telegramChatId: chatId, telegramEnabled: true, telegramBindCodeHash: undefined, telegramBindCodeExpiresAt: undefined, updatedAt: now,
          } as any);
          if (client.projectId) {
            const msg: MessageDoc = {
              id: makeId(), projectId: client.projectId, senderId: chatId, senderName: name,
              senderRole: 'telegram', message: 'Telegram connected.', read: false, channel: 'telegram', createdAt: now,
            };
            await insert('sc_messages', msg);
            await notify({ clientId: client.id, projectId: client.projectId, audience: 'client', title: 'Telegram connected', message: 'Your Telegram chat is now linked to the portal.', type: 'telegram' });
          }
          await sendTelegramText(chatId, 'Telegram connected to your Gtech school portal.');
        } else {
          await sendTelegramText(chatId, 'This bind code is invalid or expired. Please generate a new one from your portal.');
        }
      }
      return res.json({ ok: true });
    }

    const client = chatId ? await findOne<ClientDoc>('sc_clients', { telegramChatId: chatId }) : null;
    if (!client?.projectId) {
      if (chatId) await sendTelegramText(chatId, 'This chat is not linked to a school portal. Use the bind link from your portal.');
      return res.json({ ok: true });
    }

    const now = new Date().toISOString();
    const projectId = client.projectId;
    if (typeof message.text === 'string' && message.text.trim()) {
      const text = message.text.trim();
      const msg: MessageDoc = {
        id: makeId(), projectId, senderId: chatId, senderName: name, senderRole: 'telegram',
        message: text, read: false, channel: 'telegram', createdAt: now,
      };
      await insert('sc_messages', msg);
      await notify({ clientId: client.id, projectId, audience: 'client', title: 'Telegram message', message: text.slice(0, 160), type: 'telegram' });
      await sendTelegramText(chatId, 'Message received by Gtech support.');
      return res.json({ ok: true });
    }

    if (message.voice?.file_id) {
      const file = await getTelegramFile(String(message.voice.file_id));
      if (file) {
        const caption = String(message.caption || 'Voice note');
        const stored = await storeTelegramDocument(projectId, file.fileName, file.mimeType, file.data, caption);
        const msg: MessageDoc = {
          id: makeId(), projectId, senderId: chatId, senderName: name, senderRole: 'telegram',
          message: caption, read: false, channel: 'telegram', voiceFileId: stored.file.id, documentId: stored.doc.id,
          fileName: stored.file.fileName, mimeType: stored.file.mimeType, createdAt: now,
        };
        await insert('sc_messages', msg);
        await notify({ clientId: client.id, projectId, audience: 'client', title: 'Telegram voice note', message: caption.slice(0, 160), type: 'telegram' });
        await sendTelegramText(chatId, 'Voice note received by Gtech support.');
      }
      return res.json({ ok: true });
    }

    if (message.document?.file_id) {
      const doc = message.document;
      const mime = String(doc.mime_type || '');
      const isAudio = mime.startsWith('audio/') || /\.(mp3|m4a|ogg|oga|webm|wav)$/i.test(String(doc.file_name || ''));
      if (isAudio) {
        const file = await getTelegramFile(String(doc.file_id));
        if (file) {
          const caption = String(message.caption || doc.file_name || 'Audio file');
          const stored = await storeTelegramDocument(projectId, String(doc.file_name || file.fileName), mime || file.mimeType, file.data, caption);
          const msg: MessageDoc = {
            id: makeId(), projectId, senderId: chatId, senderName: name, senderRole: 'telegram',
            message: caption, read: false, channel: 'telegram', voiceFileId: stored.file.id, documentId: stored.doc.id,
            fileName: stored.file.fileName, mimeType: stored.file.mimeType, createdAt: now,
          };
          await insert('sc_messages', msg);
          await notify({ clientId: client.id, projectId, audience: 'client', title: 'Telegram audio', message: caption.slice(0, 160), type: 'telegram' });
          await sendTelegramText(chatId, 'Audio received by Gtech support.');
        }
      } else {
        await sendTelegramText(chatId, 'Received. Please send text, voice notes, or audio files through this chat.');
      }
      return res.json({ ok: true });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error', err);
    return res.status(500).json({ error: 'Webhook failed' });
  }
});

export default router;
