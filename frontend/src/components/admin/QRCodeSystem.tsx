import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Plus, Save, Trash2, QrCode, Zap, Search, Copy, CheckCircle2,
  XCircle, Download, Loader2, ChevronDown,   BadgeCheck, Layers, X, Check, ShieldOff, AlertTriangle,
} from 'lucide-react';

const API = '/api';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher: string;
  year?: string;
  edition?: string;
  description: string;
  category: string;
  createdAt: string;
}

interface ScanRecord {
  ip: string;
  at: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
}

interface QrRecord {
  id: string;
  code: string;
  serial: string;
  bookId: string;
  bookTitle: string;
  status: 'pending' | 'active' | 'revoked';
  flagged?: boolean;
  flagReason?: string | null;
  flaggedAt?: string | null;
  activatedAt: string | null;
  verifyCount?: number;
  lastVerifiedAt?: string | null;
  recentScans?: ScanRecord[];
  createdAt: string;
}

type SubTab = 'books' | 'generate' | 'activate' | 'codes';

const subTabs: { id: SubTab; label: string; icon: any }[] = [
  { id: 'books', label: 'Register Books', icon: BookOpen },
  { id: 'generate', label: 'Generate Codes', icon: QrCode },
  { id: 'activate', label: 'Activate Codes', icon: Zap },
  { id: 'codes', label: 'All Codes', icon: Layers },
];

const emptyForm = {
  title: '',
  author: '',
  isbn: '',
  publisher: 'Okson Publishers',
  year: '',
  edition: '',
  description: '',
  category: 'General',
};

