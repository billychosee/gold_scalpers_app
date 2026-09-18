import {
  calculatePromotionSummaries,
  COMPARISON_SYMBOLS,
  DEFAULT_BACKTEST_CONFIG,
  formatPromotionTable,
  formatWindowTable,
  runWindowComparisons,
  type ComparisonSymbol,
} from '../src/backtest/strategyComparison';
import { createMonthlyWindows } from '../src/backtest/monthlyWindows';
import { fetchHistoricalCandles } from './historicalData';

export { createMonthlyWindows };

interface CliArgs {
  from: Date;
  to: Date;
  cacheDir: string;
  json: boolean;
}

function parseArgs(): CliArgs {
  const values = new Map<string, string>();
  let json = false;
  for (const argument of process.argv.slice(2)) {
    if (argument === '--json') {
      json = true;
      continue;
    }
    const separator = argument.indexOf('=');
    if (separator > 0) values.set(argument.slice(0, separator).replace(/^--/, ''), argument.slice(separator + 1));
  }

  const from = new Date(values.get('from') || '2026-01-01T00:00:00Z');
  const to = new Date(values.get('to') || '2026-09-01T00:00:00Z');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw new Error('Invalid --from/--to range.');
  return { from, to, cacheDir: values.get('cache-dir') || '.cache/backtest', json };
}


async function main(): Promise<void> {
  const args = parseArgs();
  const windows = createMonthlyWindows(args.from, args.to);
  if (windows.length === 0) throw new Error('No monthly windows were created.');

  const candlesBySymbol = {} as Record<ComparisonSymbol, Awaited<ReturnType<typeof fetchHistoricalCandles>>>;
  for (const symbol of COMPARISON_SYMBOLS) {
    candlesBySymbol[symbol] = await fetchHistoricalCandles({
      symbol,
      from: args.from,
      to: args.to,
      cacheDir: args.cacheDir,
      onProgress: args.json ? (message: string) => console.error(message) : undefined,
    });
  }

  const results = runWindowComparisons(candlesBySymbol, windows, DEFAULT_BACKTEST_CONFIG);
  const summaries = calculatePromotionSummaries(
    results,
    3,
    DEFAULT_BACKTEST_CONFIG.minimumTradesPerWindow,
  );

  if (args.json) {
    console.log(JSON.stringify({
      execution: DEFAULT_BACKTEST_CONFIG.execution,
      windows,
      results,
      promotion: summaries,
    }, null, 2));
    return;
  }

  console.log('\nMONTHLY TEST WINDOWS — no pooled aggregate');
  console.log(`Windows: ${windows.map(window => window.label).join(', ')}`);
  console.log(`Execution: ${DEFAULT_BACKTEST_CONFIG.execution.entryTiming}, expiry ${DEFAULT_BACKTEST_CONFIG.execution.expiryBars} bars, payout ${DEFAULT_BACKTEST_CONFIG.execution.winPayout * 100}%`);
  console.log(`PASS requires EV > 0 and at least ${DEFAULT_BACKTEST_CONFIG.minimumTradesPerWindow} trades in every window for a symbol.`);
  console.log(formatWindowTable(results));
  console.log('\nPROMOTION DECISION');
  console.log(formatPromotionTable(summaries));
  console.log('\nA strategy is promoted only when it passes every monthly window for at least 3 of 4 symbols.');
}

main().catch((error: unknown) => {
  console.error(`Comparison failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
