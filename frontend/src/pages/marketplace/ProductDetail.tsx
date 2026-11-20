import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KeyRound, Minus, Plus, ArrowLeft, ShieldCheck, Info, CreditCard } from 'lucide-react';
import { useMarketplace, getQuote } from '../../lib/marketplace';

function money(amount: number) { return `₦${amount.toLocaleString('en-NG')}`; }

export default function ProductDetail({ token }: { token?: string }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, loading } = useMarketplace(token);
  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<{ unitPrice: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const product = products.find((p) => p.slug === slug);

  useEffect(() => {
    if (!product) return;
    setQuantity(product.minQty);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    getQuote(product.id, quantity)
      .then((q) => { if (!cancelled) { setQuote(q); setError(''); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setQuote(null); } });
    return () => { cancelled = true; };
  }, [product?.id, quantity]);

  if (loading) {
    return <div className="mp-root min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!product) {
    return <div className="mp-root min-h-screen flex flex-col items-center justify-center gap-4"><p className="text-xl">Product not found</p><button className="mp-btn" onClick={() => navigate('/marketplace')}>Back to marketplace</button></div>;
  }

  const max = Math.min(product.maxQty, product.availableQty ?? product.maxQty);

  return (
    <div className="mp-root min-h-screen">
      <header className="mp-header">
        <div className="container flex items-center justify-between h-16 px-6">
          <button onClick={() => navigate(`/marketplace${token ? `?token=${token}` : ''}`)} className="flex items-center gap-2 text-sm text-muted hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Marketplace
          </button>
          <span className="font-bold">Gtech<span className="text-violet-400">Market</span></span>
        </div>
      </header>
      <main className="container px-6 py-12 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <div className="mp-card p-8 h-64 flex items-center justify-center bg-gradient-to-br from-violet-600/15 to-orange-500/5">
              {product.image ? <img src={product.image} alt={product.name} className="max-h-full object-contain" /> :
                <KeyRound className="w-20 h-20 text-violet-400/60" />}
            </div>
            <div className="mp-card p-5 mt-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-violet-400" /> Purchase instructions</h3>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{product.instructions || 'Complete payment to receive your digital product instantly.'}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="mp-badge">{product.type.replace('DIGITAL_', '')}</span>
              {product.session && <span className="text-xs text-faint">Session: {product.session}</span>}
            </div>
            <h1 className="text-3xl font-bold mb-3">{product.name}</h1>
            <p className="text-sm text-muted leading-relaxed mb-6">{product.description}</p>

            <div className="mp-card p-6 mb-5">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="text-3xl font-bold">{money(quote?.unitPrice ?? product.price)}</div>
                  <div className="text-xs text-faint mt-1">per unit</div>
                </div>
                {product.availableQty !== undefined && (
                  <div className="text-right text-xs text-muted">
                    <span className="text-emerald-400 font-semibold">{product.availableQty.toLocaleString()}</span> available
                  </div>
                )}
              </div>

              <label className="block text-sm text-muted mb-2">Quantity</label>
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setQuantity(Math.max(product.minQty, quantity - 1))} className="w-10 h-10 rounded-lg border border-white/[0.08] hover:border-violet-500/50 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                <input
                  type="number"
                  value={quantity}
                  min={product.minQty}
                  max={max}
                  onChange={(e) => setQuantity(Math.min(max, Math.max(product.minQty, Number(e.target.value) || product.minQty)))}
                  className="w-24 text-center text-xl font-semibold bg-transparent border-b border-white/[0.1] py-1 focus:outline-none focus:border-violet-500"
                />
                <button onClick={() => setQuantity(Math.min(max, quantity + 1))} className="w-10 h-10 rounded-lg border border-white/[0.08] hover:border-violet-500/50 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              </div>
              <p className="text-[11px] text-faint">Min {product.minQty} · Max {max}</p>

              {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

              <div className="border-t border-white/[0.06] mt-5 pt-5 flex items-center justify-between">
                <span className="text-sm text-muted">Total</span>
                <span className="text-2xl font-bold">{money(quote?.total ?? product.price * quantity)}</span>
              </div>
              <button
                disabled={!!error || !quote}
                onClick={() => navigate(`/marketplace/checkout/${product.slug}?qty=${quantity}${token ? `&token=${token}` : ''}`)}
                className="mp-btn w-full mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4" /> Proceed to checkout
              </button>
            </div>

            <div className="flex items-start gap-3 text-xs text-muted">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <p>Payment is processed securely through Gtech Global's Paystack account. PINs are universal and are never locked to the purchasing school.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
