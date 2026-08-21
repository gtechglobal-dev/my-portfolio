// Market data service — fetches real data from free public crypto APIs
// Sources: CoinGecko (markets/trending/global), Binance → OKX → CoinGecko (candles),
// alternative.me (Fear & Greed), CryptoCompare (news). All responses cached in-memory.

const CG_BASE = 'https://api.coingecko.com/api/v3';
const BINANCE_BASE = 'https://api.binance.com/api/v3';
const MEXC_BASE = 'https://api.mexc.com/api/v3';
const GATEIO_BASE = 'https://api.gateio.ws/api/v4';
const FNG_URL = 'https://api.alternative.me/fng/';

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage1h: number | null;
  priceChangePercentage7d: number | null;
  ath: number;
  athChangePercentage: number;
  circulatingSupply: number | null;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  thumb: string;
  priceBtc: number;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  imageUrl: string;
  body: string;
  tags: string[];
  publishedOn: number;
}

export interface FearGreed {
  value: number;
  classification: string;
  updatedAt: number;
  history: { value: number; classification: string; date: string }[];
}

export interface GlobalMarket {
  totalMarketCapUsd: number;
  totalVolumeUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptocurrencies: number;
}

// ─── Cache ─────────────────────────────────────────────────

interface CacheEntry {
  data: any;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const data = await loader();
  cache.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}

async function fetchJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GtechGlobal-CryptoBot/1.0',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Stablecoins (excluded from signals — no tradeable trend) ──

export const STABLECOINS = new Set([
  'usdt', 'usdc', 'dai', 'fdusd', 'tusd', 'busd', 'usde', 'pyusd',
  'usdd', 'frax', 'lusd', 'gusd', 'usdp', 'eurc', 'eurs', 'usds',
]);

// ─── CoinGecko markets ─────────────────────────────────────

