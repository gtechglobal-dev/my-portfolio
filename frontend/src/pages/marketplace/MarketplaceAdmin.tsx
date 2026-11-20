import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingBag, KeyRound, Package, School, BarChart3,
  Settings, Download, Plus, Search, RefreshCw, LogOut, Menu, X,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { apiUrl } from '../../lib/api';

const API = apiUrl('/api');
type Tab = 'overview' | 'products' | 'pins' | 'orders' | 'schools' | 'reports' | 'settings';

interface Overview {
  totalSales: number; totalRevenue: number; pinRevenue: number; otherRevenue: number;
  pendingOrders: number; failedPayments: number; successfulOrders: number;
  pinsSold: number; availablePins: number; reservedPins: number; redeemedPins: number;
  unusedPins: number; revokedPins: number; productCount: number;
  salesByProduct: Record<string, number>; salesBySchool: Record<string, number>;
  salesTrend: { date: string; amount: number }[];
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="mp-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5 text-white" /></div>
      <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted">{label}</div></div>
    </div>
  );
}

const money = (n: number) => `₦${n.toLocaleString('en-NG')}`;

export default function MarketplaceAdmin() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [productForm, setProductForm] = useState({ name: '', slug: '', description: '', price: '', minQty: '1', maxQty: '500', usageLimit: '3', session: '', type: 'DIGITAL_PIN' });
  const [batchForm, setBatchForm] = useState({ name: '', count: '100', session: '', usageLimit: '3', validityDays: '' });
  const [schoolForm, setSchoolForm] = useState({ name: '' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const api = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API}/admin/marketplace${path}`, { ...options, headers: { ...headers, ...options.headers } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [ov, ord, prod, pn, sch, bat] = await Promise.allSettled([
        api('/overview'), api('/orders'), api('/products'), api('/pins'), api('/schools'), api('/pin-batches'),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (ord.status === 'fulfilled') setOrders(ord.value.orders);
      if (prod.status === 'fulfilled') setProducts(prod.value.products);
      if (pn.status === 'fulfilled') setPins(pn.value.pins);
      if (sch.status === 'fulfilled') setSchools(sch.value.schools);
      if (bat.status === 'fulfilled') setBatches(bat.value.batches);
    } catch (e: any) { setMessage(e.message); }
    setLoading(false);
  };

  useEffect(() => { if (token) load(); }, [token]);

  const login = async () => {
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (e: any) { setLoginError(e.message); }
  };

  const createProduct = async () => {
    try {
      await api('/products', { method: 'POST', body: JSON.stringify({
        ...productForm, price: Number(productForm.price), minQty: Number(productForm.minQty),
        maxQty: Number(productForm.maxQty), usageLimit: Number(productForm.usageLimit),
        categoryId: 'default', available: true, featured: true,
        instructions: 'Complete payment to receive your digital product.',
      }) });
      setShowProductForm(false);
      setMessage('Product created');
      load();
    } catch (e: any) { setMessage(e.message); }
  };

  const generateBatch = async () => {
    try {
      await api('/pin-batches', { method: 'POST', body: JSON.stringify({
        name: batchForm.name || `Batch ${new Date().toLocaleDateString()}`,
        count: Number(batchForm.count), session: batchForm.session || undefined,
        usageLimit: Number(batchForm.usageLimit), validityDays: batchForm.validityDays ? Number(batchForm.validityDays) : undefined,
      }) });
      setShowBatchForm(false);
      setMessage('PIN batch generated');
      load();
    } catch (e: any) { setMessage(e.message); }
  };

  const createSchool = async () => {
    try {
      const data = await api('/schools', { method: 'POST', body: JSON.stringify(schoolForm) });
      setNewApiKey(data.apiKey);
      setShowSchoolForm(false);
      setMessage('School integration created — save the API key now');
      load();
    } catch (e: any) { setMessage(e.message); }
  };

  if (!token) {
    return (
      <div className="mp-root min-h-screen flex items-center justify-center p-6">
        <div className="mp-card w-full max-w-sm p-8">
          <h1 className="text-xl font-bold mb-1">Marketplace Admin</h1>
          <p className="text-xs text-muted mb-6">Gtech Global administration</p>
          <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Username" className="mp-input mb-3" />
          <input value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Password" type="password" className="mp-input mb-3" />
          {loginError && <p className="text-xs text-red-400 mb-3">{loginError}</p>}
          <button onClick={login} className="mp-btn w-full">Sign in</button>
        </div>
      </div>
    );
  }

  const nav: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'pins', label: 'PIN Inventory', icon: KeyRound },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'schools', label: 'School Integrations', icon: School },
    { id: 'reports', label: 'Sales Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="mp-root min-h-screen flex">
      <aside className="w-64 border-r border-white/[0.06] p-4 shrink-0 hidden lg:block">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
          <span className="font-semibold text-sm">Market Admin</span>
        </div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${tab === n.id ? 'bg-violet-500/15 text-violet-300' : 'text-muted hover:text-white hover:bg-white/[0.04]'}`}>
              <n.icon className="w-4 h-4" /> {n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => window.open('/admin', '_blank')} className="w-full mt-6 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white"><LayoutDashboard className="w-4 h-4" /> Main Dashboard</button>
        <button onClick={() => { localStorage.removeItem('admin_token'); setToken(''); }} className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400"><LogOut className="w-4 h-4" /> Logout</button>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="border-b border-white/[0.06] px-6 h-14 flex items-center justify-between sticky top-0 bg-[#08070b]/90 backdrop-blur-xl z-40">
          <h2 className="font-semibold capitalize">{tab}</h2>
          <div className="flex items-center gap-3">
            {message && <span className="text-xs text-emerald-400">{message}</span>}
            <button onClick={load} className="text-muted hover:text-white"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </header>
        <div className="p-6">
          {loading && !overview ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div> : (
            <>
              {tab === 'overview' && overview && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={TrendingUp} label="Total revenue" value={money(overview.totalRevenue)} color="bg-violet-600" />
                    <StatCard icon={CheckCircle2} label="Successful orders" value={overview.successfulOrders} color="bg-emerald-600" />
                    <StatCard icon={Clock} label="Pending orders" value={overview.pendingOrders} color="bg-amber-600" />
                    <StatCard icon={AlertCircle} label="Failed payments" value={overview.failedPayments} color="bg-red-600" />
                    <StatCard icon={KeyRound} label="PINs sold" value={overview.pinsSold} color="bg-blue-600" />
                    <StatCard icon={Package} label="Available PINs" value={overview.availablePins} color="bg-teal-600" />
                    <StatCard icon={CheckCircle2} label="Redeemed PINs" value={overview.redeemedPins} color="bg-indigo-600" />
                    <StatCard icon={BarChart3} label="PIN revenue" value={money(overview.pinRevenue)} color="bg-orange-600" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="mp-card">
                      <h3 className="font-semibold mb-4">Sales by product</h3>
                      {Object.entries(overview.salesByProduct).length === 0 ? <p className="text-sm text-faint">No sales yet</p> :
                        Object.entries(overview.salesByProduct).map(([name, amount]) => (
                          <div key={name} className="flex justify-between py-2 border-b border-white/[0.04] text-sm"><span className="text-muted">{name}</span><span>{money(amount)}</span></div>
                        ))}
                    </div>
                    <div className="mp-card">
                      <h3 className="font-semibold mb-4">Sales by school</h3>
                      {Object.entries(overview.salesBySchool).length === 0 ? <p className="text-sm text-faint">No school purchases yet</p> :
                        Object.entries(overview.salesBySchool).map(([name, amount]) => (
                          <div key={name} className="flex justify-between py-2 border-b border-white/[0.04] text-sm"><span className="text-muted">{name}</span><span>{money(amount)}</span></div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'products' && (
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-semibold">Products ({products.length})</h3>
                    <button onClick={() => setShowProductForm(!showProductForm)} className="mp-btn !py-2 !px-4"><Plus className="w-4 h-4" /> Add product</button>
                  </div>
                  {showProductForm && (
                    <div className="mp-card p-5 mb-5 grid md:grid-cols-2 gap-3">
                      {Object.entries(productForm).map(([key, val]) => (
                        <input key={key} value={val} onChange={(e) => setProductForm({ ...productForm, [key]: e.target.value })} placeholder={key.replace(/([A-Z])/g, ' $1')} className="mp-input" />
                      ))}
                      <button onClick={createProduct} className="mp-btn col-span-full">Create product</button>
                    </div>
                  )}
                  <div className="mp-card !p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/[0.03] text-muted text-xs"><tr><th className="text-left p-4">Product</th><th>Type</th><th>Price</th><th>Limits</th><th>Status</th></tr></thead>
                      <tbody>{products.map((p) => (
                        <tr key={p.id} className="border-t border-white/[0.04]">
                          <td className="p-4 font-medium">{p.name}</td>
                          <td className="text-center text-xs text-muted">{p.type.replace('DIGITAL_', '')}</td>
                          <td className="text-center">{money(p.price)}</td>
                          <td className="text-center text-xs text-muted">{p.minQty}–{p.maxQty}</td>
                          <td className="text-center"><span className={`text-[10px] px-2 py-1 rounded-full ${p.available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{p.available ? 'Active' : 'Inactive'}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'pins' && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">PIN inventory</h3>
                    <button onClick={() => setShowBatchForm(!showBatchForm)} className="mp-btn !py-2 !px-4"><Plus className="w-4 h-4" /> Generate batch</button>
                  </div>
                  {showBatchForm && (
                    <div className="mp-card p-5 grid md:grid-cols-2 gap-3">
                      {Object.entries(batchForm).map(([key, val]) => (
                        <input key={key} value={val} onChange={(e) => setBatchForm({ ...batchForm, [key]: e.target.value })} placeholder={key.replace(/([A-Z])/g, ' $1')} className="mp-input" />
                      ))}
                      <button onClick={generateBatch} className="mp-btn col-span-full">Generate PINs</button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['available', 'reserved', 'sold', 'redeemed', 'revoked'].map((s) => (
                      <div key={s} className="mp-card p-4 text-center"><div className="text-2xl font-bold">{pins.filter((p) => p.status === s).length}</div><div className="text-[11px] text-muted capitalize">{s}</div></div>
                    ))}
                  </div>
                  <div className="mp-card !p-0 overflow-hidden">
                    <table className="w-full text-sm"><thead className="bg-white/[0.03] text-muted text-xs"><tr><th className="text-left p-4">Batch</th><th>Session</th><th>Status</th><th>Usage</th><th></th></tr></thead>
                      <tbody>{pins.slice(0, 100).map((p) => (
                        <tr key={p.id} className="border-t border-white/[0.04]">
                          <td className="p-3 font-mono text-xs">{p.codeLast4}••••</td>
                          <td className="text-center text-xs text-muted">{p.session || '—'}</td>
                          <td className="text-center"><span className={`text-[10px] px-2 py-1 rounded-full bg-white/[0.05] text-muted`}>{p.status}</span></td>
                          <td className="text-center text-xs text-muted">{p.usedCount}/{p.usageLimit}</td>
                          <td className="text-right p-3"><button onClick={async () => { await api(`/pins/${p.id}/revoke`, { method: 'POST' }); load(); }} className="text-red-400 text-xs hover:text-red-300 disabled:opacity-30" disabled={p.status === 'revoked'}>Revoke</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  {batches.length > 0 && <div className="mp-card p-5"><h4 className="font-semibold mb-3 text-sm">Recent batches</h4>{batches.map((b) => <div key={b.id} className="flex justify-between py-2 text-xs border-b border-white/[0.04]"><span className="text-muted">{b.name}</span><span>{b.count} PINs · {new Date(b.createdAt).toLocaleDateString()}</span></div>)}</div>}
                </div>
              )}

              {tab === 'orders' && (
                <div className="mp-card !p-0 overflow-hidden">
                  <table className="w-full text-sm"><thead className="bg-white/[0.03] text-muted text-xs"><tr><th className="text-left p-4">Reference</th><th>Customer</th><th>School</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
                    <tbody>{orders.map((o) => (
                      <tr key={o.id} className="border-t border-white/[0.04]">
                        <td className="p-3 font-mono text-xs">{o.reference}</td>
                        <td className="text-xs text-muted">{o.customer.name}<br /><span className="text-faint">{o.customer.email}</span></td>
                        <td className="text-xs text-muted">{o.schoolName || 'Direct'}</td>
                        <td className="text-xs">{money(o.total)}</td>
                        <td><span className={`text-[10px] px-2 py-1 rounded-full ${o.payment.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{o.payment.status}</span></td>
                        <td className="text-xs text-muted">{o.status}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              {tab === 'schools' && (
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-semibold">Connected schools ({schools.length})</h3>
                    <button onClick={() => setShowSchoolForm(!showSchoolForm)} className="mp-btn !py-2 !px-4"><Plus className="w-4 h-4" /> Add school</button>
                  </div>
                  {newApiKey && <div className="mp-card p-5 mb-5 border-emerald-500/30"><p className="text-xs text-emerald-400 mb-2">Save this API key — it will not be shown again:</p><code className="text-xs break-all bg-black/30 p-3 rounded block">{newApiKey}</code></div>}
                  {showSchoolForm && <div className="mp-card p-5 mb-5 flex gap-3"><input value={schoolForm.name} onChange={(e) => setSchoolForm({ name: e.target.value })} placeholder="School name" className="mp-input flex-1" /><button onClick={createSchool} className="mp-btn">Create</button></div>}
                  <div className="space-y-3">{schools.map((s: any) => (
                    <div key={s.id} className="mp-card p-5 flex flex-wrap items-center justify-between gap-4">
                      <div><div className="font-semibold">{s.name}</div><div className="text-[11px] text-muted mt-1">Last connected: {s.lastConnectedAt ? new Date(s.lastConnectedAt).toLocaleString() : 'Never'} · {s.purchaseCount || 0} purchases · {money(s.totalPurchaseValue || 0)}</div></div>
                      <div className="flex gap-2">
                        <span className={`text-[10px] px-2 py-1 rounded-full ${s.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{s.active ? 'Active' : 'Revoked'}</span>
                        <button onClick={async () => { const d = await api(`/schools/${s.id}/rotate`, { method: 'POST' }); setNewApiKey(d.apiKey); }} className="text-violet-400 text-xs">Rotate key</button>
                        <button onClick={async () => { await api(`/schools/${s.id}/revoke`, { method: 'POST' }); load(); }} className="text-red-400 text-xs">Revoke</button>
                      </div>
                    </div>
                  ))}</div>
                </div>
              )}

              {tab === 'reports' && overview && (
                <div className="space-y-5">
                  <div className="grid md:grid-cols-3 gap-4">
                    <StatCard icon={TrendingUp} label="Total marketplace revenue" value={money(overview.totalRevenue)} color="bg-violet-600" />
                    <StatCard icon={KeyRound} label="Result PIN revenue" value={money(overview.pinRevenue)} color="bg-blue-600" />
                    <StatCard icon={Package} label="Other digital revenue" value={money(overview.otherRevenue)} color="bg-orange-600" />
                  </div>
                  <div className="mp-card p-6">
                    <h3 className="font-semibold mb-5">Sales trend</h3>
                    {overview.salesTrend.length === 0 ? <p className="text-sm text-faint">No confirmed sales yet.</p> :
                      <div className="space-y-2">{overview.salesTrend.slice(-30).map((d) => (
                        <div key={d.date} className="flex items-center gap-3 text-xs"><span className="text-muted w-24">{d.date}</span><div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (d.amount / Math.max(...overview.salesTrend.map((x) => x.amount))) * 100)}%` }} /></div><span className="w-24 text-right">{money(d.amount)}</span></div>
                      ))}</div>}
                  </div>
                </div>
              )}

              {tab === 'settings' && (
                <div className="mp-card p-6 max-w-2xl">
                  <h3 className="font-semibold mb-4">Marketplace configuration</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between border-b border-white/[0.04] pb-3"><span className="text-muted">Payment owner</span><span>Gtech Global</span></div>
                    <div className="flex justify-between border-b border-white/[0.04] pb-3"><span className="text-muted">Payment gateway</span><span>Paystack</span></div>
                    <div className="flex justify-between border-b border-white/[0.04] pb-3"><span className="text-muted">PIN storage</span><span>Hashed + AES-256-GCM encrypted</span></div>
                    <div className="flex justify-between border-b border-white/[0.04] pb-3"><span className="text-muted">PIN ownership</span><span>Universal — no school lock</span></div>
                    <p className="text-xs text-muted leading-relaxed">Configure PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET, PIN_ENCRYPTION_KEY and MARKETPLACE_PUBLIC_URL in your backend environment.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
