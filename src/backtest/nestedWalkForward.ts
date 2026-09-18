import {
  DEFAULT_BACKTEST_CONFIG,
  DEFAULT_STRATEGY_PARAMETERS,
  precomputeIndicators,
  resolveWindowRange,
  runStrategyRangeBacktest,
  STRATEGY_IDS,
  strategyLabel,
  type BacktestCandle,
  type BacktestConfig,
  type BacktestMetrics,
  type BacktestWindow,
  type ComparisonSymbol,
  type StrategyId,
  type StrategyParameters,
} from './strategyComparison';

export interface NestedWalkForwardFold {
  id: string;
  trainingWindows: readonly BacktestWindow[];
  validationWindows: readonly BacktestWindow[];
  confirmationWindows: readonly BacktestWindow[];
}

export interface ParameterCandidate {
  id: string;
  strategy: StrategyId;
  parameters: StrategyParameters;
}

export type AdaptiveEvaluationStatus = 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA' | 'NO_TRAINING_CANDIDATE';

export interface CandidateEvaluation {
  foldId: string;
  symbol: ComparisonSymbol;
  strategy: StrategyId;
  candidateId: string;
  training: BacktestMetrics;
  validation: BacktestMetrics;
  selected: boolean;
}

export interface ConfirmationEvaluation {
  foldId: string;
  symbol: ComparisonSymbol;
  strategy: StrategyId;
  strategyLabel: string;
  candidateId: string | null;
  parameters: StrategyParameters | null;
  confirmation: BacktestMetrics;
  status: AdaptiveEvaluationStatus;
}

export interface AdaptivePromotionSummary {
  strategy: StrategyId;
  strategyLabel: string;
  qualifyingSymbols: number;
  requiredSymbols: number;
  folds: number;
  promoted: boolean;
}

export interface NestedWalkForwardReport {
  folds: readonly NestedWalkForwardFold[];
  candidates: readonly ParameterCandidate[];
  candidateEvaluations: CandidateEvaluation[];
  confirmations: ConfirmationEvaluation[];
  promotion: AdaptivePromotionSummary[];
}

function withParameters(overrides: Partial<StrategyParameters>): StrategyParameters {
  return { ...DEFAULT_STRATEGY_PARAMETERS, ...overrides };
}

/**
 * Fixed before data is inspected. These are bounded research candidates, not
 * a result-driven optimizer. Every candidate is selected only from training
 * and validation windows within a fold.
 */
export const ADAPTIVE_PARAMETER_CANDIDATES: readonly ParameterCandidate[] = [
  { id: 'sma-10-30', strategy: 'sma_crossover', parameters: withParameters({ smaFastPeriod: 10, smaSlowPeriod: 30 }) },
  { id: 'sma-20-50', strategy: 'sma_crossover', parameters: withParameters({ smaFastPeriod: 20, smaSlowPeriod: 50 }) },
  { id: 'sma-30-75', strategy: 'sma_crossover', parameters: withParameters({ smaFastPeriod: 30, smaSlowPeriod: 75 }) },
  { id: 'ema-5-13', strategy: 'ema_crossover', parameters: withParameters({ emaFastPeriod: 5, emaSlowPeriod: 13 }) },
  { id: 'ema-8-21', strategy: 'ema_crossover', parameters: withParameters({ emaFastPeriod: 8, emaSlowPeriod: 21 }) },
  { id: 'ema-13-34', strategy: 'ema_crossover', parameters: withParameters({ emaFastPeriod: 13, emaSlowPeriod: 34 }) },
  { id: 'rsi-20-80', strategy: 'rsi_mean_reversion', parameters: withParameters({ rsiPeriod: 14, rsiOversold: 20, rsiOverbought: 80 }) },
  { id: 'rsi-30-70', strategy: 'rsi_mean_reversion', parameters: withParameters({ rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 }) },
  { id: 'rsi-35-65', strategy: 'rsi_mean_reversion', parameters: withParameters({ rsiPeriod: 14, rsiOversold: 35, rsiOverbought: 65 }) },
  { id: 'bb-20-2', strategy: 'bb_breakout', parameters: withParameters({ bollingerPeriod: 20, bollingerStandardDeviations: 2 }) },
  { id: 'bb-20-2.5', strategy: 'bb_breakout', parameters: withParameters({ bollingerPeriod: 20, bollingerStandardDeviations: 2.5 }) },
  { id: 'bb-30-2', strategy: 'bb_breakout', parameters: withParameters({ bollingerPeriod: 30, bollingerStandardDeviations: 2 }) },
  { id: 'bbmr-20-2', strategy: 'bb_mean_reversion', parameters: withParameters({ bollingerPeriod: 20, bollingerStandardDeviations: 2 }) },
  { id: 'bbmr-20-2.5', strategy: 'bb_mean_reversion', parameters: withParameters({ bollingerPeriod: 20, bollingerStandardDeviations: 2.5 }) },
  { id: 'bbmr-30-2', strategy: 'bb_mean_reversion', parameters: withParameters({ bollingerPeriod: 30, bollingerStandardDeviations: 2 }) },
  { id: 'macd-8-21-5', strategy: 'macd_crossover', parameters: withParameters({ macdFastPeriod: 8, macdSlowPeriod: 21, macdSignalPeriod: 5 }) },
  { id: 'macd-12-26-9', strategy: 'macd_crossover', parameters: withParameters({ macdFastPeriod: 12, macdSlowPeriod: 26, macdSignalPeriod: 9 }) },
  { id: 'macd-19-39-9', strategy: 'macd_crossover', parameters: withParameters({ macdFastPeriod: 19, macdSlowPeriod: 39, macdSignalPeriod: 9 }) },
  { id: 'donchian-10', strategy: 'donchian_breakout', parameters: withParameters({ donchianPeriod: 10 }) },
  { id: 'donchian-20', strategy: 'donchian_breakout', parameters: withParameters({ donchianPeriod: 20 }) },
  { id: 'donchian-30', strategy: 'donchian_breakout', parameters: withParameters({ donchianPeriod: 30 }) },
  { id: 'momentum-2', strategy: 'momentum', parameters: withParameters({ momentumCandles: 2 }) },
  { id: 'momentum-3', strategy: 'momentum', parameters: withParameters({ momentumCandles: 3 }) },
  { id: 'momentum-4', strategy: 'momentum', parameters: withParameters({ momentumCandles: 4 }) },
];

