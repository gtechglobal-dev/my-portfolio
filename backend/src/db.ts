import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const isVercel = process.env.VERCEL === '1';
const isNetlify = process.env.NETLIFY === 'true';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = isVercel || isNetlify
  ? join('/tmp', 'data')
  : join(__dirname, '..', 'data');
const BOOKINGS_FILE = join(DATA_DIR, 'bookings.json');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

function ensureFile(file: string, initial: string) {
  if (!existsSync(file)) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(file, initial, 'utf-8');
  }
}

ensureFile(BOOKINGS_FILE, '[]');
ensureFile(MESSAGES_FILE, '[]');

export interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceCategory: 'web-development' | 'graphics-design';
  package: string;
  budget: string;
  description: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function readBookings(): Booking[] {
  try {
    return JSON.parse(readFileSync(BOOKINGS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeBookings(bookings: Booking[]) {
  writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
}

export function readMessages(): Message[] {
  try {
    return JSON.parse(readFileSync(MESSAGES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeMessages(messages: Message[]) {
  writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}
