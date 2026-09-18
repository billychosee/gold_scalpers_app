import {
  calculatePromotionSummaries,
  COMPARISON_SYMBOLS,
  DEFAULT_BACKTEST_CONFIG,
  precomputeIndicators,
  runWindowComparisons,
  STRATEGY_IDS,
  strategyLabel,
  type BacktestCandle,
  type BacktestConfig,
  type BacktestWindow,
  type ComparisonSymbol,
  type IndicatorCache,
  type OverlapPolicy,
  type PromotionSummary,
  type StrategyId,
  type WindowComparisonResult,
} from './strategyComparison';

export const SENSITIVITY_POLICY_IDS = ['allow', 'skip_until_exit', 'cooldown'] as const;
export type SensitivityPolicy = (typeof SENSITIVITY_POLICY_IDS)[number];

export interface SensitivityPolicyDefinition {
  id: SensitivityPolicy;
  label: string;
  overlapPolicy: OverlapPolicy;
  cooldownBars: number;
}

/**
 * This is the complete policy set for the report. The cooldown is fixed at
 * five bars before results are observed, matching the declared expiry horizon.
 */
export const SENSITIVITY_POLICIES: readonly SensitivityPolicyDefinition[] = [
  { id: 'allow', label: 'allow', overlapPolicy: 'allow', cooldownBars: 0 },
  { id: 'skip_until_exit', label: 'skip_until_exit', overlapPolicy: 'skip_until_exit', cooldownBars: 0 },
  { id: 'cooldown', label: 'cooldown (5-bar entry gap)', overlapPolicy: 'cooldown', cooldownBars: 5 },
];

export interface PolicySymbolSummary {
  policy: SensitivityPolicy;
  symbol: ComparisonSymbol;
  strategy: StrategyId;
  strategyLabel: string;
  windows: number;
  passingWindows: number;
  negativeWindows: number;
  positiveWindows: number;
  insufficientWindows: number;
  minimumTrades: number | null;
  minimumEv: number | null;
  maximumEv: number | null;
  qualifiesForSymbol: boolean;
}

export interface SensitivitySummaryRow {
  symbol: ComparisonSymbol;
  strategy: StrategyId;
  strategyLabel: string;
  byPolicy: Record<SensitivityPolicy, PolicySymbolSummary>;
  executionPolicySensitive: {
    skip_until_exit: boolean;
    cooldown: boolean;
  };
}

export interface SensitivityPolicyResult {
  policy: SensitivityPolicyDefinition;
  config: BacktestConfig;
  results: WindowComparisonResult[];
  promotion: PromotionSummary[];
}

export interface StrategySensitivityReport {
  windows: readonly BacktestWindow[];
  policies: SensitivityPolicyResult[];
  summary: SensitivitySummaryRow[];
}

function configForPolicy(baseConfig: BacktestConfig, policy: SensitivityPolicyDefinition): BacktestConfig {
  return {
    ...baseConfig,
    execution: {
      ...baseConfig.execution,
      overlapPolicy: policy.overlapPolicy,
      cooldownBars: policy.cooldownBars,
    },
  };
}

function summarizePolicySymbol(
  policy: SensitivityPolicy,
  symbol: ComparisonSymbol,
  strategy: StrategyId,
  rows: readonly WindowComparisonResult[],
  minimumTradesPerWindow: number,
): PolicySymbolSummary {
  const trades = rows.map(row => row.test.trades);
  const evs = rows.map(row => row.test.ev);
  const passingWindows = rows.filter(row => row.status === 'PASS').length;
  const insufficientWindows = rows.filter(row => row.status === 'INSUFFICIENT_DATA').length;
  const negativeWindows = rows.filter(row => row.test.trades >= minimumTradesPerWindow && row.test.ev < 0).length;
  const positiveWindows = rows.filter(row => row.test.trades >= minimumTradesPerWindow && row.test.ev > 0).length;
  const windows = rows.length;

  return {
    policy,
    symbol,
    strategy,
    strategyLabel: strategyLabel(strategy),
    windows,
    passingWindows,
    negativeWindows,
    positiveWindows,
    insufficientWindows,
    minimumTrades: trades.length === 0 ? null : Math.min(...trades),
    minimumEv: evs.length === 0 ? null : Math.min(...evs),
    maximumEv: evs.length === 0 ? null : Math.max(...evs),
    qualifiesForSymbol: windows > 0 && passingWindows === windows && insufficientWindows === 0,
  };
}

function isStrictlyPolicySensitive(
  allow: PolicySymbolSummary,
  alternative: PolicySymbolSummary,
): boolean {
  const allowIsNegativeEveryWindow =
    allow.windows > 0 &&
    allow.insufficientWindows === 0 &&
    allow.negativeWindows === allow.windows;
  const alternativeIsPositiveEveryWindow =
    alternative.windows > 0 &&
    alternative.insufficientWindows === 0 &&
    alternative.qualifiesForSymbol;
  return allowIsNegativeEveryWindow && alternativeIsPositiveEveryWindow;
}

export function runStrategySensitivity(
  candlesBySymbol: Record<ComparisonSymbol, readonly BacktestCandle[]>,
  windows: readonly BacktestWindow[],
  baseConfig: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
  requiredSymbols = 3,
): StrategySensitivityReport {
  const indicatorsBySymbol = {} as Partial<Record<ComparisonSymbol, IndicatorCache>>;
  for (const symbol of COMPARISON_SYMBOLS) {
    const candles = candlesBySymbol[symbol];
    if (!candles || candles.length === 0) throw new Error(`No candles supplied for ${symbol}`);
    indicatorsBySymbol[symbol] = precomputeIndicators(candles, baseConfig.strategyParameters);
  }

  const policies: SensitivityPolicyResult[] = SENSITIVITY_POLICIES.map(policy => {
    const config = configForPolicy(baseConfig, policy);
    const results = runWindowComparisons(candlesBySymbol, windows, config, indicatorsBySymbol);
    return {
      policy,
      config,
      results,
      promotion: calculatePromotionSummaries(results, requiredSymbols, config.minimumTradesPerWindow),
    };
  });

  const summary: SensitivitySummaryRow[] = [];
  for (const symbol of COMPARISON_SYMBOLS) {
    for (const strategy of STRATEGY_IDS) {
      const byPolicy = {} as Record<SensitivityPolicy, PolicySymbolSummary>;
      for (const policyResult of policies) {
        const rows = policyResult.results.filter(row => row.symbol === symbol && row.strategy === strategy);
        byPolicy[policyResult.policy.id] = summarizePolicySymbol(
          policyResult.policy.id,
          symbol,
          strategy,
          rows,
          policyResult.config.minimumTradesPerWindow,
        );
      }
      summary.push({
        symbol,
        strategy,
        strategyLabel: strategyLabel(strategy),
        byPolicy,
        executionPolicySensitive: {
          skip_until_exit: isStrictlyPolicySensitive(byPolicy.allow, byPolicy.skip_until_exit),
          cooldown: isStrictlyPolicySensitive(byPolicy.allow, byPolicy.cooldown),
        },
      });
    }
  }

  return { windows, policies, summary };
}
