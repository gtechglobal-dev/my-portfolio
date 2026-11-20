import { Db, Collection, ObjectId } from 'mongodb';
import {
  CategoryDoc, ProductDoc, OrderDoc, CustomerDoc, SchoolIntegrationDoc,
  LaunchTokenDoc, WebhookEventDoc, PinBatchDoc, PinDoc, PinRedemptionDoc,
  FulfilmentRecordDoc,
} from './types.js';

let db: Db | null = null;

export function initMarketplaceDb(database: Db): void {
  db = database;
}

function col<T extends object>(name: string): Collection<any> | null {
  return db ? db.collection<T & { _id?: ObjectId }>(name) : null;
}

function strip<T extends { _id?: ObjectId }>(doc: T | null): Omit<T, '_id'> | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as Omit<T, '_id'>;
}

export async function ensureMarketplaceIndexes(database: Db): Promise<void> {
  db = database;
  await Promise.all([
    database.collection('mp_categories').createIndex({ slug: 1 }, { unique: true }),
    database.collection('mp_products').createIndex({ slug: 1 }, { unique: true }),
    database.collection('mp_products').createIndex({ type: 1, active: 1 }),
    database.collection('mp_orders').createIndex({ reference: 1 }, { unique: true }),
    database.collection('mp_orders').createIndex({ 'payment.reference': 1 }, { unique: true, sparse: true }),
    database.collection('mp_orders').createIndex({ 'customer.email': 1, createdAt: -1 }),
    database.collection('mp_customers').createIndex({ email: 1 }, { unique: true }),
    database.collection('mp_school_integrations').createIndex({ apiKeyHash: 1 }, { unique: true }),
    database.collection('mp_launch_tokens').createIndex({ tokenHash: 1 }, { unique: true }),
    database.collection('mp_webhook_events').createIndex({ id: 1 }, { unique: true }),
    database.collection('mp_pin_batches').createIndex({ id: 1 }, { unique: true }),
    database.collection('mp_pins').createIndex({ codeHash: 1 }, { unique: true }),
    database.collection('mp_pins').createIndex({ status: 1, batchId: 1 }),
    database.collection('mp_pins').createIndex({ orderId: 1 }),
    database.collection('mp_redemptions').createIndex({ pinId: 1, createdAt: -1 }),
    database.collection('mp_fulfilments').createIndex({ orderId: 1 }),
  ]);
}

export async function getCategories(activeOnly = true): Promise<CategoryDoc[]> {
  const c = col<CategoryDoc>('mp_categories');
  if (!c) return [];
  const docs = await c.find(activeOnly ? { active: true } : {}).sort({ name: 1 }).toArray();
  return docs.map(({ _id, ...rest }) => rest as CategoryDoc);
}

export async function getCategory(id: string): Promise<CategoryDoc | null> {
  const c = col<CategoryDoc>('mp_categories');
  return strip(await c?.findOne({ id } as any) ?? null) as CategoryDoc | null;
}

export async function putCategory(doc: CategoryDoc): Promise<void> {
  const c = col<CategoryDoc>('mp_categories');
  if (!c) throw new Error('Database not connected');
  await c.replaceOne({ id: doc.id } as any, doc as any, { upsert: true });
}

