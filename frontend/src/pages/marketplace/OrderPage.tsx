import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Copy, ExternalLink, Download, ArrowLeft, Clock } from 'lucide-react';
import { verifyPayment, getOrder, getReceipt, requestAccess, verifyAccess, type SchoolContext } from '../../lib/marketplace';

interface OrderData {
  order: {
    reference: string; status: string; paymentStatus: string; total: number; currency: string;
    createdAt: string; paidAt?: string; receiptNumber?: string; schoolName?: string;
    returnUrl?: string; items: any[]; fulfilmentStatus?: string;
  };
  pins: any[];
}

function money(amount: number) { return `₦${amount.toLocaleString('en-NG')}`; }

export default function OrderPage({ token }: { token?: string }) {
  const [params] = useSearchParams();
  const reference = params.get('reference') || '';
  const verified = params.get('verified');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [email, setEmail] = useState(params.get('email') || '');
  const [accessToken, setAccessToken] = useState(token || '');
  const [requesting, setRequesting] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const checked = useRef(false);

  const loadOrder = async (ref: string, access: string) => {
    const data = await getOrder(ref, email, access);
    setOrderData(data);
    return data;
  };

  useEffect(() => {
    const run = async () => {
      if (checked.current) return;
      checked.current = true;
      if (!reference) { setStatus('failed'); setMessage('No order reference provided.'); return; }
      try {
        if (verified === 'true' || params.get('payment') === 'success') {
          try {
            await verifyPayment(reference);
          } catch (e: any) {
            setMessage(e.message);
          }
        }
        let access = accessToken;
        if (!access && email) {
          try { access = (await requestAccess(email)).devToken || ''; } catch { /* ignore */ }
        }
        if (!access && email) {
          setStatus('pending');
          setMessage('Enter your email to access this order.');
          return;
        }
        const data = await loadOrder(reference, access);
        if (data.order.paymentStatus === 'success') {
          setStatus('success');
        } else if (data.order.paymentStatus === 'failed') {
          setStatus('failed');
          setMessage('Payment was not successful.');
        } else {
          setStatus('pending');
          setMessage('Payment is still being confirmed.');
        }
      } catch (e: any) {
        setStatus('pending');
        setMessage(e.message || 'Unable to load order.');
      }
    };
    run();
  }, [reference]);

  const handleAccess = async () => {
    setRequesting(true);
    try {
      const result = await requestAccess(email);
      if (result.devToken) {
        setAccessToken(result.devToken);
        const data = await loadOrder(reference, result.devToken);
        setStatus(data.order.paymentStatus === 'success' ? 'success' : 'pending');
      } else {
        setMessage('If an order exists for this email, an access link has been sent.');
      }
    } catch (e: any) { setMessage(e.message); }
    setRequesting(false);
  };

  const handleReceipt = async () => {
    try {
      const receipt = await getReceipt(reference, accessToken);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `receipt-${reference}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setMessage(e.message); }
  };

  return (
    <div className="mp-root min-h-screen">
      <header className="mp-header">
        <div className="container flex items-center justify-between h-16 px-6">
          <button onClick={() => navigate('/marketplace')} className="flex items-center gap-2 text-sm text-muted hover:text-white"><ArrowLeft className="w-4 h-4" /> Marketplace</button>
          <span className="font-bold">Gtech<span className="text-violet-400">Market</span></span>
        </div>
      </header>
      <main className="container px-6 py-16 max-w-3xl mx-auto">
        {status === 'loading' ? (
          <div className="text-center"><Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" /><p className="text-muted">Confirming your payment...</p></div>
        ) : status === 'failed' ? (
          <div className="mp-card p-10 text-center">
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment not completed</h1>
            <p className="text-sm text-muted mb-6">{message || 'Your payment was not confirmed.'}</p>
            <button className="mp-btn" onClick={() => navigate('/marketplace')}>Back to marketplace</button>
          </div>
        ) : status === 'pending' ? (
          <div className="mp-card p-10 text-center">
            <Clock className="w-14 h-14 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Order awaiting confirmation</h1>
            <p className="text-sm text-muted mb-6">{message}</p>
            <div className="max-w-sm mx-auto flex gap-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email used for purchase" className="mp-input flex-1" />
              <button onClick={handleAccess} disabled={requesting} className="mp-btn">{requesting ? 'Checking...' : 'Access order'}</button>
            </div>
          </div>
        ) : orderData ? (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Payment confirmed</h1>
              <p className="text-sm text-muted">Order {orderData.order.reference} · {money(orderData.order.total)}</p>
              {orderData.order.receiptNumber && <p className="text-xs text-faint mt-1">Receipt: {orderData.order.receiptNumber}</p>}
            </div>

            {orderData.pins.length > 0 && (
              <div className="mp-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Your PINs ({orderData.pins.length})</h2>
                  <span className="text-[11px] text-emerald-400">Delivered securely</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {orderData.pins.map((pin, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <span className="font-mono text-sm tracking-wider">{pin.code || `••••-••••-••${pin.last4}`}</span>
                      <button
                        onClick={() => { if (pin.code) { navigator.clipboard.writeText(pin.code); setCopied(i); setTimeout(() => setCopied(null), 1500); } }}
                        className="text-violet-400 hover:text-violet-300 disabled:opacity-30" disabled={!pin.code}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-faint mt-4">
                  {copied !== null ? 'Copied!' : 'These PINs are universal and can be used on any participating school portal.'}
                  {orderData.pins[0]?.usageLimit && ` ${orderData.pins[0].usageLimit} successful checks per academic session.`}
                </p>
              </div>
            )}

            <div className="mp-card p-6">
              <h2 className="font-semibold mb-4">Order details</h2>
              <div className="space-y-2 text-sm">
                {orderData.order.items.map((item, i) => (
                  <div key={i} className="flex justify-between"><span className="text-muted">{item.name} × {item.quantity}</span><span>{money(item.total)}</span></div>
                ))}
                <div className="border-t border-white/[0.06] pt-3 flex justify-between font-semibold"><span>Total paid</span><span>{money(orderData.order.total)}</span></div>
                {orderData.order.schoolName && <div className="flex justify-between"><span className="text-muted">School</span><span>{orderData.order.schoolName}</span></div>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={handleReceipt} className="mp-btn"><Download className="w-4 h-4" /> Download receipt</button>
              {orderData.order.returnUrl && (
                <a href={orderData.order.returnUrl} className="mp-btn !bg-white/[0.06] !text-white">
                  Return to School Dashboard <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
