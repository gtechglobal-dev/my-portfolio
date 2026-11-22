import { useEffect, useState, useCallback } from 'react';
import { apiUrl } from '../lib/api';

const API = apiUrl('/api');

export interface Category { id: string; name: string; slug: string; description?: string; icon?: string; productCount: number; }
export interface Product {
  id: string; slug: string; name: string; description: string; shortDescription?: string;
  image?: string; price: number; type: string; minQty: number; maxQty: number;
  availableQty?: number; featured: boolean; categoryId: string; session?: string; usageLimit?: number; instructions?: string;
}

export interface SchoolContext { id: string; name: string; adminName?: string; returnUrl?: string; }

export function useMarketplace(token?: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [school, setSchool] = useState<SchoolContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/marketplace/bootstrap${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setSchool(data.school || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return { categories, products, school, loading, error, reload: load };
}

export async function getQuote(productId: string, quantity: number) {
  const res = await fetch(`${API}/marketplace/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Quote failed');
  return data as { unitPrice: number; total: number; product: Product };
}

export async function createOrder(payload: {
  productId: string; quantity: number; customer: { name: string; email: string; phone?: string }; token?: string;
}) {
  const res = await fetch(`${API}/marketplace/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Order failed');
  return data.order as { reference: string; paymentReference: string; total: number; authorizationUrl: string };
}

export async function verifyPayment(reference: string) {
  const res = await fetch(`${API}/marketplace/payment/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Verification failed');
  return data;
}

export interface SchoolCheckout {
  reference: string;
  paymentReference: string;
  seller: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  paymentStatus: string;
  returnUrl?: string | null;
  returnSignature?: string;
  status: string;
}

export async function getSchoolCheckout(reference: string): Promise<SchoolCheckout> {
  const res = await fetch(`${API}/marketplace/school/checkout/${encodeURIComponent(reference)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Order not found');
  return data.order as SchoolCheckout;
}

export async function startSchoolPayment(reference: string) {
  const res = await fetch(`${API}/marketplace/school/checkout/${encodeURIComponent(reference)}/pay`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment could not be started');
  return data as { authorizationUrl: string; reference: string; paymentReference: string };
}

export async function requestAccess(email: string) {
  const res = await fetch(`${API}/marketplace/customer/request-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function verifyAccess(token: string) {
  const res = await fetch(`${API}/marketplace/customer/verify-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Access link invalid');
  return data as { token: string; email: string };
}

export async function getOrder(ref: string, email: string, token: string) {
  const res = await fetch(`${API}/marketplace/orders/${encodeURIComponent(ref)}?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Order not found');
  return data;
}

export async function getReceipt(ref: string, token: string) {
  const res = await fetch(`${API}/marketplace/orders/${encodeURIComponent(ref)}/receipt`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Receipt unavailable');
  return data;
}
