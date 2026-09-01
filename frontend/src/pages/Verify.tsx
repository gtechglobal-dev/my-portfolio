import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, BookOpen, Loader2, Calendar, Hash, FileText,
  BadgeCheck, X, AlertTriangle, Phone, Mail, KeyRound, CheckCircle2,
  ArrowRight, Sparkles,
} from 'lucide-react';

const API = '/api';

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
            <div key={`${b.id}-${i}`} className="w-32 shrink-0 group cursor-pointer">
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface border border-white/[0.06] shadow-lg group-hover:border-emerald-400/40 transition-colors">
                {b.frontCover ? (
                  <img src={b.frontCover} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = serial.trim();
    if (!value) {
      setSubmitError('Please enter the serial number.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API}/qrcode/verify/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial: value }),
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

  const revokedFromPreflight = !loading && !result && preflight?.status === 'revoked';
  const revokedFromResult = !!result && result.status === 'revoked';
  const showRevoked = revokedFromPreflight || revokedFromResult;
  const showNotActive =
    !loading && !result && preflight && preflight.status !== 'revoked' && preflight.status !== 'invalid' && !preflight.active;

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
        {!loading && !submitting && !error && preflight?.status === 'invalid' && (
          <div className="card p-10 max-w-md w-full text-center border-amber-500/30">
            <ShieldX className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Invalid QR Code</h1>
            <p className="text-sm text-muted mb-4">{preflight.error || 'This QR code is not recognised by our system.'}</p>
            <ContactBlock />
            <CloseButton onClose={handleClose} />
          </div>
        )}

        {/* Revoked */}
        {!loading && !submitting && !error && showRevoked && (
          <div className="card p-10 max-w-md w-full text-center border-rose-500/30">
            <ShieldX className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Code Revoked</h1>
            <p className="text-sm text-muted mb-4">
              This QR code has been revoked by the publisher and is no longer valid.
              If you purchased a book carrying this code, it may be an unauthorized or counterfeit copy.
            </p>
            {preflight?.code?.serial && (
              <div className="text-xs text-faint">Serial: <span className="text-white/80">{preflight.code.serial}</span></div>
            )}
            <ContactBlock />
            <CloseButton onClose={handleClose} styles="emerald" />
          </div>
        )}

        {/* Not activated */}
        {!loading && !submitting && !error && showNotActive && (
          <div className="card p-10 max-w-md w-full text-center border-amber-500/30">
            <ShieldX className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Code Not Activated</h1>
            <p className="text-sm text-muted mb-4">
              This QR code exists but has not yet been activated by Okson Publishers.
              Book authenticity can only be confirmed once the code is activated.
            </p>
            {preflight?.code?.serial && (
              <div className="text-xs text-faint">Serial: <span className="text-white/80">{preflight.code.serial}</span></div>
            )}
            <ContactBlock />
            <CloseButton onClose={handleClose} styles="emerald" />
          </div>
        )}

        {/* SERIAL ENTRY — user enters the serial printed under the book QR code */}
        {!result && !loading && !submitting && !error && preflight?.active && preflight.needsSerial && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
            <div className="card p-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold mb-1">Verify Your Book</h1>
              <p className="text-sm text-muted mb-6">
                Enter the <span className="text-white/80 font-medium">serial number</span> printed directly under the QR code on your book to confirm it is an authentic copy.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="verify-serial" className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Serial Number</label>
                  <input
                    id="verify-serial"
                    ref={inputRef}
                    type="text"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.toUpperCase())}
                    placeholder="e.g. OKSON-AB1234"
                    className="w-full px-4 py-3 rounded-lg bg-surface border border-white/[0.06] text-white text-sm placeholder-faint focus:border-emerald-400/50 focus:outline-none transition-colors uppercase tracking-wider"
                  />
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
                {result.book ? (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold leading-tight">{result.book.title}</h2>
                    <div className="text-sm text-emerald-400 mt-1">by {result.book.author}</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted mb-4">Book details are not available.</p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                  <DetailPill icon={Hash} label="Serial" value={result.code?.serial} />
                  <DetailPill icon={FileText} label="Edition" value={result.book?.edition} />
                  <DetailPill icon={BadgeCheck} label="Status" value="Verified Authentic" />
                  <DetailPill icon={Calendar} label="Date Verified" value={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
                </div>

                {/* Book cover previews */}
                {(result.book?.frontCover || result.book?.backCover) ? (
                  <div className="flex items-center justify-center gap-5 mb-7">
                    {result.book.frontCover && (
                      <div className="w-40 sm:w-48 shrink-0">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl">
                          <img src={result.book.frontCover} alt={`${result.book.title} front cover`} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[10px] text-faint text-center mt-1.5">Front Cover</div>
                      </div>
                    )}
                    {result.book.backCover && (
                      <div className="w-40 sm:w-48 shrink-0">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl">
                          <img src={result.book.backCover} alt={`${result.book.title} back cover`} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[10px] text-faint text-center mt-1.5">Back Cover</div>
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
