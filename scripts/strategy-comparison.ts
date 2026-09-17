import WebSocket from 'ws';

interface Candle { epoch: number; open: number; high: number; low: number; close: number; }
type Direction = 'BUY' | 'SELL';
type StrategyName = 'sma_crossover' | 'ema_crossover' | 'rsi_mean_reversion' | 'bb_breakout' | 'bb_mean_reversion' | 'macd_crossover' | 'donchian_breakout' | 'momentum';

interface Trade { epoch: number; direction: Direction; outcome: 'win' | 'loss'; returnValue: number; }
interface Result { symbol: string; strategy: StrategyName; trades: number; wins: number; losses: number; winRate: number; ev: number; profitFactor: number; candidate: boolean; }

const APP_ID = process.env.DERIV_APP_ID || process.env.EXPO_PUBLIC_DERIV_APP_ID || '1089';
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(APP_ID)}`;
const GRANULARITY = 60;
const EXPIRY = 5;
const PAYOUT = 0.8;
const MAX_COUNT = 5000;
const STRATEGIES: StrategyName[] = [
  'sma_crossover', 'ema_crossover', 'rsi_mean_reversion', 'bb_breakout',
  'bb_mean_reversion', 'macd_crossover', 'donchian_breakout', 'momentum',
];
const SYMBOLS = ['R_100', 'R_50', 'R_25', '1HZ30V'];

function args(): { from: Date; to: Date } {
  const values = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const split = arg.indexOf('=');
    if (split > 0) values.set(arg.slice(0, split).replace(/^--/, ''), arg.slice(split + 1));
  }
  const from = new Date(values.get('from') || '2026-01-01T00:00:00Z');
  const to = new Date(values.get('to') || '2026-09-01T00:00:00Z');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw new Error('Invalid --from/--to range.');
  return { from, to };
}

function request<T>(message: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => { ws.close(); reject(new Error('Deriv request timed out.')); }, 30_000);
    ws.on('open', () => ws.send(JSON.stringify(message)));
    ws.on('message', (raw) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(String(raw)) as { error?: { message: string }; [key: string]: unknown };
        ws.close();
        if (response.error) reject(new Error(response.error.message)); else resolve(response as T);
      } catch (error) { ws.close(); reject(error); }
    });
    ws.on('error', (error) => { clearTimeout(timeout); reject(error); });
  });
}

async function fetchCandles(symbol: string, from: Date, to: Date): Promise<Candle[]> {
  const result: Candle[] = [];
  let end = Math.floor(to.getTime() / 1000);
  const start = Math.floor(from.getTime() / 1000);
  while (end > start) {
    const response = await request<{ candles?: Array<Record<string, number>> }>({
      ticks_history: symbol, start, end, style: 'candles', granularity: GRANULARITY,
      count: MAX_COUNT, adjust_start_time: 1, req_id: end,
    });
    const batch = (response.candles || []).map((c) => ({
      epoch: Number(c.epoch), open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close),
    })).filter((c) => Number.isFinite(c.epoch) && Number.isFinite(c.close));
    if (batch.length === 0) break;
    result.unshift(...batch);
    const oldest = Math.min(...batch.map((c) => c.epoch));
    if (oldest <= start || oldest >= end) break;
    end = oldest - GRANULARITY;
    process.stdout.write(`\r${symbol}: fetched ${result.length} candles through ${new Date(oldest * 1000).toISOString()}`);
  }
  process.stdout.write('\n');
  const unique = new Map<number, Candle>();
  result.forEach((candle) => unique.set(candle.epoch, candle));
  return [...unique.values()].sort((a, b) => a.epoch - b.epoch).filter((c) => c.epoch >= start && c.epoch <= Math.floor(to.getTime() / 1000));
}

function average(values: number[]): number { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function sma(candles: Candle[], end: number, period: number): number { return average(candles.slice(end - period, end).map((c) => c.close)); }
function ema(candles: Candle[], end: number, period: number): number {
  const values = candles.slice(0, end).map((c) => c.close);
  if (values.length < period) return 0;
  let value = average(values.slice(0, period));
  const multiplier = 2 / (period + 1);
  for (const price of values.slice(period)) value = (price - value) * multiplier + value;
  return value;
}
function stdDev(values: number[]): number {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}
function rsi(candles: Candle[], end: number, period = 14): number {
  const changes = candles.slice(end - period, end).map((candle, i) => candle.close - candles[end - period + i - 1].close);
  const gains = average(changes.map((change) => Math.max(change, 0)));
  const losses = average(changes.map((change) => Math.max(-change, 0)));
  return losses === 0 ? (gains === 0 ? 50 : 100) : 100 - (100 / (1 + gains / losses));
}
function macd(candles: Candle[], end: number): { line: number; signal: number; previousLine: number; previousSignal: number } {
  const line = ema(candles, end, 12) - ema(candles, end, 26);
  const previousLine = ema(candles, end - 1, 12) - ema(candles, end - 1, 26);
  const history: number[] = [];
  for (let i = Math.max(26, end - 9); i <= end; i++) history.push(ema(candles, i, 12) - ema(candles, i, 26));
  const signal = emaValues(history, 9);
  const previousSignal = emaValues(history.slice(0, -1), 9);
  return { line, signal, previousLine, previousSignal };
}
function emaValues(values: number[], period: number): number {
  if (values.length < period) return 0;
  let value = average(values.slice(0, period));
  const multiplier = 2 / (period + 1);
  for (const current of values.slice(period)) value = (current - value) * multiplier + value;
  return value;
}

function signalAt(candles: Candle[], index: number, strategy: StrategyName): Direction | null {
  const minimum = strategy === 'ema_crossover' ? 22 : strategy === 'macd_crossover' ? 35 : 51;
  if (index < minimum || index + EXPIRY >= candles.length) return null;
  const close = candles[index - 1].close;

  switch (strategy) {
    case 'sma_crossover': {
      const fast = sma(candles, index, 20); const slow = sma(candles, index, 50);
      const previousFast = sma(candles, index - 1, 20); const previousSlow = sma(candles, index - 1, 50);
      if (previousFast <= previousSlow && fast > slow) return 'BUY';
      if (previousFast >= previousSlow && fast < slow) return 'SELL';
      return null;
    }
    case 'ema_crossover': {
      const fast = ema(candles, index, 8); const slow = ema(candles, index, 21);
      const previousFast = ema(candles, index - 1, 8); const previousSlow = ema(candles, index - 1, 21);
      if (previousFast <= previousSlow && fast > slow) return 'BUY';
      if (previousFast >= previousSlow && fast < slow) return 'SELL';
      return null;
    }
    case 'rsi_mean_reversion': {
      const value = rsi(candles, index);
      if (value < 30) return 'BUY';
      if (value > 70) return 'SELL';
      return null;
    }
    case 'bb_breakout': {
      const values = candles.slice(index - 20, index).map((c) => c.close); const middle = average(values); const width = 2 * stdDev(values);
      const previousValues = candles.slice(index - 21, index - 1).map((c) => c.close); const previousMiddle = average(previousValues); const previousWidth = 2 * stdDev(previousValues);
      if (close > middle + width && candles[index - 2].close <= previousMiddle + previousWidth) return 'BUY';
      if (close < middle - width && candles[index - 2].close >= previousMiddle - previousWidth) return 'SELL';
      return null;
    }
    case 'bb_mean_reversion': {
      const values = candles.slice(index - 20, index).map((c) => c.close); const middle = average(values); const width = 2 * stdDev(values);
      if (close <= middle - width) return 'BUY';
      if (close >= middle + width) return 'SELL';
      return null;
    }
    case 'macd_crossover': {
      const value = macd(candles, index);
      if (value.previousLine <= value.previousSignal && value.line > value.signal) return 'BUY';
      if (value.previousLine >= value.previousSignal && value.line < value.signal) return 'SELL';
      return null;
    }
    case 'donchian_breakout': {
      const highs = candles.slice(index - 20, index - 1).map((c) => c.high); const lows = candles.slice(index - 20, index - 1).map((c) => c.low);
      if (close > Math.max(...highs)) return 'BUY';
      if (close < Math.min(...lows)) return 'SELL';
      return null;
    }
    case 'momentum': {
      const recent = candles.slice(index - 3, index);
      if (recent.every((c) => c.close > c.open)) return 'BUY';
      if (recent.every((c) => c.close < c.open)) return 'SELL';
      return null;
    }
  }
}

function run(candles: Candle[], strategy: StrategyName): Trade[] {
  const trades: Trade[] = [];
  for (let index = 1; index < candles.length - EXPIRY; index++) {
    const direction = signalAt(candles, index, strategy);
    if (!direction) continue;
    const entry = candles[index].open; const exit = candles[index + EXPIRY].close;
    const won = direction === 'BUY' ? exit > entry : exit < entry;
    trades.push({ epoch: candles[index].epoch, direction, outcome: won ? 'win' : 'loss', returnValue: won ? PAYOUT : -1 });
  }
  return trades;
}

function stats(trades: Trade[]): Omit<Result, 'symbol' | 'strategy' | 'candidate'> {
  const wins = trades.filter((t) => t.outcome === 'win').length; const losses = trades.length - wins;
  const winRate = trades.length ? wins / trades.length : 0;
  return { trades: trades.length, wins, losses, winRate, ev: winRate * PAYOUT - (1 - winRate), profitFactor: losses ? wins * PAYOUT / losses : wins ? Infinity : 0 };
}
function name(strategy: StrategyName): string {
  return ({ sma_crossover: 'SMA crossover', ema_crossover: 'EMA 8/21 crossover', rsi_mean_reversion: 'RSI mean-reversion', bb_breakout: 'Bollinger breakout', bb_mean_reversion: 'Bollinger mean-reversion', macd_crossover: 'MACD crossover', donchian_breakout: 'Donchian breakout', momentum: 'Momentum 3 candles' } as Record<StrategyName, string>)[strategy];
}

async function main(): Promise<void> {
  const { from, to } = args();
  const all: Result[] = [];
  for (const symbol of SYMBOLS) {
    const candles = await fetchCandles(symbol, from, to);
    if (candles.length < 60) { console.warn(`${symbol}: skipped, only ${candles.length} candles returned`); continue; }
    const split60 = Math.floor(candles.length * 0.6); const split80 = Math.floor(candles.length * 0.8);
    for (const strategy of STRATEGIES) {
      const trades = run(candles, strategy).filter((trade) => trade.epoch > candles[split80].epoch);
      const result = stats(trades);
      all.push({ symbol, strategy, ...result, candidate: result.ev > 0.02 });
    }
  }
  all.sort((a, b) => b.ev - a.ev);
  console.log('\nTEST SET ONLY: chronological 60/20/20 split; first 60% train, next 20% validation, final 20% test.');
  console.log('Payout assumption: 80%; no parameters were tuned per symbol or strategy.');
  console.table(all.map((row) => ({ symbol: row.symbol, strategy: name(row.strategy), trades: row.trades, winRate: `${(row.winRate * 100).toFixed(2)}%`, EV: row.ev.toFixed(4), profitFactor: row.profitFactor.toFixed(4), candidate: row.candidate ? 'YES' : '' })));
  console.log(`\nCandidates (test EV > 0.02): ${all.filter((row) => row.candidate).map((row) => `${row.symbol} / ${name(row.strategy)} (${row.ev.toFixed(4)})`).join(', ') || 'none'}`);
}

main().catch((error: unknown) => { console.error(`Comparison failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
