import {
  COMPARISON_SYMBOLS,
  DEFAULT_BACKTEST_CONFIG,
  type BacktestCandle,
  type ComparisonSymbol,
} from '../src/backtest/strategyComparison';
import {
  ADAPTIVE_PARAMETER_CANDIDATES,
  runNestedWalkForward,
  type NestedWalkForwardReport,
} from '../src/backtest/nestedWalkForward';
import { createMonthlyWindows } from '../src/backtest/monthlyWindows';
import { fetchHistoricalCandles } from './historicalData';

interface CliArgs {
  from: Date;
  to: Date;
  cacheDir: string;
  json: boolean;
  requiredSymbols: number;
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
  return {
    from,
    to,
    cacheDir: values.get('cache-dir') || '.cache/backtest',
    json,
    requiredSymbols: Number(values.get('required-symbols') || '3'),
  };
}

function formatMetric(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '—';
  return value.toFixed(4);
}

function formatCandidateEvaluations(report: NestedWalkForwardReport): string {
  const lines = [
    'CANDIDATE EVALUATIONS — training vs validation per fold',
    '',
    '| Fold | Symbol | Strategy | Candidate | Train Trades | Train EV | Val Trades | Val EV | Selected |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
  ];

  for (const item of report.candidateEvaluations) {
    lines.push(
      `| ${item.foldId} | ${item.symbol} | ${item.strategy} | ${item.candidateId} | ` +
      `${item.training.trades} | ${formatMetric(item.training.ev)} | ` +
      `${item.validation.trades} | ${formatMetric(item.validation.ev)} | ` +
      `${item.selected ? 'YES' : '—'} |`
    );
  }
  return lines.join('\n');
}

function formatConfirmations(report: NestedWalkForwardReport): string {
  const lines = [
    '',
    'CONFIRMATION RESULTS — locked month per fold',
    '',
    '| Fold | Symbol | Strategy | Candidate | Conf Trades | Conf EV | Status |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
  ];

  for (const conf of report.confirmations) {
    lines.push(
      `| ${conf.foldId} | ${conf.symbol} | ${conf.strategyLabel} | ${conf.candidateId ?? 'N/A'} | ` +
      `${conf.confirmation.trades} | ${formatMetric(conf.confirmation.ev)} | ${conf.status} |`
    );
  }
  return lines.join('\n');
}

function formatPromotion(report: NestedWalkForwardReport): string {
  const lines = [
    '',
    'PROMOTION DECISION — requires PASS on confirmation across required symbols',
    '',
    '| Strategy | Qualifying Symbols | Required | Folds | Promoted |',
    '| --- | ---: | ---: | ---: | --- |',
  ];

  for (const promo of report.promotion) {
    lines.push(
      `| ${promo.strategyLabel} | ${promo.qualifyingSymbols} | ${promo.requiredSymbols} | ${promo.folds} | ${promo.promoted ? 'YES' : 'NO'} |`
    );
  }
  return lines.join('\n');
}

function formatContract(report: NestedWalkForwardReport, args: CliArgs): string {
  return [
    'NESTED WALK-FORWARD (ADAPTIVE) BACKTEST',
    `Range: ${args.from.toISOString()} to ${args.to.toISOString()}`,
    `Windows: ${report.folds.length} folds (3 train / 1 val / 1 confirmation each)`,
    `Candidates: ${report.candidates.length} fixed parameter sets (bounded before execution)`,
    `Execution: ${DEFAULT_BACKTEST_CONFIG.execution.entryTiming}, expiry ${DEFAULT_BACKTEST_CONFIG.execution.expiryBars} bars, payout ${DEFAULT_BACKTEST_CONFIG.execution.winPayout * 100}%`,
    'Selection: training gates candidates → validation selects winner → confirmation locks result (never used for selection)',
    `Promotion: strategy must PASS confirmation on ≥${args.requiredSymbols} symbols across all folds`,
    '',
  ].join('\n');
}

function jsonReport(report: NestedWalkForwardReport, args: CliArgs): object {
  return {
    contract: {
      from: args.from.toISOString(),
      to: args.to.toISOString(),
      folds: report.folds.length,
      candidates: report.candidates.length,
      requiredSymbols: args.requiredSymbols,
      execution: DEFAULT_BACKTEST_CONFIG.execution,
      selectionRule: 'training.gates → validation.selects → confirmation.locks (never used for selection)',
      promotionRule: `PASS on confirmation across ≥${args.requiredSymbols} symbols for all folds`,
    },
    folds: report.folds,
    candidates: report.candidates,
    candidateEvaluations: report.candidateEvaluations,
    confirmations: report.confirmations,
    promotion: report.promotion,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const windows = createMonthlyWindows(args.from, args.to);
  if (windows.length < 5) throw new Error(`Need at least 5 monthly windows for 3/1/1 nested walk-forward; got ${windows.length}.`);

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

  const report = runNestedWalkForward(candlesBySymbol, windows, DEFAULT_BACKTEST_CONFIG, ADAPTIVE_PARAMETER_CANDIDATES, args.requiredSymbols);

  if (args.json) {
    console.log(JSON.stringify(jsonReport(report, args), null, 2));
    return;
  }

  console.log(formatContract(report, args));
  console.log(formatCandidateEvaluations(report));
  console.log(formatConfirmations(report));
  console.log(formatPromotion(report));
}

main().catch((error: unknown) => {
  console.error(`Nested walk-forward failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});