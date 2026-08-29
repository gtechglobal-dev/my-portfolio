import { MongoClient, Collection, ObjectId } from 'mongodb';

const DB_NAME = 'gtech-portfolio';

let client: MongoClient | null = null;
let db: ReturnType<MongoClient['db']> | null = null;

export async function connectDB(): Promise<void> {
  if (db) return;
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set — data will not persist');
    return;
  }
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);
    const bookingCount = await db.collection('bookings').countDocuments();
    console.log(`Existing bookings in DB: ${bookingCount}`);
  } catch (err: any) {
    console.error('MongoDB connection failed:', err.message);
    db = null;
  }
}

export function isDbConnected(): boolean {
  return db !== null;
}

function getCollection<T extends { _id?: ObjectId }>(name: string): Collection<T> | null {
  return db ? db.collection<T>(name) : null;
}

// ─── Booking ───────────────────────────────────────────────

export interface Booking {
  _id?: ObjectId;
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCountry: string;
  serviceCategory: 'web-development' | 'graphics-design';
  package: string;
  description: string;
  sampleImages?: string[];
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  createdAt: string;
}

export async function readBookings(): Promise<Booking[]> {
  const col = getCollection<Booking>('bookings');
  if (!col) return [];
  const docs = await col.find().sort({ createdAt: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => rest);
}

export async function writeBooking(booking: Booking): Promise<void> {
  const col = getCollection<Booking>('bookings');
  if (!col) throw new Error('Database not connected');
  await col.insertOne(booking as any);
}

export async function updateBooking(id: string, update: Partial<Booking>): Promise<Booking | null> {
  const col = getCollection<Booking>('bookings');
  if (!col) return null;
  const doc = await col.findOneAndUpdate(
    { id },
    { $set: update },
    { returnDocument: 'after' },
  );
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const col = getCollection<Booking>('bookings');
  if (!col) return false;
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

// ─── Message ───────────────────────────────────────────────

export interface Message {
  _id?: ObjectId;
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export async function readMessages(): Promise<Message[]> {
  const col = getCollection<Message>('messages');
  if (!col) return [];
  const docs = await col.find().sort({ createdAt: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => rest);
}

export async function writeMessage(msg: Message): Promise<void> {
  const col = getCollection<Message>('messages');
  if (!col) throw new Error('Database not connected');
  await col.insertOne(msg as any);
}

export async function markMessageRead(id: string): Promise<boolean> {
  const col = getCollection<Message>('messages');
  if (!col) return false;
  const result = await col.updateOne({ id }, { $set: { read: true } });
  return result.modifiedCount > 0;
}

// ─── Stats helper (used by admin) ──────────────────────────

export async function getBookings(): Promise<Booking[]> {
  return readBookings();
}

export async function getMessages(): Promise<Message[]> {
  return readMessages();
}

// ─── Book (QR verification) ────────────────────────────────

export interface Book {
  _id?: ObjectId;
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher: string;
  year?: string;
  edition?: string;
  description: string;
  category: string;
  createdAt: string;
}

export async function readBooks(): Promise<Book[]> {
  const col = getCollection<Book>('books');
  if (!col) return [];
  const docs = await col.find().sort({ createdAt: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => rest);
}

export async function findBook(id: string): Promise<Book | null> {
  const col = getCollection<Book>('books');
  if (!col) return null;
  const doc = await col.findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function writeBook(book: Book): Promise<void> {
  const col = getCollection<Book>('books');
  if (!col) throw new Error('Database not connected');
  await col.insertOne(book as any);
}

export async function deleteBook(id: string): Promise<boolean> {
  const col = getCollection<Book>('books');
  if (!col) return false;
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

// ─── QR Code ───────────────────────────────────────────────

export interface QrCode {
  _id?: ObjectId;
  id: string;
  code: string;
  serial: string;
  bookId: string;
  bookTitle: string;
  status: 'pending' | 'active' | 'revoked';
  flagged?: boolean;
  flagReason?: string | null;
  flaggedAt?: string | null;
  activatedAt: string | null;
  verifyCount?: number;
  lastVerifiedAt?: string | null;
  recentScans?: Array<{ ip: string; at: string }>;
  createdAt: string;
}

export async function readQrCodes(filter?: Partial<QrCode>): Promise<QrCode[]> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return [];
  const query: Record<string, any> = {};
  if (filter?.bookId) query.bookId = filter.bookId;
  if (filter?.status) query.status = filter.status;
  const docs = await col.find(query).sort({ createdAt: 1 }).toArray();
  return docs.map(({ _id, ...rest }) => rest);
}

export async function findQrCode(code: string): Promise<QrCode | null> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return null;
  const doc = await col.findOne({ code });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function writeQrCode(q: QrCode): Promise<void> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) throw new Error('Database not connected');
  await col.insertOne({
    ...q,
    flagged: q.flagged ?? false,
    flagReason: q.flagReason ?? null,
    flaggedAt: q.flaggedAt ?? null,
    verifyCount: q.verifyCount ?? 0,
    lastVerifiedAt: q.lastVerifiedAt ?? null,
    recentScans: q.recentScans ?? [],
  } as any);
}

export async function activateQrCode(code: string): Promise<QrCode | null> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return null;
  const doc = await col.findOneAndUpdate(
    { code },
    { $set: { status: 'active', activatedAt: new Date().toISOString() } },
    { returnDocument: 'after' },
  );
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function revokeQrCode(code: string): Promise<QrCode | null> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return null;
  const doc = await col.findOneAndUpdate(
    { code },
    { $set: { status: 'revoked' } },
    { returnDocument: 'after' },
  );
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function deleteQrCode(code: string): Promise<boolean> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return false;
  const result = await col.deleteOne({ code });
  return result.deletedCount > 0;
}

const SUSPICION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_WINDOW_SCANS = 10;

export async function recordVerification(code: string, ip: string): Promise<QrCode | null> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return null;
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const scan = { ip, at: now };

  const doc = await col.findOne({ code });
  if (!doc) return null;

  const recent = (doc.recentScans || [])
    .filter((s) => nowMs - new Date(s.at).getTime() <= SUSPICION_WINDOW_MS);
  recent.push(scan);
  const capped = recent.slice(-10);

  const distinctIps = new Set(capped.map((s) => s.ip)).size;
  const scanCount = capped.length;

  const becameFlagged = !doc.flagged && (distinctIps >= 2 || scanCount >= MAX_WINDOW_SCANS);

  const set: Record<string, any> = {
    verifyCount: (doc.verifyCount || 0) + 1,
    lastVerifiedAt: now,
    recentScans: capped,
  };
  if (becameFlagged) {
    set.flagged = true;
    set.flagReason =
      distinctIps >= 2
        ? 'This serial was scanned from multiple locations within a short time — possible unauthorized duplicate.'
        : 'Unusually high number of scans detected for this serial — possible unauthorized duplicate.';
    set.flaggedAt = now;
  }

  const updated = await col.findOneAndUpdate(
    { code },
    { $set: set },
    { returnDocument: 'after' },
  );
  if (!updated) return null;
  const { _id, ...rest } = updated;
  return rest;
}

export async function deleteQrCodesByBook(bookId: string): Promise<number> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return 0;
  const result = await col.deleteMany({ bookId });
  return result.deletedCount || 0;
}
