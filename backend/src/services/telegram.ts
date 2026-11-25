import { Buffer } from 'buffer';

type TelegramFile = { data: Buffer; fileName: string; mimeType: string };

const env = (key: string) => String(process.env[key] || '').trim();

function botToken(): string { return env('TELEGRAM_BOT_TOKEN'); }
function publicBaseUrl(): string {
  const base = env('PUBLIC_URL') || env('MARKETPLACE_PUBLIC_URL') || env('RENDER_EXTERNAL_URL');

  return base.replace(/\/+$/, '');
}

function mimeFromPath(filePath: string): string {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'm4a') return 'audio/mp4';
  if (ext === 'mp4') return 'audio/mp4';
  if (ext === 'webm') return 'audio/webm';
  if (ext === 'oga' || ext === 'ogg') return 'audio/ogg';
  return 'audio/ogg';
}

export function telegramConfigured(): boolean {
  return !!botToken();
}

export function telegramBotUrl(): string {
  const username = env('TELEGRAM_BOT_USERNAME').replace(/^@/, '');
  return username ? `https://t.me/${username}` : '';
}

export function telegramWebhookUrl(): string {
  const base = publicBaseUrl();
  return base ? `${base}/api/telegram/webhook` : '';
}

export async function setTelegramWebhook(): Promise<boolean> {
  const token = botToken();
  const url = telegramWebhookUrl();
  if (!token || !url) return false;
  try {
    const body = new URLSearchParams({ url });
    const secret = env('TELEGRAM_WEBHOOK_SECRET');
    if (secret) body.set('secret_token', secret);
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = await res.json().catch(() => null) as any;
    if (!res.ok || !json?.ok) {
      console.error('Telegram setWebhook failed:', json?.description || res.status);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Telegram setWebhook error:', err?.message || err);
    return false;
  }
}

export async function sendTelegramText(chatId: string, text: string): Promise<boolean> {
  const token = botToken();
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const json = await res.json().catch(() => null) as any;
    if (!res.ok || !json?.ok) {
      console.error('Telegram sendMessage failed:', json?.description || res.status);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Telegram sendMessage error:', err?.message || err);
    return false;
  }
}

export async function sendTelegramVoice(chatId: string, data: Buffer, fileName: string, caption?: string): Promise<boolean> {
  const token = botToken();
  if (!token || !chatId) return false;
  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    if (caption) form.append('caption', caption);
    const blob = new Blob([new Uint8Array(data)], { type: mimeFromPath(fileName) });
    form.append('voice', blob, fileName || 'voice.ogg');
    const res = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, { method: 'POST', body: form });
    const json = await res.json().catch(() => null) as any;
    if (!res.ok || !json?.ok) {
      console.error('Telegram sendVoice failed:', json?.description || res.status);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Telegram sendVoice error:', err?.message || err);
    return false;
  }
}

export async function getTelegramFile(fileId: string): Promise<TelegramFile | null> {
  const token = botToken();
  if (!token || !fileId) return null;
  try {
    const metaRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const meta = await metaRes.json().catch(() => null) as any;
    const filePath = String(meta?.result?.file_path || '');
    if (!metaRes.ok || !meta?.ok || !filePath) {
      console.error('Telegram getFile failed:', meta?.description || metaRes.status);
      return null;
    }
    const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!fileRes.ok) {
      console.error('Telegram file download failed:', fileRes.status);
      return null;
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const fileName = filePath.split('/').pop() || `telegram-${fileId}`;
    return { data, fileName, mimeType: mimeFromPath(filePath) };
  } catch (err: any) {
    console.error('Telegram getFile error:', err?.message || err);
    return null;
  }
}
