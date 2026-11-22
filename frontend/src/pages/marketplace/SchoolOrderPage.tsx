import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import {
  getSchoolCheckout,
  startSchoolPayment,
  verifyPayment,
  type SchoolCheckout,
} from '../../lib/marketplace';

type Status = 'loading' | 'ready' | 'paying' | 'success' | 'failed';

function money(amount: number, currency = 'NGN') {
  return `${currency === 'NGN' ? '₦' : ''}${Number(amount || 0).toLocaleString('en-NG')}`;
}

function returnWithPinOrder(returnUrl: string, orderRef: string, signature: string) {
  try {
    const url = new URL(returnUrl);
    url.searchParams.set('pinOrder', orderRef);
    if (signature) url.searchParams.set('pinSig', signature);
    return url.toString();
  } catch {
    return '';
  }
}

export default function SchoolOrderPage({ callback = false }: { callback?: boolean }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get('reference') || '';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState<SchoolCheckout | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('No order reference was provided.');
        return;
      }

      try {
        if (callback) {
          const verified = await verifyPayment(reference);
          const current = await getSchoolCheckout(String(verified.reference || ''));
          setOrder(current);

          if (current.paymentStatus !== 'success') {
            setStatus('failed');
            setMessage('Payment was not confirmed. Please return to your school dashboard and try again.');
            return;
          }

          setStatus('success');
          setMessage('Payment confirmed. Your PINs are being delivered to your school dashboard.');
          const target = current.returnUrl ? returnWithPinOrder(current.returnUrl, current.reference, current.returnSignature || '') : '';
          if (target) window.setTimeout(() => window.location.replace(target), 900);
          return;
        }

        const current = await getSchoolCheckout(reference);
        setOrder(current);

        if (current.paymentStatus === 'success') {
          setStatus('success');
          setMessage('Payment confirmed. Redirecting your PINs to the school dashboard.');
          const target = current.returnUrl ? returnWithPinOrder(current.returnUrl, current.reference, current.returnSignature || '') : '';
          if (target) window.setTimeout(() => window.location.replace(target), 900);
          return;
        }

        setStatus('ready');
      } catch (err: any) {
        setStatus('failed');
        setMessage(err.message || 'Unable to load this order.');
      }
    };

    run();
  }, [callback, reference]);

  const handlePay = async () => {
    if (!order) return;
    setStatus('paying');
    setMessage('');
    try {
      const result = await startSchoolPayment(order.reference);
      window.location.assign(result.authorizationUrl);
    } catch (err: any) {
      setStatus('ready');
      setMessage(err.message || 'Payment could not be started.');
    }
  };

  return (
    <div className="mp-root min-h-screen">
      <header className="mp-header">
        <div className="container flex items-center justify-between h-16 px-6">
          <button
            onClick={() => navigate('/school-management')}
            className="flex items-center gap-2 text-sm text-muted hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> School Management
          </button>
          <span className="font-bold">Gtech Global</span>
        </div>
      </header>

      <main className="container px-6 py-16 max-w-2xl mx-auto">
        {status === 'loading' ? (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
            <p className="text-muted">Preparing your Gtech Global order...</p>
          </div>
        ) : status === 'failed' ? (
          <div className="mp-card p-10 text-center">
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Order unavailable</h1>
            <p className="text-sm text-muted mb-6">{message}</p>
            <button className="mp-btn" onClick={() => navigate('/school-management')}>Back to School Management</button>
          </div>
        ) : status === 'success' ? (
          <div className="mp-card p-10 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment confirmed</h1>
            <p className="text-sm text-muted">{message}</p>
            <p className="text-xs text-faint mt-3">Order {order?.reference}</p>
          </div>
        ) : order ? (
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300 border border-violet-400/30 rounded-full px-3 py-1">
                <ShieldCheck className="w-4 h-4" /> Seller: Gtech Global
              </span>
              <h1 className="text-2xl font-bold mt-4 mb-2">Review your PIN order</h1>
              <p className="text-sm text-muted">Confirm the quantity and total before payment.</p>
            </div>

            <div className="mp-card p-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Product</span>
                  <span className="font-semibold text-right">{order.productName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">School</span>
                  <span className="font-semibold text-right">{order.customerName || 'School account'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Quantity</span>
                  <span className="font-semibold">{order.quantity.toLocaleString('en-NG')} PIN(s)</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Unit price</span>
                  <span className="font-semibold">{money(order.unitPrice, order.currency)}</span>
                </div>
                <div className="border-t border-white/[0.06] pt-4 flex justify-between gap-4 text-lg font-bold">
                  <span>Total</span>
                  <span>{money(order.total, order.currency)}</span>
                </div>
              </div>
            </div>

            {message && <p className="text-sm text-amber-300 text-center">{message}</p>}

            <button className="mp-btn w-full justify-center" onClick={handlePay} disabled={status === 'paying'}>
              {status === 'paying' ? 'Opening secure payment...' : `Pay ${money(order.total, order.currency)} on Gtech Global`}
            </button>

            <p className="text-[11px] text-faint text-center">
              Payment is processed securely on Gtech Global’s Paystack account. After payment, your PINs are delivered straight to your school dashboard.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
