import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldX, BookOpen, Loader2, Calendar, Hash, Users, FileText, BadgeCheck, X, AlertTriangle, Phone, Mail } from 'lucide-react';

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
  createdAt: string;
}

interface VerifyResult {
  active: boolean;
  status?: string;
  code?: { serial: string; activatedAt?: string | null; createdAt?: string; verifyCount?: number; lastVerifiedAt?: string | null };
  book?: BookInfo | null;
  flagged?: boolean;
  flagReason?: string | null;
  error?: string;
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      <Icon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className="text-sm text-white/90">{value}</div>
      </div>
    </div>
  );
}

interface VerifyProps {
  code: string;
}

export default function Verify({ code }: VerifyProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [closeHint, setCloseHint] = useState(false);

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
          setResult({ active: false, status: 'invalid', error: data.error });
          return;
        }
        setResult(data);
      })
      .catch(() => setError('Could not connect to the verification server. Please try again.'))
      .finally(() => { clearTimeout(timer); setLoading(false); });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [code]);

  const handleClose = () => {
    window.close();
    setTimeout(() => setCloseHint(true), 600);
  };

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
        {loading ? (
          <div className="card p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm text-muted">Verifying code...</p>
          </div>
        ) : error ? (
          <div className="card p-10 max-w-md w-full text-center">
            <ShieldX className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Verification Unavailable</h1>
            <p className="text-sm text-muted">{error}</p>
            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <p className="text-xs text-muted mb-2">Contact us for assistance:</p>
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
          </div>
        ) : result?.status === 'revoked' ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="card p-10 max-w-md w-full text-center border-rose-500/30">
            <ShieldX className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Code Revoked</h1>
            <p className="text-sm text-muted mb-4">
              This QR code has been revoked by the publisher and is no longer valid.
              If you purchased a book carrying this code, it may be an unauthorized or counterfeit copy.
            </p>
            {result?.code?.serial && (
              <div className="text-xs text-faint">Serial: <span className="text-white/80">{result.code.serial}</span></div>
            )}
            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <p className="text-xs text-muted mb-2">Report suspicious activity:</p>
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
            <button onClick={handleClose} className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">
              Close <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : !result || result.status === 'invalid' || !result.active ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="card p-10 max-w-md w-full text-center border-amber-500/30">
            <ShieldX className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Code Not Activated</h1>
            <p className="text-sm text-muted mb-4">
              This QR code exists but has not yet been activated by Okson Publishers.
              Book authenticity can only be confirmed once the code is activated.
            </p>
            {result?.code?.serial && (
              <div className="text-xs text-faint">Serial: <span className="text-white/80">{result.code.serial}</span></div>
            )}
            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <p className="text-xs text-muted mb-2">Contact us for assistance:</p>
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
            <button onClick={handleClose} className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">
              Close <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full">
            <div className="card p-8 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h1 className="text-xl font-bold">Authentic Product</h1>
              </div>
              <p className="text-sm text-muted mb-5">
                This QR code has been verified as genuine and corresponds to the registered publication below.
              </p>

              {result.flagged && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-6">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-amber-300">Suspicious Activity Detected</div>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      {result.flagReason || 'This serial has been scanned from multiple locations.'} This could mean one of these codes has been copied or printed without authorization. If you did not buy an original copy, contact the publisher.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified Genuine
                </div>
                <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-white/[0.05] text-muted font-medium">
                  Serial: {result.code?.serial}
                </div>
                {result.code?.activatedAt && (
                  <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-white/[0.05] text-muted font-medium">
                    Activated {new Date(result.code.activatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {result.book ? (
                <>
                  <div className="flex items-start gap-4 mb-2">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <BookOpen className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold leading-tight">{result.book.title}</h2>
                      <div className="text-sm text-emerald-400 mt-0.5">by {result.book.author}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid sm:grid-cols-2 gap-x-6">
                    <div className="border-t border-white/[0.05] pt-2">
                      <DetailRow icon={Hash} label="ISBN" value={result.book.isbn} />
                      <DetailRow icon={Users} label="Publisher" value={result.book.publisher} />
                      <DetailRow icon={Calendar} label="Year" value={result.book.year} />
                    </div>
                    <div className="border-t border-white/[0.05] pt-2">
                      <DetailRow icon={FileText} label="Edition" value={result.book.edition} />
                      <DetailRow icon={BookOpen} label="Category" value={result.book.category} />
                    </div>
                  </div>

                  {result.book.description && (
                    <div className="mt-4 pt-4 border-t border-white/[0.05]">
                      <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">About this book</div>
                      <p className="text-sm leading-relaxed text-[#c5c5ca]">{result.book.description}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">Book details are not available.</p>
              )}

              <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
                <p className="text-[11px] text-faint">
                  This verification is provided by <span className="text-white/70">Okson Publishers</span>.
                  Ensure you are scanning the code printed on the official book cover.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-white/[0.05]">
                <p className="text-xs text-muted mb-3">Have complaints or suspect fraud? Contact Okson Publishers:</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
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

              <button onClick={handleClose} className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] py-2.5 text-sm text-white/80 hover:border-white/20 hover:text-white transition-colors">
                Close Page <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
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