export default function QRCodeSystem({ token }: { token: string }) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [subTab, setSubTab] = useState<SubTab>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [codes, setCodes] = useState<QrRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  const [selectedBookId, setSelectedBookId] = useState('');
  const [genCount, setGenCount] = useState('10');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Array<{ serial: string; code: string; qr: string }>>([]);

  const [codeInput, setCodeInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState<{ type: string; message: string } | null>(null);

  const [codesFilter, setCodesFilter] = useState<'' | 'pending' | 'active' | 'flagged' | 'revoked'>('');
  const [bookFilter, setBookFilter] = useState('');
  const [codesSearch, setCodesSearch] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{ code: QrRecord; book: Book | null } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, codesRes] = await Promise.all([
        fetch(`${API}/qrcode`, { headers }),
        fetch(`${API}/qrcode/codes`, { headers }),
      ]);
      if (booksRes.ok) setBooks((await booksRes.json()).books || []);
      if (codesRes.ok) setCodes((await codesRes.json()).codes || []);
    } catch (err) {
      console.error('Failed to load QR data:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const setField = (k: keyof typeof emptyForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.title.trim() || !form.author.trim()) {
      setStatus({ type: 'error', message: 'Title and author are required' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/qrcode`, {
        method: 'POST', headers, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: `Book "${data.book.title}" registered!` });
        setForm(emptyForm);
        fetchData();
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to register book' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not connect to server' });
    }
    setSaving(false);
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" and all of its QR codes?`)) return;
    const res = await fetch(`${API}/qrcode/${id}`, { method: 'DELETE', headers });
    if (res.ok) fetchData();
  };

  const handleGenerate = async () => {
    if (!selectedBookId) {
      setStatus({ type: 'error', message: 'Select a book first' });
      return;
    }
    setGenerating(true);
    setStatus(null);
    setGenerated([]);
    try {
      const res = await fetch(`${API}/qrcode/${selectedBookId}/generate`, {
        method: 'POST', headers, body: JSON.stringify({ count: parseInt(genCount, 10) || 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerated(data.codes || []);
        setStatus({ type: 'success', message: `${data.count} QR code${data.count > 1 ? 's' : ''} generated! Scan to activate.` });
        fetchData();
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to generate codes' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not connect to server' });
    }
    setGenerating(false);
  };

  const handleActivate = async () => {
    const code = codeInput.trim().toLowerCase();
    if (!code) {
      setActivationMsg({ type: 'error', message: 'Scan or paste the QR code value first' });
      return;
    }
    setActivating(true);
    setActivationMsg(null);
    try {
      const res = await fetch(`${API}/qrcode/codes/${code}/activate`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (res.ok) {
        setActivationMsg({
          type: data.alreadyActive ? 'info' : 'success',
          message: data.alreadyActive
            ? `Code ${data.code.serial} was already active.`
            : `Code ${data.code?.serial} activated successfully!`,
        });
        setCodeInput('');
        fetchData();
      } else {
        setActivationMsg({ type: 'error', message: data.error || 'Failed to activate code' });
      }
    } catch {
      setActivationMsg({ type: 'error', message: 'Could not connect to server' });
    }
    setActivating(false);
  };

  const fetchCodeDetail = async (code: string) => {
    if (detailCode === code) {
      setDetailCode(null);
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    setDetailCode(code);
    try {
      const res = await fetch(`${API}/qrcode/codes/${code}/detail`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDetailData({ code: data.code, book: data.book });
      }
    } catch (err) {
      console.error('Failed to load code detail:', err);
    }
    setDetailLoading(false);
  };

  const downloadGenerated = async () => {
    if (generated.length === 0) return;
    setDownloading('all');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      const book = books.find((b) => b.id === selectedBookId);
      const title = book?.title || 'Codes';

      const cols = 2;
      const rows = 2;
      const perPage = cols * rows;
      const cellW = 300;
      const cellH = 280;
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      let page = doc.addPage([cols * cellW + 60, rows * cellH + 120]);
      page.drawText(`Okson Publishers - ${title}`, { x: 30, y: page.getHeight() - 40, size: 18, font: boldFont, color: rgb(0.05, 0.05, 0.05) });

      for (let i = 0; i < generated.length; i++) {
        if (i % perPage === 0 && i > 0) {
          page = doc.addPage([cols * cellW + 60, rows * cellH + 120]);
          page.drawText(`Okson Publishers - ${title}`, { x: 30, y: page.getHeight() - 40, size: 18, font: boldFont, color: rgb(0.05, 0.05, 0.05) });
        }
        const posInPage = i % perPage;
        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);
        const g = generated[i];
        const png = await fetch(g.qr).then((r) => r.arrayBuffer());
        const img = await doc.embedPng(new Uint8Array(png));
        const x = 30 + col * cellW;
        const y = 60 + (rows - 1 - row) * cellH;
        page.drawImage(img, { x, y, width: 180, height: 180 });
        page.drawText(g.serial, { x: x + 190, y: y + 120, size: 13, font });
        page.drawText(`${window.location.origin}/verify/${g.code}`, { x: x + 190, y: y + 100, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
      }

      const bytes = await doc.save();
      const pdfArray = new ArrayBuffer(bytes.length);
      new Uint8Array(pdfArray).set(bytes);
      const blob = new Blob([pdfArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `okson-codes-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('PDF generation failed. Try individual downloads instead.');
    }
    setDownloading(null);
  };

  const downloadOne = async (g: { serial: string; code: string; qr: string }) => {
    setDownloading(g.serial);
    const a = document.createElement('a');
    a.href = g.qr;
    a.download = `${g.serial}.png`;
    a.click();
    setDownloading(null);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setActivationMsg({ type: 'info', message: 'Code copied to clipboard — paste in the Activate box.' });
    } catch { /* ignore */ }
  };

  const filteredCodes = codes.filter((c) => {
    if (codesFilter === 'flagged') {
      if (!c.flagged) return false;
    } else if (codesFilter && c.status !== codesFilter) {
      return false;
    }
    if (bookFilter && c.bookId !== bookFilter) return false;
    if (codesSearch) {
      const q = codesSearch.toLowerCase();
      if (!c.serial.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q) && !c.bookTitle.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const flaggedCount = codes.filter((c) => c.flagged).length;
  const revokedCount = codes.filter((c) => c.status === 'revoked').length;

  const selectedBook = books.find((b) => b.id === selectedBookId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo" /> Okson Publishers QR Verification
          </h3>
          <p className="text-xs text-muted mt-1">Register books, generate serial QR codes, activate them, and let readers verify authenticity.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] text-xs hover:bg-white/[0.08] transition-colors">
          Refresh
        </button>
      </div>

      {flaggedCount > 0 && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-rose-300">
              {flaggedCount} code{flaggedCount > 1 ? 's' : ''} flagged for suspicious verification activity
            </div>
            <p className="text-xs text-rose-200/70 mt-0.5">
              Same serial scanned from multiple locations or abnormally often — likely an unauthorized duplicate print.
              Review them under All Codes and revoke any that look fraudulent.
            </p>
          </div>
          <button onClick={() => { setSubTab('codes'); setCodesFilter('flagged'); }} className="shrink-0 text-xs text-rose-300 hover:text-rose-200 underline underline-offset-2">
            Review
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              subTab === t.id ? 'bg-indigo text-white' : 'bg-white/[0.04] text-muted hover:text-white hover:bg-white/[0.08]'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo animate-spin" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          {/* REGISTER BOOKS */}
          {subTab === 'books' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo" /> Register a New Book
                </h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1">
                    <label htmlFor="qr-title" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Title *</label>
                    <input id="qr-title" name="qr-title" type="text" value={form.title} onChange={(e) => setField('title', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" placeholder="e.g. Wisdom of the Ages" />
                  </div>
                  <div>
                    <label htmlFor="qr-author" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Author *</label>
                    <input id="qr-author" name="qr-author" type="text" value={form.author} onChange={(e) => setField('author', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" placeholder="e.g. Okson Adeyemi" />
                  </div>
                  <div>
                    <label htmlFor="qr-isbn" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">ISBN</label>
                    <input id="qr-isbn" name="qr-isbn" type="text" value={form.isbn} onChange={(e) => setField('isbn', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" placeholder="978-... (optional)" />
                  </div>
                  <div>
                    <label htmlFor="qr-publisher" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Publisher</label>
                    <input id="qr-publisher" name="qr-publisher" type="text" value={form.publisher} onChange={(e) => setField('publisher', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="qr-year" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Year</label>
                    <input id="qr-year" name="qr-year" type="text" value={form.year} onChange={(e) => setField('year', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" placeholder="e.g. 2026" />
                  </div>
                  <div>
                    <label htmlFor="qr-edition" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Edition</label>
                    <input id="qr-edition" name="qr-edition" type="text" value={form.edition} onChange={(e) => setField('edition', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" placeholder="e.g. 2nd Edition" />
                  </div>
                  <div>
                    <label htmlFor="qr-category" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Category</label>
                    <input id="qr-category" name="qr-category" type="text" value={form.category} onChange={(e) => setField('category', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" placeholder="e.g. Fiction, Education" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label htmlFor="qr-desc" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Description</label>
                    <textarea id="qr-desc" name="qr-desc" rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors resize-none" placeholder="Short description shown to readers when they verify the code (optional)" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={handleRegister} disabled={saving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo text-white text-sm font-semibold hover:bg-indigo-dark transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Saving...' : 'Register Book'}
                  </button>
                  {status?.type === 'success' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{status.message}</span>}
                  {status?.type === 'error' && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{status.message}</span>}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4">Registered Books <span className="text-faint font-normal">({books.length})</span></h4>
                {books.length === 0 ? (
                  <div className="card p-10 text-center">
                    <BookOpen className="w-10 h-10 text-faint mx-auto mb-3" />
                    <p className="text-sm text-muted">No books registered yet. Use the form above to add one.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {books.map((b) => {
                      const bookCodes = codes.filter((c) => c.bookId === b.id);
                      const active = bookCodes.filter((c) => c.status === 'active').length;
                      return (
                        <div key={b.id} className="card p-5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0">
                              <h5 className="text-sm font-semibold leading-tight">{b.title}</h5>
                              <div className="text-xs text-indigo mt-0.5">{b.author}</div>
                            </div>
                            <button onClick={() => handleDeleteBook(b.id, b.title)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {b.isbn && <div className="text-[11px] text-muted">ISBN: {b.isbn}</div>}
                          <div className="text-[11px] text-muted">{b.category}{b.year ? ` · ${b.year}` : ''}</div>
                          <div className="flex items-center gap-3 mt-3 text-[11px]">
                            <span className="text-muted">Codes: <span className="text-white/80">{bookCodes.length}</span></span>
                            <span className="text-muted">Active: <span className="text-emerald-400">{active}</span></span>
                          </div>
                          <button onClick={() => { setSelectedBookId(b.id); setSubTab('generate'); }}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo/10 text-indigo text-xs font-medium hover:bg-indigo/20 transition-colors">
                            <QrCode className="w-3.5 h-3.5" /> Generate Codes
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GENERATE CODES */}
          {subTab === 'generate' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo" /> Generate Serial QR Codes
                </h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="qr-selbook" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Book</label>
                    <select id="qr-selbook" name="qr-selbook" value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm focus:border-indigo/40 focus:outline-none transition-colors">
                      <option value="">Select a book...</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="qr-count" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Number of Codes</label>
                    <input id="qr-count" name="qr-count" type="number" min={1} max={500} value={genCount} onChange={(e) => setGenCount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm focus:border-indigo/40 focus:outline-none transition-colors" />
                  </div>
                  <div className="lg:col-span-2 flex items-end">
                    <button onClick={handleGenerate} disabled={generating || !selectedBookId}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo text-white text-sm font-semibold hover:bg-indigo-dark transition-all disabled:opacity-50">
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      {generating ? 'Generating...' : `Generate ${parseInt(genCount, 10) || 1} Code${parseInt(genCount, 10) !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-faint mt-3">
                  Codes are generated with unique random tokens and unguessable serial numbers (e.g. OKSON-AB1234). They start as <span className="text-amber-400">pending</span> and must be activated in the "Activate Codes" section before readers can verify them.
                </p>
                {status?.type === 'success' && <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{status.message}</p>}
                {status?.type === 'error' && <p className="text-xs text-red-400 mt-2 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{status.message}</p>}
              </div>

              {generated.length > 0 && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold">Generated Codes ({generated.length}) — {selectedBook?.title}</h4>
                    <div className="flex gap-2">
                      <button onClick={() => setGenerated([])} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] text-xs hover:bg-white/[0.08] transition-colors">
                        <X className="w-3.5 h-3.5" /> Clear
                      </button>
                      <button onClick={downloadGenerated} disabled={downloading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo/10 text-indigo text-xs hover:bg-indigo/20 transition-colors disabled:opacity-50">
                        {downloading === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download All (PDF)
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mb-4">
                    Scan each code with your device to copy or use it in the Activate section. Generated codes remain <span className="text-amber-400">pending</span> until you activate them.
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {generated.map((g) => (
                      <div key={g.serial} className="border border-white/[0.06] rounded-xl p-4 bg-ink flex flex-col items-center">
                        <img src={g.qr} alt={g.serial} className="w-40 h-40 rounded-lg bg-white p-2" />
                        <div className="text-xs font-semibold mt-2">{g.serial}</div>
                        <button onClick={() => copyCode(g.code)} className="mt-2 text-[10px] text-indigo hover:text-indigo/80 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Copy code
                        </button>
                        <button onClick={() => downloadOne(g)} disabled={downloading === g.serial}
                          className="mt-1 text-[10px] text-muted hover:text-white flex items-center gap-1">
                          {downloading === g.serial ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Download PNG
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVATE CODES */}
          {subTab === 'activate' && (
            <div className="space-y-6">
              <div className="card p-6 max-w-2xl">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo" /> Activate a Code
                </h4>
                <p className="text-xs text-muted mb-4">
                  Paste (or scan) the QR code value, then activate it. Once activated, any reader who scans the code will be taken to the verified page showing the book details.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input id="qr-code-input" name="qr-code-input" type="text" value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Paste the code token here..."
                    className="flex-1 px-4 py-3 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                  <button onClick={handleActivate} disabled={activating || !codeInput.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo text-white text-sm font-semibold hover:bg-indigo-dark transition-all disabled:opacity-50">
                    {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Activate
                  </button>
                </div>
                {activationMsg?.type === 'success' && <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{activationMsg.message}</p>}
                {activationMsg?.type === 'info' && <p className="text-xs text-amber-400 mt-3 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" />{activationMsg.message}</p>}
                {activationMsg?.type === 'error' && <p className="text-xs text-red-400 mt-3 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{activationMsg.message}</p>}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4">Pending Codes <span className="text-faint font-normal">(ready to activate)</span></h4>
                {pendingCodes().length === 0 ? (
                  <div className="card p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-muted">No pending codes. Generate new codes to get started.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pendingCodes().slice(0, 30).map((c) => (
                      <div key={c.id} className="card p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{c.serial}</div>
                          <div className="text-[10px] text-muted truncate">{c.bookTitle}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => copyCode(c.code)} className="text-[10px] text-muted hover:text-white flex items-center gap-1">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button onClick={() => activateRecord(c)} className="text-[10px] text-indigo hover:text-indigo/80 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Activate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALL CODES */}
          {subTab === 'codes' && (
            <div className="space-y-4">
              {revokedCount > 0 && (
                <p className="text-[11px] text-faint">
                  {revokedCount} inactive revoked code{revokedCount > 1 ? 's' : ''} (scans show them as revoked).
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                  <input id="codes-search" name="codes-search" type="text" value={codesSearch} onChange={(e) => setCodesSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" placeholder="Search by serial, book, or code..." />
                </div>
                <select id="codes-filter" name="codes-filter" value={codesFilter} onChange={(e) => setCodesFilter(e.target.value as any)}
                  className="px-4 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm focus:border-indigo/40 focus:outline-none transition-colors">
                  <option value="">All Status</option>
                  <option value="flagged">Flagged (Suspicious)</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="revoked">Revoked</option>
                </select>
                <select id="codes-book" name="codes-book" value={bookFilter} onChange={(e) => setBookFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-lg bg-surface border border-white/[0.06] text-white text-sm focus:border-indigo/40 focus:outline-none transition-colors">
                  <option value="">All Books</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>

              <div className="card overflow-hidden">
                {filteredCodes.length === 0 ? (
                  <div className="p-10 text-center">
                    <QrCode className="w-8 h-8 text-faint mx-auto mb-2" />
                    <p className="text-sm text-muted">No codes found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                          <th className="text-left px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium">Serial</th>
                          <th className="text-left px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium">Book</th>
                          <th className="text-left px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium">Status</th>
                          <th className="text-left px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium">Scans</th>
                          <th className="text-left px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium">Created</th>
                          <th className="text-left px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium">Activated</th>
                          <th className="w-28 px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCodes.map((c) => (
                          <>
                            <tr key={c.id} className={`border-b border-white/[0.04] transition-colors ${c.flagged ? 'bg-rose-500/[0.04] hover:bg-rose-500/[0.07]' : 'hover:bg-white/[0.02]'}`}>
                              <td className="px-4 py-3 font-medium text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span>{c.serial}</span>
                                  {c.flagged && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                                </div>
                                {c.flagged && c.flagReason && (
                                  <div title={c.flagReason} className="text-[10px] text-rose-300/80 mt-0.5 max-w-[260px] truncate">{c.flagReason}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted text-xs">{c.bookTitle}</td>
                              <td className="px-4 py-3">
                                {c.flagged ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-500/15 text-rose-300">Flagged</span>
                                ) : c.status === 'active' ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400">Active</span>
                                ) : c.status === 'revoked' ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/[0.06] text-white/50">Revoked</span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400">Pending</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-faint text-xs">
                                {c.verifyCount || 0}
                                {c.lastVerifiedAt && (
                                  <div className="text-[10px]">{new Date(c.lastVerifiedAt).toLocaleString()}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-faint text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-faint text-xs">{c.activatedAt ? new Date(c.activatedAt).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button onClick={() => copyCode(c.code)} title="Copy code" className="text-muted hover:text-white transition-colors">
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => fetchCodeDetail(c.code)} title="View scan details" className="text-muted hover:text-indigo-400 transition-colors">
                                    <ChevronDown className={detailCode === c.code ? 'w-3.5 h-3.5 rotate-180' : 'w-3.5 h-3.5'} />
                                  </button>
                                  <button onClick={() => revokeRecord(c)} title={c.status === 'revoked' ? 'Revoked — click to undo (re-activate)' : 'Revoke this code'}
                                    className="text-muted hover:text-rose-400 transition-colors">
                                    <ShieldOff className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteRecord(c)} title="Delete this code permanently"
                                    className="text-muted hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {detailCode === c.code && (
                              <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                                <td colSpan={7} className="px-4 py-3">
                                  {detailLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                      <Loader2 className="w-6 h-6 text-indigo animate-spin" />
                                      <span className="ml-2 text-sm text-muted">Loading scan details...</span>
                                    </div>
                                  ) : detailData ? (
                                    <div className="border-t border-white/[0.04] pt-4">
                                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        <div className="col-span-1 md:col-span-2">
                                          <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" /> {detailData.book?.title || 'Unknown Book'}
                                            <span className="text-xs text-muted">by {detailData.book?.author || 'Unknown'}</span>
                                          </h4>
                                          <div className="text-xs text-muted space-y-1">
                                            <div>ISBN: {detailData.book?.isbn || '—'}</div>
                                            <div>Publisher: {detailData.book?.publisher || '—'}</div>
                                            <div>Category: {detailData.book?.category || '—'}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Code Info</h4>
                                          <div className="text-xs text-muted space-y-1">
                                            <div>Serial: <span className="text-white/80">{detailData.code.serial}</span></div>
                                            <div>Status: <span className="text-white/80 capitalize">{detailData.code.status}</span></div>
                                            <div>Total Scans: <span className="text-white/80">{detailData.code.verifyCount || 0}</span></div>
                                            <div>Created: <span className="text-white/80">{new Date(detailData.code.createdAt).toLocaleString()}</span></div>
                                            {detailData.code.activatedAt && (
                                              <div>Activated: <span className="text-white/80">{new Date(detailData.code.activatedAt).toLocaleString()}</span></div>
                                            )}
                                            {detailData.code.flagged && (
                                              <div className="text-rose-300">Flagged: {detailData.code.flagReason}</div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="col-span-1 md:col-span-3">
                                          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Scan History ({detailData.code.recentScans?.length || 0})</h4>
                                          {detailData.code.recentScans && detailData.code.recentScans.length > 0 ? (
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="border-b border-white/[0.04] text-left text-muted">
                                                    <th className="px-3 py-2">Date & Time</th>
                                                    <th className="px-3 py-2">IP Address</th>
                                                    <th className="px-3 py-2">Device</th>
                                                    <th className="px-3 py-2">Browser</th>
                                                    <th className="px-3 py-2">OS</th>
                                                    <th className="px-3 py-2">User Agent</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {detailData.code.recentScans.slice().reverse().map((scan, idx) => (
                                                    <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                                                      <td className="px-3 py-2 text-faint">{new Date(scan.at).toLocaleString()}</td>
                                                      <td className="px-3 py-2 text-faint font-mono">{scan.ip}</td>
                                                      <td className="px-3 py-2">{scan.device || 'Unknown'}</td>
                                                      <td className="px-3 py-2">{scan.browser || 'Unknown'}</td>
                                                      <td className="px-3 py-2">{scan.os || 'Unknown'}</td>
                                                      <td className="px-3 py-2 text-faint max-w-[200px] truncate" title={scan.userAgent || ''}>{scan.userAgent || '—'}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-muted text-center py-4">No scan history available</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted text-center py-4">Failed to load details</p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );

  function pendingCodes() {
    return codes.filter((c) => c.status === 'pending');
  }

  async function activateRecord(record: QrRecord) {
    setActivationMsg(null);
    setCodeInput('');
    try {
      const res = await fetch(`${API}/qrcode/codes/${record.code}/activate`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (res.ok) {
        setActivationMsg({ type: 'success', message: `Code ${data.code?.serial} activated!` });
        fetchData();
      } else {
        setActivationMsg({ type: 'error', message: data.error || 'Failed to activate code' });
      }
    } catch {
      setActivationMsg({ type: 'error', message: 'Could not connect to server' });
    }
  }

  async function revokeRecord(record: QrRecord) {
    if (record.status === 'revoked') {
      if (!confirm(`Re-activate ${record.serial}? It will verify as authentic again.`)) return;
      try {
        const res = await fetch(`${API}/qrcode/codes/${record.code}/activate`, {
          method: 'POST', headers,
        });
        const data = await res.json();
        if (res.ok) {
          setActivationMsg({ type: 'success', message: `Code ${record.serial} re-activated.` });
          fetchData();
        } else {
          setActivationMsg({ type: 'error', message: data.error || 'Failed to re-activate code' });
        }
      } catch {
        setActivationMsg({ type: 'error', message: 'Could not connect to server' });
      }
      return;
    }
    const reason = record.flagged
      ? 'Revoke this flagged/suspicious code? It will no longer verify as authentic.'
      : `Revoke ${record.serial}? It will no longer verify as authentic and can be re-activated later if needed.`;
    if (!confirm(reason)) return;
    try {
      const res = await fetch(`${API}/qrcode/codes/${record.code}`, {
        method: 'DELETE', headers,
      });
      const data = await res.json();
      if (res.ok) {
        setActivationMsg({ type: 'success', message: `Code ${record.serial} revoked.` });
        fetchData();
      } else {
        setActivationMsg({ type: 'error', message: data.error || 'Failed to revoke code' });
      }
    } catch {
      setActivationMsg({ type: 'error', message: 'Could not connect to server' });
    }
  }

  async function deleteRecord(record: QrRecord) {
    if (!confirm(`Delete ${record.serial} permanently? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/qrcode/codes/${record.code}/delete`, {
        method: 'DELETE', headers,
      });
      const data = await res.json();
      if (res.ok) {
        setActivationMsg({ type: 'success', message: `Code ${record.serial} deleted.` });
        fetchData();
      } else {
        setActivationMsg({ type: 'error', message: data.error || 'Failed to delete code' });
      }
    } catch {
      setActivationMsg({ type: 'error', message: 'Could not connect to server' });
    }
  }
}
