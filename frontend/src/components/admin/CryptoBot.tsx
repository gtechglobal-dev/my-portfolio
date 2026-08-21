import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, RefreshCw, Activity, Flame, Newspaper, Gauge, TrendingUp, TrendingDown,
  Minus, ShieldAlert, Target, ChevronDown, ExternalLink, Zap, CircleDot,
  ArrowUpRight, ArrowDownRight, Info, Clock,
} from 'lucide-react';

const API = '/api';

interface IndicatorEvidence {
  name: string;
  value: string;
  verdict: 'bullish' | 'bearish' | 'neutral';
  vote: number;
  evidence: string;
}

interface RiskLevels {
  entry: number;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  riskRewardRatio: number | null;
  atrPercent: number;
  support: number;
  resistance: number;
}

interface TradeSignal {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  price: number;
  priceChange24h: number;
  marketCapRank: number;
  interval: string;
  candleSource: string;
  score: number;
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  trendLabel: string;
  indicators: IndicatorEvidence[];
  warnings: string[];
  regime: { label: string; description: string; bullish: boolean };
  risk: RiskLevels | null;
  analyzedAt: string;
}

interface ScanResponse {
  regime: { label: string; description: string; bullish: boolean };
  interval: string;
  scannedAt: string;
  signals: TradeSignal[];
  failed: { symbol: string; reason: string }[];
}

interface PulseData {
  global: { totalMarketCapUsd: number; totalVolumeUsd: number; btcDominance: number; marketCapChange24h: number; activeCryptocurrencies: number } | null;
  fearGreed: { value: number; classification: string; history: { value: number; date: string }[] } | null;
  btc: { symbol: string; name: string; image: string; price: number; change24h: number } | null;
  eth: { symbol: string; name: string; image: string; price: number; change24h: number } | null;
  gainers: { id: string; symbol: string; name: string; image: string; price: number; change24h: number }[];
  losers: { id: string; symbol: string; name: string; image: string; price: number; change24h: number }[];
}

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  thumb: string;
}

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  imageUrl: string;
  body: string;
  publishedOn: number;
}

