import WebSocket from 'ws';

interface Candle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

type Direction = 'BUY' | 'SELL';

interface JournalEntry {
  id: string;
  timestamp_signal: string;
  timestamp_execution: string | null;
  symbol: string;
  direction: Direction;
  signal_reason: string;
  confidence_score: number;
  htf_trend: string;
  ltf_context: string;
  entry_price: number;
  stake: number;
  payout_percent: number | null;
  expiry_seconds: number;
  predicted_outcome: string | null;
  actual_outcome: 'win' | 'loss';
  profit: number;
  latency_ms: number;
  market_closed_at_entry: boolean;
  paper_trade: boolean;
}

interface TradeResult {
  epoch: number;
  entry: number;
  exit: number;
  direction: Direction;
  outcome: 'win' | 'loss';
  returnValue: number;
  journal: JournalEntry;
}

interface BacktestReport {
  symbol: string;
  from: string;
  to: string;
  strategy: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  payoutAssumed: number;
  expectedValuePerTrade: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeLike: number;
  train: SplitReport;
  test: SplitReport;
}

interface SplitReport {
  name: 'train' | 'test';
  from: string;
  to: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  expectedValuePerTrade: number;
  profitFactor: number;
}

interface Metrics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  expectedValuePerTrade: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeLike: number;
}

