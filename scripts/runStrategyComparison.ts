import {
  COMPARISON_SYMBOLS,
  DEFAULT_BACKTEST_CONFIG,
  formatComparisonTable,
  runStrategyComparison,
} from '../src/backtest/strategyComparison';
import type { BacktestCandle, ComparisonSymbol } from '../src/backtest/strategyComparison';

declare const process: {
  argv: string[];
  exitCode?: number;
};

declare const require: (moduleName: string) => unknown;
declare const console: {
  log: (...values: unknown[]) => void;
  error: (...values: unknown[]) => void;
};

interface FileSystemModule {
  readFileSync(filePath: string | number, encoding: string): string;
}

const fs = require('fs') as FileSystemModule;

function readInput(inputPath: string): string {
  return fs.readFileSync(inputPath === '-' ? 0 : inputPath, 'utf8');
}

function usage(): string {
  return [
    'Usage: npm run backtest:compare -- path/to/candles.json [--json]',
    '       npm run backtest:compare -- - [--json] < candles.json',
    '',
    'Expected JSON shape:',
    '{',
    '  "R_100": [{ "epoch": 0, "open": 100, "high": 101, "low": 99, "close": 100.5 }],',
    '  "R_50":  [{ "epoch": 0, "open": 100, "high": 101, "low": 99, "close": 100.5 }],',
    '  "R_25":  [{ "epoch": 0, "open": 100, "high": 101, "low": 99, "close": 100.5 }],',
    '  "1HZ30V": [{ "epoch": 0, "open": 100, "high": 101, "low": 99, "close": 100.5 }]',
    '}',
  ].join('\n');
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function numberField(value: unknown, field: string, symbol: string, index: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${symbol}[${index}].${field} must be a finite number`);
  }
  return number;
}

function parseCandleSeries(value: unknown, symbol: string): BacktestCandle[] {
  const rows = Array.isArray(value)
    ? value
    : asRecord(value, symbol).candles;
  if (!Array.isArray(rows)) throw new Error(`${symbol} must be an array of candles`);

  const candles = rows.map((row, index): BacktestCandle => {
    const candle = asRecord(row, `${symbol}[${index}]`);
    const epochValue = candle.epoch;
    const epoch = epochValue === undefined ? undefined : numberField(epochValue, 'epoch', symbol, index);
    return {
      open: numberField(candle.open, 'open', symbol, index),
      high: numberField(candle.high, 'high', symbol, index),
      low: numberField(candle.low, 'low', symbol, index),
      close: numberField(candle.close, 'close', symbol, index),
      epoch,
    };
  });

  if (candles.some(candle => candle.high < candle.low)) {
    throw new Error(`${symbol} contains a candle where high is below low`);
  }

  if (candles.every(candle => candle.epoch !== undefined)) {
    candles.sort((left, right) => (left.epoch ?? 0) - (right.epoch ?? 0));
  }

  return candles;
}

function parseInput(raw: unknown): Record<ComparisonSymbol, readonly BacktestCandle[]> {
  const root = asRecord(raw, 'Input');
  const source = root.candlesBySymbol === undefined ? root : asRecord(root.candlesBySymbol, 'candlesBySymbol');
  const result = {} as Record<ComparisonSymbol, readonly BacktestCandle[]>;

  for (const symbol of COMPARISON_SYMBOLS) {
    result[symbol] = parseCandleSeries(source[symbol], symbol);
  }
  return result;
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const inputPath = args.find(argument => !argument.startsWith('--'));

  if (!inputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  try {
    const raw = JSON.parse(readInput(inputPath)) as unknown;
    const candlesBySymbol = parseInput(raw);
    const results = runStrategyComparison(candlesBySymbol, DEFAULT_BACKTEST_CONFIG);
    console.log(jsonOutput ? JSON.stringify(results, null, 2) : formatComparisonTable(results));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Strategy comparison failed: ${message}`);
    process.exitCode = 1;
  }
}

main();
