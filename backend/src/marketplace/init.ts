import { isDbConnected } from '../db.js';
import { ensureMarketplaceIndexes } from './store.js';

export async function initMarketplace(): Promise<void> {
  if (!isDbConnected()) return;
  const { getDb } = await import('../db.js');
  const db = getDb();
  if (db) await ensureMarketplaceIndexes(db);
}
