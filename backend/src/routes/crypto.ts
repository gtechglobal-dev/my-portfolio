import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import {
  getTopMarkets,
  getTrending,
  getGlobalMarket,
  getCandles,
  getFearGreed,
  getNews,
  STABLECOINS,
} from '../services/marketData.js';
import { analyzeCoin, buildRegime, type TradeSignal } from '../services/signalEngine.js';

const router = Router();
router.use(authMiddleware);

// ─── Market pulse: global stats + fear & greed + BTC/ETH snapshot ──

router.get('/pulse', async (_req: Request, res: Response) => {
  try {
    const [markets, global, fearGreed] = await Promise.all([
      getTopMarkets(50),
      getGlobalMarket().catch(() => null),
      getFearGreed().catch(() => null),
    ]);

    const btc = markets.find((c) => c.symbol === 'btc') || null;
    const eth = markets.find((c) => c.symbol === 'eth') || null;
    const tradable = markets.filter((c) => !STABLECOINS.has(c.symbol));
    const gainers = [...tradable].sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h).slice(0, 5);
    const losers = [...tradable].sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h).slice(0, 5);

    res.json({
      global,
      fearGreed: fearGreed
        ? { value: fearGreed.value, classification: fearGreed.classification, history: fearGreed.history }
        : null,
      btc: btc && { symbol: btc.symbol, name: btc.name, image: btc.image, price: btc.currentPrice, change24h: btc.priceChangePercentage24h },
      eth: eth && { symbol: eth.symbol, name: eth.name, image: eth.image, price: eth.currentPrice, change24h: eth.priceChangePercentage24h },
      gainers: gainers.map((c) => ({ id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image, price: c.currentPrice, change24h: c.priceChangePercentage24h })),
      losers: losers.map((c) => ({ id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image, price: c.currentPrice, change24h: c.priceChangePercentage24h })),
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Crypto pulse failed:', err.message);
    res.status(502).json({ error: 'Failed to fetch market data. Try again shortly.' });
  }
});

// ─── Trending coins ────────────────────────────────────────

router.get('/trending', async (_req: Request, res: Response) => {
  try {
    res.json({ trending: await getTrending() });
  } catch (err: any) {
    console.error('Trending fetch failed:', err.message);
    res.status(502).json({ error: 'Failed to fetch trending coins' });
  }
});

// ─── News ──────────────────────────────────────────────────

router.get('/news', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit) || '20', 10) || 20, 40);
    res.json({ news: await getNews(limit) });
  } catch (err: any) {
    console.error('News fetch failed:', err.message);
    res.status(502).json({ error: 'Failed to fetch news' });
  }
});

// ─── Top markets list ──────────────────────────────────────

router.get('/markets', async (_req: Request, res: Response) => {
  try {
    res.json({ markets: await getTopMarkets(50) });
  } catch (err: any) {
    console.error('Markets fetch failed:', err.message);
    res.status(502).json({ error: 'Failed to fetch market data' });
  }
});

// ─── Full market scan: signals for top N coins ─────────────

router.get('/scan', async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit) || '12', 10) || 12, 1), 25);
  const intervalParam = String(req.query.interval || '4h');
  const interval = (['1h', '4h', '1d'].includes(intervalParam) ? intervalParam : '4h') as '1h' | '4h' | '1d';

  try {
    const markets = await getTopMarkets(50);
    const candidates = markets
      .filter((c) => !STABLECOINS.has(c.symbol))
      .filter((c) => /^[a-z0-9]{2,10}$/i.test(c.symbol))
      .slice(0, limit);

    const [fearGreed, btcCandles] = await Promise.all([
      getFearGreed().catch(() => null),
      getCandles('bitcoin', 'btc', interval, 220).catch(() => null),
    ]);

    const regime = buildRegime(
      btcCandles?.candles ?? null,
      fearGreed?.value ?? null,
      fearGreed?.classification ?? null,
    );

    const signals: TradeSignal[] = [];
    const failed: { symbol: string; reason: string }[] = [];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const CONCURRENCY = 3;
    const queue = [...candidates];
    const worker = async () => {
      while (queue.length > 0) {
        const coin = queue.shift()!;
        let done = false;
        for (let attempt = 0; attempt < 2 && !done; attempt++) {
          try {
            const { candles, source } = await getCandles(coin.id, coin.symbol, interval, 220);
            signals.push(
              analyzeCoin({
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                image: coin.image,
                price: coin.currentPrice,
                priceChange24h: coin.priceChangePercentage24h,
                marketCapRank: coin.marketCapRank,
                candles,
                candleSource: source,
                interval,
                regime,
              }),
            );
            done = true;
          } catch (err: any) {
            if (attempt === 0) await sleep(1200);
            else failed.push({ symbol: coin.symbol.toUpperCase(), reason: err?.message || 'analysis failed' });
          }
        }
        await sleep(250);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    signals.sort((a, b) => b.score - a.score);

    res.json({
      regime,
      interval,
      scannedAt: new Date().toISOString(),
      signals,
      failed,
    });
  } catch (err: any) {
    console.error('Scan failed:', err.message);
    res.status(502).json({ error: 'Market scan failed. Try again shortly.' });
  }
});

// ─── Deep analysis for a single coin ───────────────────────

router.get('/signal/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const intervalParam = String(req.query.interval || '4h');
  const interval = (['1h', '4h', '1d'].includes(intervalParam) ? intervalParam : '4h') as '1h' | '4h' | '1d';

  try {
    const markets = await getTopMarkets(50);
    const coin = markets.find((c) => c.id === id);
    if (!coin) return res.status(404).json({ error: `Coin "${id}" not found in top 50 markets` });
    if (STABLECOINS.has(coin.symbol)) return res.status(400).json({ error: 'Stablecoins are not analysed' });

    const [fearGreed, candleData] = await Promise.all([
      getFearGreed().catch(() => null),
      getCandles(coin.id, coin.symbol, interval, 220),
    ]);

    const regime = buildRegime(null, fearGreed?.value ?? null, fearGreed?.classification ?? null);
    const signal = analyzeCoin({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      price: coin.currentPrice,
      priceChange24h: coin.priceChangePercentage24h,
      marketCapRank: coin.marketCapRank,
      candles: candleData.candles,
      candleSource: candleData.source,
      interval,
      regime,
    });

    res.json({ signal });
  } catch (err: any) {
    console.error(`Signal for ${id} failed:`, err.message);
    res.status(502).json({ error: `Analysis failed for ${id}: ${err.message}` });
  }
});

export default router;
