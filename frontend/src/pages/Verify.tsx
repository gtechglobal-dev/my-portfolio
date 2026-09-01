import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldX, BookOpen, Loader2, Calendar, Hash, FileText,
  BadgeCheck, X, AlertTriangle, Phone, Mail, KeyRound, CheckCircle2,
  Sparkles, ZoomIn, Lock,
} from 'lucide-react';

const API = '/api';
const SERIAL_PREFIX = 'OKSON-';
const SERIAL_SUFFIX_LEN = 6;

interface BookInfo {
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
  createdAt: string;
}

interface OtherBook {
  id: string;
  title: string;
  author: string;
  edition?: string;
  frontCover?: string | null;
}

interface VerifyCode {
  serial: string;
  activatedAt?: string | null;
  createdAt?: string;
  verifyCount?: number;
  lastVerifiedAt?: string | null;
}

interface VerifyResult {
  active: boolean;
  status?: string;
  needsSerial?: boolean;
  code?: VerifyCode;
  book?: BookInfo | null;
  error?: string;
}

function DetailPill({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value || !String(value).trim()) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-white/[0.05] text-muted font-medium">
      <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span className="text-muted">{label}:</span>
      <span className="text-white/85">{value}</span>
    </div>
  );
}

// ─── 3D book mockup: auto-generated from the uploaded cover image ───
// The cover is always rendered at an angle inside a bordered frame so it can't
// be cleanly screenshotted / reproduced. Same angle is used inline and in the
// popout modal.

function BookMockup({
  cover,
  alt,
  size = 'sm',
  onOpen,
}: {
  cover: string;
  alt: string;
  size?: 'sm' | 'lg';
  onOpen?: () => void;
}) {
  const coverW = size === 'lg' ? 210 : 96;
  const coverH = Math.round(coverW * 1.35);
  const thickness = Math.max(8, Math.round(coverW * 0.11));
  const angle = -24;

  return (
    <button
      type="button"
      onClick={onOpen}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className="group block select-none rounded-xl border border-white/[0.12] bg-white/[0.03] p-3 sm:p-4 shadow-xl backdrop-blur transition-all hover:border-emerald-400/40 hover:bg-white/[0.05] outline-none"
      style={{ WebkitUserDrag: 'none' } as any}
    >
      <div style={{ perspective: 900 }} className="flex items-center justify-center py-1">
        <div
          className="relative"
          style={{ transformStyle: 'preserve-3d', transform: `rotateY(${angle}deg)` }}
        >
          {/* back cover edge (behind, dark) */}
          <div
            className="absolute rounded-l-md"
            style={{
              width: coverW,
              height: coverH,
              background: 'linear-gradient(140deg, #2a2a30, #14141a)',
              transform: 'translateZ(-3px)',
            }}
          />
          {/* page stack (open edge on the right) */}
          <div
            className="absolute rounded-r-sm"
            style={{
              left: coverW - 2,
              width: thickness,
              height: coverH,
              background: 'repeating-linear-gradient(90deg, #f4f0e6 0 2px, #e2dccb 2px 4px)',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.25)',
              transform: 'rotateY(-90deg)',
              transformOrigin: 'left center',
            }}
          />
          {/* spine shadow on the left */}
          <div
            className="absolute left-0 top-0 bottom-0 rounded-l-sm"
            style={{
              width: Math.max(3, Math.round(coverW * 0.05)),
              background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0))',
            }}
          />
          {/* front cover */}
          <img
            src={cover}
            alt={alt}
            draggable={false}
            className="relative rounded-r-sm shadow-[4px_6px_18px_rgba(0,0,0,0.45)] select-none"
            style={{
              width: coverW,
              height: coverH,
              objectFit: 'cover',
              userSelect: 'none',
              WebkitUserDrag: 'none',
              pointerEvents: 'none',
            } as any}
          />
        </div>
      </div>
      {onOpen && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-faint transition-colors group-hover:text-emerald-300">
          <ZoomIn className="w-3 h-3" /> Click to view preview
        </div>
      )}
    </button>
  );
}

// ─── Popout modal: same angled mockup, larger, never downloadable ───

function CoverPopout({
  cover,
  alt,
  onClose,
}: {
  cover: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.92, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative z-10 max-w-[92vw]"
      >
        <div
          className="rounded-2xl border border-white/15 bg-ink/95 shadow-2xl p-6"
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between gap-6 mb-4">
            <div className="text-left">
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Protected preview
              </div>
              <p className="text-[10px] text-faint mt-0.5">Angled preview — downloads are disabled</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <BookMockup cover={cover} alt={alt} size="lg" />
        </div>
      </motion.div>
    </motion.div>
  );
}

