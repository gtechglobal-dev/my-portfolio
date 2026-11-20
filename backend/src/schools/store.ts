import { Db, Collection } from 'mongodb';
import { getDb, isDbConnected } from '../db.js';
import * as T from './types.js';

const COLLECTIONS = [
  'sc_applications', 'sc_packages', 'sc_faqs', 'sc_clients', 'sc_proposals',
  'sc_agreements', 'sc_projects', 'sc_milestones', 'sc_payments', 'sc_onboarding',
  'sc_invitations', 'sc_submissions', 'sc_student_imports', 'sc_documents', 'sc_files',
  'sc_notifications', 'sc_messages', 'sc_issues', 'sc_trainings', 'sc_handovers',
  'sc_activity', 'sc_settings', 'sc_webhook_events',
] as const;

export async function ensureSchoolIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('sc_applications').createIndex({ reference: 1 }, { unique: true }),
    db.collection('sc_applications').createIndex({ status: 1, createdAt: -1 }),
    db.collection('sc_packages').createIndex({ slug: 1 }, { unique: true }),
    db.collection('sc_clients').createIndex({ email: 1 }, { unique: true }),
    db.collection('sc_proposals').createIndex({ reference: 1 }, { unique: true }),
    db.collection('sc_proposals').createIndex({ clientTokenHash: 1 }, { unique: true }),
    db.collection('sc_agreements').createIndex({ reference: 1 }, { unique: true }),
    db.collection('sc_agreements').createIndex({ clientTokenHash: 1 }, { unique: true }),
    db.collection('sc_projects').createIndex({ reference: 1 }, { unique: true }),
    db.collection('sc_projects').createIndex({ clientId: 1 }),
    db.collection('sc_milestones').createIndex({ projectId: 1, sortOrder: 1 }),
    db.collection('sc_payments').createIndex({ reference: 1 }, { unique: true }),
    db.collection('sc_payments').createIndex({ paystackReference: 1 }, { unique: true, sparse: true }),
    db.collection('sc_invitations').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('sc_invitations').createIndex({ projectId: 1 }),
    db.collection('sc_documents').createIndex({ projectId: 1, clientVisible: 1 }),
    db.collection('sc_files').createIndex({ documentId: 1 }, { unique: true }),
    db.collection('sc_notifications').createIndex({ clientId: 1, createdAt: -1 }),
    db.collection('sc_messages').createIndex({ projectId: 1, createdAt: -1 }),
    db.collection('sc_webhook_events').createIndex({ id: 1 }, { unique: true }),
  ]);
}

function collection(name: string): Collection<any> | null {
  const db = getDb();
  return db ? db.collection(name) : null;
}

export function requireDb(): void {
  if (!isDbConnected()) throw new Error('DB_UNAVAILABLE');
}

export async function findAll<T>(name: string, filter: Record<string, unknown> = {}, sort: Record<string, 1 | -1> = { createdAt: -1 }, limit = 5000): Promise<T[]> {
  const c = collection(name);
  if (!c) return [];
  const docs = await c.find(filter as any).sort(sort as any).limit(limit).toArray();
  return docs.map(({ _id, ...rest }: any) => rest as T);
}

export async function findOne<T>(name: string, filter: Record<string, unknown>): Promise<T | null> {
  const c = collection(name);
  if (!c) return null;
  const doc = await c.findOne(filter as any);
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return rest as T;
}

export async function insert<T extends object>(name: string, doc: T): Promise<T> {
  requireDb();
  await collection(name)!.insertOne(doc as any);
  return doc;
}

export async function upsert<T extends object>(name: string, key: string, doc: T): Promise<T> {
  requireDb();
  await collection(name)!.replaceOne({ [key]: (doc as any)[key] } as any, doc as any, { upsert: true });
  return doc;
}

