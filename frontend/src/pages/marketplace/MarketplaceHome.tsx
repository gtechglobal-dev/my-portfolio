import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Search, ShieldCheck, KeyRound, ArrowRight, MessageCircle,
  CheckCircle2, Clock, FileText, Lock, Package, HelpCircle, ChevronRight,
  CreditCard, Headphones, AlertCircle,
} from 'lucide-react';
import { useMarketplace, type Product } from '../../lib/marketplace';

const WHATSAPP_URL = 'https://wa.me/2347054867749?text=' + encodeURIComponent('Hello Gtech Global Marketplace, I need help with a purchase.');

function money(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function ProductCard({ product, onBuy }: { product: Product; onBuy: (p: Product) => void }) {
  const Icon = product.type === 'DIGITAL_PIN' ? KeyRound : Package;
  return (
    <div className="mp-card group">
      <div className="h-32 rounded-xl bg-gradient-to-br from-violet-600/20 to-orange-500/10 border border-white/[0.06] flex items-center justify-center mb-4 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-12 h-12 text-violet-400/70 group-hover:text-violet-300 transition-colors" />
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        {product.featured && <span className="mp-badge">Featured</span>}
        <span className="text-[10px] text-faint uppercase tracking-wider">{product.type.replace('DIGITAL_', '')}</span>
      </div>
      <h3 className="text-base font-semibold mb-1.5">{product.name}</h3>
      <p className="text-xs text-muted leading-relaxed mb-4 line-clamp-2">{product.shortDescription || product.description}</p>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xl font-bold text-white">{money(product.price)}</div>
          <div className="text-[11px] text-faint">per unit</div>
        </div>
        {product.availableQty !== undefined && (
          <div className="text-right">
            <div className="text-sm font-medium text-emerald-400">{product.availableQty.toLocaleString()}</div>
            <div className="text-[11px] text-faint">available</div>
          </div>
        )}
      </div>
      <button onClick={() => onBuy(product)} className="mp-btn w-full">
        Buy Now <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

const FAQS = [
  { q: 'What is a result-checking PIN?', a: 'A result-checking PIN is a secure code that lets a parent or guardian view a published examination result on the school portal.' },
  { q: 'Who can buy PINs?', a: 'Only school administrators can purchase PIN packs through their school portal. Each PIN costs ₦1,000 and is delivered into the school’s Result PIN inventory.' },
  { q: 'Is a PIN locked to a term?', a: 'Yes. A PIN stays unused until its first successful check. That first use locks it to the current session and term, and it cannot be used for any other term.' },
  { q: 'How many times can a PIN be used?', a: 'Each PIN allows four successful result checks. Invalid attempts and unavailable results do not consume an allowance.' },
  { q: 'When are PINs available?', a: 'After payment is confirmed, PINs are stored in the school Admin Result PIN page where they can be copied or downloaded with a unique sale ID. You can also retrieve them from your order page.' },
  { q: 'What if the school portal is offline after purchase?', a: 'Your confirmed order and PINs are stored centrally by Gtech Global. The school can sync the order later, or we retry delivery automatically.' },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mp-section">
      <div className="text-center mb-10">
        <h2 className="mp-heading">Frequently asked questions</h2>
        <p className="text-muted text-sm mt-2">Everything you need to know before purchasing.</p>
      </div>
      <div className="max-w-3xl mx-auto space-y-2">
        {FAQS.map((faq, i) => (
          <div key={faq.q} className="mp-card p-0 overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-4 p-5 text-left">
              <span className="font-medium text-sm">{faq.q}</span>
              <ChevronRight className={`w-4 h-4 text-violet-400 shrink-0 transition-transform ${open === i ? 'rotate-90' : ''}`} />
            </button>
            {open === i && <p className="px-5 pb-5 text-sm text-muted leading-relaxed">{faq.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MarketplaceHome({ token }: { token?: string }) {
  const navigate = useNavigate();
  const { categories, products, school, loading, error } = useMarketplace(token);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = products.filter((p) =>
    (category === 'all' || p.categoryId === category) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
  );
  const pinProducts = products.filter((p) => p.type === 'DIGITAL_PIN');
  const featured = products.filter((p) => p.featured);

  return (
    <div className="mp-root">
      <div className="mp-glow" />
      <header className="mp-header">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/gtechlogo.png" alt="" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg">Gtech Global <span className="text-violet-400">Result PIN Depot</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted">
            <a href="#products" className="hover:text-white transition">Products</a>
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <button onClick={() => navigate(`/marketplace/orders${token ? `?token=${token}` : ''}`)} className="hover:text-white transition">My Orders</button>
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mp-btn !py-2 !px-4">
            <MessageCircle className="w-4 h-4" /> Support
          </a>
        </div>
      </header>

      {school && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 text-center text-sm">
          <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-400" />
          Purchasing from <strong>{school.name}</strong> dashboard{school.adminName ? ` as ${school.adminName}` : ''} — PINs remain universal.
        </div>
      )}

      <section className="mp-hero">
        <div className="container px-6 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs mb-6">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure digital products by Gtech Global
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-5">
            Digital products, <span className="mp-gradient">delivered instantly.</span>
          </h1>
          <p className="text-muted text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Result PIN packs for school administrators. ₦1,000 per PIN, delivered straight into your school Result PIN inventory and ready to copy or download.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-faint absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#151318] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-6 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-emerald-400" /> Secure checkout</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-400" /> Instant delivery</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified payments</span>
          </div>
        </div>
      </section>

      <section className="mp-section !pt-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => setCategory('all')} className={`mp-chip ${category === 'all' ? 'mp-chip-active' : ''}`}>All products</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={`mp-chip ${category === c.id ? 'mp-chip-active' : ''}`}>
              {c.name} <span className="opacity-50">({c.productCount})</span>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="mp-section text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400">{error}</p>
          <p className="text-sm text-muted mt-2">Make sure the API server is running.</p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="mp-section" id="products">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="mp-heading">Featured products</h2>
                  <p className="text-muted text-sm mt-1">Popular digital products available now.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.map((p) => <ProductCard key={p.id} product={p} onBuy={(prod) => navigate(`/marketplace/product/${prod.slug}${token ? `?token=${token}` : ''}`)} />)}
              </div>
            </section>
          )}

          {pinProducts.length > 0 && (
            <section className="mp-section">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="mp-heading flex items-center gap-2"><KeyRound className="w-5 h-5 text-violet-400" /> Examination PINs</h2>
                  <p className="text-muted text-sm mt-1">Universal result-checking PINs for participating school portals.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {pinProducts.map((p) => <ProductCard key={p.id} product={p} onBuy={(prod) => navigate(`/marketplace/product/${prod.slug}${token ? `?token=${token}` : ''}`)} />)}
              </div>
            </section>
          )}

          <section className="mp-section">
            <h2 className="mp-heading mb-6">All products {filtered.length !== products.length && <span className="text-sm text-muted font-normal">({filtered.length} results)</span>}</h2>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No products found. Try a different search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p) => <ProductCard key={p.id} product={p} onBuy={(prod) => navigate(`/marketplace/product/${prod.slug}${token ? `?token=${token}` : ''}`)} />)}
              </div>
            )}
          </section>
        </>
      )}

      <section className="mp-section" id="how">
        <h2 className="mp-heading text-center mb-10">How it works</h2>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: ShoppingBag, title: 'Choose product', text: 'Select a digital product and quantity.' },
            { icon: CreditCard, title: 'Pay securely', text: 'Checkout through Gtech Global Paystack.' },
            { icon: FileText, title: 'Get receipt', text: 'Receive an instant verified receipt.' },
            { icon: CheckCircle2, title: 'Retrieve PINs', text: 'Access your PINs securely from your order page.' },
          ].map((s, i) => (
            <div key={s.title} className="mp-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-[10px] text-violet-400 mb-1 font-semibold">STEP {i + 1}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="faq"><FAQ /></div>

      <section className="mp-section !pb-20">
        <div className="mp-card p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-violet-600/10 to-orange-500/5">
          <div>
            <h2 className="text-xl font-bold mb-2">Need help with your purchase?</h2>
            <p className="text-sm text-muted">Our support team is available on WhatsApp to assist with orders, PINs and payments.</p>
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mp-btn">
            <Headphones className="w-4 h-4" /> Chat on WhatsApp
          </a>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-faint px-6">
        <p>© {new Date().getFullYear()} Gtech Global Marketplace. All rights reserved.</p>
        <p className="mt-2">Payments processed securely via Paystack. PINs are universal across participating school systems.</p>
      </footer>
    </div>
  );
}
