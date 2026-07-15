import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn, LogOut, LayoutDashboard, CalendarCheck, MessageSquare,
  Users, Clock, CheckCircle, XCircle, Trash2, Mail, Phone,
  Calendar, Search, Menu, X, ChevronDown, TrendingUp, ArrowRight,
  Palette, Upload, Image as ImageIcon,
} from 'lucide-react';

const API = '/api';

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceCategory: string;
  package: string;
  budget: string;
  description: string;
  status: string;
  createdAt: string;
}

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface GraphicsDesign {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  color: string;
  createdAt: string;
}

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalMessages: number;
  unreadMessages: number;
  recentBookings: Booking[];
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo/20">
            <LayoutDashboard className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-[#a09890] mt-1">Gtech Global Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-sm text-[#a09890] mb-1.5">Username</label>
                            <input id="admin-username" name="admin-username" type="text" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)}
                              className="w-full px-4 py-3 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-sm placeholder-[#6b6560] focus:border-indigo/40 focus:outline-none transition-colors" placeholder="admin" />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm text-[#a09890] mb-1.5">Password</label>
                            <input id="admin-password" name="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-4 py-3 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-sm placeholder-[#6b6560] focus:border-indigo/40 focus:outline-none transition-colors" placeholder="••••••" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-dark transition-all">
            {loading ? 'Signing in...' : 'Sign In'} <LogIn className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-[#a09890]">{label}</div>
      </div>
    </motion.div>
  );
}

