import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, KeyRound } from 'lucide-react';
import { useMarketplace, createOrder, getQuote } from '../../lib/marketplace';

function money(amount: number) { return `₦${amount.toLocaleString('en-NG')}`; }

export default function Checkout({ token }: { token?: string }) {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const quantity = Number(params.get('qty') || 1);
  const { products, school, loading } = useMarketplace(token);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quote, setQuote] = useState<{ unitPrice: number; total: number } | null>(null);
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const product = products.find((p) => p.slug === slug);

  useEffect(() => {
    if (product) getQuote(product.id, quantity).then(setQuote).catch((e) => setError(e.message));
  }, [product?.id, quantity]);

  const handlePay = async () => {
    if (!product || !terms) return;
    setSubmitting(true);
    setError('');
    try {
      const order = await createOrder({
        productId: product.id,
        quantity,
        customer: { name, email, phone: phone || undefined },
        token,
      });
      window.location.href = order.authorizationUrl;
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (loading || !product) {
    return <div className="mp-root min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="mp-root min-h-screen">
      <header className="mp-header">
        <div className="container flex items-center justify-between h-16 px-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted hover:text-white"><ArrowLeft className="w-4 h-4" /> Back</button>
          <span className="font-bold">Secure <span className="text-violet-400">Checkout</span></span>
        </div>
      </header>
      <main className="container px-6 py-12 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Review your order</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="mp-card p-6">
              <h2 className="font-semibold mb-4">Customer details</h2>
              <div className="space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="mp-input" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" className="mp-input" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (optional)" className="mp-input" />
              </div>
            </div>
            {school && (
              <div className="mp-card p-5 border-emerald-500/20 bg-emerald-500/[0.04]">
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Originating school</div>
                <div className="text-sm font-medium">{school.name}</div>
                <p className="text-[11px] text-muted mt-1">Purchase will be attributed to this school. PINs remain universal.</p>
              </div>
            )}
          </div>

          <div className="mp-card p-6 h-fit">
            <h2 className="font-semibold mb-5 flex items-center gap-2"><KeyRound className="w-4 h-4 text-violet-400" /> Order summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Product</span><span className="font-medium text-right">{product.name}</span></div>
              <div className="flex justify-between"><span className="text-muted">Quantity</span><span>{quantity}</span></div>
              <div className="flex justify-between"><span className="text-muted">Unit price</span><span>{money(quote?.unitPrice ?? product.price)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Payment method</span><span>Paystack</span></div>
              <div className="border-t border-white/[0.06] pt-4 flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">{money(quote?.total ?? product.price * quantity)}</span>
              </div>
            </div>
            <label className="flex items-start gap-3 mt-6 cursor-pointer">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 accent-violet-500" />
              <span className="text-xs text-muted leading-relaxed">I agree to the terms of purchase. I understand PINs are revealed only after payment confirmation and are non-refundable once delivered.</span>
            </label>
            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            <button
              onClick={handlePay}
              disabled={!terms || !name || !email || !quote || submitting}
              className="mp-btn w-full mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" /> {submitting ? 'Redirecting to Paystack...' : `Pay ${money(quote?.total ?? 0)}`}
            </button>
            <div className="flex items-center gap-2 text-[11px] text-faint mt-4 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secured by Gtech Global Paystack
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
