import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle2, XCircle, Download, KeyRound } from 'lucide-react';
import { apiUrl } from '../../lib/api';
import { requestAccess, verifyAccess, getReceipt } from '../../lib/marketplace';

function money(amount: number) { return `₦${amount.toLocaleString('en-NG')}`; }

export default function OrdersPage({ token }: { token?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [accessToken, setAccessToken] = useState(token || '');
  const [orders, setOrders] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlToken = params.get('token');
    if (urlToken && urlToken.length > 20) {
      verifyAccess(urlToken).then((r) => { setAccessToken(r.token); setEmail(r.email); }).catch(() => {});
    }
  }, []);

  const loadOrders = async () => {
    if (!email || !accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl('/api')}/marketplace/customer/orders`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'x-customer-email': email },
      });
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
      else setMessage(data.error);
    } catch (e: any) { setMessage(e.message); }
    setLoading(false);
  };

  useEffect(() => { if (accessToken && email) loadOrders(); }, [accessToken, email]);

  const handleRequest = async () => {
    setLoading(true);
    const result = await requestAccess(email);
    if (result.devToken) {
      setAccessToken(result.devToken);
    } else {
      setMessage('If an account exists, an access link has been sent.');
    }
    setLoading(false);
  };

  const downloadReceipt = async (ref: string) => {
    try {
      const receipt = await getReceipt(ref, accessToken);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${ref}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setMessage(e.message); }
  };

  return (
    <div className="mp-root min-h-screen">
      <header className="mp-header">
        <div className="container flex items-center justify-between h-16 px-6">
          <button onClick={() => navigate('/marketplace')} className="flex items-center gap-2 text-sm text-muted hover:text-white"><ArrowLeft className="w-4 h-4" /> Marketplace</button>
          <span className="font-bold">My <span className="text-violet-400">Orders</span></span>
        </div>
      </header>
      <main className="container px-6 py-16 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Order history</h1>
        <p className="text-sm text-muted mb-8">Securely access your purchases and receipts.</p>

        {!accessToken ? (
          <div className="mp-card p-8 max-w-md">
            <h2 className="font-semibold mb-4">Access your orders</h2>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email used for purchase" className="mp-input mb-3" />
            <button onClick={handleRequest} disabled={!email || loading} className="mp-btn w-full disabled:opacity-40">{loading ? 'Sending...' : 'Send access link'}</button>
            {message && <p className="text-xs text-muted mt-3">{message}</p>}
          </div>
        ) : (
          <>
            {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div> :
              orders.length === 0 ? (
                <div className="text-center py-16 text-muted"><Package className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No orders found for this account.</p></div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div key={o.reference} className="mp-card p-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-sm font-medium">{o.reference}</div>
                        <div className="text-xs text-muted mt-1">{new Date(o.createdAt).toLocaleDateString()} · {money(o.total)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] px-2 py-1 rounded-full ${o.paymentStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {o.paymentStatus === 'success' ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}{o.paymentStatus}
                        </span>
                        <button onClick={() => navigate(`/marketplace/order?reference=${o.reference}&email=${encodeURIComponent(email)}`)} className="text-violet-400 text-xs hover:text-violet-300 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" /> View PINs</button>
                        {o.paymentStatus === 'success' && <button onClick={() => downloadReceipt(o.reference)} className="text-muted hover:text-white"><Download className="w-4 h-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            {message && <p className="text-xs text-red-400 mt-4">{message}</p>}
          </>
        )}
      </main>
    </div>
  );
}