function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '234' + digits.slice(1);
  if (digits.startsWith('234')) return digits;
  return '234' + digits;
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<'dashboard' | 'bookings' | 'messages' | 'graphics'>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: string; message: string } | null>(null);
  const [graphics, setGraphics] = useState<GraphicsDesign[]>([]);
  const [gfxTitle, setGfxTitle] = useState('');
  const [gfxCategory, setGfxCategory] = useState('Logo Design');
  const [gfxDescription, setGfxDescription] = useState('');
  const [gfxColor, setGfxColor] = useState('#4f46e5');
  const [gfxImage, setGfxImage] = useState<string | null>(null);
  const [gfxUploading, setGfxUploading] = useState(false);
  const [gfxStatus, setGfxStatus] = useState<{ type: string; message: string } | null>(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, bookingsRes, messagesRes, graphicsRes] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers }),
        fetch(`${API}/bookings`, { headers }),
        fetch(`${API}/contact`, { headers }),
        fetch(`${API}/graphics`, { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(data.messages || []);
      }
      if (graphicsRes.ok) {
        const data = await graphicsRes.json();
        setGraphics(data.graphics || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  useEffect(() => {
    if (tab === 'bookings' && bookings.length === 0 && !loading) fetchData();
    if (tab === 'graphics' && graphics.length === 0 && !loading) fetchData();
  }, [tab]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`${API}/bookings/${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status }),
    });
    if (res.ok) fetchData();
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Delete this booking?')) return;
    const res = await fetch(`${API}/bookings/${id}`, { method: 'DELETE', headers });
    if (res.ok) fetchData();
  };

  const markRead = async (id: string) => {
    await fetch(`${API}/contact/${id}/read`, { method: 'PATCH', headers });
    fetchData();
  };

  const handleSendEmail = async () => {
    const booking = filteredBookings.find(b => b.id === expandedId);
    if (!booking || !replySubject.trim() || !replyMessage.trim()) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`${API}/admin/send-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: booking.clientEmail,
          subject: replySubject.trim(),
          text: replyMessage.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailStatus({ type: 'success', message: 'Reply sent successfully!' });
        setReplySubject('');
        setReplyMessage('');
        setTimeout(() => { setReplyingTo(null); setEmailStatus(null); }, 3000);
      } else {
        setEmailStatus({ type: 'error', message: data.error || 'Failed to send email' });
      }
    } catch {
      setEmailStatus({ type: 'error', message: 'Could not connect to server' });
    }
    setSendingEmail(false);
  };

  const handleGfxImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setGfxStatus({ type: 'error', message: 'Image must be under 5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setGfxImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGfxUpload = async () => {
    if (!gfxTitle.trim() || !gfxImage) {
      setGfxStatus({ type: 'error', message: 'Title and image are required' });
      return;
    }
    setGfxUploading(true);
    setGfxStatus(null);
    try {
      const res = await fetch(`${API}/graphics`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: gfxTitle.trim(),
          category: gfxCategory,
          description: gfxDescription.trim(),
          image: gfxImage,
          color: gfxColor,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGfxStatus({ type: 'success', message: 'Design uploaded successfully!' });
        setGfxTitle('');
        setGfxDescription('');
        setGfxImage(null);
        setGfxColor('#4f46e5');
        fetchData();
        setTimeout(() => setGfxStatus(null), 3000);
      } else {
        setGfxStatus({ type: 'error', message: data.error || 'Upload failed' });
      }
    } catch {
      setGfxStatus({ type: 'error', message: 'Could not connect to server' });
    }
    setGfxUploading(false);
  };

  const deleteGraphics = async (id: string) => {
    if (!confirm('Delete this design?')) return;
    const res = await fetch(`${API}/graphics/${id}`, { method: 'DELETE', headers });
    if (res.ok) fetchData();
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.clientName.toLowerCase().includes(q) || b.clientEmail.toLowerCase().includes(q) || b.clientPhone.includes(q);
    }
    return true;
  });

  type NavId = 'dashboard' | 'bookings' | 'messages' | 'graphics';
  const navItems: { id: NavId; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck, badge: stats?.pendingBookings },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: stats?.unreadMessages },
    { id: 'graphics', label: 'Graphics', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-[#0c0b0a] flex">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0f0f1a] border-r border-white/[0.04] transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo to-violet-600 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Gtech Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#a09890]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                tab === item.id ? 'bg-indigo/10 text-indigo' : 'text-[#a09890] hover:text-white hover:bg-white/[0.03]'
              }`}>
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="ml-auto text-[10px] bg-indigo/20 text-indigo px-2 py-0.5 rounded-full font-medium">{item.badge}</span>
              ) : null}
            </button>
          ))}
          <hr className="my-2 border-white/[0.04]" />
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all">
            <LogOut className="w-4 h-4" /> <span>Logout</span>
          </button>
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 bg-[#0c0b0a]/80 backdrop-blur-xl border-b border-white/[0.04] px-6 h-14 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#a09890]">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold capitalize">{tab}</h2>
          <div className="ml-auto flex items-center gap-2 text-xs text-[#6b6560]">
            <button onClick={fetchData} className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors" title="Refresh data">
              Refresh
            </button>
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-indigo border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                {tab === 'dashboard' && stats && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard icon={CalendarCheck} label="Total Bookings" value={stats.totalBookings} color="bg-indigo" />
                      <StatCard icon={Clock} label="Pending" value={stats.pendingBookings} color="bg-violet-500" />
                      <StatCard icon={CheckCircle} label="Completed" value={stats.completedBookings} color="bg-emerald-500" />
                      <StatCard icon={MessageSquare} label="Unread Messages" value={stats.unreadMessages} color="bg-rose-500" />
                    </div>
                    <div className="card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold">Recent Bookings</h3>
                        <button onClick={() => setTab('bookings')} className="text-xs text-indigo hover:text-indigo/80 flex items-center gap-1">
                          View all <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      {stats.recentBookings.length === 0 ? (
                        <p className="text-sm text-[#6b6560] text-center py-6">No bookings yet</p>
                      ) : (
                        <div className="space-y-2">
                          {stats.recentBookings.map((b) => (
                            <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                              <div>
                                <div className="text-sm font-medium">{b.clientName}</div>
                                <div className="text-xs text-[#a09890]">{b.serviceCategory.replace('-', ' ')}</div>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                b.status === 'pending' ? 'bg-violet-500/10 text-violet-400' :
                                b.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                                b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>{b.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="card p-5">
                        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                          <button onClick={() => { window.open('/', '_blank'); }} className="w-full text-left px-3 py-2.5 rounded-lg bg-white/[0.03] text-sm hover:bg-white/[0.06] transition-colors">
                            View Live Site
                          </button>
                          <button onClick={() => setTab('bookings')} className="w-full text-left px-3 py-2.5 rounded-lg bg-white/[0.03] text-sm hover:bg-white/[0.06] transition-colors">
                            Manage Bookings
                          </button>
                          <button onClick={() => setTab('messages')} className="w-full text-left px-3 py-2.5 rounded-lg bg-white/[0.03] text-sm hover:bg-white/[0.06] transition-colors">
                            View Messages
                          </button>
                        </div>
                      </div>
                      <div className="card p-5">
                        <h3 className="text-sm font-semibold mb-3">Booking Status</h3>
                        {stats.totalBookings > 0 ? (
                          <div className="space-y-2">
                            {[
                              { label: 'Pending', value: stats.pendingBookings, color: 'bg-violet-500' },
                              { label: 'Approved', value: stats.approvedBookings, color: 'bg-blue-500' },
                              { label: 'Completed', value: stats.completedBookings, color: 'bg-emerald-500' },
                              { label: 'Cancelled', value: stats.cancelledBookings, color: 'bg-red-500' },
                            ].map((s) => (
                              <div key={s.label} className="flex items-center gap-3">
                                <span className="text-xs text-[#a09890] w-16">{s.label}</span>
                                <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                                  <div className={`h-full rounded-full ${s.color} transition-all`}
                                    style={{ width: `${(s.value / stats.totalBookings) * 100}%` }} />
                                </div>
                                <span className="text-xs font-medium w-6 text-right">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#6b6560] text-center py-4">No data yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'bookings' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6560]" />
                        <input id="booking-search" name="booking-search" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-sm placeholder-[#6b6560] focus:border-indigo/40 focus:outline-none transition-colors" placeholder="Search bookings..." />
                      </div>
                      <div className="relative">
                        <label htmlFor="booking-status-filter" className="sr-only">Filter by status</label>
                        <select id="booking-status-filter" name="booking-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                          className="appearance-none px-4 py-2.5 pr-8 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-sm focus:border-indigo/40 focus:outline-none transition-colors">
                          <option value="">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6560] pointer-events-none" />
                      </div>
                    </div>

                    {filteredBookings.length === 0 ? (
                      <div className="card p-10 text-center">
                        <CalendarCheck className="w-10 h-10 text-[#6b6560] mx-auto mb-3" />
                        <p className="text-sm text-[#a09890]">No bookings found</p>
                      </div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                                <th className="text-left px-4 py-3 text-[10px] text-[#a09890] uppercase tracking-wider font-medium">Client</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#a09890] uppercase tracking-wider font-medium">Category</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#a09890] uppercase tracking-wider font-medium">Package</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#a09890] uppercase tracking-wider font-medium">Budget</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#a09890] uppercase tracking-wider font-medium">Status</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#a09890] uppercase tracking-wider font-medium">Date</th>
                                <th className="w-12 px-4 py-3"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredBookings.map((b) => (
                                <>
                                  <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}>
                                    <td className="px-4 py-3">
                                      <div className="font-medium text-sm">{b.clientName}</div>
                                      <div className="text-[10px] text-[#6b6560]">{b.clientEmail}</div>
                                    </td>
                                    <td className="px-4 py-3 text-[#a09890] text-xs capitalize">{b.serviceCategory.replace('-', ' ')}</td>
                                    <td className="px-4 py-3 text-[#a09890] text-xs">{b.package || 'N/A'}</td>
                                    <td className="px-4 py-3 text-[#a09890] text-xs">{b.budget}</td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        b.status === 'pending' ? 'bg-violet-500/10 text-violet-400' :
                                        b.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                                        b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                      }`}>{b.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[#6b6560] text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                      <ChevronDown className={`w-4 h-4 text-[#a09890] transition-transform ${expandedId === b.id ? 'rotate-180' : ''}`} />
                                    </td>
                                  </tr>
                                  {expandedId === b.id && (
                                    <tr key={`${b.id}-details`}>
                                      <td colSpan={7} className="px-4 py-4 bg-white/[0.02] border-b border-white/[0.04]">
                                        <div className="space-y-4">
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                              <div className="text-[10px] text-[#a09890] uppercase tracking-wider mb-1">Description</div>
                                              <p className="text-xs leading-relaxed text-[#c0c0d0]">{b.description}</p>
                                            </div>
                                            <div>
                                              <div className="text-[10px] text-[#a09890] uppercase tracking-wider mb-1">Contact</div>
                                              <div className="space-y-1.5">
                                                <a href={`mailto:${b.clientEmail}`} className="flex items-center gap-2 text-xs text-indigo hover:text-indigo/80 transition-colors">
                                                  <Mail className="w-3.5 h-3.5" /> {b.clientEmail}
                                                </a>
                                                <div className="flex items-center gap-2 text-xs text-[#a09890]">
                                                  <Phone className="w-3.5 h-3.5" /> {b.clientPhone}
                                                </div>
                                              </div>
                                              <div className="mt-2 text-[10px] text-[#6b6560]">
                                                Submitted: {new Date(b.createdAt).toLocaleString()}
                                              </div>
                                            </div>
                                          </div>

                                          <hr className="border-white/[0.04]" />

                                          {replyingTo === b.id ? (
                                            <div className="space-y-3 max-w-lg">
                                              <div>
                                                <label htmlFor={`reply-to-${b.id}`} className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1">To</label>
                                                <input id={`reply-to-${b.id}`} name={`reply-to-${b.id}`} type="text" value={b.clientEmail} readOnly
                                                  className="w-full px-3 py-2 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-xs" />
                                              </div>
                                              <div>
                                                <label htmlFor={`reply-subject-${b.id}`} className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1">Subject</label>
                                                <input id={`reply-subject-${b.id}`} name={`reply-subject-${b.id}`} type="text" value={replySubject} onChange={(e) => setReplySubject(e.target.value)}
                                                  className="w-full px-3 py-2 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-xs focus:border-indigo/40 focus:outline-none" placeholder="Subject" />
                                              </div>
                                              <div>
                                                <label htmlFor={`reply-message-${b.id}`} className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1">Message</label>
                                                <textarea id={`reply-message-${b.id}`} name={`reply-message-${b.id}`} rows={4} value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)}
                                                  className="w-full px-3 py-2 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-xs focus:border-indigo/40 focus:outline-none resize-none" placeholder="Type your reply..." />
                                              </div>
                                              <div className="flex gap-2">
                                                <button onClick={handleSendEmail} disabled={sendingEmail}
                                                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo text-white text-xs font-medium hover:bg-indigo/80 transition-colors disabled:opacity-50">
                                                  {sendingEmail ? 'Sending...' : 'Send Reply'} <Mail className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setReplyingTo(null)}
                                                  className="px-4 py-2 rounded-lg bg-white/[0.04] text-[#a09890] text-xs hover:text-white transition-colors">
                                                  Cancel
                                                </button>
                                              </div>
                                              {emailStatus && (
                                                <p className={`text-xs ${emailStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                  {emailStatus.message}
                                                </p>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex flex-wrap items-center gap-2">
                                              <button onClick={() => { setReplyingTo(b.id); setReplySubject('Re: Your Booking Enquiry'); setReplyMessage(''); setEmailStatus(null); }}
                                                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo/10 text-indigo text-xs font-medium hover:bg-indigo/20 transition-colors">
                                                <Mail className="w-4 h-4" /> Reply via Email
                                              </button>
                                              <a href={`https://wa.me/${formatPhoneForWhatsApp(b.clientPhone)}?text=Hi ${b.clientName}, regarding your booking enquiry...`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                                                <MessageSquare className="w-4 h-4" /> WhatsApp
                                              </a>
                                              <div className="flex-1" />
                                              {b.status !== 'approved' && (
                                                <button onClick={() => { updateStatus(b.id, 'approved'); setExpandedId(null); }}
                                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-colors">
                                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                                </button>
                                              )}
                                              {b.status !== 'completed' && (
                                                <button onClick={() => { updateStatus(b.id, 'completed'); setExpandedId(null); }}
                                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">
                                                  <CheckCircle className="w-3.5 h-3.5" /> Complete
                                                </button>
                                              )}
                                              {b.status !== 'cancelled' && (
                                                <button onClick={() => { updateStatus(b.id, 'cancelled'); setExpandedId(null); }}
                                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors">
                                                  <XCircle className="w-3.5 h-3.5" /> Cancel
                                                </button>
                                              )}
                                              <button onClick={() => { deleteBooking(b.id); setExpandedId(null); }}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'messages' && (
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {messages.length === 0 ? (
                        <div className="card p-10 text-center">
                          <MessageSquare className="w-10 h-10 text-[#6b6560] mx-auto mb-3" />
                          <p className="text-sm text-[#a09890]">No messages yet</p>
                        </div>
                      ) : (
                        messages.map((m) => (
                          <button key={m.id} onClick={() => { setSelectedMsg(m); if (!m.read) markRead(m.id); }}
                            className={`w-full text-left card p-4 transition-all ${!m.read ? 'border-indigo/30' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold">{m.name}</h4>
                              {!m.read && <span className="w-2 h-2 rounded-full bg-indigo" />}
                            </div>
                            <p className="text-xs text-[#a09890]">{m.subject}</p>
                            <p className="text-xs text-[#6b6560] mt-1 line-clamp-2">{m.message}</p>
                            <div className="text-[10px] text-[#6b6560] mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                          </button>
                        ))
                      )}
                    </div>
                    <div>
                      {selectedMsg ? (
                        <div className="card p-5 sticky top-20">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold">{selectedMsg.name}</h3>
                            <button onClick={() => setSelectedMsg(null)} className="text-[#6b6560] hover:text-white text-xs">Close</button>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div><span className="text-[#a09890] text-xs">Email:</span> <a href={`mailto:${selectedMsg.email}`} className="text-indigo text-xs">{selectedMsg.email}</a></div>
                            <div><span className="text-[#a09890] text-xs">Subject:</span> <span className="text-xs">{selectedMsg.subject}</span></div>
                            <div><span className="text-[#a09890] text-xs">Date:</span> <span className="text-xs">{new Date(selectedMsg.createdAt).toLocaleString()}</span></div>
                            <hr className="border-white/[0.04]" />
                            <p className="text-sm leading-relaxed">{selectedMsg.message}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="card p-10 text-center">
                          <MessageSquare className="w-10 h-10 text-[#6b6560] mx-auto mb-3" />
                          <p className="text-sm text-[#a09890]">Select a message to read</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tab === 'graphics' && (
                  <div className="space-y-6">
                    <div className="card p-6">
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-indigo" />
                        Upload New Design
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="gfx-title" className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1.5">Title *</label>
                            <input id="gfx-title" name="gfx-title" type="text" value={gfxTitle} onChange={(e) => setGfxTitle(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-sm placeholder-[#6b6560] focus:border-indigo/40 focus:outline-none transition-colors"
                              placeholder="e.g. Premium Logo Concept" />
                          </div>
                          <div>
                            <label htmlFor="gfx-category" className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1.5">Category</label>
                            <select id="gfx-category" name="gfx-category" value={gfxCategory} onChange={(e) => setGfxCategory(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-sm focus:border-indigo/40 focus:outline-none transition-colors">
                              <option>Logo Design</option>
                              <option>Flyer Design</option>
                              <option>Banner Ad</option>
                              <option>Social Media</option>
                              <option>Brand Identity</option>
                              <option>Business Card</option>
                              <option>Poster</option>
                              <option>Other</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="gfx-description" className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1.5">Description</label>
                            <textarea id="gfx-description" name="gfx-description" rows={3} value={gfxDescription} onChange={(e) => setGfxDescription(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg bg-[#151412] border border-white/[0.06] text-white text-sm placeholder-[#6b6560] focus:border-indigo/40 focus:outline-none transition-colors resize-none"
                              placeholder="Brief description of the design..." />
                          </div>
                          <div>
                            <label htmlFor="gfx-color" className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1.5">Accent Color</label>
                            <div className="flex items-center gap-3">
                              <input id="gfx-color" name="gfx-color" type="color" value={gfxColor} onChange={(e) => setGfxColor(e.target.value)}
                                className="w-10 h-10 rounded-lg border border-white/[0.06] cursor-pointer bg-transparent" />
                              <span className="text-xs text-[#6b6560]">{gfxColor}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="gfx-image" className="text-[10px] text-[#a09890] uppercase tracking-wider block mb-1.5">Image * (max 5MB)</label>
                            <label htmlFor="gfx-image" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/[0.08] rounded-xl cursor-pointer hover:border-indigo/30 transition-colors bg-[#151412]">
                              {gfxImage ? (
                                <img src={gfxImage} alt="Preview" className="w-full h-full object-contain rounded-xl p-2" />
                              ) : (
                                <div className="text-center">
                                  <ImageIcon className="w-8 h-8 text-[#6b6560] mx-auto mb-2" />
                                  <p className="text-xs text-[#6b6560]">Click to select image</p>
                                  <p className="text-[10px] text-[#6b6560] mt-1">PNG, JPG, WebP</p>
                                </div>
                              )}
                              <input id="gfx-image" name="gfx-image" type="file" accept="image/*" onChange={handleGfxImageChange} className="hidden" />
                            </label>
                          </div>
                          <button onClick={handleGfxUpload} disabled={gfxUploading || !gfxTitle.trim() || !gfxImage}
                            className="w-full py-2.5 rounded-lg bg-indigo text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            {gfxUploading ? 'Uploading...' : 'Upload Design'} <Upload className="w-4 h-4" />
                          </button>
                          {gfxStatus && (
                            <p className={`text-xs ${gfxStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {gfxStatus.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-4">
                        Uploaded Designs <span className="text-[#6b6560] font-normal">({graphics.length})</span>
                      </h3>
                      {graphics.length === 0 ? (
                        <div className="card p-10 text-center">
                          <Palette className="w-10 h-10 text-[#6b6560] mx-auto mb-3" />
                          <p className="text-sm text-[#a09890]">No designs uploaded yet</p>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {graphics.map((d) => (
                            <div key={d.id} className="card p-0 overflow-hidden group">
                              <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#0c0b0a] flex items-center justify-center p-2">
                                <img src={d.image} alt={d.title} className="max-w-full max-h-full object-contain" />
                                <button onClick={() => deleteGraphics(d.id)}
                                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/60">
                                  <Trash2 className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                              <div className="p-3">
                                <span className="text-[9px] uppercase tracking-wider text-white/40">{d.category}</span>
                                <h4 className="text-xs font-semibold mt-0.5">{d.title}</h4>
                                <div className="text-[9px] text-[#6b6560] mt-1">{new Date(d.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/admin/verify`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) { setToken(null); localStorage.removeItem('admin_token'); } })
      .catch(() => { setToken(null); localStorage.removeItem('admin_token'); });
  }, [token]);

  const handleLogin = (t: string) => {
    localStorage.setItem('admin_token', t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