export function createNestedWalkForwardFolds(windows: readonly BacktestWindow[]): NestedWalkForwardFold[] {
  const folds: NestedWalkForwardFold[] = [];
  for (let confirmationIndex = 4; confirmationIndex < windows.length; confirmationIndex += 1) {
    folds.push({
      id: `fold-${confirmationIndex - 3}`,
      trainingWindows: windows.slice(confirmationIndex - 4, confirmationIndex - 1),
      validationWindows: windows.slice(confirmationIndex - 1, confirmationIndex),
      confirmationWindows: windows.slice(confirmationIndex, confirmationIndex + 1),
    });
  }
  return folds;
}

function combineRanges(
  candles: readonly BacktestCandle[],
  windows: readonly BacktestWindow[],
): { start: number; end: number } {
  if (windows.length === 0) return { start: 0, end: 0 };
  return {
    start: resolveWindowRange(candles, windows[0]).start,
    end: resolveWindowRange(candles, windows[windows.length - 1]).end,
  };
}

function sumMetrics(metrics: readonly BacktestMetrics[]): BacktestMetrics {
  const trades = metrics.reduce((sum, item) => sum + item.trades, 0);
  const wins = metrics.reduce((sum, item) => sum + item.wins, 0);
  const losses = metrics.reduce((sum, item) => sum + item.losses, 0);
  const ties = metrics.reduce((sum, item) => sum + item.ties, 0);
  const grossProfit = metrics.reduce((sum, item) => sum + item.grossProfit, 0);
  const grossLoss = metrics.reduce((sum, item) => sum + item.grossLoss, 0);
  return {
    trades,
    wins,
    losses,
    ties,
    winRate: trades === 0 ? 0 : wins / trades,
    ev: trades === 0 ? 0 : (grossProfit - grossLoss) / trades,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Number.POSITIVE_INFINITY : 0) : grossProfit / grossLoss,
    grossProfit,
    grossLoss,
  };
}

function evaluateCandidate(
  candles: readonly BacktestCandle[],
  candidate: ParameterCandidate,
  fold: NestedWalkForwardFold,
  config: BacktestConfig,
): { training: BacktestMetrics; validation: BacktestMetrics } {
  const candidateConfig = { ...config, strategyParameters: candidate.parameters };
  const indicators = precomputeIndicators(candles, candidate.parameters);
  const training = sumMetrics(fold.trainingWindows.map(window => runStrategyRangeBacktest(
    candles,
    candidate.strategy,
    combineRanges(candles, [window]),
    candidateConfig,
    indicators,
  )));
  const validation = sumMetrics(fold.validationWindows.map(window => runStrategyRangeBacktest(
    candles,
    candidate.strategy,
    combineRanges(candles, [window]),
    candidateConfig,
    indicators,
  )));
  return { training, validation };
}

