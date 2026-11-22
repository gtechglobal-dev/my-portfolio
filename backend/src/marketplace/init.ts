import { isDbConnected } from '../db.js';
import { ensureMarketplaceIndexes, putCategory, putProduct } from './store.js';
import type { CategoryDoc, ProductDoc } from './types.js';

const now = () => new Date().toISOString();

export async function initMarketplace(): Promise<void> {
  if (!isDbConnected()) return;
  const { getDb } = await import('../db.js');
  const db = getDb();
  if (!db) return;

  await ensureMarketplaceIndexes(db);

  const category: CategoryDoc = {
    id: 'result-pins',
    name: 'Result PINs',
    slug: 'result-pins',
    description: 'School-only result-checking PIN packs.',
    icon: 'KeyRound',
    active: true,
    createdAt: now(),
  };
  await putCategory(category);

  const product: ProductDoc = {
    id: 'result-checking-pin',
    categoryId: category.id,
    type: 'DIGITAL_PIN',
    name: 'Result Checking PIN',
    slug: 'result-checking-pin',
    description: 'Standalone result-checking PIN delivered straight into your school result PIN stock.',
    shortDescription: '₦1,000 per PIN · 4 uses · locked to first session and term.',
    price: 1000,
    currency: 'NGN',
    minQty: 1,
    maxQty: 500,
    bulkPricing: [],
    available: true,
    featured: true,
    schoolOnly: true,
    instructions: 'Delivered to the school Admin Result PIN page; copy or download each code after purchase.',
    usageLimit: 4,
    createdAt: now(),
    updatedAt: now(),
  };
  await putProduct(product);
}
