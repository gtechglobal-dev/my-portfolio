import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldX, BookOpen, Loader2, Calendar, Hash, Users, FileText, BadgeCheck } from 'lucide-react';

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
  code?: { serial: string; activatedAt?: string | null; createdAt?: string };
  book?: BookInfo | null;
  error?: string;
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      <Icon className="w-4 h-4 text-indigo mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className="text-sm text-white/90">{value}</div>
      </div>
    </div>
  );
}

export default function Verify() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`${API}/qrcode/verify/${code}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setResult({ active: false, status: 'invalid', error: data.error });
          return;
        }
        setResult(data);
      })
      .catch(() => setError('Could not connect to the verification server. Please try again.'))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] flex flex-col">
      <header className="w-full border-b border-white/[0.05]">
        <div className="container flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold leading-tight">Okson Publishers</div>
              <div className="text-[10px] text-muted">Book Authenticity Verification</div>
            </div>
          </div>
          <Link to="/" className="text-xs text-muted hover:text-white transition-colors">Visit Okson Publishers</Link>
        </div>
      </header>

      <main className="flex-1 container flex items-start justify-center px-6 py-16">
        {loading ? (
          <div className="card p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo animate-spin" />
            <p className="text-sm text-muted">Verifying code...</p>
          </div>
        ) : error ? (
          <div className="card p-10 max-w-md w-full text-center">
            <ShieldX className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Verification Unavailable</h1>
            <p className="text-sm text-muted">{error}</p>
          </div>
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
            <Link to="/" className="btn btn-primary mt-6 text-sm">Continue</Link>
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
                    <div className="w-14 h-14 rounded-2xl bg-indigo/15 flex items-center justify-center shrink-0">
                      <BookOpen className="w-7 h-7 text-indigo" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold leading-tight">{result.book.title}</h2>
                      <div className="text-sm text-indigo mt-0.5">by {result.book.author}</div>
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
            </div>

            <Link to="/" className="block text-center text-sm text-indigo hover:text-indigo/80 transition-colors">← Back to Okson Publishers</Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
