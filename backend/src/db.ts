import { MongoClient, Collection, ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';

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
    await ensureIndexes();
  } catch (err: any) {
    console.error('MongoDB connection failed:', err.message);
    db = null;
  }
}

// Unique indexes guarantee serial numbers and book codes can never repeat —
// enforced at the database level even under concurrent generates.
async function ensureIndexes(): Promise<void> {
  if (!db) return;
  try {
    await db.collection('qrcodes').createIndex({ serial: 1 }, { unique: true });
    await db.collection('qrcodes').createIndex({ code: 1 }, { unique: true });
    await db.collection('books').createIndex({ bookCode: 1 }, { unique: true });
    console.log('Unique indexes ensured on qrcodes.serial / qrcodes.code / books.bookCode');
  } catch (err: any) {
    console.error('Failed to ensure unique indexes:', err.message);
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
  frontCover?: string | null;
  backCover?: string | null;
  /** Unique token encoded in the single QR code printed on every copy of this book. */
  bookCode?: string;
  /** Total number of printed copies recorded in the Sales tab. */
  printedCopies?: number;
  /** Number of copies sold as tracked in the Sales tab. */
  soldCopies?: number;
  /** Selling price per copy (NGN) as set in the Sales tab. */
  price?: number;
  /** Chronological log of every recorded sale (added when a sale is recorded). */
  salesLog?: SaleEntry[];
  createdAt: string;
}

export interface SaleEntry {
  id: string;
  /** Seller / operational staff who recorded the sale. */
  seller: string;
  /** Quantity of copies sold in this transaction. */
  qty: number;
  /** Selling price per copy used for this sale (at the time of the sale). */
  price: number;
  /** Total revenue of the sale (qty * price). */
  revenue: number;
  /** ISO timestamp of when the sale was recorded. */
  date: string;
}

export function makeBookCode(): string {
  return randomBytes(12).toString('hex');
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

export async function findBookByCode(bookCode: string): Promise<Book | null> {
  const col = getCollection<Book>('books');
  if (!col) return null;
  const doc = await col.findOne({ bookCode });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function assignBookCode(id: string): Promise<string> {
  const col = getCollection<Book>('books');
  if (!col) throw new Error('Database not connected');
  // Generate a code that is not already in use by another book.
  let code = makeBookCode();
  while (await col.findOne({ bookCode: code })) {
    code = makeBookCode();
  }
  await col.updateOne({ id }, { $set: { bookCode: code } });
  return code;
}

export async function writeBook(book: Book): Promise<void> {
  const col = getCollection<Book>('books');
  if (!col) throw new Error('Database not connected');
  await col.insertOne(book as any);
}

export async function updateBook(id: string, update: Partial<Book>): Promise<Book | null> {
  const col = getCollection<Book>('books');
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

export async function deleteBook(id: string): Promise<boolean> {
  const col = getCollection<Book>('books');
  if (!col) return false;
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

// Atomically increment the sold count and append a sale-history entry. Returns null
// if the book cannot be found or the database is unavailable.
export async function recordSaleToBook(
  id: string,
  price: number,
  qty: number,
  revenue: number,
  seller: string,
  logId: string,
): Promise<Book | null> {
  const col = getCollection<Book>('books');
  if (!col) return null;
  const entry: SaleEntry = {
    id: logId,
    seller,
    qty,
    price,
    revenue,
    date: new Date().toISOString(),
  };
  const doc = await col.findOneAndUpdate(
    { id },
    { $inc: { soldCopies: qty }, $push: { salesLog: entry as any } },
    { returnDocument: 'after' },
  );
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

// ─── QR Code ───────────────────────────────────────────────

export interface ScanRecord {
  ip: string;
  at: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
  state?: string;
  city?: string;
}

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
  alertSent?: boolean;
  alertAt?: string | null;
  activatedAt: string | null;
  verifyCount?: number;
  lastVerifiedAt?: string | null;
  recentScans?: ScanRecord[];
  locations?: string[];
  devices?: string[];
  flagCombos?: string[];
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

export async function findSerial(serial: string, bookId: string): Promise<QrCode | null> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return null;
  const doc = await col.findOne({ serial, bookId });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function findQrCodeBySerial(serial: string): Promise<QrCode | null> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return null;
  const doc = await col.findOne({ serial });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

// Returns true when the serial already exists in the DB. Used by the generator
// to guarantee a serial is globally unique before inserting it.
export async function serialExists(serial: string): Promise<boolean> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return false;
  return (await col.countDocuments({ serial })) > 0;
}

export async function writeQrCode(q: QrCode): Promise<void> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) throw new Error('Database not connected');
  await col.insertOne({
    ...q,
    flagged: q.flagged ?? false,
    flagReason: q.flagReason ?? null,
    flaggedAt: q.flaggedAt ?? null,
    alertSent: q.alertSent ?? false,
    alertAt: q.alertAt ?? null,
    verifyCount: q.verifyCount ?? 0,
    lastVerifiedAt: q.lastVerifiedAt ?? null,
    recentScans: q.recentScans ?? [],
    locations: q.locations ?? [],
    devices: q.devices ?? [],
    flagCombos: q.flagCombos ?? [],
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

// A serial is flagged as suspicious when it has been verified from this many
// distinct device + location combinations over its lifetime.
const FLAG_DISTINCT_COMBOS = 100;

// An admin alert is fired when the serial has been verified from this many
// distinct locations within the 24-hour window ("many different locations at
// ~the same time", not just many scans).
const ALERT_DISTINCT_LOCATIONS = 50;

const MAX_RECENT_SCANS = 100;

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'Unknown';
  let browser = 'Unknown';
  let os = 'Unknown';

  if (!ua) return { device, browser, os };

  const uaLower = ua.toLowerCase();

  if (uaLower.includes('mobile') || uaLower.includes('android') || uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) {
    device = 'Mobile';
  } else if (uaLower.includes('tablet')) {
    device = 'Tablet';
  } else {
    device = 'Desktop';
  }

  if (uaLower.includes('edg/')) browser = 'Edge';
  else if (uaLower.includes('chrome') || uaLower.includes('crios')) browser = 'Chrome';
  else if (uaLower.includes('firefox') || uaLower.includes('fxios')) browser = 'Firefox';
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari';
  else if (uaLower.includes('opera') || uaLower.includes('opr/')) browser = 'Opera';
  else if (uaLower.includes('samsungbrowser')) browser = 'Samsung Browser';

  if (uaLower.includes('windows')) os = 'Windows';
  else if (uaLower.includes('mac os') || uaLower.includes('macos')) os = 'macOS';
  else if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) os = 'iOS';
  else if (uaLower.includes('android')) os = 'Android';
  else if (uaLower.includes('linux')) os = 'Linux';

  return { device, browser, os };
}

export async function recordVerification(
  code: string,
  ip: string,
  userAgent?: string,
  geo?: { country?: string; state?: string; city?: string }
): Promise<{ record: QrCode | null; shouldAlert: boolean }> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return { record: null, shouldAlert: false };
  const now = new Date().toISOString();
  const nowMs = Date.now();

  const { device, browser, os } = parseUserAgent(userAgent || '');

  const country = geo?.country || 'Unknown';
  const state = geo?.state || 'Unknown';
  const city = geo?.city || 'Unknown';

  // Normalised location key: "State, Country" (e.g. "Lagos, Nigeria")
  const locationKey = [state.trim(), country.trim()].filter(Boolean).join(', ') || 'Unknown';

  // Combo key used to track distinct device + location pairs for flagging
  const comboKey = `${device}|${locationKey}`;

  const scan: ScanRecord = {
    ip,
    at: now,
    userAgent,
    device,
    browser,
    os,
    country,
    state,
    city,
  };

  const doc = await col.findOne({ code });
  if (!doc) return { record: null, shouldAlert: false };

  // Rolling 24h scan history for location-specific alert detection
  const recent = (doc.recentScans || [])
    .filter((s) => nowMs - new Date(s.at).getTime() <= SUSPICION_WINDOW_MS);
  recent.push(scan);
  const capped = recent.slice(-MAX_RECENT_SCANS);

  // Distinct locations (state+country) within the 24h window — for the alert
  const distinctLocationsInWindow = new Set(
    capped
      .map((s) => [s.state, s.country].filter(Boolean).join(', ').trim())
      .filter((k) => k && k !== ',')
  ).size;

  // Lifetime distinct arrays (cumulative, never shrunk)
  const lifetimeLocations = new Set<string>([
    ...(doc.locations || []),
    locationKey,
  ]);

  const lifetimeDevices = new Set<string>([
    ...(doc.devices || []),
    device,
  ]);

  const lifetimeCombos = new Set<string>([
    ...(doc.flagCombos || []),
    comboKey,
  ]);

  const set: Record<string, any> = {
    verifyCount: (doc.verifyCount || 0) + 1,
    lastVerifiedAt: now,
    recentScans: capped,
    locations: Array.from(lifetimeLocations),
    devices: Array.from(lifetimeDevices),
    flagCombos: Array.from(lifetimeCombos),
  };

  // Flag at 100 distinct device + location combos
  const becameFlagged =
    !doc.flagged && lifetimeCombos.size >= FLAG_DISTINCT_COMBOS;

  if (becameFlagged) {
    set.flagged = true;
    set.flagReason =
      `This serial was verified from ${lifetimeCombos.size} different device/location combinations — possible unauthorized duplicate or wide distribution.`;
    set.flaggedAt = now;
  }

  // Admin alert when scanned from 50+ distinct locations in 24h window,
  // and we have not already alerted for this code
  const shouldAlert =
    distinctLocationsInWindow >= ALERT_DISTINCT_LOCATIONS &&
    !doc.alertSent;

  if (shouldAlert) {
    set.alertSent = true;
    set.alertAt = now;
  }

  const updated = await col.findOneAndUpdate(
    { code },
    { $set: set },
    { returnDocument: 'after' },
  );
  if (!updated) return { record: null, shouldAlert: false };
  const { _id, ...rest } = updated;
  return { record: rest, shouldAlert };
}

export async function deleteQrCodesByBook(bookId: string): Promise<number> {
  const col = getCollection<QrCode>('qrcodes');
  if (!col) return 0;
  const result = await col.deleteMany({ bookId });
  return result.deletedCount || 0;
}