export async function update<T extends object>(name: string, key: string, id: string, patch: Partial<T>): Promise<T | null> {
  const c = collection(name);
  if (!c) return null;
  const doc = await c.findOneAndUpdate({ [key]: id } as any, { $set: patch as any }, { returnDocument: 'after' });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return rest as T;
}

export async function increment(name: string, key: string, id: string, field: string, amount: number): Promise<void> {
  const c = collection(name);
  if (!c) return;
  await c.updateOne({ [key]: id } as any, { $inc: { [field]: amount } } as any);
}

export async function count(name: string, filter: Record<string, unknown> = {}): Promise<number> {
  const c = collection(name);
  return c ? c.countDocuments(filter as any) : 0;
}

export async function nextRef(prefix: string, collectionName: string): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-`);
  const c = collection(collectionName);
  if (!c) return T.nextSequenceRef(prefix, 1, year);
  const docs = await c.find({ reference: pattern } as any).toArray();
  let max = 0;
  for (const d of docs) {
    const num = parseInt(String((d as any).reference).split('-').pop() || '0', 10);
    if (num > max) max = num;
  }
  return T.nextSequenceRef(prefix, max + 1, year);
}

export async function logActivity(entry: Omit<T.ActivityDoc, 'id' | 'createdAt'>): Promise<void> {
  try {
    await insert('sc_activity', { id: T.makeId(), createdAt: new Date().toISOString(), ...entry });
  } catch { return; }
}

export async function notify(entry: Omit<T.NotificationDoc, 'id' | 'read' | 'createdAt'>): Promise<void> {
  try {
    await insert('sc_notifications', { id: T.makeId(), read: false, createdAt: new Date().toISOString(), ...entry });
  } catch { return; }
}

export async function getSettings(): Promise<T.SettingsDoc> {
  const defaults: T.SettingsDoc = {
    id: 'global',
    contact: { email: 'gtechglobal.dev@gmail.com', phone: '+2347054867749', whatsapp: '2347054867749' },
    brand: { name: 'Gtech Global', tagline: 'Your Ideas. Our Digital Solutions.' },
    privacyPolicy: 'Privacy policy content is managed by Gtech Global administrators.',
    terms: 'Terms and conditions are managed by Gtech Global administrators.',
    agreementTemplate: '',
    depositPercent: 40,
    finalPercent: 60,
    defaultMilestones: [
      { title: 'Initial payment confirmed', weight: 8 },
      { title: 'School information collection', weight: 7 },
      { title: 'School configuration', weight: 10 },
      { title: 'Branding', weight: 7 },
      { title: 'Database configuration', weight: 8 },
      { title: 'Development', weight: 25 },
      { title: 'Internal testing', weight: 8 },
      { title: 'Client testing', weight: 7 },
      { title: 'Corrections', weight: 5 },
      { title: 'Staff training', weight: 5 },
      { title: 'Final payment', weight: 5 },
      { title: 'Production deployment', weight: 4 },
      { title: 'Handover', weight: 1 },
    ],
    fileRestrictions: { maxBytes: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
    updatedAt: new Date().toISOString(),
  };
  return (await findOne<T.SettingsDoc>('sc_settings', { id: 'global' })) || defaults;
}

export async function getPackages(activeOnly = false): Promise<T.PackageDoc[]> {
  const filter = activeOnly ? { active: true } : {};
  return findAll<T.PackageDoc>('sc_packages', filter, { sortOrder: 1 });
}

export async function getFaqs(): Promise<T.FaqDoc[]> {
  return findAll<T.FaqDoc>('sc_faqs', { active: true }, { sortOrder: 1 });
}

export function progressFor(projectId: string, milestones: T.MilestoneDoc[]): number {
  const list = milestones.filter((m) => m.projectId === projectId);
  if (!list.length) return 0;
  const totalWeight = list.reduce((s, m) => s + m.weight, 0);
  if (totalWeight <= 0) return 0;
  const done = list.filter((m) => m.status === 'completed').reduce((s, m) => s + m.weight, 0);
  return Math.round((done / totalWeight) * 100);
}
