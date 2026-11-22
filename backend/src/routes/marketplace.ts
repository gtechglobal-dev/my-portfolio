import { Router, Request, Response, NextFunction } from 'express';
import {
  getCategories, getProducts, getProduct, getAvailablePinCount,
  getOrders, getOrder, getOrderByPaymentReference, getCustomer, putCustomer, putOrder,
  getWebhookEvent, putWebhookEvent, putFulfilment, getFulfilments, getPins,
  getSchoolIntegration, getSchoolByApiKeyHash,
} from '../marketplace/store.js';
import {
  makeId, makeReference, paystackSignature, constantTimeEqual,
  generateApiKey, hashApiKey, hashToken, orderReturnSignature, type OrderDoc,
} from '../marketplace/types.js';
import { requireDb, authenticateSchool, resolveLaunchToken, generateMarketplaceToken, verifyCustomerToken, type SchoolAuthRequest } from '../marketplace/auth.js';
import { initializePaystack, verifyPaystack, buildOrder, allocateAndFulfil, retryOrderFulfilment } from '../marketplace/payment.js';
import { isDbConnected } from '../db.js';
import { decryptPin } from '../marketplace/pinCrypto.js';
import { rateLimit } from '../marketplace/rateLimit.js';

const router = Router();

function marketplaceBase(req: Request): string {
  const configured = process.env.MARKETPLACE_PUBLIC_URL
    || process.env.SCHOOL_CLIENT_PUBLIC_URL
    || process.env.RENDER_EXTERNAL_URL
    || '';
  return (configured || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

router.use(requireDb);

router.get('/bootstrap', async (_req: Request, res: Response) => {
  try {
    const token = _req.query.token as string | undefined;
    let school: any = null;
    if (token) {
      const resolved = await resolveLaunchToken(token);
      if (resolved) school = resolved.school;
    }
    const [categories, allProducts] = await Promise.all([getCategories(), getProducts({ available: true })]);
    const products = allProducts.filter((p) => !p.schoolOnly);
    const availablePins = await getAvailablePinCount();
    res.json({
      categories: categories.map((c) => ({ ...c, productCount: products.filter((p) => p.categoryId === c.id).length })),
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        image: p.image,
        price: p.price,
        type: p.type,
        minQty: p.minQty,
        maxQty: p.maxQty,
        availableQty: p.type === 'DIGITAL_PIN' ? availablePins : undefined,
        featured: p.featured,
        categoryId: p.categoryId,
        session: p.session,
        usageLimit: p.usageLimit,
      })),
      school,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load marketplace' });
  }
});

router.post('/orders/quote', async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    const product = await getProduct(productId);
    if (!product || !product.available || product.schoolOnly) return res.status(404).json({ error: 'Product not found' });
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < product.minQty || qty > product.maxQty) {
      return res.status(400).json({ error: `Quantity must be between ${product.minQty} and ${product.maxQty}` });
    }
    const available = product.type === 'DIGITAL_PIN' ? await getAvailablePinCount(product.session) : Infinity;
    if (qty > available) return res.status(400).json({ error: `Only ${available} PINs available` });
    const bulk = [...(product.bulkPricing || [])].sort((a, b) => b.minQty - a.minQty);
    const unitPrice = bulk.find((b) => qty >= b.minQty)?.price ?? product.price;
    res.json({ product: { id: product.id, name: product.name, type: product.type, image: product.image }, quantity: qty, unitPrice, total: unitPrice * qty });
  } catch {
    res.status(500).json({ error: 'Failed to calculate quote' });
  }
});