const DERIV_APP_ID = process.env.DERIV_APP_ID || process.env.EXPO_PUBLIC_DERIV_APP_ID || '1089';
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(DERIV_APP_ID)}`;
const GRANULARITY_SECONDS = 60;
const SMA_FAST = 20;
const SMA_SLOW = 50;
const RSI_PERIOD = 14;
const ATR_PERIOD = 20;
const EXPIRY_CANDLES = 5;
const PAYOUT = 0.8;
const MAX_CANDLES_PER_REQUEST = 5000;

function parseArgs(): { symbol: string; from: Date; to: Date; strategy: string } {
  const values = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const separator = arg.indexOf('=');
    if (separator > 0) values.set(arg.slice(0, separator).replace(/^--/, ''), arg.slice(separator + 1));
  }

  const symbol = values.get('symbol') || 'R_100';
  const from = new Date(values.get('from') || '2026-01-01T00:00:00Z');
  const to = new Date(values.get('to') || new Date().toISOString());
  const strategy = values.get('strategy') || 'sma_trend';

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    throw new Error('Use valid --from and --to dates, with --from before --to.');
  }
  if (strategy !== 'sma_trend') throw new Error(`Unsupported strategy: ${strategy}`);
  return { symbol, from, to, strategy };
}

function request<T>(message: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Deriv WebSocket request timed out.'));
    }, 30_000);

    ws.on('open', () => ws.send(JSON.stringify(message)));
    ws.on('message', (raw) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(String(raw)) as { error?: { message: string }; [key: string]: unknown };
        ws.close();
        if (response.error) reject(new Error(response.error.message));
        else resolve(response as T);
      } catch (error) {
        ws.close();
        reject(error);
      }
    });
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function fetchCandles(symbol: string, from: Date, to: Date): Promise<Candle[]> {
  const candles: Candle[] = [];
  let endEpoch = Math.floor(to.getTime() / 1000);
  const startEpoch = Math.floor(from.getTime() / 1000);

  while (endEpoch > startEpoch) {
    const response = await request<{ candles?: Array<Record<string, number>> }>({
      ticks_history: symbol,
      start: startEpoch,
      end: endEpoch,
      style: 'candles',
      granularity: GRANULARITY_SECONDS,
      count: MAX_CANDLES_PER_REQUEST,
      adjust_start_time: 1,
      req_id: endEpoch,
    });

    const batch = (response.candles || []).map((candle) => ({
      epoch: Number(candle.epoch),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    })).filter((candle) => Number.isFinite(candle.epoch) && Number.isFinite(candle.close));

    if (batch.length === 0) break;
    candles.unshift(...batch);

    const oldest = Math.min(...batch.map((candle) => candle.epoch));
    if (oldest <= startEpoch || oldest >= endEpoch) break;
    endEpoch = oldest - GRANULARITY_SECONDS;
    process.stdout.write(`\rFetched ${candles.length} candles through ${new Date(oldest * 1000).toISOString()}`);
  }

  process.stdout.write('\n');
  const unique = new Map<number, Candle>();
  for (const candle of candles) unique.set(candle.epoch, candle);
  return [...unique.values()].sort((left, right) => left.epoch - right.epoch)
    .filter((candle) => candle.epoch >= startEpoch && candle.epoch <= Math.floor(to.getTime() / 1000));
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(candles: Candle[], endExclusive: number, period: number): number {
  return average(candles.slice(endExclusive - period, endExclusive).map((candle) => candle.close));
}

function rsi(candles: Candle[], endExclusive: number): number {
  const changes = candles.slice(endExclusive - RSI_PERIOD, endExclusive).map((candle, index, values) => {
    const previous = candles[endExclusive - RSI_PERIOD + index - 1];
    return previous ? candle.close - previous.close : 0;
  });
  const gains = average(changes.map((change) => Math.max(change, 0)));
  const losses = average(changes.map((change) => Math.max(-change, 0)));
  if (losses === 0) return gains === 0 ? 50 : 100;
  return 100 - (100 / (1 + gains / losses));
}

function trueRanges(candles: Candle[], start: number, endExclusive: number): number[] {
  return candles.slice(start, endExclusive).map((candle, index) => {
    const previous = candles[start + index - 1];
    return previous
      ? Math.max(candle.high - candle.low, Math.abs(candle.high - previous.close), Math.abs(candle.low - previous.close))
      : candle.high - candle.low;
  });
}

function atr(candles: Candle[], endExclusive: number, period: number): number {
  return average(trueRanges(candles, endExclusive - period, endExclusive));
}

function signalAt(candles: Candle[], index: number): { direction: Direction; reason: string } | null {
  if (index < SMA_SLOW + 1 || index + EXPIRY_CANDLES >= candles.length) return null;

  const fast = sma(candles, index, SMA_FAST);
  const slow = sma(candles, index, SMA_SLOW);
  const previousFast = sma(candles, index - 1, SMA_FAST);
  const previousSlow = sma(candles, index - 1, SMA_SLOW);
  const currentRsi = rsi(candles, index);
  const currentAtr = atr(candles, index, ATR_PERIOD);
  const previousAtrAverage = average(Array.from({ length: ATR_PERIOD }, (_, offset) => {
    const end = index - offset;
    return atr(candles, end, ATR_PERIOD);
  }));

  // Every value above uses candles before index. Candle index is the entry bar.
  if (currentAtr > previousAtrAverage * 2) return null;
  if (previousFast <= previousSlow && fast > slow && currentRsi < 70) {
    return { direction: 'BUY', reason: `SMA20=${fast.toFixed(2)} > SMA50=${slow.toFixed(2)}, RSI=${currentRsi.toFixed(0)}` };
  }
  if (previousFast >= previousSlow && fast < slow && currentRsi > 30) {
    return { direction: 'SELL', reason: `SMA20=${fast.toFixed(2)} < SMA50=${slow.toFixed(2)}, RSI=${currentRsi.toFixed(0)}` };
  }
  return null;
}

function runBacktest(symbol: string, candles: Candle[]): TradeResult[] {
  const trades: TradeResult[] = [];
  for (let index = SMA_SLOW + 1; index + EXPIRY_CANDLES < candles.length; index += 1) {
    const signal = signalAt(candles, index);
    if (!signal) continue;

    const entry = candles[index].open;
    const exit = candles[index + EXPIRY_CANDLES].close;
    const won = signal.direction === 'BUY' ? exit > entry : exit < entry;
    const returnValue = won ? PAYOUT : -1;
    const timestamp = new Date(candles[index].epoch * 1000).toISOString();
    trades.push({
      epoch: candles[index].epoch,
      entry,
      exit,
      direction: signal.direction,
      outcome: won ? 'win' : 'loss',
      returnValue,
      journal: {
        id: `backtest-${symbol}-${candles[index].epoch}`,
        timestamp_signal: timestamp,
        timestamp_execution: timestamp,
        symbol,
        direction: signal.direction,
        signal_reason: signal.reason,
        confidence_score: 0,
        htf_trend: 'N/A (synthetic SMA crossover)',
        ltf_context: `${signal.direction} at ${entry}`,
        entry_price: entry,
        stake: 1,
        payout_percent: PAYOUT * 100,
        expiry_seconds: EXPIRY_CANDLES * 60,
        predicted_outcome: null,
        actual_outcome: won ? 'win' : 'loss',
        profit: returnValue,
        latency_ms: 0,
        market_closed_at_entry: false,
        paper_trade: true,
      },
    });
  }
  return trades;
}

function metrics(trades: TradeResult[]): Metrics {
  const wins = trades.filter((trade) => trade.outcome === 'win').length;
  const losses = trades.length - wins;
  const winRate = trades.length === 0 ? 0 : wins / trades.length;
  const grossWins = wins * PAYOUT;
  const grossLosses = losses;
  const returns = trades.map((trade) => trade.returnValue);
  const mean = average(returns);
  const variance = average(returns.map((value) => (value - mean) ** 2));
  let maxLosingStreak = 0;
  let currentLosingStreak = 0;
  for (const trade of trades) {
    currentLosingStreak = trade.outcome === 'loss' ? currentLosingStreak + 1 : 0;
    maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
  }
  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate,
    expectedValuePerTrade: winRate * PAYOUT - (1 - winRate),
    profitFactor: grossLosses === 0 ? (grossWins > 0 ? Number.POSITIVE_INFINITY : 0) : grossWins / grossLosses,
    maxDrawdown: maxLosingStreak,
    sharpeLike: Math.sqrt(variance) === 0 ? 0 : mean / Math.sqrt(variance),
  };
}

function printReport(report: BacktestReport): void {
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n${report.symbol} ${report.from} to ${report.to}`);
  console.log(`Total trades: ${report.totalTrades}`);
  console.log(`Wins: ${report.wins}`);
  console.log(`Losses: ${report.losses}`);
  console.log(`Win rate: ${(report.winRate * 100).toFixed(2)}%`);
  console.log('Average payout assumed: 80% (documented assumption, not broker payout data)');
  console.log(`Expected value per trade: ${report.expectedValuePerTrade.toFixed(4)}`);
  console.log(`Profit factor: ${report.profitFactor.toFixed(4)}`);
  console.log(`Max drawdown (longest losing streak): ${report.maxDrawdown}`);
  console.log(`Sharpe-like ratio: ${report.sharpeLike.toFixed(4)}`);
  console.log(`Conclusion: ${report.expectedValuePerTrade > 0 ? 'POSITIVE EV in this sample; not proof of future edge' : 'NOT PROFITABLE in this sample'}`);
  console.log(`Train: ${(report.train.winRate * 100).toFixed(2)}% win rate, EV ${report.train.expectedValuePerTrade.toFixed(4)}, ${report.train.totalTrades} trades`);
  console.log(`Test: ${(report.test.winRate * 100).toFixed(2)}% win rate, EV ${report.test.expectedValuePerTrade.toFixed(4)}, ${report.test.totalTrades} trades`);
}

