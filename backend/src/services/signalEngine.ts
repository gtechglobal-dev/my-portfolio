// Crypto signal engine — computes real technical indicators from OHLCV candles
// and produces a composite buy/sell signal with transparent evidence.
//
// Indicators: RSI(14), MACD(12,26,9), SMA 20/50/200 trend structure,
// EMA 9/21 momentum cross, Bollinger Bands(20,2), ATR(14) volatility,
// volume confirmation and support/resistance structure.

import type { Candle } from './marketData.js';

export type SignalLabel = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
export type Verdict = 'bullish' | 'bearish' | 'neutral';

export interface IndicatorEvidence {
  name: string;
  value: string;
  verdict: Verdict;
  vote: number;
  evidence: string;
}

export interface RegimeContext {
  label: string;
  description: string;
  bullish: boolean;
  fearGreedValue: number | null;
  fearGreedLabel: string | null;
}

export interface RiskLevels {
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

export interface TradeSignal {
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
  signal: SignalLabel;
  confidence: number;
  trendLabel: string;
  indicators: IndicatorEvidence[];
  warnings: string[];
  regime: RegimeContext;
  risk: RiskLevels | null;
  analyzedAt: string;
}

// ─── Core math helpers ─────────────────────────────────────

function sma(values: number[], period: number): number {
  if (values.length < period) return NaN;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function ema(values: number[], period: number): number {
  const series = emaSeries(values, period);
  return series.length ? series[series.length - 1] : NaN;
}

/** Wilder's RSI */
function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return NaN;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
  prevHistogram: number;
  crossedUp: boolean;
  crossedDown: boolean;
}

function macd(closes: number[]): MacdResult | null {
  if (closes.length < 35) return null;
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  // align tails (ema12 is longer)
  const offset = ema12.length - ema26.length;
  const macdLine: number[] = [];
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[i + offset] - ema26[i]);
  }
  const signalSeries = emaSeries(macdLine, 9);
  if (!signalSeries.length || macdLine.length < 2) return null;
  const mOffset = macdLine.length - signalSeries.length;
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalSeries[signalSeries.length - 1];
  const histogram = lastMacd - lastSignal;
  const prevHistogram =
    macdLine[macdLine.length - 2] - signalSeries[signalSeries.length - 2];
  return {
    macd: lastMacd,
    signal: lastSignal,
    histogram,
    prevHistogram,
    crossedUp: prevHistogram <= 0 && histogram > 0,
    crossedDown: prevHistogram >= 0 && histogram < 0,
  };
}

interface BollingerResult {
  upper: number;
  middle: number;
  lower: number;
  percentB: number; // 0 = at lower band, 1 = at upper band
}

