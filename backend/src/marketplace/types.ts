import { randomBytes, createHash, createHmac, timingSafeEqual, randomUUID } from 'crypto';

export type ProductType = 'DIGITAL_PIN' | 'DIGITAL_VOUCHER' | 'SOFTWARE_LICENSE' | 'DIGITAL_DOWNLOAD' | 'DIGITAL_SERVICE';

export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active: boolean;
  createdAt: string;
}

export interface ProductDoc {
  id: string;
  categoryId: string;
  type: ProductType;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  image?: string;
  price: number;
  currency: 'NGN';
  minQty: number;
  maxQty: number;
  bulkPricing?: { minQty: number; price: number }[];
  available: boolean;
  featured: boolean;
  instructions?: string;
  session?: string;
  validityDays?: number;
  usageLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
}

export type OrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'processing' | 'delivered' | 'failed' | 'cancelled';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned' | 'reversed';

export interface OrderDoc {
  id: string;
  reference: string;
  customer: OrderCustomer;
  schoolId?: string | null;
  schoolName?: string | null;
  launchTokenId?: string | null;
  items: {
    productId: string;
    name: string;
    type: ProductType;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
  total: number;
  currency: 'NGN';
  status: OrderStatus;
  payment: {
    status: PaymentStatus;
    provider: 'paystack';
    reference: string;
    accessCode?: string;
    authorizationUrl?: string;
    paidAt?: string;
    gatewayResponse?: string;
    amount: number;
    owner: 'GTECH_GLOBAL';
    receivingAccount: string;
  };
  fulfilment?: {
    status: 'pending' | 'allocated' | 'delivered' | 'failed';
    deliveredAt?: string;
    itemCount?: number;
  };
  receiptNumber?: string;
  returnUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDoc {
  email: string;
  name?: string;
  phone?: string;
  verified: boolean;
  verificationHash?: string;
  verificationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolIntegrationDoc {
  id: string;
  name: string;
  apiKeyHash: string;
  prefix: string;
  active: boolean;
  permissions: string[];
  lastConnectedAt?: string;
  lastError?: string;
  revokedAt?: string;
  createdAt: string;
  rotatedAt?: string;
}

export interface LaunchTokenDoc {
  id: string;
  tokenHash: string;
  schoolId: string;
  schoolName: string;
  adminUserId?: string;
  adminName?: string;
  returnUrl?: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

export interface WebhookEventDoc {
  id: string;
  event: string;
  reference: string;
  status: 'processed' | 'duplicate' | 'failed';
  createdAt: string;
}

export interface PinBatchDoc {
  id: string;
  name: string;
  count: number;
  prefix: string;
  session?: string;
  validityDays?: number;
  usageLimit: number;
  createdBy: string;
  createdAt: string;
}

export type PinStatus = 'available' | 'reserved' | 'sold' | 'redeemed' | 'revoked' | 'expired';

export interface PinDoc {
  id: string;
  codeHash: string;
  codeCipher?: string;
  codeLast4: string;
  batchId: string;
  status: PinStatus;
  session?: string;
  usageLimit: number;
  usedCount: number;
  expiresAt?: string;
  reservedFor?: string;
  orderId?: string;
  schoolAtPurchase?: string | null;
  createdAt: string;
  activatedAt?: string;
  soldAt?: string;
  revokedAt?: string;
}

export interface PinRedemptionDoc {
  id: string;
  pinId: string;
  schoolId: string;
  regNo?: string;
  studentRef?: string;
  session: string;
  term?: string;
  success: boolean;
  reason?: string;
  ip?: string;
  createdAt: string;
}

export interface FulfilmentRecordDoc {
  id: string;
  orderId: string;
  productId: string;
  type: ProductType;
  status: 'pending' | 'allocated' | 'delivered' | 'failed';
  payload?: Record<string, unknown>;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_USAGE_LIMIT = 3;
const PIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeId(): string {
  return randomUUID();
}

export function makeReference(prefix: string): string {
  const bytes = randomBytes(5).toString('hex').toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${bytes}`;
}

export function makePinCode(length = 12): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += PIN_ALPHABET[bytes[i] % PIN_ALPHABET.length];
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

export function normalizePin(pin: string): string {
  return pin.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashPin(pin: string): string {
  return createHash('sha256').update(normalizePin(pin)).digest('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function paystackSignature(secret: string, body: string): string {
  return createHmac('sha512', secret).update(body).digest('hex');
}

export function getUnitPrice(product: ProductDoc, qty: number): number {
  const bulk = [...(product.bulkPricing || [])].sort((a, b) => b.minQty - a.minQty);
  const match = bulk.find((b) => qty >= b.minQty);
  return match ? match.price : product.price;
}

export function defaultUsageLimit(product?: ProductDoc | null): number {
  return product?.usageLimit ?? DEFAULT_USAGE_LIMIT;
}

export function sessionKey(session: string): string {
  return session.trim().replace(/[^A-Za-z0-9]+/g, '_');
}