async function main(): Promise<void> {
  const { symbol, from, to, strategy } = parseArgs();
  console.log(`Fetching ${symbol} M1 candles from ${from.toISOString()} to ${to.toISOString()}...`);
  const candles = await fetchCandles(symbol, from, to);
  if (candles.length < SMA_SLOW + EXPIRY_CANDLES + 1) {
    throw new Error(`Only ${candles.length} candles returned; at least ${SMA_SLOW + EXPIRY_CANDLES + 1} are required.`);
  }

  const trades = runBacktest(symbol, candles);
  const splitIndex = Math.floor(candles.length * 0.7);
  const splitEpoch = candles[splitIndex].epoch;
  const trainTrades = trades.filter((trade) => trade.epoch <= splitEpoch);
  const testTrades = trades.filter((trade) => trade.epoch > splitEpoch);
  const overall = metrics(trades);
  const train = metrics(trainTrades);
  const test = metrics(testTrades);
  const report: BacktestReport = {
    symbol,
    from: from.toISOString(),
    to: to.toISOString(),
    strategy,
    payoutAssumed: PAYOUT,
    ...overall,
    train: { name: 'train', from: from.toISOString(), to: new Date(candles[splitIndex].epoch * 1000).toISOString(), ...train },
    test: { name: 'test', from: new Date(candles[splitIndex + 1].epoch * 1000).toISOString(), to: to.toISOString(), ...test },
  };
  printReport(report);
}

main().catch((error: unknown) => {
  console.error(`Backtest failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