function bollinger(closes: number[], period = 20, mult = 2): BollingerResult | null {
  if (closes.length < period) return null;
  const mid = sma(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((acc, v) => acc + (v - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  const upper = mid + mult * sd;
  const lower = mid - mult * sd;
  const percentB = upper === lower ? 0.5 : (closes[closes.length - 1] - lower) / (upper - lower);
  return { upper, middle: mid, lower, percentB };
}

/** Wilder's ATR */
function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return NaN;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
  }
  let value = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    value = (value * (period - 1) + trs[i]) / period;
  }
  return value;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(parseFloat(n.toFixed(n < 1 ? 4 : 2)));

// ─── Market regime ─────────────────────────────────────────

export function buildRegime(
  btcCandles: Candle[] | null,
  fearGreedValue: number | null,
  fearGreedLabel: string | null,
): RegimeContext {
  let btcTrendBullish: boolean | null = null;
  let btcDesc = '';
  if (btcCandles && btcCandles.length >= 60) {
    const closes = btcCandles.map((c) => c.close);
    const sma50 = sma(closes, 50);
    const price = closes[closes.length - 1];
    btcTrendBullish = price > sma50;
    btcDesc = `BTC is ${btcTrendBullish ? 'above' : 'below'} its 50-period average (${fmt(sma50)})`;
  }

  const fg = fearGreedValue;
  let label: string;
  let bullish: boolean;

  if (btcTrendBullish === null && fg === null) {
    return { label: 'Unknown', description: 'Not enough data to assess market regime.', bullish: true, fearGreedValue: fg, fearGreedLabel };
  }

  if ((btcTrendBullish ?? true) && (fg === null || fg >= 45)) {
    label = 'Bullish';
    bullish = true;
  } else if (!(btcTrendBullish ?? false) && (fg !== null && fg < 30)) {
    label = 'Capitulation Risk';
    bullish = false;
  } else if (!(btcTrendBullish ?? false)) {
    label = 'Bearish';
    bullish = false;
  } else {
    label = 'Mixed';
    bullish = fg !== null ? fg >= 45 : true;
  }

  const parts: string[] = [];
  if (btcDesc) parts.push(btcDesc);
  if (fg !== null) parts.push(`Fear & Greed at ${fg} (${fearGreedLabel})`);
  if (label === 'Bullish') parts.push('conditions generally favour long entries');
  else if (label === 'Bearish') parts.push('conditions favour caution — counter-trend buys carry higher risk');
  else if (label === 'Capitulation Risk') parts.push('panic conditions — historically an accumulation zone, but very high risk');
  else parts.push('signals are mixed — wait for confirmation');

  return { label, description: parts.join('; ') + '.', bullish, fearGreedValue: fg, fearGreedLabel };
}

// ─── Signal classification ─────────────────────────────────

export function classify(score: number): SignalLabel {
  if (score >= 60) return 'STRONG_BUY';
  if (score >= 25) return 'BUY';
  if (score > -25) return 'NEUTRAL';
  if (score > -60) return 'SELL';
  return 'STRONG_SELL';
}

export function signalMeta(label: SignalLabel): { text: string; action: string } {
  switch (label) {
    case 'STRONG_BUY': return { text: 'Strong Buy', action: 'Multiple aligned bullish signals — favourable window to enter with a stop-loss.' };
    case 'BUY': return { text: 'Buy', action: 'Conditions lean bullish — consider entering on confirmation or dips.' };
    case 'NEUTRAL': return { text: 'Neutral', action: 'No edge — stay out of the market and wait for clearer signals.' };
    case 'SELL': return { text: 'Sell / Avoid', action: 'Conditions lean bearish — avoid new longs; holders should tighten stops.' };
    case 'STRONG_SELL': return { text: 'Strong Sell', action: 'Multiple aligned bearish signals — exit longs and stand aside.' };
  }
}

// ─── Main analysis ─────────────────────────────────────────

export interface AnalyzeInput {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  price: number;
  priceChange24h: number;
  marketCapRank: number;
  candles: Candle[];
  candleSource: string;
  interval: string;
  regime: RegimeContext;
}

export function analyzeCoin(input: AnalyzeInput): TradeSignal {
  const { candles, regime } = input;
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const price = closes[closes.length - 1];
  const indicators: IndicatorEvidence[] = [];
  const warnings: string[] = [];

  // 1. Trend structure — SMA 50/200 alignment (±20)
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const hasSma200 = !isNaN(sma200);
  const aboveSma50 = price > sma50;
  const aboveSma200 = hasSma200 ? price > sma200 : aboveSma50;
  let trendVote = 0;
  let trendVerdict: Verdict = 'neutral';
  let trendText = '';
  if (aboveSma50 && aboveSma200) {
    trendVote = 20;
    trendVerdict = 'bullish';
    trendText = `Price (${fmt(price)}) trades above both the 50-MA (${fmt(sma50)})${hasSma200 ? ` and 200-MA (${fmt(sma200)})` : ''} — classic uptrend structure.`;
  } else if (!aboveSma50 && !aboveSma200) {
    trendVote = -20;
    trendVerdict = 'bearish';
    trendText = `Price (${fmt(price)}) trades below both the 50-MA (${fmt(sma50)})${hasSma200 ? ` and 200-MA (${fmt(sma200)})` : ''} — downtrend structure.`;
  } else {
    trendVote = aboveSma50 ? 8 : -8;
    trendVerdict = aboveSma50 ? 'bullish' : 'bearish';
    trendText = `Mixed structure: price is ${aboveSma50 ? 'above' : 'below'} the 50-MA (${fmt(sma50)}) but ${aboveSma200 ? 'above' : 'below'} the 200-MA (${hasSma200 ? fmt(sma200) : 'n/a'}) — transition phase.`;
  }
  indicators.push({ name: 'Trend Structure (SMA 50/200)', value: `${fmt(sma50)}${hasSma200 ? ` / ${fmt(sma200)}` : ''}`, verdict: trendVerdict, vote: trendVote, evidence: trendText });

  // 2. MACD (±20)
  const m = macd(closes);
  let macdVote = 0;
  if (m) {
    const histPct = price > 0 ? (m.histogram / price) * 100 : 0;
    if (m.crossedUp) {
      macdVote = 20;
      indicators.push({ name: 'MACD (12,26,9)', value: `hist ${m.histogram.toPrecision(3)}`, verdict: 'bullish', vote: macdVote, evidence: 'Fresh bullish MACD crossover this period — momentum just flipped positive.' });
    } else if (m.crossedDown) {
      macdVote = -20;
      indicators.push({ name: 'MACD (12,26,9)', value: `hist ${m.histogram.toPrecision(3)}`, verdict: 'bearish', vote: macdVote, evidence: 'Fresh bearish MACD crossover this period — momentum just flipped negative.' });
    } else if (m.histogram > 0 && histPct > 0.05) {
      macdVote = clamp(Math.round(10 + histPct * 40), 11, 18);
      indicators.push({ name: 'MACD (12,26,9)', value: `hist ${m.histogram.toPrecision(3)}`, verdict: 'bullish', vote: macdVote, evidence: `MACD histogram positive (${histPct.toFixed(2)}% of price) and ${m.histogram > m.prevHistogram ? 'expanding' : 'contracting'} — bullish momentum ${m.histogram > m.prevHistogram ? 'building' : 'fading'}.` });
    } else if (m.histogram < 0 && histPct < -0.05) {
      macdVote = clamp(Math.round(10 + histPct * 40), -18, -11);
      indicators.push({ name: 'MACD (12,26,9)', value: `hist ${m.histogram.toPrecision(3)}`, verdict: 'bearish', vote: macdVote, evidence: `MACD histogram negative (${histPct.toFixed(2)}% of price) — bearish momentum in control.` });
    } else {
      indicators.push({ name: 'MACD (12,26,9)', value: `hist ${m.histogram.toPrecision(3)}`, verdict: 'neutral', vote: 0, evidence: 'MACD hovers near its signal line — no meaningful momentum edge.' });
    }
  }

  // 3. RSI (±15)
  const r = rsi(closes, 14);
  let rsiVote = 0;
  let rsiVerdict: Verdict = 'neutral';
  let rsiText = '';
  if (!isNaN(r)) {
    if (r < 30) {
      rsiVote = 15; rsiVerdict = 'bullish';
      rsiText = `RSI ${r.toFixed(1)} — oversold. Historically a high-probability bounce zone.`;
    } else if (r < 40) {
      rsiVote = 7; rsiVerdict = 'bullish';
      rsiText = `RSI ${r.toFixed(1)} — recovering from weakness, mild bullish tilt.`;
    } else if (r <= 60) {
      rsiVote = Math.round(clamp((r - 50) * 0.4, -4, 4));
      rsiVerdict = rsiVote > 0 ? 'bullish' : rsiVote < 0 ? 'bearish' : 'neutral';
      rsiText = `RSI ${r.toFixed(1)} — neutral zone, neither overbought nor oversold.`;
    } else if (r <= 70) {
      rsiVote = 6; rsiVerdict = 'bullish';
      rsiText = `RSI ${r.toFixed(1)} — strong bullish momentum, but approaching overbought.`;
    } else if (r <= 80) {
      rsiVote = -8; rsiVerdict = 'bearish';
      rsiText = `RSI ${r.toFixed(1)} — overbought. Chasing here carries pullback risk.`;
      warnings.push(`RSI overbought at ${r.toFixed(1)} — elevated pullback risk`);
    } else {
      rsiVote = -15; rsiVerdict = 'bearish';
      rsiText = `RSI ${r.toFixed(1)} — extremely overbought, statistically prone to sharp mean reversion.`;
      warnings.push(`RSI extremely overbought at ${r.toFixed(1)}`);
    }
    indicators.push({ name: 'RSI (14)', value: r.toFixed(1), verdict: rsiVerdict, vote: rsiVote, evidence: rsiText });
  }

  // 4. Short-term momentum EMA 9/21 (±10)
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  if (!isNaN(ema9) && !isNaN(ema21)) {
    const gapPct = ((ema9 - ema21) / ema21) * 100;
    const momoVote = Math.round(clamp(gapPct * 25, -10, 10));
    indicators.push({
      name: 'EMA 9/21 Cross',
      value: `${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(2)}%`,
      verdict: momoVote > 1 ? 'bullish' : momoVote < -1 ? 'bearish' : 'neutral',
      vote: momoVote,
      evidence: gapPct >= 0
        ? `Short-term EMA9 sits ${gapPct.toFixed(2)}% above EMA21 — short-term momentum favours buyers.`
        : `Short-term EMA9 sits ${Math.abs(gapPct).toFixed(2)}% below EMA21 — short-term momentum favours sellers.`,
    });
  }

  // 5. Bollinger Bands position (±10)
  const bb = bollinger(closes, 20, 2);
  let bbVote = 0;
  if (bb) {
    const pb = bb.percentB;
    if (pb <= 0.05) {
      bbVote = 8;
      indicators.push({ name: 'Bollinger Bands (20,2)', value: `%B ${(pb * 100).toFixed(0)}%`, verdict: 'bullish', vote: bbVote, evidence: `Price is tagging the lower band (${fmt(bb.lower)}) — stretched to the downside, snap-back likely.` });
    } else if (pb >= 0.95) {
      bbVote = -8;
      indicators.push({ name: 'Bollinger Bands (20,2)', value: `%B ${(pb * 100).toFixed(0)}%`, verdict: 'bearish', vote: bbVote, evidence: `Price is pressing the upper band (${fmt(bb.upper)}) — extended move, exhaustion risk.` });
      warnings.push('Price extended above upper Bollinger band');
    } else {
      bbVote = pb > 0.5 ? 4 : -4;
      indicators.push({ name: 'Bollinger Bands (20,2)', value: `%B ${(pb * 100).toFixed(0)}%`, verdict: bbVote > 0 ? 'bullish' : 'bearish', vote: bbVote, evidence: `Price sits in the ${pb > 0.5 ? 'upper' : 'lower'} half of the bands (${fmt(bb.lower)} – ${fmt(bb.upper)}).` });
    }
  }

  // 6. Volume confirmation (±10)
  const last = candles[candles.length - 1];
  const volAvg = sma(volumes.filter((v) => v > 0), 20);
  if (!isNaN(volAvg) && volAvg > 0 && last.volume > 0) {
    const volRatio = last.volume / volAvg;
    const upCandle = last.close >= last.open;
    const volVote = Math.round(clamp((volRatio - 1) * 10, -10, 10)) * (upCandle ? 1 : -1);
    indicators.push({
      name: 'Volume Confirmation',
      value: `${volRatio.toFixed(2)}× avg`,
      verdict: volVote > 1 ? (upCandle ? 'bullish' : 'bearish') : 'neutral',
      vote: volVote,
      evidence: upCandle
        ? `Latest volume is ${volRatio.toFixed(2)}× the 20-candle average on an up candle — ${volRatio > 1.5 ? 'strong buying participation confirms the move' : 'buying volume present but not exceptional'}.`
        : `Latest volume is ${volRatio.toFixed(2)}× the 20-candle average on a down candle — ${volRatio > 1.5 ? 'heavy selling pressure' : 'mild distribution'} .`,
    });
    if (upCandle && volRatio < 0.6 && input.priceChange24h > 3) {
      warnings.push('Rally on declining volume — weak conviction, breakout may fail');
    }
  } else {
    indicators.push({ name: 'Volume Confirmation', value: 'n/a', verdict: 'neutral', vote: 0, evidence: 'Volume data unavailable from this data source — excluded from scoring.' });
  }

  // 7. Support / resistance structure (±10)
  const lookback = candles.slice(-20);
  const support = Math.min(...lookback.map((c) => c.low));
  const resistance = Math.max(...lookback.map((c) => c.high));
  const distToSupport = ((price - support) / price) * 100;
  const distToResistance = ((resistance - price) / price) * 100;
  let srVote = 0;
  let srVerdict: Verdict = 'neutral';
  let srText = '';
  if (distToSupport <= 1.5 && distToSupport <= distToResistance) {
    srVote = 6; srVerdict = 'bullish';
    srText = `Price is only ${distToSupport.toFixed(2)}% above the 20-candle support (${fmt(support)}) — tight, well-defined risk level for longs.`;
  } else if (distToResistance <= 1.5) {
    srVote = -6; srVerdict = 'bearish';
    srText = `Price is within ${distToResistance.toFixed(2)}% of the 20-candle resistance (${fmt(resistance)}) — needs a breakout to continue higher.`;
  } else {
    srVote = distToSupport > distToResistance ? 3 : -3;
    srVerdict = srVote > 0 ? 'bullish' : 'bearish';
    srText = `Room to run: ${distToResistance.toFixed(1)}% to resistance (${fmt(resistance)}), ${distToSupport.toFixed(1)}% cushion above support (${fmt(support)}).`;
  }
  indicators.push({ name: 'Support / Resistance', value: `${fmt(support)} – ${fmt(resistance)}`, verdict: srVerdict, vote: srVote, evidence: srText });

  // ─── Composite score ─────────────────────────────────────
  const rawScore = indicators.reduce((sum, i) => sum + i.vote, 0);
  const maxPossible = 95;
  let score = Math.round(clamp((rawScore / maxPossible) * 100, -100, 100));

  // Regime adjustment — counter-trend buys get downgraded
  if (!regime.bullish && score >= 25) {
    score = Math.min(score, 24);
    warnings.push(`${regime.label} market regime — buy signal downgraded one tier (counter-trend risk)`);
  }
  if (regime.fearGreedValue !== null && regime.fearGreedValue >= 75 && score >= 25) {
    warnings.push(`Extreme greed (${regime.fearGreedValue}) — euphoria phase historically precedes corrections`);
  }
  if (regime.fearGreedValue !== null && regime.fearGreedValue <= 20 && score <= -25) {
    warnings.push(`Extreme fear (${regime.fearGreedValue}) — panic selling often marks bottoms; watch for reversal signals`);
  }

  const signal = classify(score);

  // Confidence = agreement among weighted votes toward the dominant direction
  const totalAbs = indicators.reduce((s, i) => s + Math.abs(i.vote), 0);
  const dir = Math.sign(rawScore);
  const agreeing = indicators.reduce((s, i) => (Math.sign(i.vote) === dir ? s + Math.abs(i.vote) : s), 0);
  let confidence = totalAbs > 0 ? Math.round((agreeing / totalAbs) * 100) : 50;
  if (signal === 'NEUTRAL') confidence = Math.min(confidence, 55);

  // Trend label
  let trendLabel: string;
  if (trendVote >= 20) trendLabel = 'Strong Uptrend';
  else if (trendVote > 0) trendLabel = 'Uptrend';
  else if (trendVote <= -20) trendLabel = 'Strong Downtrend';
  else if (trendVote < 0) trendLabel = 'Downtrend';
  else trendLabel = 'Ranging';

  // ─── Risk levels ─────────────────────────────────────────
  const atrValue = atr(candles, 14);
  const atrPercent = price > 0 && !isNaN(atrValue) ? (atrValue / price) * 100 : 0;
  let risk: RiskLevels | null = null;

  if ((signal === 'BUY' || signal === 'STRONG_BUY') && !isNaN(atrValue) && atrValue > 0) {
    const structureStop = support * 0.995;
    const volatilityStop = price - 1.5 * atrValue;
    const stopLoss = structureStop >= price - 2.5 * atrValue
      ? Math.min(structureStop, volatilityStop)
      : volatilityStop;
    const riskPerUnit = price - stopLoss;
    risk = {
      entry: price,
      stopLoss,
      takeProfit1: price + riskPerUnit,
      takeProfit2: price + 2 * riskPerUnit,
      takeProfit3: price + 3 * riskPerUnit,
      riskRewardRatio: 2,
      atrPercent,
      support,
      resistance,
    };
  } else {
    risk = { entry: price, stopLoss: null, takeProfit1: null, takeProfit2: null, takeProfit3: null, riskRewardRatio: null, atrPercent, support, resistance };
  }

  if (atrPercent > 6) {
    warnings.push(`High volatility (ATR ${atrPercent.toFixed(1)}% per candle) — reduce position size`);
  }

  return {
    id: input.id,
    symbol: input.symbol.toUpperCase(),
    name: input.name,
    image: input.image,
    price,
    priceChange24h: input.priceChange24h,
    marketCapRank: input.marketCapRank,
    interval: input.interval,
    candleSource: input.candleSource,
    score,
    signal,
    confidence,
    trendLabel,
    indicators,
    warnings,
    regime,
    risk,
    analyzedAt: new Date().toISOString(),
  };
}
