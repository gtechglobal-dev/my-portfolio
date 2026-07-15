import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const isServerless = process.env.VERCEL === '1' || process.env.NETLIFY === 'true' || process.env.RENDER === 'true' || process.env.LAMBDA_TASK_ROOT !== undefined;
const DATA_DIR = isServerless
  ? join('/tmp', 'data')
  : join(process.cwd(), 'data');
const BOOKINGS_FILE = join(DATA_DIR, 'bookings.json');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');
const GRAPHICS_FILE = join(DATA_DIR, 'graphics.json');

function ensureFile(file: string, initial: string) {
  if (!existsSync(file)) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(file, initial, 'utf-8');
  }
}

ensureFile(BOOKINGS_FILE, '[]');
ensureFile(MESSAGES_FILE, '[]');
ensureFile(GRAPHICS_FILE, '[]');

export interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCountry: string;
  serviceCategory: 'web-development' | 'graphics-design';
  package: string;
  description: string;
  sampleImage?: string;
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

export interface GraphicsDesign {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  color: string;
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

export function readGraphics(): GraphicsDesign[] {
  try {
    return JSON.parse(readFileSync(GRAPHICS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeGraphics(graphics: GraphicsDesign[]) {
  writeFileSync(GRAPHICS_FILE, JSON.stringify(graphics, null, 2), 'utf-8');
}