const SIGNAL_STYLES: Record<TradeSignal['signal'], { label: string; cls: string; barCls: string }> = {
  STRONG_BUY: { label: 'Strong Buy', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', barCls: 'bg-emerald-500' },
  BUY: { label: 'Buy', cls: 'bg-green-500/10 text-green-400 border-green-500/20', barCls: 'bg-green-500' },
  NEUTRAL: { label: 'Neutral', cls: 'bg-white/[0.06] text-[#a196b8] border-white/10', barCls: 'bg-[#6b6180]' },
  SELL: { label: 'Sell / Avoid', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20', barCls: 'bg-orange-500' },
  STRONG_SELL: { label: 'Strong Sell', cls: 'bg-red-500/10 text-red-400 border-red-500/30', barCls: 'bg-red-500' },
};

function fmtCompact(n: number): string {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPrice(n: number): string {
  if (!n) return '—';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(4)}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ChangeChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict === 'bullish') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (verdict === 'bearish') return <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  return <Minus className="w-3.5 h-3.5 text-[#6b6180] shrink-0" />;
}

function FearGreedCard({ fg }: { fg: NonNullable<PulseData['fearGreed']> }) {
  const v = fg.value;
  const color = v <= 24 ? 'text-red-400' : v <= 44 ? 'text-orange-400' : v <= 54 ? 'text-yellow-300' : v <= 74 ? 'text-lime-400' : 'text-emerald-400';
  const barColor = v <= 24 ? 'bg-red-500' : v <= 44 ? 'bg-orange-500' : v <= 54 ? 'bg-yellow-400' : v <= 74 ? 'bg-lime-500' : 'bg-emerald-500';
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-indigo" />
        <span className="text-xs text-[#a196b8]">Fear &amp; Greed Index</span>
      </div>
      <div className="flex items-end gap-3">
        <div className={`text-4xl font-bold leading-none ${color}`}>{v}</div>
        <div className="text-sm text-[#c0c0d0] pb-0.5">{fg.classification}</div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${v}%` }} />
      </div>
      <div className="mt-3 flex items-end gap-1 h-8">
        {fg.history.slice().reverse().map((h) => (
          <div key={h.date} className="flex-1 flex flex-col justify-end" title={`${h.date}: ${h.value}`}>
            <div className={`w-full rounded-sm ${barColor} ${h.value <= 24 ? 'opacity-70' : ''}`}
              style={{ height: `${Math.max(h.value, 6)}%` }} />
          </div>
        ))}
      </div>
      <div className="text-[10px] text-[#6b6180] mt-1">Last 8 days</div>
    </div>
  );
}

function SignalCard({ s, expanded, onToggle }: { s: TradeSignal; expanded: boolean; onToggle: () => void }) {
  const meta = SIGNAL_STYLES[s.signal];
  const bullish = s.score >= 0;
  return (
    <motion.div layout className="card overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <img src={s.image} alt={s.name} className="w-9 h-9 rounded-full bg-[#120d1f]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{s.symbol}</span>
              <span className="text-[10px] text-[#6b6180]">#{s.marketCapRank}</span>
            </div>
            <div className="text-xs text-[#a196b8] truncate">{fmtPrice(s.price)} · <ChangeChip value={s.priceChange24h} /></div>
          </div>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="hidden sm:block w-24">
              <div className="flex justify-between text-[10px] text-[#6b6180] mb-1">
                <span>confidence</span><span>{s.confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div className={`h-full rounded-full ${meta.barCls}`} style={{ width: `${s.confidence}%` }} />
              </div>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${meta.cls}`}>{meta.label}</span>
            <span className={`text-xs font-bold w-10 text-right ${bullish ? 'text-emerald-400' : 'text-red-400'}`}>
              {s.score > 0 ? '+' : ''}{s.score}
            </span>
            <ChevronDown className={`w-4 h-4 text-[#a196b8] transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04] pt-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#6b6180]">
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {s.interval} candles · {s.candleSource}</span>
                <span className="inline-flex items-center gap-1"><Activity className="w-3 h-3" /> trend: {s.trendLabel}</span>
                <span className="inline-flex items-center gap-1"><CircleDot className="w-3 h-3" /> analyzed {timeAgo(new Date(s.analyzedAt).getTime())}</span>
              </div>

              <div className={`rounded-lg p-3 text-xs leading-relaxed ${s.regime.bullish ? 'bg-emerald-500/[0.06] text-emerald-200/80' : 'bg-orange-500/[0.06] text-orange-200/80'}`}>
                <span className="font-semibold">Market regime: {s.regime.label}.</span> {s.regime.description}
              </div>

              {s.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {s.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-orange-300/90">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#a196b8] mb-2">Evidence — technical indicators</div>
                <div className="space-y-2">
                  {s.indicators.map((ind) => (
                    <div key={ind.name} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <VerdictIcon verdict={ind.verdict} />
                        <span className="text-xs font-medium">{ind.name}</span>
                        <span className="ml-auto text-xs text-[#a196b8]">{ind.value}</span>
                        <span className={`text-[10px] font-semibold w-9 text-right ${ind.vote > 0 ? 'text-emerald-400' : ind.vote < 0 ? 'text-red-400' : 'text-[#6b6180]'}`}>
                          {ind.vote > 0 ? '+' : ''}{ind.vote}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#a196b8] pl-5.5">{ind.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>

              {s.risk && s.risk.stopLoss !== null && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#a196b8] mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Trade plan (risk-managed)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: 'Entry', value: fmtPrice(s.risk.entry), cls: 'text-white' },
                      { label: 'Stop Loss', value: fmtPrice(s.risk.stopLoss!), cls: 'text-red-400' },
                      { label: 'TP 1 (1R)', value: fmtPrice(s.risk.takeProfit1!), cls: 'text-emerald-400' },
                      { label: 'TP 2 (2R)', value: fmtPrice(s.risk.takeProfit2!), cls: 'text-emerald-400' },
                      { label: 'TP 3 (3R)', value: fmtPrice(s.risk.takeProfit3!), cls: 'text-emerald-400' },
                    ].map((x) => (
                      <div key={x.label} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <div className="text-[10px] text-[#6b6180]">{x.label}</div>
                        <div className={`text-xs font-semibold mt-0.5 ${x.cls}`}>{x.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-[#6b6180] mt-2">
                    Support {fmtPrice(s.risk.support)} · Resistance {fmtPrice(s.risk.resistance)} · Volatility (ATR) {s.risk.atrPercent.toFixed(2)}% · R:R 1:{s.risk.riskRewardRatio}
                  </div>
                </div>
              )}

              {s.signal === 'NEUTRAL' && (
                <div className="rounded-lg bg-white/[0.03] p-3 text-xs text-[#a196b8] flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo" />
                  No tradeable edge right now. The bot recommends staying flat until indicators align.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CryptoBot({ token }: { token: string }) {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [interval_, setInterval_] = useState<'1h' | '4h' | '1d'>('4h');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const loadPulse = useCallback(async () => {
    try {
      const r = await fetch(`${API}/crypto/pulse`, { headers });
      if (r.ok) setPulse(await r.json());
    } catch {}
  }, [token]);

  const loadSideData = useCallback(async () => {
    try {
      const [t, n] = await Promise.all([
        fetch(`${API}/crypto/trending`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/crypto/news?limit=15`, { headers }).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (t?.trending) setTrending(t.trending);
      if (n?.news) setNews(n.news);
    } catch {}
  }, [token]);

  const runScan = useCallback(async (silent = false) => {
    if (!silent) setScanning(true);
    setScanError('');
    try {
      const r = await fetch(`${API}/crypto/scan?limit=12&interval=${interval_}`, { headers });
      const data = await r.json();
      if (r.ok) {
        setScan(data);
        setLastScan(Date.now());
      } else if (!silent) {
        setScanError(data.error || 'Scan failed');
      }
    } catch {
      if (!silent) setScanError('Cannot reach the server');
    }
    if (!silent) setScanning(false);
  }, [token, interval_]);

  useEffect(() => {
    loadPulse();
    loadSideData();
    runScan();
  }, []);

  useEffect(() => {
    runScan();
  }, [interval_]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      runScan(true);
      loadPulse();
      loadSideData();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [autoRefresh, runScan, loadPulse, loadSideData]);

  const buys = scan?.signals.filter((s) => s.score >= 25).length ?? 0;
  const sells = scan?.signals.filter((s) => s.score <= -25).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo to-[#2b0f4e] flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Crypto Signal Bot</h3>
            <p className="text-[10px] text-[#6b6180]">
              Live market analysis · {scan ? `${scan.signals.length} coins scanned` : 'initializing…'}
              {lastScan ? ` · updated ${timeAgo(lastScan)}` : ''}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
            {(['1h', '4h', '1d'] as const).map((tf) => (
              <button key={tf} onClick={() => setInterval_(tf)}
                className={`px-3 py-1.5 text-xs transition-colors ${interval_ === tf ? 'bg-indigo text-white' : 'bg-transparent text-[#a196b8] hover:text-white'}`}>
                {tf}
              </button>
            ))}
          </div>
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${autoRefresh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-white/[0.04] text-[#a196b8] border-white/[0.08] hover:text-white'}`}>
            <Zap className="w-3.5 h-3.5" /> Auto 5m {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => runScan()} disabled={scanning}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo text-white text-xs font-semibold hover:bg-indigo-dark transition-all disabled:opacity-50">
            {scanning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Scanning…
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Run Market Scan
              </>
            )}
          </button>
        </div>
      </div>

      {scanError && (
        <div className="card p-4 text-sm text-red-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> {scanError}
        </div>
      )}

      {pulse && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {pulse.fearGreed ? <FearGreedCard fg={pulse.fearGreed} /> : (
            <div className="card p-5 text-xs text-[#6b6180]">Fear &amp; Greed unavailable</div>
          )}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-indigo" />
              <span className="text-xs text-[#a196b8]">Total Market Cap</span>
            </div>
            <div className="text-2xl font-bold">{fmtCompact(pulse.global?.totalMarketCapUsd ?? 0)}</div>
            {pulse.global && <div className="mt-1"><ChangeChip value={pulse.global.marketCapChange24h} /></div>}
            <div className="text-[10px] text-[#6b6180] mt-2">Vol 24h {fmtCompact(pulse.global?.totalVolumeUsd ?? 0)}</div>
          </div>
          {[pulse.btc, pulse.eth].map((c, i) => c && (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <img src={c.image} alt={c.name} className="w-4 h-4 rounded-full" />
                <span className="text-xs text-[#a196b8]">{c.name}</span>
              </div>
              <div className="text-2xl font-bold">{fmtPrice(c.price)}</div>
              <div className="mt-1"><ChangeChip value={c.change24h} /></div>
            </div>
          ))}
        </div>
      )}

      {scan && (
        <div className={`rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2 border ${
          scan.regime.bullish ? 'bg-emerald-500/[0.05] border-emerald-500/20' : 'bg-orange-500/[0.05] border-orange-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {scan.regime.bullish
              ? <TrendingUp className="w-4 h-4 text-emerald-400" />
              : <TrendingDown className="w-4 h-4 text-orange-400" />}
            <span className={`text-sm font-semibold ${scan.regime.bullish ? 'text-emerald-400' : 'text-orange-400'}`}>
              {scan.regime.label} regime
            </span>
          </div>
          <p className="text-xs text-[#a196b8] flex-1 min-w-[240px]">{scan.regime.description}</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400">{buys} buy zone</span>
            <span className="text-[#6b6180]">{(scan.signals.length - buys - sells)} neutral</span>
            <span className="text-red-400">{sells} avoid</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo" /> Signals — top of market
          </h3>
          {!scan && !scanError ? (
            <div className="card p-10 text-center">
              <div className="w-6 h-6 border-2 border-indigo border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#6b6180] mt-3">Scanning the market…</p>
            </div>
          ) : scan && scan.signals.length === 0 ? (
            <div className="card p-10 text-center">
              <Bot className="w-10 h-10 text-[#6b6180] mx-auto mb-3" />
              <p className="text-sm text-[#a196b8]">No signals produced{scan.failed.length ? ` — ${scan.failed.length} coin(s) had no data` : ''}</p>
            </div>
          ) : (
            scan?.signals.map((s) => (
              <SignalCard key={s.id} s={s} expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-accent" /> Trending Now
            </h3>
            {trending.length === 0 ? (
              <p className="text-xs text-[#6b6180] py-3 text-center">Loading trending coins…</p>
            ) : (
              <div className="space-y-2">
                {trending.slice(0, 7).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <span className="text-[10px] text-[#6b6180] w-3">{i + 1}</span>
                    <img src={t.thumb} alt={t.name} className="w-6 h-6 rounded-full" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{t.name}</div>
                      <div className="text-[10px] text-[#6b6180]">{t.symbol}{t.rank ? ` · rank #${t.rank}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pulse && (pulse.gainers.length > 0 || pulse.losers.length > 0) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" /> 24h Movers
              </h3>
              <div className="space-y-1.5">
                {pulse.gainers.slice(0, 3).map((g) => (
                  <div key={g.id} className="flex items-center gap-2 text-xs">
                    <img src={g.image} alt="" className="w-4 h-4 rounded-full" />
                    <span className="font-medium">{g.symbol}</span>
                    <span className="ml-auto text-emerald-400">+{g.change24h.toFixed(1)}%</span>
                  </div>
                ))}
                {pulse.losers.slice(0, 3).map((l) => (
                  <div key={l.id} className="flex items-center gap-2 text-xs">
                    <img src={l.image} alt="" className="w-4 h-4 rounded-full" />
                    <span className="font-medium">{l.symbol}</span>
                    <span className="ml-auto text-red-400">{l.change24h.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Newspaper className="w-4 h-4 text-indigo" /> Latest Crypto News
            </h3>
            {news.length === 0 ? (
              <p className="text-xs text-[#6b6180] py-3 text-center">Loading news feed…</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {news.map((n) => (
                  <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-2.5 group">
                    {n.imageUrl && <img src={n.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-[#120d1f]" />}
                    <div className="min-w-0">
                      <div className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-indigo transition-colors">{n.title}</div>
                      <div className="text-[10px] text-[#6b6180] mt-1">{n.source} · {timeAgo(n.publishedOn)}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
            <a href="https://www.coingecko.com/en/news" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-indigo hover:text-indigo/80 mt-3">
              More news <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#6b6180] shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-[#6b6180]">
          Signals are generated algorithmically from real-time market data (CoinGecko, Binance/OKX order book candles,
          Fear &amp; Greed index) using RSI, MACD, moving-average structure, Bollinger Bands, volume and volatility analysis.
          They are informational only — <span className="text-[#a196b8]">not financial advice.</span> Always do your own research
          and never risk more than you can afford to lose.
        </p>
      </div>
    </div>
  );
}