function VerifiedBadge() {
  const circle = 56 * Math.PI;
  return (
    <div className="relative w-24 h-24">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 1.9, opacity: 0 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
      />
      <div className="relative w-full h-full rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
        <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
          <circle cx="28" cy="28" r="26" stroke="rgba(16,185,129,0.35)" strokeWidth="3" strokeDasharray={circle} strokeDashoffset={0} strokeLinecap="round" />
          <motion.path
            d="M18 29 L25 36 L38 22"
            stroke="#34d399"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
      </div>
    </div>
  );
}

function ScrollingCovers({ books }: { books: OtherBook[] }) {
  const covers = books.filter((b) => b.frontCover);
  if (covers.length === 0) return null;
  const doubled = [...covers, ...covers];
  return (
    <div className="border-t border-white/[0.06] mt-8 pt-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold">More titles from Okson Publishers</h3>
      </div>
      <div className="relative overflow-hidden">
        <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
          {doubled.map((b, i) => (
            <div key={`${b.id}-${i}`} className="w-24 shrink-0 group cursor-pointer" onContextMenu={(e) => e.preventDefault()}>
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface border border-white/[0.06] shadow-lg group-hover:border-emerald-400/40 transition-colors">
                {b.frontCover ? (
                  <img src={b.frontCover} alt={b.title} className="w-full h-full object-cover" loading="lazy" draggable={false} style={{ WebkitUserDrag: 'none' } as any} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                    <BookOpen className="w-8 h-8 text-emerald-400/50" />
                  </div>
                )}
              </div>
              <div className="mt-1.5 text-[10px] text-white/80 truncate">{b.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VerifyProps {
  code: string;
}

export default function Verify({ code }: VerifyProps) {
  const [loading, setLoading] = useState(true);
  const [preflight, setPreflight] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [serial, setSerial] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [others, setOthers] = useState<OtherBook[]>([]);
  const [closeHint, setCloseHint] = useState(false);
  const [popout, setPopout] = useState<{ cover: string; alt: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError('');
    fetch(`${API}/qrcode/verify/${code}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setPreflight({ active: false, status: 'invalid', error: data.error });
          return;
        }
        setPreflight(data);
      })
      .catch(() => setError('Could not connect to the verification server. Please try again.'))
      .finally(() => { clearTimeout(timer); setLoading(false); });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [code]);

  useEffect(() => {
    if (preflight?.active && preflight.needsSerial) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [preflight]);

  useEffect(() => {
    // Load other books for the carousel only when verification succeeds.
    if (!result?.active) return;
    let active = true;
    fetch(`${API}/qrcode/public/books`)
      .then((r) => (r.ok ? r.json() : { books: [] }))
      .then((d) => { if (active) setOthers(d.books || []); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [result?.active]);

  const handleSerialChange = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.toUpperCase().replace(/\s+/g, '');
    if (v.startsWith(SERIAL_PREFIX)) v = v.slice(SERIAL_PREFIX.length);
    else if (v.startsWith('OKSON')) v = v.slice(5).replace(/^[- ]*/, '');
    setSerial(v.slice(0, SERIAL_SUFFIX_LEN));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = serial.trim();
    if (!value) {
      setSubmitError('Please enter the serial number suffix printed on the book.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API}/qrcode/verify/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial: `${SERIAL_PREFIX}${value}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Verification failed. Please try again.');
      } else {
        setResult(data);
      }
    } catch {
      setSubmitError('Could not connect to the verification server. Please try again.');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    window.close();
    setTimeout(() => setCloseHint(true), 600);
  };

  const activeBook = result?.book || preflight?.book || null;
  const successBook = result?.active && result.book ? result.book : null;
  const resultRevoked = !!result && result.status === 'revoked';
  const resultPending = !!result && result.status === 'pending';
  const showInvalid = !result && preflight?.status === 'invalid';
  const showRevoked = resultRevoked;
  const showNotActive = resultPending;

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] flex flex-col">
      <header className="w-full border-b border-white/[0.05]">
        <div className="container flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold leading-tight text-white">Okson Publishers</div>
              <div className="text-[10px] text-emerald-400">Book Authenticity Verification</div>
            </div>
          </div>
          <button onClick={handleClose} className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
      </header>

      <main className="flex-1 container flex items-start justify-center px-6 py-16">
        {/* Connecting / verifying */}
        {(loading || submitting) && (
          <div className="card p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm text-muted">{submitting ? 'Verifying serial...' : 'Loading...'}</p>
          </div>
        )}

        {/* Server / network error */}
        {!loading && !submitting && error && (
          <div className="card p-10 max-w-md w-full text-center">
            <ShieldX className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Verification Unavailable</h1>
            <p className="text-sm text-muted mb-4">{error}</p>
            <ContactBlock />
          </div>
        )}

        {/* Invalid QR */}
        {!loading && !submitting && !error && showInvalid && (
          <div className="card p-10 max-w-md w-full text-center border-amber-500/30">
            <ShieldX className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Invalid QR Code</h1>
            <p className="text-sm text-muted mb-4">{preflight?.error || 'This QR code is not recognised by our system.'}</p>
            <ContactBlock />
            <CloseButton onClose={handleClose} />
          </div>
        )}

        {/* Revoked serial */}
        {!loading && !submitting && !error && showRevoked && (
          <div className="card p-10 max-w-md w-full text-center border-rose-500/30">
            <ShieldX className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Code Revoked</h1>
            <p className="text-sm text-muted mb-4">
              This serial number has been revoked by the publisher and is no longer valid.
              If you purchased a book carrying this serial, it may be an unauthorized or counterfeit copy.
            </p>
            {result?.code?.serial && (
              <div className="text-xs text-faint">Serial: <span className="text-white/80">{result.code.serial}</span></div>
            )}
            <ContactBlock />
            <CloseButton onClose={handleClose} styles="emerald" />
          </div>
        )}

        {/* Not activated serial */}
        {!loading && !submitting && !error && showNotActive && (
          <div className="card p-10 max-w-md w-full text-center border-amber-500/30">
            <ShieldX className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Code Not Activated</h1>
            <p className="text-sm text-muted mb-4">
              This serial number exists but has not yet been activated by Okson Publishers.
              Book authenticity can only be confirmed once the serial is activated.
            </p>
            {result?.code?.serial && (
              <div className="text-xs text-faint">Serial: <span className="text-white/80">{result.code.serial}</span></div>
            )}
            <ContactBlock />
            <CloseButton onClose={handleClose} styles="emerald" />
          </div>
        )}

        {/* SERIAL ENTRY — user enters the serial suffix; OKSON- is fixed */}
        {!result && !loading && !submitting && !error && preflight?.active && preflight.needsSerial && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
            <div className="card p-8">
              {activeBook && (activeBook.frontCover || activeBook.backCover) && (
                <div className="flex items-center justify-center gap-5 mb-5">
                  {activeBook.frontCover && (
                    <BookMockup
                      cover={activeBook.frontCover}
                      alt={`${activeBook.title} front cover`}
                      onOpen={() => setPopout({ cover: activeBook.frontCover!, alt: `${activeBook.title} front cover` })}
                    />
                  )}
                  {activeBook.backCover && (
                    <BookMockup
                      cover={activeBook.backCover}
                      alt={`${activeBook.title} back cover`}
                      onOpen={() => setPopout({ cover: activeBook.backCover!, alt: `${activeBook.title} back cover` })}
                    />
                  )}
                </div>
              )}

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold mb-1">Verify Your Book</h1>
              <p className="text-sm text-muted mb-6">
                Enter the <span className="text-white/80 font-medium">serial number</span> printed on your copy of{' '}
                <span className="text-emerald-300 font-medium">{activeBook?.title || 'this book'}</span> to confirm it is an authentic copy.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="verify-serial" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Serial Number</label>
                  <div className="flex items-stretch overflow-hidden rounded-lg border border-white/[0.06] bg-surface focus-within:border-emerald-400/50 transition-colors">
                    <span className="flex items-center px-3 text-sm font-bold text-white/90 bg-white/[0.04] border-r border-white/[0.06] tracking-wider select-none">
                      {SERIAL_PREFIX}
                    </span>
                    <input
                      id="verify-serial"
                      ref={inputRef}
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={serial}
                      onChange={handleSerialChange}
                      placeholder="AB1234"
                      maxLength={SERIAL_SUFFIX_LEN}
                      className="w-full px-3 py-3 bg-transparent text-white text-sm placeholder-faint focus:outline-none uppercase tracking-wider"
                    />
                  </div>
                  <p className="text-[10px] text-faint mt-1.5">Only the number after "<span className="text-white/70">{SERIAL_PREFIX}</span>" needs to be typed.</p>
                </div>
                {submitError && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-200/90">{submitError}</p>
                  </div>
                )}
                <button type="submit" disabled={submitting || !serial.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500 text-ink text-sm font-bold hover:bg-emerald-400 transition-all disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify Serial</>}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/[0.05] text-center">
                <p className="text-[11px] text-faint">Having trouble? Contact Okson Publishers below.</p>
              </div>
              <ContactBlock compact />
            </div>
          </motion.div>
        )}

        {/* AUTHENTIC COPY — successful verification */}
        <AnimatePresence>
          {result?.active && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full">
              <div className="card p-8 mb-5 text-center">
                <div className="flex flex-col items-center mb-5">
                  <VerifiedBadge />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold tracking-widest"
                  >
                    <BadgeCheck className="w-4 h-4" /> AUTHENTIC COPY
                  </motion.div>
                </div>

                <p className="text-sm text-muted mb-6">
                  This book has been verified as a <span className="text-emerald-400 font-medium">genuine Okson Publishers</span> publication.
                </p>

                {/* Book identity + status + date */}
                {successBook ? (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold leading-tight">{successBook.title}</h2>
                    <div className="text-sm text-emerald-400 mt-1">by {successBook.author}</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted mb-4">Book details are not available.</p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                  <DetailPill icon={Hash} label="Serial" value={result.code?.serial} />
                  <DetailPill icon={FileText} label="Edition" value={successBook?.edition} />
                  <DetailPill icon={BadgeCheck} label="Status" value="Verified Authentic" />
                  <DetailPill icon={Calendar} label="Date Verified" value={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
                </div>

                {/* Angled mockups: front & back side by side, clickable → popout */}
                {(successBook?.frontCover || successBook?.backCover) ? (
                  <div className="flex items-start justify-center gap-5 mb-7">
                    {successBook?.frontCover && (
                      <div>
                        <BookMockup
                          cover={successBook.frontCover}
                          alt={`${successBook.title} front cover`}
                          onOpen={() => setPopout({ cover: successBook!.frontCover!, alt: `${successBook.title} front cover` })}
                        />
                      </div>
                    )}
                    {successBook?.backCover && (
                      <div>
                        <BookMockup
                          cover={successBook.backCover}
                          alt={`${successBook.title} back cover`}
                          onOpen={() => setPopout({ cover: successBook!.backCover!, alt: `${successBook.title} back cover` })}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center mb-7">
                    <div className="w-24 h-32 rounded-xl bg-emerald-500/10 border border-white/[0.06] flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-emerald-400/60" />
                    </div>
                  </div>
                )}

                {/* Thank-you message */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
                  <p className="text-sm leading-relaxed text-white/85">
                    Thank you for choosing an authentic <span className="text-emerald-300 font-semibold">OKSON publication</span>.
                    Your support helps us continue developing affordable learning materials for Nigerian students.
                  </p>
                </motion.div>

                {/* Scrolling preview of other Okson titles */}
                <ScrollingCovers books={others} />

                <div className="mt-6 pt-6 border-t border-white/[0.05]">
                  <ContactBlock compact />
                </div>

                <CloseButton onClose={handleClose} styles="outline" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Click-to-view popout — protected preview, not downloadable */}
      <AnimatePresence>
        {popout && (
          <CoverPopout
            cover={popout.cover}
            alt={popout.alt}
            onClose={() => setPopout(null)}
          />
        )}
      </AnimatePresence>

      {closeHint && (
        <div className="fixed bottom-4 inset-x-0 flex justify-center px-6 z-50">
          <div className="text-[11px] text-muted bg-surface/95 border border-white/[0.06] rounded-lg px-3 py-2 shadow-lg">
            If the window didn't close automatically, you can close this tab now.
          </div>
        </div>
      )}
    </div>
  );
}

function ContactBlock({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? '' : 'mt-6 pt-6 border-t border-white/[0.05]'}>
      <p className="text-xs text-muted mb-3">Contact Okson Publishers for assistance:</p>
      <div className="flex flex-col items-center gap-2 text-sm">
        <a href="tel:08034802717" className="flex items-center gap-2 text-white/80 hover:text-emerald-400 transition-colors">
          <Phone className="w-4 h-4" /> 0803 480 2717
        </a>
        <a href="tel:09054867749" className="flex items-center gap-2 text-white/80 hover:text-emerald-400 transition-colors">
          <Phone className="w-4 h-4" /> 0905 486 7749
        </a>
        <a href="mailto:oksonpublishers@gmail.com" className="flex items-center gap-2 text-white/80 hover:text-emerald-400 transition-colors">
          <Mail className="w-4 h-4" /> oksonpublishers@gmail.com
        </a>
      </div>
    </div>
  );
}

function CloseButton({ onClose, styles = 'outline' }: { onClose: () => void; styles?: 'outline' | 'emerald' | 'default' }) {
  if (styles === 'emerald') {
    return (
      <button onClick={onClose} className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">
        Close <X className="w-4 h-4" />
      </button>
    );
  }
  return (
    <button onClick={onClose} className="mt-6 w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] py-2.5 text-sm text-white/80 hover:border-white/20 hover:text-white transition-colors">
      Close Page <X className="w-3.5 h-3.5" />
    </button>
  );
}