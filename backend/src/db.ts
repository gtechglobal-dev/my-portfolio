import { MongoClient, Collection, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DB_NAME = 'gtech-portfolio';

let client: MongoClient | null = null;
let db: ReturnType<MongoClient['db']> | null = null;

export async function connectDB(): Promise<void> {
  if (db) return;
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set — data will not persist');
    return;
  }
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);
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
  if (!col) { console.warn('No DB — booking not saved'); return; }
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
  if (!col) { console.warn('No DB — message not saved'); return; }
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
