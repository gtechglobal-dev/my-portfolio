import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const PIN_ENCRYPTION_KEY = process.env.PIN_ENCRYPTION_KEY || '';

function deriveKey(): Buffer | null {
  if (!PIN_ENCRYPTION_KEY) return null;
  return createHash('sha256').update(PIN_ENCRYPTION_KEY).digest();
}

export function encryptPin(code: string): string | undefined {
  const key = deriveKey();
  if (!key) return undefined;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPin(cipherText: string): string | null {
  const key = deriveKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(cipherText, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function isPinEncryptionConfigured(): boolean {
  return PIN_ENCRYPTION_KEY.length > 0;
}
