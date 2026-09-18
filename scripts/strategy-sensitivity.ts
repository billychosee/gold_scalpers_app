import {
  COMPARISON_SYMBOLS,
  formatPromotionTable,
  DEFAULT_BACKTEST_CONFIG,
  type BacktestCandle,
  type ComparisonSymbol,
} from '../src/backtest/strategyComparison';
import { createMonthlyWindows } from '../src/backtest/monthlyWindows';
import {
  runStrategySensitivity,
  SENSITIVITY_POLICIES,
  type PolicySymbolSummary,
  type SensitivityPolicy,
  type StrategySensitivityReport,
} from '../src/backtest/strategySensitivity';
import { fetchHistoricalCandles } from './historicalData';

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

function formatEv(value: number | null): string {
  return value === null ? '—' : value.toFixed(4);
}

function formatPolicySummary(summary: PolicySymbolSummary): string {
  return `${formatEv(summary.minimumEv)}..${formatEv(summary.maximumEv)}; ${summary.passingWindows}/${summary.windows} pass; min ${summary.minimumTrades ?? '—'} trades`;
}

function sensitivityMark(summary: StrategySensitivityReport['summary'][number]): string {
  if (summary.executionPolicySensitive.skip_until_exit && summary.executionPolicySensitive.cooldown) return 'BOTH';
  if (summary.executionPolicySensitive.skip_until_exit) return 'SKIP';
  if (summary.executionPolicySensitive.cooldown) return 'COOLDOWN';
  return '—';
}

function formatSideBySideTable(report: StrategySensitivityReport): string {
  const lines = [
    '| Symbol | Strategy | allow | skip_until_exit | cooldown (5 bars) | Strictly sensitive |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of report.summary) {
    lines.push(`| ${row.symbol} | ${row.strategyLabel} | ${formatPolicySummary(row.byPolicy.allow)} | ${formatPolicySummary(row.byPolicy.skip_until_exit)} | ${formatPolicySummary(row.byPolicy.cooldown)} | ${sensitivityMark(row)} |`);
  }
  return lines.join('\n');
}

function formatWindowDetail(report: StrategySensitivityReport): string {
  const lines = [
    '| Policy | Window | Symbol | Strategy | Trades | EV | Status |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
  ];
  for (const policyResult of report.policies) {
    for (const row of policyResult.results) {
      lines.push(`| ${policyResult.policy.id} | ${row.window.label} | ${row.symbol} | ${row.strategyLabel} | ${row.test.trades} | ${formatEv(row.test.ev)} | ${row.status} |`);
    }
  }
  return lines.join('\n');
}

function formatContract(report: StrategySensitivityReport): string {
  return [
    'SENSITIVITY REPORT — monthly TEST windows only; no pooled aggregate',
    `Windows: ${report.windows.map(window => window.label).join(', ')}`,
    'Policies were fixed before execution: allow; skip_until_exit; cooldown with a fixed 5-bar cooldown.',
    'Decision rule: allow must be negative in every window, while the alternative must be positive with at least 30 trades in every window for the same symbol.',
    'Interpretation: all-negative policies indicate strategy weakness; an all-window positive alternative indicates overlap sensitivity; mixed windows are inconclusive.',
    '',
  ].join('\n');
}

function policyCount(report: StrategySensitivityReport, policy: SensitivityPolicy): string {
  const result = report.policies.find(item => item.policy.id === policy);
  if (!result) return '0';
  return String(result.results.length);
}

function printReport(report: StrategySensitivityReport): void {
  console.log(formatContract(report));
  console.log(`Rows: ${SENSITIVITY_POLICIES.map(policy => `${policy.id}=${policyCount(report, policy.id)}`).join(', ')}`);
  console.log('\nSIDE-BY-SIDE SYMBOL/STRATEGY SUMMARY');
  console.log(formatSideBySideTable(report));
  for (const policyResult of report.policies) {
    console.log(`\nPROMOTION — ${policyResult.policy.label}`);
    console.log(formatPromotionTable(policyResult.promotion));
  }
  console.log('\nPER-WINDOW DETAIL');
  console.log(formatWindowDetail(report));
}

function jsonReport(report: StrategySensitivityReport, args: CliArgs): object {
  return {
    contract: {
      from: args.from.toISOString(),
      to: args.to.toISOString(),
      windows: report.windows,
      symbols: COMPARISON_SYMBOLS,
      policies: SENSITIVITY_POLICIES,
      minimumTradesPerWindow: 30,
      requiredSymbols: 3,
      decisionRule: 'allow must be negative in every window; skip_until_exit or cooldown is sensitive only when positive with >=30 trades in every window for the same symbol',
      interpretationRule: {
        allNegative: 'strategy weakness, not overlap artifact',
        alternativePositiveEveryWindow: 'overlap or entry-frequency sensitivity worth investigating',
        mixed: 'inconclusive and not promoted',
      },
    },
    ...report,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const windows = createMonthlyWindows(args.from, args.to);
  if (windows.length === 0) throw new Error('No monthly windows were created.');

  const candlesBySymbol = {} as Record<ComparisonSymbol, BacktestCandle[]>;
  for (const symbol of COMPARISON_SYMBOLS) {
    candlesBySymbol[symbol] = await fetchHistoricalCandles({
      symbol,
      from: args.from,
      to: args.to,
      cacheDir: args.cacheDir,
      onProgress: args.json ? (message: string) => console.error(message) : undefined,
    });
  }

  const report = runStrategySensitivity(candlesBySymbol, windows, DEFAULT_BACKTEST_CONFIG);
  if (args.json) console.log(JSON.stringify(jsonReport(report, args), null, 2));
  else printReport(report);
}

main().catch((error: unknown) => {
  console.error(`Sensitivity comparison failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
