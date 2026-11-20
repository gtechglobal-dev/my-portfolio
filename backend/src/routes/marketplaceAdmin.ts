import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { isDbConnected, getDb } from '../db.js';
import {
  getCategories, putCategory, getProducts, getProduct, putProduct,
  getOrders, getOrder, putOrder, getPins, getPinBatches, putPinBatch,
  insertPins, revokePin, getRedemptions, pinStats, getSchoolIntegration,
  putSchoolIntegration,
} from '../marketplace/store.js';
import {
  makeId, makePinCode, hashPin, generateApiKey, hashApiKey,
  type CategoryDoc, type ProductDoc, type PinDoc, type PinBatchDoc,
} from '../marketplace/types.js';
import { isPinEncryptionConfigured, encryptPin } from '../marketplace/pinCrypto.js';
import { retryOrderFulfilment } from '../marketplace/payment.js';

const router = Router();
router.use(authMiddleware);

function requireDb(_req: Request, res: Response, next: any) {
  if (!isDbConnected()) return res.status(503).json({ error: 'Database unavailable' });
  next();
}
router.use(requireDb);

router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const orders = await getOrders({}, 10000);
    const paid = orders.filter((o) => o.payment.status === 'success');
    const pins = await pinStats();
    const products = await getProducts();
    const byProduct: Record<string, number> = {};
    const bySchool: Record<string, number> = {};
    let pinRevenue = 0;
    let otherRevenue = 0;
    for (const o of paid) {
      for (const item of o.items) byProduct[item.name] = (byProduct[item.name] || 0) + item.total;
      if (o.schoolName) bySchool[o.schoolName] = (bySchool[o.schoolName] || 0) + o.total;
      if (o.items.some((i) => i.type === 'DIGITAL_PIN')) pinRevenue += o.total;
      else otherRevenue += o.total;
    }
    const daily: Record<string, number> = {};
    for (const o of paid) {
      const day = (o.payment.paidAt || o.createdAt).slice(0, 10);
      daily[day] = (daily[day] || 0) + o.total;
    }
    res.json({
      totalSales: paid.length,
      totalRevenue: paid.reduce((s, o) => s + o.total, 0),
      pinRevenue,
      otherRevenue,
      pendingOrders: orders.filter((o) => ['pending', 'awaiting_payment'].includes(o.status)).length,
      failedPayments: orders.filter((o) => o.payment.status === 'failed').length,
      successfulOrders: paid.length,
      pinsSold: (pins.sold || 0) + (pins.redeemed || 0),
      availablePins: pins.available || 0,
      reservedPins: pins.reserved || 0,
      redeemedPins: pins.redeemed || 0,
      unusedPins: pins.sold || 0,
      revokedPins: pins.revoked || 0,
      expiredPins: pins.expired || 0,
      productCount: products.length,
      salesByProduct: byProduct,
      salesBySchool: bySchool,
      salesTrend: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

router.get('/categories', async (_req: Request, res: Response) => {
  res.json({ categories: await getCategories(false) });
});

router.post('/categories', async (req: Request, res: Response) => {
  const { name, slug, description, icon, active } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  const doc: CategoryDoc = {
    id: makeId(), name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    description, icon, active: active !== false, createdAt: new Date().toISOString(),
  };
  try {
    await putCategory(doc);
    res.status(201).json({ category: doc });
  } catch (err: any) {
    res.status(400).json({ error: err.code === 11000 ? 'Slug already exists' : 'Failed to save' });
  }
});

router.get('/products', async (_req: Request, res: Response) => {
  res.json({ products: await getProducts() });
});

router.post('/products', async (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name || !body.slug || !body.price) return res.status(400).json({ error: 'Name, slug and price required' });
  const now = new Date().toISOString();
  const product: ProductDoc = {
    id: makeId(),
    categoryId: body.categoryId,
    type: body.type || 'DIGITAL_PIN',
    name: body.name,
    slug: String(body.slug).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    description: body.description || '',
    shortDescription: body.shortDescription,
    image: body.image,
    price: Number(body.price),
    currency: 'NGN',
    minQty: Number(body.minQty) || 1,
    maxQty: Number(body.maxQty) || 500,
    bulkPricing: Array.isArray(body.bulkPricing) ? body.bulkPricing : [],
    available: body.available !== false,
    featured: !!body.featured,
    instructions: body.instructions,
    session: body.session,
    validityDays: body.validityDays ? Number(body.validityDays) : undefined,
    usageLimit: body.usageLimit ? Number(body.usageLimit) : 3,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await putProduct(product);
    res.status(201).json({ product });
  } catch (err: any) {
    res.status(400).json({ error: err.code === 11000 ? 'Slug already exists' : 'Failed to save' });
  }
});

router.patch('/products/:id', async (req: Request, res: Response) => {
  const product = await getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updated: ProductDoc = { ...product, ...req.body, id: product.id, updatedAt: new Date().toISOString() };
  await putProduct(updated);
  res.json({ product: updated });
});

router.get('/orders', async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.schoolId) filter.schoolId = req.query.schoolId;
  if (req.query.search) {
    const q = String(req.query.search);
    const all = await getOrders(filter, 10000);
    return res.json({ orders: all.filter((o) => o.reference.includes(q) || o.customer.email.includes(q) || o.customer.name.toLowerCase().includes(q.toLowerCase())) });
  }
  res.json({ orders: await getOrders(filter) });
});