function selectCandidate(
  evaluations: readonly CandidateEvaluation[],
  minimumTradesPerWindow: number,
): string | null {
  const eligible = evaluations.filter(item =>
    item.training.trades >= minimumTradesPerWindow * 3 &&
    item.training.ev > 0 &&
    item.validation.trades >= minimumTradesPerWindow &&
    item.validation.ev > 0,
  );
  eligible.sort((left, right) => {
    if (right.validation.ev !== left.validation.ev) return right.validation.ev - left.validation.ev;
    return right.validation.trades - left.validation.trades;
  });
  return eligible[0]?.candidateId ?? null;
}

export function runNestedWalkForward(
  candlesBySymbol: Record<ComparisonSymbol, readonly BacktestCandle[]>,
  windows: readonly BacktestWindow[],
  config: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
  candidates: readonly ParameterCandidate[] = ADAPTIVE_PARAMETER_CANDIDATES,
  requiredSymbols = 3,
): NestedWalkForwardReport {
  const folds = createNestedWalkForwardFolds(windows);
  const candidateEvaluations: CandidateEvaluation[] = [];
  const confirmations: ConfirmationEvaluation[] = [];

  for (const fold of folds) {
    for (const symbol of Object.keys(candlesBySymbol) as ComparisonSymbol[]) {
      const candles = candlesBySymbol[symbol];
      if (!candles || candles.length === 0) throw new Error(`No candles supplied for ${symbol}`);
      for (const strategy of STRATEGY_IDS) {
        const strategyCandidates = candidates.filter(candidate => candidate.strategy === strategy);
        const evaluationsForSelection: CandidateEvaluation[] = [];
        for (const candidate of strategyCandidates) {
          const evaluation = evaluateCandidate(candles, candidate, fold, config);
          const item: CandidateEvaluation = {
            foldId: fold.id,
            symbol,
            strategy,
            candidateId: candidate.id,
            training: evaluation.training,
            validation: evaluation.validation,
            selected: false,
          };
          candidateEvaluations.push(item);
          evaluationsForSelection.push(item);
        }

        const selectedCandidateId = selectCandidate(evaluationsForSelection, config.minimumTradesPerWindow);
        for (const item of evaluationsForSelection) item.selected = item.candidateId === selectedCandidateId;
        const selected = strategyCandidates.find(candidate => candidate.id === selectedCandidateId);
        if (!selected) {
          confirmations.push({
            foldId: fold.id,
            symbol,
            strategy,
            strategyLabel: strategyLabel(strategy),
            candidateId: null,
            parameters: null,
            confirmation: {
              trades: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              winRate: 0,
              ev: 0,
              profitFactor: 0,
              grossProfit: 0,
              grossLoss: 0,
            },
            status: 'NO_TRAINING_CANDIDATE',
          });
          continue;
        }

        const confirmationConfig = { ...config, strategyParameters: selected.parameters };
        const indicators = precomputeIndicators(candles, selected.parameters);
        const confirmation = sumMetrics(fold.confirmationWindows.map(window => runStrategyRangeBacktest(
          candles,
          selected.strategy,
          combineRanges(candles, [window]),
          confirmationConfig,
          indicators,
        )));
        const status: AdaptiveEvaluationStatus = confirmation.trades < config.minimumTradesPerWindow
          ? 'INSUFFICIENT_DATA'
          : confirmation.ev > 0
            ? 'PASS'
            : 'FAIL';
        confirmations.push({
          foldId: fold.id,
          symbol,
          strategy,
          strategyLabel: strategyLabel(strategy),
          candidateId: selected.id,
          parameters: selected.parameters,
          confirmation,
          status,
        });
      }
    }
  }

  const promotion = STRATEGY_IDS.map(strategy => {
    const bySymbol = (Object.keys(candlesBySymbol) as ComparisonSymbol[]).map(symbol => {
      const rows = confirmations.filter(row => row.strategy === strategy && row.symbol === symbol);
      return rows.length === folds.length && rows.every(row => row.status === 'PASS');
    });
    const qualifyingSymbols = bySymbol.filter(Boolean).length;
    return {
      strategy,
      strategyLabel: strategyLabel(strategy),
      qualifyingSymbols,
      requiredSymbols,
      folds: folds.length,
      promoted: qualifyingSymbols >= requiredSymbols,
    };
  });

  return { folds, candidates, candidateEvaluations, confirmations, promotion };
}
