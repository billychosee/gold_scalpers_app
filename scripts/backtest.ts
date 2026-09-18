import {
  DEFAULT_BACKTEST_CONFIG,
  runStrategyBacktest,
  normalizeStrategyId,
  type BacktestCandle,
  type BacktestMetrics,
  type StrategyId,
} from '../src/backtest/strategyComparison';
import { fetchHistoricalCandles } from './historicalData';

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
  validation: SplitReport;
  test: SplitReport;
}

interface SplitReport {
  name: 'train' | 'validation' | 'test';
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  expectedValuePerTrade: number;
  profitFactor: number;
}

function parseArgs(): { symbol: string; from: Date; to: Date; strategy: StrategyId; cacheDir: string } {
  const values = new Map<string, string>();
  for (const argument of process.argv.slice(2)) {
    const separator = argument.indexOf('=');
    if (separator > 0) values.set(argument.slice(0, separator).replace(/^--/, ''), argument.slice(separator + 1));
  }

  const from = new Date(values.get('from') || '2026-01-01T00:00:00Z');
  const to = new Date(values.get('to') || new Date().toISOString());
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw new Error('Use valid --from and --to dates, with --from before --to.');
  return {
    symbol: values.get('symbol') || 'R_100',
    from,
    to,
    strategy: normalizeStrategyId(values.get('strategy') || 'sma_trend'),
    cacheDir: values.get('cache-dir') || '.cache/backtest',
  };
}

function splitReport(name: SplitReport['name'], metrics: BacktestMetrics): SplitReport {
  return {
    name,
    totalTrades: metrics.trades,
    wins: metrics.wins,
    losses: metrics.losses,
    winRate: metrics.winRate,
    expectedValuePerTrade: metrics.ev,
    profitFactor: metrics.profitFactor,
  };
}

function maxLosingStreak(returns: readonly number[]): number {
  let current = 0;
  let maximum = 0;
  for (const value of returns) {
    current = value < 0 ? current + 1 : 0;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}

function sharpeLike(returns: readonly number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  const deviation = Math.sqrt(variance);
  return deviation === 0 ? 0 : mean / deviation;
}

function createReport(
  symbol: string,
  from: Date,
  to: Date,
  strategy: StrategyId,
  result: ReturnType<typeof runStrategyBacktest>,
): BacktestReport {
  const returns = result.trades.map(trade => trade.pnl);
  return {
    symbol,
    from: from.toISOString(),
    to: to.toISOString(),
    strategy,
    totalTrades: result.overall.trades,
    wins: result.overall.wins,
    losses: result.overall.losses,
    winRate: result.overall.winRate,
    payoutAssumed: DEFAULT_BACKTEST_CONFIG.execution.winPayout,
    expectedValuePerTrade: result.overall.ev,
    profitFactor: result.overall.profitFactor,
    maxDrawdown: maxLosingStreak(returns),
    sharpeLike: sharpeLike(returns),
    train: splitReport('train', result.train),
    validation: splitReport('validation', result.validation),
    test: splitReport('test', result.test),
  };
}

function printReport(report: BacktestReport): void {
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n${report.symbol} ${report.from} to ${report.to}`);
  console.log(`Total trades: ${report.totalTrades}`);
  console.log(`Wins: ${report.wins}`);
  console.log(`Losses: ${report.losses}`);
  console.log(`Win rate: ${(report.winRate * 100).toFixed(2)}%`);
  console.log(`Payout assumed: ${(report.payoutAssumed * 100).toFixed(0)}% net win return`);
  console.log(`Expected value per trade: ${report.expectedValuePerTrade.toFixed(4)}`);
  console.log(`Profit factor: ${Number.isFinite(report.profitFactor) ? report.profitFactor.toFixed(4) : 'Infinity'}`);
  console.log(`Max drawdown (longest losing streak): ${report.maxDrawdown}`);
  console.log(`Sharpe-like ratio: ${report.sharpeLike.toFixed(4)}`);
  console.log(`Conclusion: ${report.expectedValuePerTrade > 0 ? 'POSITIVE EV in this sample; not proof of future edge' : 'NOT PROFITABLE in this sample'}`);
  for (const split of [report.train, report.validation, report.test]) {
    console.log(`${split.name}: ${(split.winRate * 100).toFixed(2)}% win rate, EV ${split.expectedValuePerTrade.toFixed(4)}, ${split.totalTrades} trades`);
  }
}

async function main(): Promise<void> {
  const { symbol, from, to, strategy, cacheDir } = parseArgs();
  console.log(`Fetching ${symbol} M1 candles from ${from.toISOString()} to ${to.toISOString()}...`);
  const candles = await fetchHistoricalCandles({ symbol, from, to, cacheDir });
  if (candles.length < 60) throw new Error(`Only ${candles.length} candles returned; at least 60 are required.`);

  const result = runStrategyBacktest(candles as BacktestCandle[], strategy, {
    ...DEFAULT_BACKTEST_CONFIG,
    split: { trainFraction: 0.7, validationFraction: 0, testFraction: 0.3 },
  });
  printReport(createReport(symbol, from, to, strategy, result));
}

main().catch((error: unknown) => {
  console.error(`Backtest failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