export async function getTopMarkets(limit = 50): Promise<CoinMarket[]> {
  return cached(`cg:markets:${limit}`, 90_000, async () => {
    const url =
      `${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}` +
      `&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;
    const raw = await fetchJson<any[]>(url);
    if (!Array.isArray(raw)) throw new Error('Unexpected markets response');
    return raw.map((c) => ({
      id: c.id,
      symbol: String(c.symbol || '').toLowerCase(),
      name: c.name,
      image: c.image,
      currentPrice: c.current_price ?? 0,
      marketCap: c.market_cap ?? 0,
      marketCapRank: c.market_cap_rank ?? 0,
      totalVolume: c.total_volume ?? 0,
      high24h: c.high_24h ?? 0,
      low24h: c.low_24h ?? 0,
      priceChange24h: c.price_change_24h ?? 0,
      priceChangePercentage24h: c.price_change_percentage_24h ?? 0,
      priceChangePercentage1h: c.price_change_percentage_1h_in_currency ?? null,
      priceChangePercentage7d: c.price_change_percentage_7d_in_currency ?? null,
      ath: c.ath ?? 0,
      athChangePercentage: c.ath_change_percentage ?? 0,
      circulatingSupply: c.circulating_supply ?? null,
    }));
  });
}

export async function getTrending(): Promise<TrendingCoin[]> {
  return cached('cg:trending', 300_000, async () => {
    const data = await fetchJson<any>(`${CG_BASE}/search/trending`);
    const coins = data?.coins ?? [];
    return coins.map((c: any) => ({
      id: c.item?.id,
      name: c.item?.name,
      symbol: String(c.item?.symbol || '').toUpperCase(),
      rank: c.item?.market_cap_rank ?? 0,
      thumb: c.item?.thumb,
      priceBtc: c.item?.price_btc ?? 0,
    }));
  });
}

export async function getGlobalMarket(): Promise<GlobalMarket> {
  return cached('cg:global', 120_000, async () => {
    const data = await fetchJson<any>(`${CG_BASE}/global`);
    const d = data?.data ?? {};
    return {
      totalMarketCapUsd: d.total_market_cap?.usd ?? 0,
      totalVolumeUsd: d.total_volume?.usd ?? 0,
      btcDominance: d.market_cap_percentage?.btc ?? 0,
      ethDominance: d.market_cap_percentage?.eth ?? 0,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? 0,
      activeCryptocurrencies: d.active_cryptocurrencies ?? 0,
    };
  });
}

// ─── Candles (Binance → OKX → CoinGecko fallback chain) ────

function mapBinanceKlines(rows: any[]): Candle[] {
  return rows.map((k) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

function mapGateioCandles(rows: any[]): Candle[] {
  // Gate.io returns newest-first string arrays:
  // [unix_time(s), quoteVolume, close, high, low, open, baseVolume, closed]
  return rows
    .map((k) => ({
      time: Number(k[0]) * 1000,
      open: parseFloat(k[5]),
      high: parseFloat(k[3]),
      low: parseFloat(k[4]),
      close: parseFloat(k[2]),
      volume: parseFloat(k[6]),
    }))
    .sort((a, b) => a.time - b.time);
}

function mapCoinGeckoOhlc(rows: any[]): Candle[] {
  // [timestamp, open, high, low, close] — no volume provided
  return rows.map((r) => ({
    time: r[0],
    open: r[1],
    high: r[2],
    low: r[3],
    close: r[4],
    volume: 0,
  }));
}

/**
 * Fetch OHLCV candles for a coin. Tries Binance spot klines first (best data),
 * then MEXC (Binance-compatible), then Gate.io, then CoinGecko OHLC.
 * Returns candles oldest→newest. Results cached ~3 minutes to stay within
 * public API rate limits.
 */
const candleCache = new Map<string, CacheEntry>();

export async function getCandles(
  coingeckoId: string,
  symbol: string,
  interval: '1h' | '4h' | '1d' = '4h',
  limit = 200,
): Promise<{ candles: Candle[]; source: string }> {
  const key = `${coingeckoId}:${interval}:${limit}`;
  const hit = candleCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as { candles: Candle[]; source: string };
  const pair = `${symbol.toUpperCase()}USDT`;

  const cacheResult = (result: { candles: Candle[]; source: string }) => {
    candleCache.set(key, { data: result, expires: Date.now() + 180_000 });
    return result;
  };

  // 1) Binance
  try {
    const binanceInterval = interval === '1h' ? '1h' : interval === '4h' ? '4h' : '1d';
    const rows = await fetchJson<any[]>(
      `${BINANCE_BASE}/klines?symbol=${pair}&interval=${binanceInterval}&limit=${limit}`,
    );
    if (Array.isArray(rows) && rows.length > 30) {
      return cacheResult({ candles: mapBinanceKlines(rows), source: 'binance' });
    }
  } catch {}

  // 2) MEXC (Binance-compatible klines)
  try {
    const mexcInterval = interval === '1h' ? '1h' : interval === '4h' ? '4h' : '1d';
    const rows = await fetchJson<any[]>(
      `${MEXC_BASE}/klines?symbol=${pair}&interval=${mexcInterval}&limit=${limit}`,
    );
    if (Array.isArray(rows) && rows.length > 30) {
      return cacheResult({ candles: mapBinanceKlines(rows), source: 'mexc' });
    }
  } catch {}

  // 3) Gate.io
  try {
    const gateInterval = interval === '1h' ? '1h' : interval === '4h' ? '4h' : '1d';
    const gateLimit = Math.min(limit, 1000);
    const rows = await fetchJson<any[]>(
      `${GATEIO_BASE}/spot/candlesticks?currency_pair=${pair.replace('USDT', '_USDT')}&interval=${gateInterval}&limit=${gateLimit}`,
    );
    if (Array.isArray(rows) && rows.length > 30) {
      return cacheResult({ candles: mapGateioCandles(rows), source: 'gateio' });
    }
  } catch {}

  // 3) CoinGecko OHLC (days param controls granularity: 30 → 4h candles)
  try {
    const days = interval === '1h' ? 7 : interval === '4h' ? 30 : 365;
    const rows = await fetchJson<any[]>(
      `${CG_BASE}/coins/${coingeckoId}/ohlc?vs_currency=usd&days=${days}`,
    );
    if (Array.isArray(rows) && rows.length > 30) {
      const result = { candles: mapCoinGeckoOhlc(rows), source: 'coingecko' };
      candleCache.set(key, { data: result, expires: Date.now() + 180_000 });
      return result;
    }
  } catch {}

  throw new Error(`No candle data available for ${symbol.toUpperCase()}`);
}

// ─── Fear & Greed Index ────────────────────────────────────

export async function getFearGreed(): Promise<FearGreed> {
  return cached('fng', 600_000, async () => {
    const data = await fetchJson<any>(`${FNG_URL}?limit=8`);
    const entries: any[] = data?.data ?? [];
    if (!entries.length) throw new Error('Fear & Greed unavailable');
    const classify = (v: number) =>
      v <= 24 ? 'Extreme Fear' : v <= 44 ? 'Fear' : v <= 54 ? 'Neutral' : v <= 74 ? 'Greed' : 'Extreme Greed';
    return {
      value: parseInt(entries[0].value, 10),
      classification: entries[0].value_classification || classify(parseInt(entries[0].value, 10)),
      updatedAt: Number(entries[0].timestamp) * 1000,
      history: entries.map((e) => ({
        value: parseInt(e.value, 10),
        classification: e.value_classification,
        date: new Date(Number(e.timestamp) * 1000).toISOString().slice(0, 10),
      })),
    };
  });
}

// ─── News (public RSS feeds — Cointelegraph → CoinDesk → Decrypt) ──

const NEWS_FEEDS = [
  'https://cointelegraph.com/rss',
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://decrypt.co/feed',
];

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeXml(m[1]) : '';
}

function tagAttr(block: string, name: string, attr: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*\\b${attr}="([^"]+)"`, 'i'));
  return m ? decodeXml(m[1]) : '';
}

