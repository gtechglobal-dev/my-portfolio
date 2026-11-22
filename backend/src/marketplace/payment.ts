import {
  OrderDoc, ProductDoc, PinDoc, makePinCode, hashPin, makeId, makeReference,
  getUnitPrice, FulfilmentRecordDoc, deliverySignature,
} from './types.js';
import { decryptPin } from './pinCrypto.js';
import {
  atomicAllocatePins, markPinsSold, releasePins, putFulfilment,
  getOrder, putOrder,
} from './store.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializePaystack(order: OrderDoc, email: string, callbackUrl?: string): Promise<PaystackInitResult> {
  if (!PAYSTACK_SECRET) throw new Error('PAYSTACK_NOT_CONFIGURED');
  const publicUrl = process.env.MARKETPLACE_PUBLIC_URL || process.env.SCHOOL_CLIENT_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '';
  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: Math.round(order.total * 100),
      reference: order.payment.reference,
      currency: 'NGN',
      callback_url: callbackUrl || (publicUrl
        ? `${publicUrl}/marketplace/order?reference=${encodeURIComponent(order.payment.reference)}&verified=true&email=${encodeURIComponent(order.customer.email)}`
        : undefined),
      metadata: {
        orderId: order.id,
        orderReference: order.reference,
        custom_fields: [
          { display_name: 'Seller', variable_name: 'seller', value: 'Gtech Global' },
          { display_name: 'Order', variable_name: 'order_reference', value: order.reference },
        ],
      },
    }),
  });
  const data = await response.json() as any;
  if (!response.ok || !data.status) {
    throw new Error(data.message || 'PAYSTACK_INIT_FAILED');
  }
  return {
    authorization_url: data.data.authorization_url,
    access_code: data.data.access_code,
    reference: data.data.reference,
  };
}

export async function verifyPaystack(reference: string): Promise<{
  verified: boolean;
  amount: number;
  status: string;
  paidAt?: string;
  gatewayResponse?: string;
}> {
  if (!PAYSTACK_SECRET) throw new Error('PAYSTACK_NOT_CONFIGURED');
  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const data = await response.json() as any;
  if (!response.ok || !data.status) {
    return { verified: false, amount: 0, status: 'error' };
  }
  const tx = data.data;
  return {
    verified: tx.status === 'success',
    amount: Math.round(tx.amount / 100),
    status: tx.status,
    paidAt: tx.paid_at ? new Date(tx.paid_at).toISOString() : undefined,
    gatewayResponse: tx.gateway_response,
  };
}

export function fulfilmentHandler(product: ProductDoc, pins: PinDoc[]): Record<string, unknown> {
  switch (product.type) {
    case 'DIGITAL_PIN':
      return {
        pins: pins.map((p) => ({
          code: p.codeCipher ? decryptPin(p.codeCipher) || '' : '',
          session: p.session,
          usageLimit: p.usageLimit,
          expiresAt: p.expiresAt,
        })),
        instructions: product.instructions,
      };
    case 'DIGITAL_VOUCHER':
    case 'SOFTWARE_LICENSE':
    case 'DIGITAL_DOWNLOAD':
    case 'DIGITAL_SERVICE':
      return { instructions: product.instructions };
  }
}

export async function allocateAndFulfil(
  order: OrderDoc,
  products: ProductDoc[],
): Promise<{ pins: PinDoc[]; fulfilment: FulfilmentRecordDoc[] }> {
  const allPins: PinDoc[] = [];
  const records: FulfilmentRecordDoc[] = [];

  for (const item of order.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    const now = new Date().toISOString();
    const record: FulfilmentRecordDoc = {
      id: makeId(),
      orderId: order.id,
      productId: product.id,
      type: product.type,
      status: 'pending',
      attempts: 1,
      createdAt: now,
      updatedAt: now,
    };

    try {
      let pins: PinDoc[] = [];
      if (product.type === 'DIGITAL_PIN') {
        pins = await atomicAllocatePins(order.id, item.quantity, product.session);
        allPins.push(...pins);
      }
      record.status = 'allocated';
      record.payload = fulfilmentHandler(product, pins);
      await putFulfilment(record);
      records.push(record);
    } catch (err: any) {
      record.status = 'failed';
      record.lastError = err.message;
      await putFulfilment(record);
      await releasePins(order.id);
      throw err;
    }
  }

  await markPinsSold(order.id, order.schoolId);
  return { pins: allPins, fulfilment: records };
}

export async function deliverSchoolStock(order: OrderDoc, codes: string[]): Promise<void> {
  const delivery = order.delivery;
  if (!delivery || delivery.mode !== 'school_stock' || !delivery.webhookUrl) return;
  const body = JSON.stringify({
    reference: order.reference,
    schoolId: order.schoolId,
    schoolName: order.schoolName,
    quantity: order.quantity,
    productName: order.items[0]?.name || '',
    codes,
    deliveredAt: new Date().toISOString(),
  });
  const signature = deliverySignature(
    delivery.secret || process.env.PIN_DELIVERY_SECRET || '',
    body,
  );
  const response = await fetch(delivery.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-gtech-delivery-signature': signature },
    body,
  });
  if (!response.ok) throw new Error(`School delivery failed (${response.status})`);
}

export function buildOrder(
  customer: { name: string; email: string; phone?: string },
  items: { product: ProductDoc; quantity: number }[],
  school?: { id: string; name: string; returnUrl?: string } | null,
  launchTokenId?: string | null,
): OrderDoc {
  const now = new Date().toISOString();
  const orderItems = items.map(({ product, quantity }) => {
    const unitPrice = getUnitPrice(product, quantity);
    return {
      productId: product.id,
      name: product.name,
      type: product.type,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    };
  });
  const total = orderItems.reduce((sum, i) => sum + i.total, 0);
  return {
    id: makeId(),
    reference: makeReference('GTM'),
    customer: { name: customer.name, email: customer.email.toLowerCase(), phone: customer.phone },
    schoolId: school?.id || null,
    schoolName: school?.name || null,
    launchTokenId: launchTokenId || null,
    returnUrl: school?.returnUrl || null,
    items: orderItems,
    quantity: orderItems.reduce((sum, i) => sum + i.quantity, 0),
    unitPrice: orderItems[0]?.unitPrice || 0,
    subtotal: total,
    total,
    currency: 'NGN',
    status: 'awaiting_payment',
    payment: {
      status: 'pending',
      provider: 'paystack',
      reference: makeReference('PSK'),
      amount: total,
      owner: 'GTECH_GLOBAL',
      receivingAccount: 'GTECH_GLOBAL_PAYSTACK',
    },
    fulfilment: { status: 'pending' },
    createdAt: now,
    updatedAt: now,
  };
}

export async function retryOrderFulfilment(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order || order.payment.status !== 'success') return;
  if (order.fulfilment?.status === 'delivered') return;
  const { getProduct } = await import('./store.js');
  const products = await Promise.all(order.items.map((i) => getProduct(i.productId)));
  const valid = products.filter(Boolean) as ProductDoc[];
  await allocateAndFulfil(order, valid);
  order.fulfilment = { status: 'allocated' };
  order.status = 'paid';
  order.updatedAt = new Date().toISOString();
  await putOrder(order);
}
