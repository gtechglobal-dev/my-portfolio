import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeImage } from '../../lib/image';
import {
  BookOpen, Plus, Save, Trash2, QrCode, Zap, Search, Copy, CheckCircle2,
  XCircle, Download, Loader2, ChevronDown, BadgeCheck, Layers, X, Check, ShieldOff, AlertTriangle, Pencil, ScanLine, Hash, RefreshCw,
} from 'lucide-react';

const API = '/api';

const SERIAL_PREFIX = 'OKSON-';

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
  frontCover?: string | null;
  backCover?: string | null;
  bookCode?: string;
  createdAt: string;
}

interface SerialRecord {
  serial: string;
  code: string;
}

interface ScanRecord {
  ip: string;
  at: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
  state?: string;
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
  alertSent?: boolean;
  alertAt?: string | null;
  activatedAt: string | null;
  verifyCount?: number;
  lastVerifiedAt?: string | null;
  recentScans?: ScanRecord[];
  locations?: string[];
  devices?: string[];
  flagCombos?: string[];
  createdAt: string;
}

type SubTab = 'register' | 'books' | 'activate' | 'codes';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

  const subTabs: { id: SubTab; label: string; icon: any }[] = [
    { id: 'register', label: 'Register Book', icon: Plus },
    { id: 'books', label: 'Registered Books', icon: BookOpen },
    { id: 'activate', label: 'Activate Serials', icon: Zap },
    { id: 'codes', label: 'All Serials', icon: Hash },
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

function CoverThumb({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="aspect-[3/4] w-20 rounded-lg overflow-hidden border border-white/[0.08] shrink-0">
      <img src={url} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}

// Small angled book mockup (auto-generated from the uploaded cover) shown in the
// admin so the publisher can see exactly what readers will see on verify.
function AdminMockup({ url, alt }: { url: string; alt: string }) {
  const w = 60;
  const h = Math.round(w * 1.35);
  const thick = 8;
  return (
    <div
      className="rounded-lg border border-white/[0.12] bg-white/[0.03] p-2.5 shadow-lg select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div style={{ perspective: 700 }}>
        <div className="relative" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-24deg)' }}>
          <div
            className="absolute rounded"
            style={{ width: w, height: h, background: 'linear-gradient(140deg,#2a2a30,#14141a)', transform: 'translateZ(-2px)' }}
          />
          <div
            className="absolute rounded-sm"
            style={{ left: w - 2, width: thick, height: h, background: 'repeating-linear-gradient(90deg,#f4f0e6 0 2px,#e2dccb 2px 4px)', transform: 'rotateY(-90deg)', transformOrigin: 'left center' }}
          />
          <img
            src={url}
            alt={alt}
            draggable={false}
            className="relative rounded-r-sm"
            style={{ width: w, height: h, objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' } as any}
          />
        </div>
      </div>
    </div>
  );
}

export default function QRCodeSystem({ token }: { token: string }) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [subTab, setSubTab] = useState<SubTab>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [codes, setCodes] = useState<QrRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);
  const [formStatus, setFormStatus] = useState<{ type: string; message: string } | null>(null);

  const [frontCover, setFrontCover] = useState<string | null>(null);
  const [backCover, setBackCover] = useState<string | null>(null);
  const [coverErrors, setCoverErrors] = useState<string>('');

  const [regQr, setRegQr] = useState<{ book: Book; qr: string } | null>(null);

  const [coverBookId, setCoverBookId] = useState<string | null>(null);
  const [coverUpload, setCoverUpload] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });
  const [coverSaving, setCoverSaving] = useState(false);

  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  const [selectedBookId, setSelectedBookId] = useState('');
  const [genCount, setGenCount] = useState('10');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<SerialRecord[]>([]);
  const [genQr, setGenQr] = useState<string | null>(null);
  const [genBookCode, setGenBookCode] = useState<string | null>(null);
  const [genBookId, setGenBookId] = useState('');

  // Inline panels inside each registered book card.
  const [cardPanel, setCardPanel] = useState<{ bookId: string; panel: 'generate' | 'qr' | 'covers' | 'edit' } | null>(null);
  const [cardQr, setCardQr] = useState<{ bookId: string; qr: string; verifyUrl: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [confirmBox, setConfirmBox] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmBox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      setFormStatus({ type: 'error', message: 'Title and author are required' });
      return;
    }
    setSaving(true);
    setFormStatus(null);
    setCoverErrors('');
    try {
      const res = await fetch(`${API}/qrcode`, {
        method: 'POST', headers, body: JSON.stringify({ ...form, frontCover, backCover }),
      });
      const data = await res.json();
      if (res.ok) {
        setFormStatus({ type: 'success', message: `Book "${data.book.title}" registered!` });
        setForm(emptyForm);
        setFrontCover(null);
        setBackCover(null);
        setRegQr({ book: data.book, qr: data.qr });
        fetchData();
      } else {
        setFormStatus({ type: 'error', message: data.error || 'Failed to register book' });
      }
    } catch {
      setFormStatus({ type: 'error', message: 'Could not connect to server' });
    }
    setSaving(false);
  };

  const pickCover = async (kind: 'front' | 'back') => {
    setCoverErrors('');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setCoverErrors('Image must be 5MB or smaller. Please use a smaller image.');
        return;
      }
      try {
        const optimized = await optimizeImage(file, { maxWidth: 900, maxHeight: 1200 });
        if (kind === 'front') setFrontCover(optimized);
        else setBackCover(optimized);
      } catch {
        setCoverErrors('Could not read the image file.');
      }
    };
    input.click();
  };

  const pickCoverUpload = async (kind: 'front' | 'back') => {
    setCoverErrors('');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setCoverErrors('Image must be 5MB or smaller. Please use a smaller image.');
        return;
      }
      try {
        const optimized = await optimizeImage(file, { maxWidth: 900, maxHeight: 1200 });
        setCoverUpload((c) => ({ ...c, [kind]: optimized }));
      } catch {
        setCoverErrors('Could not read the image file.');
      }
    };
    input.click();
  };

  const saveCovers = async (bookId: string) => {
    if (!coverUpload.front && !coverUpload.back) return;
    setCoverSaving(true);
    setCoverErrors('');
    try {
      const res = await fetch(`${API}/qrcode/${bookId}/covers`, {
        method: 'POST', headers, body: JSON.stringify(coverUpload),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: 'Book covers updated!' });
        setCoverUpload({ front: null, back: null });
        setCoverBookId(null);
        setCardPanel(null);
        fetchData();
      } else {
        setCoverErrors(data.error || 'Failed to upload covers');
      }
    } catch {
      setCoverErrors('Could not connect to server');
    }
    setCoverSaving(false);
  };

  const startEditBook = (b: Book) => {
    setEditBookId(b.id);
    setEditForm({
      title: b.title,
      author: b.author,
      isbn: b.isbn || '',
      publisher: b.publisher,
      year: b.year || '',
      edition: b.edition || '',
      description: b.description,
      category: b.category,
    });
  };

  const setEditField = (k: keyof typeof emptyForm, v: string) =>
    setEditForm((f) => ({ ...f, [k]: v }));

  const handleSaveEdit = async () => {
    if (!editBookId) return;
    if (!editForm.title.trim() || !editForm.author.trim()) {
      setStatus({ type: 'error', message: 'Title and author are required' });
      return;
    }
    setEditSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/qrcode/${editBookId}`, {
        method: 'PATCH', headers, body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: `Book "${data.book.title}" updated!` });
        setEditBookId(null);
        setCardPanel(null);
        fetchData();
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to update book' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not connect to server' });
    }
    setEditSaving(false);
  };

  const handleDeleteBook = (id: string, title: string) => {
    setConfirmBox({
      title: 'Delete Book',
      message: `Delete "${title}" and all of its QR codes? This cannot be undone.`,
      confirmLabel: 'Delete Book',
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`${API}/qrcode/${id}`, { method: 'DELETE', headers });
        if (res.ok) fetchData();
      },
    });
  };

  const handleGenerate = async () => {
    if (!selectedBookId) {
      setStatus({ type: 'error', message: 'Select a book first' });
      return;
    }
    setGenerating(true);
    setStatus(null);
    setGenerated([]);
    setGenQr(null);
    setGenBookCode(null);
    setGenBookId(selectedBookId);
    try {
      const res = await fetch(`${API}/qrcode/${selectedBookId}/generate`, {
        method: 'POST', headers, body: JSON.stringify({ count: parseInt(genCount, 10) || 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerated(data.codes || []);
        setGenQr(data.qr || null);
        setGenBookCode(data.bookCode || null);
        setStatus({ type: 'success', message: `${data.count} serial number${data.count > 1 ? 's' : ''} generated for the book QR!` });
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
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setActivationMsg({ type: 'error', message: 'Enter a serial number (e.g. OKSON-AB1234)' });
      return;
    }
    setActivating(true);
    setActivationMsg(null);
    try {
      const res = await fetch(`${API}/qrcode/codes/${encodeURIComponent(code)}/activate`, {
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

  const viewBookQr = async (book: Book) => {
    setQrLoading(true);
    setCardQr(null);
    setSelectedBookId(book.id);
    try {
      const resp = await fetch(`${API}/qrcode/${book.id}/qr`, { headers });
      const data = await resp.json();
      if (!resp.ok || !data.qr) throw new Error('No QR');
      setCardQr({ bookId: book.id, qr: data.qr, verifyUrl: data.verifyUrl });
    } catch {
      setStatus({ type: 'error', message: 'Could not load the book QR. Try again.' });
    }
    setQrLoading(false);
  };

  const downloadGenerated = async () => {
    if (generated.length === 0) return;
    setDownloading('all');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      const book = books.find((b) => b.id === selectedBookId);
      const title = book?.title || 'Codes';

      const cols = 1;
      const rows = 4;
      const perPage = cols * rows;
      const cellW = 400;
      const cellH = 150;
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      let page = doc.addPage([cols * cellW + 60, rows * cellH + 170]);
      page.drawText(`Okson Publishers - ${title}`, { x: 30, y: page.getHeight() - 40, size: 18, font: boldFont, color: rgb(0.05, 0.05, 0.05) });

      // The single book QR on every page
      let bookQr = genQr;
      if (!bookQr && book?.bookCode) {
        const resp = await fetch(`${API}/qrcode/${book.id}/qr`, { headers });
        const data = await resp.json();
        if (resp.ok) bookQr = data.qr;
      }
      if (bookQr) {
        const png = await fetch(bookQr).then((r) => r.arrayBuffer());
        const img = await doc.embedPng(new Uint8Array(png));
        page.drawImage(img, { x: 30, y: page.getHeight() - 150, width: 100, height: 100 });
        page.drawText('Scan this QR once — then enter the serial printed on the book.', { x: 140, y: page.getHeight() - 90, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText('Every serial under this book verifies with this same QR.', { x: 140, y: page.getHeight() - 108, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      }

      for (let i = 0; i < generated.length; i++) {
        if (i % perPage === 0 && i > 0) {
          page = doc.addPage([cols * cellW + 60, rows * cellH + 170]);
          page.drawText(`Okson Publishers - ${title}`, { x: 30, y: page.getHeight() - 40, size: 18, font: boldFont, color: rgb(0.05, 0.05, 0.05) });
          if (bookQr) {
            const png = await fetch(bookQr).then((r) => r.arrayBuffer());
            const img = await doc.embedPng(new Uint8Array(png));
            page.drawImage(img, { x: 30, y: page.getHeight() - 150, width: 100, height: 100 });
            page.drawText('Scan this QR once — then enter the serial printed on the book.', { x: 140, y: page.getHeight() - 90, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
            page.drawText('Every serial under this book verifies with this same QR.', { x: 140, y: page.getHeight() - 108, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
          }
        }
        const posInPage = i % perPage;
        const g = generated[i];
        const y = 40 + (rows - 1 - Math.floor(posInPage / cols)) * cellH;
        page.drawText(g.serial, { x: 40, y: y + 70, size: 20, font: boldFont });
        page.drawText(`Verify at ${window.location.origin}/verify`, { x: 40, y: y + 48, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
      }

      const bytes = await doc.save();
      const pdfArray = new ArrayBuffer(bytes.length);
      new Uint8Array(pdfArray).set(bytes);
      const blob = new Blob([pdfArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `okson-serials-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('PDF generation failed. Try again.');
    }
    setDownloading(null);
  };

  const downloadBookQr = async (book?: Book) => {
    const id = book?.id || selectedBookId;
    if (!id) return;
    setDownloading('bookqr');
    try {
      const resp = await fetch(`${API}/qrcode/${id}/qr`, { headers });
      const data = await resp.json();
      if (!resp.ok || !data.qr) throw new Error('No QR');
      const a = document.createElement('a');
      a.href = data.qr;
      a.download = `okson-book-qr-${books.find((b) => b.id === id)?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'book'}.png`;
      a.click();
    } catch {
      alert('Could not load the book QR. Generate codes or refresh first.');
    }
    setDownloading(null);
  };

  const toggleCardPanel = async (panel: 'generate' | 'qr' | 'covers' | 'edit', book: Book) => {
    const isOpen = cardPanel?.bookId === book.id && cardPanel.panel === panel;
    if (isOpen) {
      setCardPanel(null);
      if (panel === 'covers') { setCoverBookId(null); setCoverUpload({ front: null, back: null }); }
      if (panel === 'edit') setEditBookId(null);
      return;
    }
    setCardPanel({ bookId: book.id, panel });
    setSelectedBookId(book.id);
    if (panel === 'covers') {
      setEditBookId(null);
      setCoverBookId(book.id);
      setCoverUpload({ front: null, back: null });
    } else if (panel === 'edit') {
      setCoverBookId(null); setCoverUpload({ front: null, back: null });
      startEditBook(book);
    } else if (panel === 'qr') {
      setCoverBookId(null); setEditBookId(null);
      await viewBookQr(book);
    } else {
      setCoverBookId(null); setEditBookId(null);
    }
  };

  const copySerial = async (serial: string) => {
    try {
      await navigator.clipboard.writeText(serial);
      setActivationMsg({ type: 'info', message: 'Serial copied — paste it in the Activate box.' });
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
              Review them under All Serials and revoke any that look fraudulent.
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
          {/* REGISTER BOOK */}
          {subTab === 'register' && (
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

                <div className="mt-5">
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-2">Book Cover Designs (front & back)</label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                      {frontCover ? (
                        <CoverThumb url={frontCover} alt="Front cover" />
                      ) : (
                        <div className="aspect-[3/4] w-20 rounded-lg border border-dashed border-white/[0.15] flex flex-col items-center justify-center text-faint">
                          <BookOpen className="w-5 h-5 mb-1" />
                          <span className="text-[9px]">Front</span>
                        </div>
                      )}
                      <button type="button" onClick={() => pickCover('front')}
                        className="text-xs text-indigo hover:text-indigo/80 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> {frontCover ? 'Change' : 'Add'} Front Cover
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {backCover ? (
                        <CoverThumb url={backCover} alt="Back cover" />
                      ) : (
                        <div className="aspect-[3/4] w-20 rounded-lg border border-dashed border-white/[0.15] flex flex-col items-center justify-center text-faint">
                          <BookOpen className="w-5 h-5 mb-1" />
                          <span className="text-[9px]">Back</span>
                        </div>
                      )}
                      <button type="button" onClick={() => pickCover('back')}
                        className="text-xs text-indigo hover:text-indigo/80 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> {backCover ? 'Change' : 'Add'} Back Cover
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-faint mt-2">These appear on the reader's verification page as the book preview. Max 5MB each.</p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={handleRegister} disabled={saving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo text-white text-sm font-semibold hover:bg-indigo-dark transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Saving...' : 'Register Book'}
                  </button>
                  {formStatus?.type === 'success' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{formStatus.message}</span>}
                  {formStatus?.type === 'error' && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{formStatus.message}</span>}
                </div>
                {regQr && regQr.qr && (
                  <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-4 flex items-start gap-4">
                    <img src={regQr.qr} alt={`${regQr.book.title} QR code`} className="w-24 h-24 rounded-lg bg-white p-1.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <ScanLine className="w-3.5 h-3.5" /> Book QR ready — "{regQr.book.title}"
                      </div>
                      <p className="text-[11px] text-muted mt-1">
                        This is the <span className="text-white/80">single QR code</span> for the book. It is printed on every copy — readers scan it once, then enter the serial number printed on their copy to verify authenticity.
                      </p>
                      <code className="block text-[10px] bg-ink rounded px-2 py-1 border border-white/[0.06] mt-2 break-all">{`${window.location.origin}/verify/${regQr.book.bookCode}`}</code>
                      <button onClick={() => setRegQr(null)} className="text-[10px] text-muted hover:text-white mt-2">Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REGISTERED BOOKS */}
          {subTab === 'books' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-4">Registered Books <span className="text-faint font-normal">({books.length})</span></h4>
                {books.length === 0 ? (
                  <div className="card p-10 text-center">
                    <BookOpen className="w-10 h-10 text-faint mx-auto mb-3" />
                    <p className="text-sm text-muted">No books registered yet. Use the "Register Book" tab to add one.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {books.map((b) => {
                      const bookCodes = codes.filter((c) => c.bookId === b.id);
                      const active = bookCodes.filter((c) => c.status === 'active').length;
                      const isManage = coverBookId === b.id;
                      const isEdit = editBookId === b.id;
                      const panel = cardPanel?.bookId === b.id ? cardPanel.panel : null;
                      return (
                        <div key={b.id} className="card p-5 flex flex-col">
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
                          {(b.frontCover || b.backCover) && (
                            <div className="flex items-end gap-4 my-3">
                              {b.frontCover && <AdminMockup url={b.frontCover} alt={`${b.title} front`} />}
                              {b.backCover && <AdminMockup url={b.backCover} alt={`${b.title} back`} />}
                            </div>
                          )}
                          {b.isbn && <div className="text-[11px] text-muted">ISBN: {b.isbn}</div>}
                          {b.bookCode && (
                            <button onClick={() => copySerial(b.bookCode!)} title="Copy book code"
                              className="mt-1 text-[10px] text-indigo hover:text-indigo/80 flex items-center gap-1 self-start">
                              <ScanLine className="w-2.5 h-2.5" /> Book code: {b.bookCode}
                            </button>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-[11px]">
                            <span className="text-muted">Serials: <span className="text-white/80">{bookCodes.length}</span></span>
                            <span className="text-muted">Active: <span className="text-emerald-400">{active}</span></span>
                          </div>

                          {/* Action buttons (covers/edit panels stay inline in this card) */}
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={() => toggleCardPanel('generate', b)}
                              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${panel === 'generate' ? 'bg-indigo text-white' : 'bg-indigo/10 text-indigo hover:bg-indigo/20'}`}>
                              <QrCode className="w-3.5 h-3.5 shrink-0" /> Generate
                            </button>
                            <button onClick={() => toggleCardPanel('qr', b)}
                              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${panel === 'qr' ? 'bg-indigo text-white' : 'bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white'}`} title="View the single QR code for this book">
                              <ScanLine className="w-3.5 h-3.5 shrink-0" /> QR
                            </button>
                            <button onClick={() => toggleCardPanel('covers', b)}
                              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isManage ? 'bg-indigo text-white' : 'bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white'}`} title="Upload front/back cover designs">
                              {isManage ? <X className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />} Covers
                            </button>
                            <button onClick={() => toggleCardPanel('edit', b)}
                              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isEdit ? 'bg-indigo text-white' : 'bg-white/[0.05] text-muted hover:bg-white/[0.1] hover:text-white'}`} title="Edit book details">
                              <Pencil className="w-3.5 h-3.5 shrink-0" />
                              {isEdit ? 'Close' : 'Edit'}
                            </button>
                          </div>

                          {/* ── Generate serial codes (inline) ── */}
                          {panel === 'generate' && (
                            <div className="rounded-lg border border-white/[0.06] bg-ink p-3 mt-3">
                              <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Generate Serial Codes</div>
                              <p className="text-[10px] text-faint mb-2">One QR per book, printed on every copy. Each copy gets its own serial to type in and verify.</p>
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] text-muted block mb-1">Number of Serials</label>
                                  <input type="number" min={1} max={500} value={genCount} onChange={(e) => setGenCount(e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <button onClick={handleGenerate} disabled={generating || !selectedBookId}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo text-white text-[10px] font-medium hover:bg-indigo-dark transition-colors disabled:opacity-50">
                                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                                  {generating ? 'Generating...' : 'Generate'}
                                </button>
                              </div>
                              {genBookId === b.id && status?.type === 'success' && <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{status.message}</p>}
                              {genBookId === b.id && status?.type === 'error' && <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1"><XCircle className="w-3 h-3" />{status.message}</p>}

                              {genBookId === b.id && genQr && (
                                <div className="mt-3 rounded-lg border border-white/[0.06] bg-surface/50 p-3">
                                  <div className="text-[10px] font-semibold text-white/80 mb-2 flex items-center gap-1.5">
                                    <ScanLine className="w-3 h-3 text-indigo" /> Book QR — every copy of "{b.title}"
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <img src={genQr} alt={`${b.title} QR code`} className="w-20 h-20 rounded bg-white p-1 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <code className="block text-[9px] bg-ink rounded px-2 py-1 border border-white/[0.06] break-all mb-2">{`${window.location.origin}/verify/${genBookCode || b.bookCode}`}</code>
                                      <div className="flex flex-wrap gap-2">
                                        <button onClick={() => downloadBookQr(b)} disabled={downloading === 'bookqr'}
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo/10 text-indigo text-[10px] hover:bg-indigo/20 transition-colors disabled:opacity-50">
                                          {downloading === 'bookqr' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} QR PNG
                                        </button>
                                        {genBookCode && (
                                          <button onClick={() => copySerial(genBookCode)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] text-muted text-[10px] hover:text-white transition-colors">
                                            <Copy className="w-3 h-3" /> Copy code
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {genBookId === b.id && generated.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] text-muted uppercase tracking-wider">{generated.length} generated for "{b.title}"</div>
                                    <div className="flex items-center gap-2">
                                      <button onClick={downloadGenerated} disabled={downloading === 'all'}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo/10 text-indigo text-[10px] hover:bg-indigo/20 transition-colors disabled:opacity-50">
                                        {downloading === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Print Sheet
                                      </button>
                                      <button onClick={() => setGenerated([])} className="text-[10px] text-muted hover:text-white">Clear</button>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {generated.map((g) => (
                                      <button key={g.serial} onClick={() => copySerial(g.serial)} title="Copy serial"
                                        className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium tracking-wide flex items-center gap-1 hover:bg-white/[0.08] transition-colors">
                                        {g.serial} <Copy className="w-2.5 h-2.5 text-faint" />
                                      </button>
                                    ))}
                                  </div>
                                  <p className="text-[9px] text-faint mt-2">Pending serials verify as "Not activated" until you activate them under the "Activate Serials" tab.</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Book QR (inline) ── */}
                          {panel === 'qr' && (
                            <div className="rounded-lg border border-white/[0.06] bg-ink p-3 mt-3">
                              <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Book QR</div>
                              {qrLoading ? (
                                <div className="flex items-center gap-2 text-xs text-muted py-3"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading QR...</div>
                              ) : cardQr?.bookId === b.id ? (
                                <div className="flex items-start gap-3">
                                  <img src={cardQr.qr} alt={`${b.title} QR code`} className="w-24 h-24 rounded bg-white p-1.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-muted mb-1">The <span className="text-white/80">single QR</span> printed on every copy of this book.</p>
                                    <code className="block text-[9px] bg-ink rounded px-2 py-1 border border-white/[0.06] break-all mb-2">{cardQr.verifyUrl}</code>
                                    <div className="flex flex-wrap gap-2">
                                      <button onClick={() => downloadBookQr(b)} disabled={downloading === 'bookqr'}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo/10 text-indigo text-[10px] hover:bg-indigo/20 transition-colors disabled:opacity-50">
                                        {downloading === 'bookqr' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Download PNG
                                      </button>
                                      {b.bookCode && (
                                        <button onClick={() => copySerial(b.bookCode!)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] text-muted text-[10px] hover:text-white transition-colors">
                                          <Copy className="w-3 h-3" /> Copy book code
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted py-2">Could not load the QR. Try again.</p>
                              )}
                            </div>
                          )}

                          {/* ── Upload covers (inline) ── */}
                          {isManage && (
                            <div className="rounded-lg border border-white/[0.06] bg-ink p-3 mt-3">
                              <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Upload Covers</div>
                              <div className="flex flex-wrap gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  {coverUpload.front ? <CoverThumb url={coverUpload.front} alt="Front" /> : <div className="aspect-[3/4] w-14 rounded border border-dashed border-white/[0.15] flex items-center justify-center text-faint text-[9px]">Front</div>}
                                  <button type="button" onClick={() => pickCoverUpload('front')} className="text-[10px] text-indigo flex items-center gap-1"><Plus className="w-3 h-3" /> {coverUpload.front ? 'Change' : 'Add'} Front</button>
                                </div>
                                <div className="flex items-center gap-2">
                                  {coverUpload.back ? <CoverThumb url={coverUpload.back} alt="Back" /> : <div className="aspect-[3/4] w-14 rounded border border-dashed border-white/[0.15] flex items-center justify-center text-faint text-[9px]">Back</div>}
                                  <button type="button" onClick={() => pickCoverUpload('back')} className="text-[10px] text-indigo flex items-center gap-1"><Plus className="w-3 h-3" /> {coverUpload.back ? 'Change' : 'Add'} Back</button>
                                </div>
                              </div>
                              {coverErrors && <p className="text-[10px] text-red-400 mb-2">{coverErrors}</p>}
                              <div className="flex items-center gap-2">
                                <button onClick={() => saveCovers(b.id)} disabled={coverSaving || (!coverUpload.front && !coverUpload.back)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo text-white text-[10px] font-medium hover:bg-indigo-dark disabled:opacity-50">
                                  {coverSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Covers
                                </button>
                                <button onClick={() => toggleCardPanel('covers', b)}
                                  className="text-[10px] text-muted hover:text-white" disabled={coverSaving}>Cancel</button>
                              </div>
                            </div>
                          )}

                          {/* ── Edit book details (inline) ── */}
                          {isEdit && (
                            <div className="rounded-lg border border-white/[0.06] bg-ink p-3 mt-3">
                              <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Edit Book Details</div>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Title *</label>
                                  <input type="text" value={editForm.title} onChange={(e) => setEditField('title', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Author *</label>
                                  <input type="text" value={editForm.author} onChange={(e) => setEditField('author', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">ISBN</label>
                                  <input type="text" value={editForm.isbn} onChange={(e) => setEditField('isbn', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Publisher</label>
                                  <input type="text" value={editForm.publisher} onChange={(e) => setEditField('publisher', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Year</label>
                                  <input type="text" value={editForm.year} onChange={(e) => setEditField('year', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Edition</label>
                                  <input type="text" value={editForm.edition} onChange={(e) => setEditField('edition', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] text-muted block mb-1">Category</label>
                                  <input type="text" value={editForm.category} onChange={(e) => setEditField('category', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] text-muted block mb-1">Description</label>
                                  <textarea rows={2} value={editForm.description} onChange={(e) => setEditField('description', e.target.value)}
                                    className="w-full px-2.5 py-2 rounded-lg bg-surface border border-white/[0.06] text-white text-xs placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors resize-none" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={handleSaveEdit} disabled={editSaving}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo text-white text-[10px] font-medium hover:bg-indigo-dark disabled:opacity-50">
                                  {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes
                                </button>
                                <button onClick={() => toggleCardPanel('edit', b)}
                                  className="text-[10px] text-muted hover:text-white" disabled={editSaving}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVATE SERIALS */}
          {subTab === 'activate' && (
            <div className="space-y-6">
              <div className="card p-6 max-w-2xl">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo" /> Activate a Serial Number
                </h4>
                <p className="text-xs text-muted mb-4">
                  Paste the serial number printed on the book copy, then activate it. Once activated, readers who scan the book's QR and enter this serial will see the verified authentic page.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input id="qr-code-input" name="qr-code-input" type="text" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder={`e.g. ${SERIAL_PREFIX}AB1234`}
                    className="flex-1 px-4 py-3 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-indigo/40 focus:outline-none transition-colors uppercase tracking-wider" />
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
                <h4 className="text-sm font-semibold mb-4">Pending Serials <span className="text-faint font-normal">(ready to activate)</span></h4>
                {pendingCodes().length === 0 ? (
                  <div className="card p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-muted">No pending serials. Generate serials on the Generate tab.</p>
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
                          <button onClick={() => copySerial(c.serial)} className="text-[10px] text-muted hover:text-white flex items-center gap-1">
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
                                  <button onClick={() => fetchCodeDetail(c.code)} className="flex items-center gap-1.5 w-full text-left hover:text-indigo-400 transition-colors focus:outline-none">
                                    <span className="truncate">{c.serial}</span>
                                    {c.flagged && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                                    <ChevronDown className={detailCode === c.code ? 'w-3.5 h-3.5 rotate-180 shrink-0' : 'w-3.5 h-3.5 shrink-0 text-faint'} />
                                  </button>
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
                                    <button onClick={() => copySerial(c.serial)} title="Copy serial" className="text-muted hover:text-white transition-colors">
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
                                            <div>Distinct Locations: <span className="text-white/80">{detailData.code.locations?.length || 0}</span></div>
                                            <div>Distinct Devices: <span className="text-white/80">{detailData.code.devices?.length || 0}</span></div>
                                            <div>Distinct Device/Loc pairs: <span className={`font-medium ${(detailData.code.flagCombos?.length || 0) >= 100 ? 'text-rose-300' : 'text-white/80'}`}>{detailData.code.flagCombos?.length || 0}</span>
                                              <span className="text-faint"> / 100 (flag threshold)</span>
                                            </div>
                                            <div>Created: <span className="text-white/80">{new Date(detailData.code.createdAt).toLocaleString()}</span></div>
                                            {detailData.code.activatedAt && (
                                              <div>Activated: <span className="text-white/80">{new Date(detailData.code.activatedAt).toLocaleString()}</span></div>
                                            )}
                                            {detailData.code.flagged && (
                                              <div className="text-rose-300">Flagged: {detailData.code.flagReason}</div>
                                            )}
                                            {detailData.code.alertSent && (
                                              <div className="text-amber-300">Admin alert sent {detailData.code.alertAt ? `on ${new Date(detailData.code.alertAt).toLocaleString()}` : ''}</div>
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
                                                    <th className="px-3 py-2">State</th>
                                                    <th className="px-3 py-2">Location</th>
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
                                                      <td className="px-3 py-2">{scan.state || 'Unknown'}</td>
                                                      <td className="px-3 py-2">{scan.city ? `${scan.city}, ${scan.country || ''}` : (scan.country || 'Unknown')}</td>
                                                      <td className="px-3 py-2">{scan.device || 'Unknown'}</td>
                                                      <td className="px-3 py-2">{scan.browser || 'Unknown'}</td>
                                                      <td className="px-3 py-2">{scan.os || 'Unknown'}</td>
                                                      <td className="px-3 py-2 text-faint max-w-[160px] truncate" title={scan.userAgent || ''}>{scan.userAgent || '—'}</td>
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

      {/* Confirmation modal for admin actions */}
      <AnimatePresence>
        {confirmBox && (
          <motion.div
            key="confirm"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmBox(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.16 }}
              className="relative w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#14141a] p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmBox.danger ? 'bg-rose-500/15 text-rose-400' : 'bg-indigo/15 text-indigo'}`}>
                  {confirmBox.danger ? <AlertTriangle className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setConfirmBox(null); }} className="ml-auto w-7 h-7 rounded-lg bg-white/[0.05] text-muted hover:text-white hover:bg-white/[0.1] flex items-center justify-center transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="text-base font-semibold mb-1.5">{confirmBox.title}</h4>
              <p className="text-sm text-muted leading-relaxed mb-5">{confirmBox.message}</p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={(e) => { e.stopPropagation(); setConfirmBox(null); }}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] text-xs font-medium text-muted hover:bg-white/[0.1] hover:text-white transition-colors">
                  {confirmBox.cancelLabel || 'Cancel'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cb = confirmBox;
                    setConfirmBox(null);
                    cb.onConfirm();
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${confirmBox.danger ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo text-white hover:bg-indigo-dark'}`}
                >
                  {confirmBox.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

  function revokeRecord(record: QrRecord) {
    if (record.status === 'revoked') {
      setConfirmBox({
        title: 'Re-activate Serial',
        message: `Re-activate ${record.serial}? It will verify as authentic again.`,
        confirmLabel: 'Re-activate',
        onConfirm: () => doReactivate(record),
      });
      return;
    }
    setConfirmBox({
      title: 'Revoke Serial',
      message: record.flagged
        ? 'This code was flagged for suspicious verification activity. Revoke it so it no longer verifies as authentic? You can re-activate it later if needed.'
        : `Revoke ${record.serial}? It will no longer verify as authentic and can be re-activated later if needed.`,
      confirmLabel: 'Revoke Serial',
      danger: true,
      onConfirm: () => doRevoke(record),
    });
  }

  async function doReactivate(record: QrRecord) {
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
  }

  async function doRevoke(record: QrRecord) {
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

  function deleteRecord(record: QrRecord) {
    setConfirmBox({
      title: 'Delete Serial Permanently',
      message: `Delete ${record.serial} permanently? This cannot be undone — the serial will no longer verify and cannot be recovered.`,
      confirmLabel: 'Delete Permanently',
      danger: true,
      onConfirm: () => doDeleteRecord(record),
    });
  }

  async function doDeleteRecord(record: QrRecord) {
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