function parseRss(xml: string): NewsItem[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return items.map((block, i) => {
    const title = tag(block, 'title');
    const url = tag(block, 'link') || tagAttr(block, 'feedburner:origLink', 'href');
    const pub = tag(block, 'pubDate');
    const image =
      tagAttr(block, 'media:content', 'url') ||
      tagAttr(block, 'media:thumbnail', 'url') ||
      tagAttr(block, 'enclosure', 'url') ||
      (tag(block, 'description').match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? '');
    const bodyRaw = tag(block, 'description').replace(/<img[^>]*>/gi, '').replace(/<[^>]+>/g, '');
    return {
      id: `${i}-${url || title}`,
      title,
      url,
      source: tag(block, 'source') || new URL(url || 'https://crypto.news').hostname.replace('www.', ''),
      imageUrl: image,
      body: bodyRaw.slice(0, 280),
      tags: [],
      publishedOn: pub ? new Date(pub).getTime() : Date.now(),
    };
  }).filter((n) => n.title && n.url);
}

export async function getNews(limit = 20): Promise<NewsItem[]> {
  return cached(`news:${limit}`, 300_000, async () => {
    for (const feed of NEWS_FEEDS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        let xml: string;
        try {
          const res = await fetch(feed, { signal: controller.signal, headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          xml = await res.text();
        } finally {
          clearTimeout(timer);
        }
        const items = parseRss(xml)
          .sort((a, b) => b.publishedOn - a.publishedOn)
          .slice(0, limit);
        if (items.length) return items;
      } catch (err: any) {
        console.warn(`News feed failed (${feed}): ${err.message}`);
      }
    }
    throw new Error('All news feeds unavailable');
  });
}