router.post('/orders/:ref/retry', async (req: Request, res: Response) => {
  const order = await getOrder(req.params.ref);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  try {
    await retryOrderFulfilment(order.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pins', async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.batchId) filter.batchId = req.query.batchId;
  res.json({ pins: await getPins(filter, 10000) });
});

router.post('/pin-batches', async (req: Request, res: Response) => {
  const count = Math.min(Math.max(Number(req.body.count) || 1, 1), 5000);
  if (!isPinEncryptionConfigured()) {
    return res.status(500).json({ error: 'PIN_ENCRYPTION_KEY must be configured before generating PINs' });
  }
  const now = new Date().toISOString();
  const batch: PinBatchDoc = {
    id: makeId(),
    name: req.body.name || `Batch ${new Date().toLocaleDateString()}`,
    count,
    prefix: 'GT',
    session: req.body.session,
    validityDays: req.body.validityDays ? Number(req.body.validityDays) : undefined,
    usageLimit: Number(req.body.usageLimit) || 3,
    createdBy: (req as AuthRequest).admin?.username || 'admin',
    createdAt: now,
  };
  const codes = new Set<string>();
  while (codes.size < count) codes.add(makePinCode());
  const expiresAt = batch.validityDays
    ? new Date(Date.now() + batch.validityDays * 86400000).toISOString()
    : undefined;
  const pins: PinDoc[] = [...codes].map((code) => ({
    id: makeId(),
    codeHash: hashPin(code),
    codeCipher: encryptPin(code),
    codeLast4: code.slice(-4),
    batchId: batch.id,
    status: 'available',
    session: batch.session,
    usageLimit: batch.usageLimit,
    usedCount: 0,
    expiresAt,
    createdAt: now,
  }));
  try {
    await putPinBatch(batch);
    await insertPins(pins);
    res.status(201).json({ batch, count: pins.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate PIN batch' });
  }
});

router.get('/pin-batches', async (_req: Request, res: Response) => {
  res.json({ batches: await getPinBatches() });
});

router.post('/pins/:id/revoke', async (req: Request, res: Response) => {
  const ok = await revokePin(req.params.id);
  res.json({ success: ok });
});

router.get('/redemptions', async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.pinId) filter.pinId = req.query.pinId;
  if (req.query.schoolId) filter.schoolId = req.query.schoolId;
  res.json({ redemptions: await getRedemptions(filter) });
});

router.get('/schools', async (_req: Request, res: Response) => {
  const db = getDb();
  const orders = await getOrders({}, 10000);
  const schools = db ? await db.collection('mp_school_integrations').find().toArray() : [];
  res.json({
    schools: schools.map(({ _id, apiKeyHash, ...s }: any) => {
      const schoolOrders = orders.filter((o) => o.schoolId === s.id && o.payment.status === 'success');
      return { ...s, purchaseCount: schoolOrders.length, totalPurchaseValue: schoolOrders.reduce((sum, o) => sum + o.total, 0) };
    }),
  });
});

router.post('/schools', async (req: Request, res: Response) => {
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'School name required' });
  const apiKey = generateApiKey('gts');
  const doc = {
    id: makeId(), name, apiKeyHash: hashApiKey(apiKey), prefix: 'gts',
    active: true, permissions: permissions || ['launch', 'verify', 'sync'],
    createdAt: new Date().toISOString(),
  };
  await putSchoolIntegration(doc);
  res.status(201).json({ school: { id: doc.id, name: doc.name, active: doc.active }, apiKey });
});

router.post('/schools/:id/rotate', async (req: Request, res: Response) => {
  const school = await getSchoolIntegration(req.params.id);
  if (!school) return res.status(404).json({ error: 'School not found' });
  const apiKey = generateApiKey('gts');
  await putSchoolIntegration({ ...school, apiKeyHash: hashApiKey(apiKey), rotatedAt: new Date().toISOString() });
  res.json({ apiKey });
});

router.post('/schools/:id/revoke', async (req: Request, res: Response) => {
  const school = await getSchoolIntegration(req.params.id);
  if (!school) return res.status(404).json({ error: 'School not found' });
  await putSchoolIntegration({ ...school, active: false, revokedAt: new Date().toISOString() });
  res.json({ success: true });
});

export default router;