router.post('/orders', rateLimit(20, 15 * 60 * 1000, 'create-order'), async (req: Request, res: Response) => {
  try {
    const { productId, quantity, customer, token } = req.body;
    if (!productId || !customer?.name || !customer?.email) {
      return res.status(400).json({ error: 'Product, name and email are required' });
    }
    const product = await getProduct(productId);
    if (!product || !product.available || product.schoolOnly) return res.status(404).json({ error: 'Product not found' });
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < product.minQty || qty > product.maxQty) {
      return res.status(400).json({ error: `Quantity must be between ${product.minQty} and ${product.maxQty}` });
    }
    const available = product.type === 'DIGITAL_PIN' ? await getAvailablePinCount(product.session) : Infinity;
    if (qty > available) return res.status(409).json({ error: 'Insufficient inventory' });

    let school: { id: string; name: string; returnUrl?: string } | null = null;
    let launchTokenId: string | null = null;
    if (token) {
      const resolved = await resolveLaunchToken(token, true);
      if (!resolved) return res.status(401).json({ error: 'Marketplace session expired or already used. Please restart from your school dashboard.' });
      school = resolved.school;
      launchTokenId = resolved.tokenHash;
    }

    const order = buildOrder(customer, [{ product, quantity: qty }], school, launchTokenId);
    await putOrder(order);
    const existingCustomer = await getCustomer(order.customer.email);
    if (!existingCustomer) {
      await putCustomer({
        email: order.customer.email,
        name: order.customer.name,
        phone: order.customer.phone,
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    const init = await initializePaystack(order, order.customer.email);
    order.payment.accessCode = init.access_code;
    order.payment.authorizationUrl = init.authorization_url;
    order.status = 'awaiting_payment';
    await putOrder(order);
    res.status(201).json({
      order: {
        reference: order.reference,
        paymentReference: order.payment.reference,
        total: order.total,
        authorizationUrl: init.authorization_url,
        status: order.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message === 'PAYSTACK_NOT_CONFIGURED' ? 'Payment gateway unavailable' : 'Failed to create order' });
  }
});

router.post('/payment/webhook', async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '';
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  const signature = req.headers['x-paystack-signature'];
  if (!secret || typeof signature !== 'string' || !constantTimeEqual(paystackSignature(secret, raw), signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  const event = req.body?.event;
  const reference = req.body?.data?.reference;
  if (!reference) return res.status(400).json({ error: 'Missing reference' });
  const eventId = String(req.body?.data?.id || req.headers['x-paystack-event-id'] || reference);
  const existing = await getWebhookEvent(eventId);
  if (existing) return res.json({ received: true, duplicate: true });

  try {
    if (event === 'charge.success') {
      await putWebhookEvent({ id: eventId, event, reference, status: 'processed', createdAt: new Date().toISOString() });
      await confirmPayment(reference);
    } else {
      await putWebhookEvent({ id: eventId, event, reference, status: 'processed', createdAt: new Date().toISOString() });
    }
    res.json({ received: true });
  } catch (err: any) {
    await putWebhookEvent({ id: eventId, event, reference, status: 'failed', createdAt: new Date().toISOString() });
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function confirmPayment(reference: string): Promise<OrderDoc | null> {
  const order = await getOrderByPaymentReference(reference);
  if (!order) return null;
  if (order.payment.status === 'success' && order.fulfilment?.status === 'delivered') return order;

  const verification = await verifyPaystack(reference);
  if (!verification.verified || verification.amount !== order.total) {
    order.payment.status = verification.status === 'failed' ? 'failed' : 'pending';
    order.status = verification.status === 'failed' ? 'failed' : 'awaiting_payment';
    order.updatedAt = new Date().toISOString();
    await putOrder(order);
    return order;
  }

  order.payment.status = 'success';
  order.payment.paidAt = verification.paidAt;
  order.payment.gatewayResponse = verification.gatewayResponse;
  order.status = 'processing';
  order.updatedAt = new Date().toISOString();
  await putOrder(order);

  let deliveredCodes: string[] = [];
  if (order.fulfilment?.status !== 'delivered') {
    const products = await Promise.all(order.items.map((i) => getProduct(i.productId)));
    const valid = products.filter(Boolean) as any[];
    const { pins } = await allocateAndFulfil(order, valid);
    deliveredCodes = pins
      .map((p) => (p.codeCipher ? decryptPin(p.codeCipher) || '' : ''))
      .filter(Boolean);
    order.fulfilment = { status: 'delivered', deliveredAt: new Date().toISOString(), itemCount: pins.length };
    order.status = 'delivered';
    order.receiptNumber = makeReference('RCP');
  } else {
    const records = await getFulfilments(order.id);
    deliveredCodes = records.flatMap((r) =>
      ((r.payload?.pins as { code?: string }[] | undefined) || [])
        .map((p) => p.code || '')
        .filter(Boolean),
    );
  }

  if (order.delivery?.mode === 'school_stock') {
    try {
      const { deliverSchoolStock } = await import('../marketplace/payment.js');
      await deliverSchoolStock(order, deliveredCodes);
      order.delivery.status = 'delivered';
      order.delivery.deliveredAt = new Date().toISOString();
    } catch (err: any) {
      order.delivery.status = 'failed';
      order.delivery.error = err.message;
    }
  }

  order.updatedAt = new Date().toISOString();
  await putOrder(order);

  import('../services/whatsapp.js').then(({ sendMarketplaceOrderAlert }) =>
    sendMarketplaceOrderAlert({
      reference: order.reference,
      customer: order.customer.name,
      email: order.customer.email,
      total: order.total,
      schoolName: order.schoolName,
      pinCount: order.quantity,
    }),
  ).catch(() => {});

  return order;
}

router.post('/payment/verify', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Reference required' });
    const order = await getOrderByPaymentReference(reference);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment.status !== 'success') {
      const updated = await confirmPayment(reference);
      if (!updated || updated.payment.status !== 'success') {
        return res.status(402).json({ error: 'Payment not confirmed', status: updated?.payment.status });
      }
    }
    const current = await getOrder(order.id);
    res.json({
      reference: current?.reference,
      status: current?.status,
      paymentStatus: current?.payment.status,
      receiptNumber: current?.receiptNumber,
      paidAt: current?.payment.paidAt,
    });
  } catch {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.get('/orders/:ref', async (req: Request, res: Response) => {
  try {
    const order = await getOrder(req.params.ref);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const email = (req.query.email as string || '').toLowerCase();
    const auth = req.headers.authorization?.replace('Bearer ', '');
    const payload = auth ? verifyCustomerToken(auth) : null;
    const authorized = (email && email === order.customer.email) ||
      (payload && (payload.email === order.customer.email || payload.admin));
    if (!authorized) return res.status(403).json({ error: 'Unauthorized' });

    const fulfilments = await getFulfilments(order.id);
    const pins: any[] = [];
    if (order.payment.status === 'success') {
      const allocated = await getPins({ orderId: order.id }, order.quantity + 10);
      for (const pin of allocated) {
        pins.push({
          code: pin.codeCipher ? decryptPin(pin.codeCipher) : null,
          last4: pin.codeLast4,
          session: pin.session,
          status: pin.status,
          usageLimit: pin.usageLimit,
          usedCount: pin.usedCount,
          expiresAt: pin.expiresAt,
        });
      }
    }
    res.json({
      order: {
        reference: order.reference,
        status: order.status,
        paymentStatus: order.payment.status,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        paidAt: order.payment.paidAt,
        receiptNumber: order.receiptNumber,
        schoolName: order.schoolName,
        returnUrl: order.returnUrl,
        items: order.items,
        fulfilmentStatus: order.fulfilment?.status,
      },
      pins,
      fulfilments: fulfilments.map((f) => ({ status: f.status, type: f.type, attempts: f.attempts })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to load order' });
  }
});

router.post('/customer/request-access', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const customer = await getCustomer(email.toLowerCase());
  if (!customer) return res.json({ sent: true });
  const token = generateMarketplaceToken({ email: customer.email, purpose: 'order-access' }, '30m');
  res.json({ sent: true, devToken: process.env.NODE_ENV === 'development' ? token : undefined });
});

router.get('/customer/orders', async (req: Request, res: Response) => {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  const payload = auth ? verifyCustomerToken(auth) : null;
  const emailHeader = (req.headers['x-customer-email'] as string || '').toLowerCase();
  const email = payload?.email || emailHeader;
  if (!email || (payload && payload.purpose && payload.purpose !== 'order-access')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const orders = await getOrders({ 'customer.email': email });
  res.json({ orders: orders.map((o) => ({
    reference: o.reference,
    status: o.status,
    paymentStatus: o.payment.status,
    total: o.total,
    createdAt: o.createdAt,
    itemCount: o.quantity,
  })) });
});

router.post('/customer/verify-access', async (req: Request, res: Response) => {
  const { token } = req.body;
  const payload = verifyCustomerToken(token || '');
  if (!payload || payload.purpose !== 'order-access' || !payload.email) {
    return res.status(401).json({ error: 'Invalid or expired access link' });
  }
  res.json({ token: generateMarketplaceToken({ email: payload.email }, '12h'), email: payload.email });
});

router.get('/orders/:ref/receipt', async (req: Request, res: Response) => {
  const order = await getOrder(req.params.ref);
  const auth = req.headers.authorization?.replace('Bearer ', '');
  const payload = auth ? verifyCustomerToken(auth) : null;
  if (!order || order.payment.status !== 'success') return res.status(404).json({ error: 'Receipt unavailable' });
  if (!payload || (payload.email !== order.customer.email && !payload.admin)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  res.json({
    receiptNumber: order.receiptNumber,
    orderReference: order.reference,
    date: order.payment.paidAt,
    customer: order.customer,
    items: order.items,
    total: order.total,
    paymentReference: order.payment.reference,
    status: 'PAID',
  });
});

router.post('/retry/:ref', async (req: Request, res: Response) => {
  const order = await getOrder(req.params.ref);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  try {
    await retryOrderFulfilment(order.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/school/catalogue', authenticateSchool, async (_req: SchoolAuthRequest, res: Response) => {
  try {
    const [products, availablePins] = await Promise.all([
      getProducts({ available: true }),
      getAvailablePinCount(),
    ]);
    res.json({
      availablePins,
      products: products
        .filter((p) => p.type === 'DIGITAL_PIN' && p.schoolOnly)
        .map((p) => ({
          id: p.id, slug: p.slug, name: p.name, description: p.description,
          shortDescription: p.shortDescription, price: p.price, currency: p.currency,
          minQty: p.minQty, maxQty: p.maxQty, bulkPricing: p.bulkPricing || [],
          usageLimit: p.usageLimit, availableQty: availablePins, session: p.session,
        })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to load PIN catalogue' });
  }
});

router.post('/school/orders', authenticateSchool, async (req: SchoolAuthRequest, res: Response) => {
  try {
    const { productId, quantity, customer, returnUrl } = req.body;
    if (!productId || !customer?.name || !customer?.email) {
      return res.status(400).json({ error: 'Product, name and email are required' });
    }
    if (returnUrl && !/^https?:\/\//i.test(String(returnUrl))) {
      return res.status(400).json({ error: 'returnUrl must be an absolute URL' });
    }
    const product = await getProduct(productId);
    if (!product || !product.available || !product.schoolOnly) {
      return res.status(404).json({ error: 'PIN product not found' });
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < product.minQty || qty > product.maxQty) {
      return res.status(400).json({ error: `Quantity must be between ${product.minQty} and ${product.maxQty}` });
    }
    const available = await getAvailablePinCount(product.session);
    if (qty > available) return res.status(409).json({ error: `Only ${available} PINs available` });

    const school = await getSchoolIntegration(req.school!.id);
    const order = buildOrder(
      customer,
      [{ product, quantity: qty }],
      { id: req.school!.id, name: req.school!.name, returnUrl },
      null,
    );
    order.delivery = {
      mode: 'school_stock',
      webhookUrl: school?.deliveryWebhookUrl || process.env.SCHOOL_PIN_DELIVERY_WEBHOOK || '',
      secret: school?.deliverySecret || process.env.PIN_DELIVERY_SECRET || '',
      status: 'pending',
    };
    await putOrder(order);

    const checkoutUrl = `${marketplaceBase(req)}/school-management/pin-order?reference=${encodeURIComponent(order.reference)}`;
    res.status(201).json({
      order: {
        reference: order.reference,
        paymentReference: order.payment.reference,
        total: order.total,
        quantity: order.quantity,
        checkoutUrl,
        status: order.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message === 'PAYSTACK_NOT_CONFIGURED' ? 'Payment gateway unavailable' : 'Failed to create PIN order',
    });
  }
});

router.get('/school/checkout/:ref', async (req: Request, res: Response) => {
  try {
    const order = await getOrder(req.params.ref);
    if (!order || order.delivery?.mode !== 'school_stock') {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({
      order: {
        reference: order.reference,
        paymentReference: order.payment.reference,
        seller: 'Gtech Global',
        productName: order.items[0]?.name || '',
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        total: order.total,
        currency: order.currency,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        paymentStatus: order.payment.status,
        returnUrl: order.returnUrl || null,
        returnSignature: order.delivery?.secret ? orderReturnSignature(order.delivery.secret, order.reference) : '',
        status: order.status,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load order' });
  }
});

router.post('/school/checkout/:ref/pay', async (req: Request, res: Response) => {
  try {
    const order = await getOrder(req.params.ref);
    if (!order || order.delivery?.mode !== 'school_stock') {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.payment.status === 'success') {
      return res.json({ authorizationUrl: `${marketplaceBase(req)}/school-management/pin-order/callback?reference=${encodeURIComponent(order.payment.reference)}` });
    }
    const callbackUrl = `${marketplaceBase(req)}/school-management/pin-order/callback?reference=${encodeURIComponent(order.payment.reference)}`;
    const init = await initializePaystack(order, order.customer.email, callbackUrl);
    order.payment.accessCode = init.access_code;
    order.payment.authorizationUrl = init.authorization_url;
    order.status = 'awaiting_payment';
    await putOrder(order);
    res.json({
      authorizationUrl: init.authorization_url,
      reference: order.reference,
      paymentReference: order.payment.reference,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message === 'PAYSTACK_NOT_CONFIGURED' ? 'Payment gateway unavailable' : 'Failed to start payment',
    });
  }
});

router.get('/school/health', authenticateSchool, (_req: SchoolAuthRequest, res: Response) => {
  res.json({ status: 'ok', db: isDbConnected(), timestamp: new Date().toISOString() });
});

router.post('/school/launch-token', authenticateSchool, async (req: SchoolAuthRequest, res: Response) => {
  try {
    const school = await getSchoolIntegration(req.school!.id);
    if (!school || !school.active || school.revokedAt) return res.status(401).json({ error: 'School integration inactive' });
    const { adminUserId, adminName, returnUrl } = req.body;
    const token = generateApiKey('launch').replace('launch_', '');
    const { hashToken, makeId } = await import('../marketplace/types.js');
    await (await import('../marketplace/store.js')).putLaunchToken({
      id: makeId(),
      tokenHash: hashToken(token),
      schoolId: school.id,
      schoolName: school.name,
      adminUserId,
      adminName,
      returnUrl,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    const base = process.env.MARKETPLACE_PUBLIC_URL || '';
    res.json({ token, url: `${base}/marketplace?token=${token}`, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
  } catch {
    res.status(500).json({ error: 'Failed to create launch token' });
  }
});

router.get('/school/order/:ref', authenticateSchool, async (req: SchoolAuthRequest, res: Response) => {
  const order = await getOrder(req.params.ref);
  if (!order || order.schoolId !== req.school!.id) return res.status(404).json({ error: 'Order not found' });
  const records = await getFulfilments(order.id);
  const codes = records.flatMap((r) =>
    ((r.payload?.pins as { code?: string }[] | undefined) || [])
      .map((p) => p.code || '')
      .filter(Boolean),
  );
  res.json({
    order: {
        reference: order.reference,
        schoolId: order.schoolId,
        status: order.status,
        paymentStatus: order.payment.status,
        total: order.total,
        quantity: order.quantity,
      productName: order.items[0]?.name || '',
      delivery: order.delivery || null,
      createdAt: order.createdAt,
    },
    codes,
  });
});

router.get('/school/orders', authenticateSchool, async (req: SchoolAuthRequest, res: Response) => {
  const orders = await (await import('../marketplace/store.js')).getOrders({ schoolId: req.school!.id });
  res.json({ orders: orders.map((o) => ({ reference: o.reference, status: o.status, paymentStatus: o.payment.status, total: o.total, createdAt: o.createdAt })) });
});

router.post('/verify-pin', rateLimit(20, 15 * 60 * 1000, 'pin-verify'), async (req: Request, res: Response) => {
  const { pin, session, schoolId } = req.body;
  if (!pin || !session || !schoolId) return res.status(400).json({ error: 'pin, session and schoolId required' });
  const apiKey = req.headers['x-school-api-key'];
  if (!apiKey || typeof apiKey !== 'string') return res.status(401).json({ error: 'School API key required' });
  const school = await getSchoolByApiKeyHash(hashApiKey(apiKey));
  if (!school || school.id !== schoolId) return res.status(403).json({ error: 'School not authorized' });
  const { hashPin, normalizePin } = await import('../marketplace/types.js');
  const { getPinByCodeHash, consumePinAtomic, putRedemption, putSchoolIntegration } = await import('../marketplace/store.js');
  const record = await getPinByCodeHash(hashPin(pin));
  if (!record) {
    await putRedemption({ id: makeId(), pinId: 'unknown', schoolId, session, success: false, reason: 'INVALID_PIN', createdAt: new Date().toISOString() });
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  if (record.status !== 'sold' && record.status !== 'available') {
    return res.status(401).json({ error: 'PIN is not active' });
  }
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({ error: 'PIN expired' });
  }
  const result = await consumePinAtomic(record.id, session, record.usageLimit);
  await putRedemption({
    id: makeId(), pinId: record.id, schoolId, regNo: req.body.regNo, studentRef: req.body.studentRef,
    session, term: req.body.term, success: result.ok, reason: result.reason, createdAt: new Date().toISOString(),
  });
  if (!result.ok) return res.status(result.reason === 'USAGE_LIMIT' ? 429 : 401).json({ error: result.reason });
  res.json({ valid: true, usageLimit: record.usageLimit, remaining: result.remaining, session });
});

router.post('/school/sync-orders', authenticateSchool, async (req: SchoolAuthRequest, res: Response) => {
  const { references } = req.body as { references?: string[] };
  if (!Array.isArray(references)) return res.status(400).json({ error: 'references array required' });
  const results = [];
  for (const ref of references) {
    const order = await getOrder(ref);
    if (!order || order.schoolId !== req.school!.id) {
      results.push({ reference: ref, error: 'not found' });
      continue;
    }
    results.push({
      reference: ref,
      status: order.status,
      paymentStatus: order.payment.status,
      quantity: order.quantity,
      deliveredAt: order.fulfilment?.deliveredAt,
    });
  }
  res.json({ results });
});

router.post('/school/notification', authenticateSchool, async (req: SchoolAuthRequest, res: Response) => {
  const { reference, status } = req.body;
  const order = await getOrder(reference);
  if (!order || order.schoolId !== req.school!.id) return res.status(404).json({ error: 'Order not found' });
  order.updatedAt = new Date().toISOString();
  await putOrder(order);
  res.json({ received: true, status });
});

export default router;