export async function getProducts(filter: Record<string, unknown> = {}): Promise<ProductDoc[]> {
  const c = col<ProductDoc>('mp_products');
  if (!c) return [];
  const docs = await c.find(filter as any).sort({ featured: -1, createdAt: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => rest as ProductDoc);
}

export async function getProduct(idOrSlug: string): Promise<ProductDoc | null> {
  const c = col<ProductDoc>('mp_products');
  if (!c) return null;
  const doc = await c.findOne({ $or: [{ id: idOrSlug }, { slug: idOrSlug }] } as any);
  return strip(doc) as ProductDoc | null;
}

export async function putProduct(doc: ProductDoc): Promise<void> {
  const c = col<ProductDoc>('mp_products');
  if (!c) throw new Error('Database not connected');
  await c.replaceOne({ id: doc.id } as any, doc as any, { upsert: true });
}

export async function getAvailablePinCount(session?: string): Promise<number> {
  const c = col<PinDoc>('mp_pins');
  if (!c) return 0;
  const filter: Record<string, unknown> = { status: 'available' };
  if (session) filter.session = session;
  return c.countDocuments(filter as any);
}

export async function getOrder(idOrRef: string): Promise<OrderDoc | null> {
  const c = col<OrderDoc>('mp_orders');
  if (!c) return null;
  const doc = await c.findOne({ $or: [{ id: idOrRef }, { reference: idOrRef }] } as any);
  return strip(doc) as OrderDoc | null;
}

export async function getOrderByPaymentReference(ref: string): Promise<OrderDoc | null> {
  const c = col<OrderDoc>('mp_orders');
  return strip(await c?.findOne({ 'payment.reference': ref } as any) ?? null) as OrderDoc | null;
}

export async function getOrders(filter: Record<string, unknown> = {}, limit = 500): Promise<OrderDoc[]> {
  const c = col<OrderDoc>('mp_orders');
  if (!c) return [];
  const docs = await c.find(filter as any).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(({ _id, ...rest }) => rest as OrderDoc);
}

export async function putOrder(doc: OrderDoc): Promise<void> {
  const c = col<OrderDoc>('mp_orders');
  if (!c) throw new Error('Database not connected');
  await c.replaceOne({ id: doc.id } as any, doc as any, { upsert: true });
}

export async function getCustomer(email: string): Promise<CustomerDoc | null> {
  const c = col<CustomerDoc>('mp_customers');
  return strip(await c?.findOne({ email: email.toLowerCase() } as any) ?? null) as CustomerDoc | null;
}

export async function putCustomer(doc: CustomerDoc): Promise<void> {
  const c = col<CustomerDoc>('mp_customers');
  if (!c) throw new Error('Database not connected');
  await c.replaceOne({ email: doc.email } as any, doc as any, { upsert: true });
}

export async function getSchoolIntegration(id: string): Promise<SchoolIntegrationDoc | null> {
  const c = col<SchoolIntegrationDoc>('mp_school_integrations');
  return strip(await c?.findOne({ id } as any) ?? null) as SchoolIntegrationDoc | null;
}

export async function getSchoolByApiKeyHash(hash: string): Promise<SchoolIntegrationDoc | null> {
  const c = col<SchoolIntegrationDoc>('mp_school_integrations');
  return strip(await c?.findOne({ apiKeyHash: hash, active: true } as any) ?? null) as SchoolIntegrationDoc | null;
}

export async function putSchoolIntegration(doc: SchoolIntegrationDoc): Promise<void> {
  const c = col<SchoolIntegrationDoc>('mp_school_integrations');
  if (!c) throw new Error('Database not connected');
  await c.replaceOne({ id: doc.id } as any, doc as any, { upsert: true });
}

export async function getLaunchToken(hash: string): Promise<LaunchTokenDoc | null> {
  const c = col<LaunchTokenDoc>('mp_launch_tokens');
  return strip(await c?.findOne({ tokenHash: hash } as any) ?? null) as LaunchTokenDoc | null;
}

export async function putLaunchToken(doc: LaunchTokenDoc): Promise<void> {
  const c = col<LaunchTokenDoc>('mp_launch_tokens');
  if (!c) throw new Error('Database not connected');
  await c.insertOne(doc as any);
}

export async function markLaunchTokenUsed(hash: string): Promise<boolean> {
  const c = col<LaunchTokenDoc>('mp_launch_tokens');
  if (!c) return false;
  const result = await c.updateOne({ tokenHash: hash, usedAt: { $exists: false } } as any, { $set: { usedAt: new Date().toISOString() } });
  return result.modifiedCount > 0;
}

export async function getWebhookEvent(id: string): Promise<WebhookEventDoc | null> {
  const c = col<WebhookEventDoc>('mp_webhook_events');
  return strip(await c?.findOne({ id } as any) ?? null) as WebhookEventDoc | null;
}

export async function putWebhookEvent(doc: WebhookEventDoc): Promise<void> {
  const c = col<WebhookEventDoc>('mp_webhook_events');
  if (!c) throw new Error('Database not connected');
  try {
    await c.insertOne(doc as any);
  } catch (err: any) {
    if (err.code !== 11000) throw err;
  }
}

export async function putPinBatch(doc: PinBatchDoc): Promise<void> {
  const c = col<PinBatchDoc>('mp_pin_batches');
  if (!c) throw new Error('Database not connected');
  await c.insertOne(doc as any);
}

export async function getPinBatches(): Promise<PinBatchDoc[]> {
  const c = col<PinBatchDoc>('mp_pin_batches');
  if (!c) return [];
  const docs = await c.find().sort({ createdAt: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => rest as PinBatchDoc);
}

export async function insertPins(pins: PinDoc[]): Promise<void> {
  const c = col<PinDoc>('mp_pins');
  if (!c || pins.length === 0) throw new Error('Database not connected');
  await c.insertMany(pins as any, { ordered: false });
}

export async function getPins(filter: Record<string, unknown> = {}, limit = 500): Promise<PinDoc[]> {
  const c = col<PinDoc>('mp_pins');
  if (!c) return [];
  const docs = await c.find(filter as any).sort({ createdAt: 1 }).limit(limit).toArray();
  return docs.map(({ _id, ...rest }) => rest as PinDoc);
}

export async function getPinByCodeHash(hash: string): Promise<PinDoc | null> {
  const c = col<PinDoc>('mp_pins');
  return strip(await c?.findOne({ codeHash: hash } as any) ?? null) as PinDoc | null;
}

export async function atomicAllocatePins(orderId: string, count: number, session?: string): Promise<PinDoc[]> {
  const c = col<PinDoc>('mp_pins');
  if (!c) throw new Error('Database not connected');
  const filter: Record<string, unknown> = { status: 'available' };
  if (session) filter.session = session;
  const docs = await c.find(filter as any).sort({ createdAt: 1 }).limit(count).toArray();
  if (docs.length < count) throw new Error('INSUFFICIENT_INVENTORY');
  const ids = docs.map((d) => d._id);
  const result = await c.updateMany(
    { _id: { $in: ids }, status: 'available' } as any,
    { $set: { status: 'reserved', reservedFor: orderId } },
  );
  if (result.modifiedCount !== count) throw new Error('ALLOCATION_CONFLICT');
  return docs.map(({ _id, ...rest }) => rest as PinDoc);
}

export async function markPinsSold(orderId: string, schoolId?: string | null): Promise<void> {
  const c = col<PinDoc>('mp_pins');
  if (!c) throw new Error('Database not connected');
  await c.updateMany(
    { reservedFor: orderId, status: 'reserved' } as any,
    { $set: { status: 'sold', orderId, schoolAtPurchase: schoolId || null, soldAt: new Date().toISOString(), $unset: { reservedFor: '' } } },
  );
}

export async function releasePins(orderId: string): Promise<void> {
  const c = col<PinDoc>('mp_pins');
  if (!c) return;
  await c.updateMany(
    { reservedFor: orderId, status: 'reserved' } as any,
    { $set: { status: 'available' }, $unset: { reservedFor: '' } },
  );
}

export async function revokePin(pinId: string): Promise<boolean> {
  const c = col<PinDoc>('mp_pins');
  if (!c) return false;
  const result = await c.updateOne({ id: pinId, status: { $ne: 'revoked' } } as any, { $set: { status: 'revoked', revokedAt: new Date().toISOString() } });
  return result.modifiedCount > 0;
}

export interface ConsumeResult { ok: boolean; reason?: string; usedCount?: number; remaining?: number; }

export async function consumePinAtomic(pinId: string, session: string, usageLimit: number): Promise<ConsumeResult> {
  const c = col<PinDoc>('mp_pins');
  if (!c) return { ok: false, reason: 'DB_UNAVAILABLE' };
  const sessionKey = session.replace(/[^A-Za-z0-9]/g, '_');
  const key = `usage.${sessionKey}`;
  const doc = await c.findOne({ id: pinId } as any);
  if (!doc) return { ok: false, reason: 'INVALID_PIN' };
  if (doc.status !== 'available' && doc.status !== 'sold') return { ok: false, reason: 'PIN_INACTIVE' };
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return { ok: false, reason: 'PIN_EXPIRED' };
  const current = (doc as any).usage?.[sessionKey] || 0;
  const limit = Math.min(usageLimit, doc.usageLimit);
  if (current >= limit) return { ok: false, reason: 'USAGE_LIMIT' };
  const result = await c.findOneAndUpdate(
    { id: pinId, $or: [{ [key]: { $lt: limit } }, { [key]: { $exists: false } }] } as any,
    { $inc: { [key]: 1, usedCount: 1 } },
    { returnDocument: 'after' },
  );
  if (!result) return { ok: false, reason: 'USAGE_LIMIT' };
  const used = (result as any).usage?.[sessionKey] || 1;
  return { ok: true, usedCount: used, remaining: Math.max(0, limit - used) };
}

export async function putRedemption(doc: PinRedemptionDoc): Promise<void> {
  const c = col<PinRedemptionDoc>('mp_redemptions');
  if (!c) throw new Error('Database not connected');
  await c.insertOne(doc as any);
}

export async function getRedemptions(filter: Record<string, unknown> = {}, limit = 500): Promise<PinRedemptionDoc[]> {
  const c = col<PinRedemptionDoc>('mp_redemptions');
  if (!c) return [];
  const docs = await c.find(filter as any).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(({ _id, ...rest }) => rest as PinRedemptionDoc);
}

export async function putFulfilment(doc: FulfilmentRecordDoc): Promise<void> {
  const c = col<FulfilmentRecordDoc>('mp_fulfilments');
  if (!c) throw new Error('Database not connected');
  await c.replaceOne({ id: doc.id } as any, doc as any, { upsert: true });
}

export async function getFulfilments(orderId: string): Promise<FulfilmentRecordDoc[]> {
  const c = col<FulfilmentRecordDoc>('mp_fulfilments');
  if (!c) return [];
  const docs = await c.find({ orderId } as any).toArray();
  return docs.map(({ _id, ...rest }) => rest as FulfilmentRecordDoc);
}

export async function pinStats(): Promise<Record<string, number>> {
  const c = col<PinDoc>('mp_pins');
  if (!c) return {};
  const rows = await c.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]).toArray();
  const result: Record<string, number> = {};
  for (const row of rows) result[String(row._id)] = row.count;
  return result;
}
