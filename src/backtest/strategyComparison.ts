import {
  BollingerBands,
  calculateBollingerBandsSeries,
  calculateEmaSeries,
  calculateMacdSeries,
  calculateRsiSeries,
  calculateRollingHighSeries,
  calculateRollingLowSeries,
  calculateSmaSeries,
  MacdValue,
} from './indicators';

export const COMPARISON_SYMBOLS = ['R_100', 'R_50', 'R_25', '1HZ30V'] as const;
export type ComparisonSymbol = (typeof COMPARISON_SYMBOLS)[number];

export const STRATEGY_IDS = [
  'sma_crossover',
  'ema_crossover',
  'rsi_mean_reversion',
  'bb_breakout',
  'bb_mean_reversion',
  'macd_crossover',
  'donchian_breakout',
  'momentum',
] as const;
export type StrategyId = (typeof STRATEGY_IDS)[number];
export type StrategyName = StrategyId;
export type TradeDirection = 'BUY' | 'SELL';

export interface StrategyDefinition {
  id: StrategyId;
  label: string;
}

export const STRATEGIES: readonly StrategyDefinition[] = [
  { id: 'sma_crossover', label: 'SMA crossover' },
  { id: 'ema_crossover', label: 'EMA 8/21 crossover' },
  { id: 'rsi_mean_reversion', label: 'RSI mean-reversion' },
  { id: 'bb_breakout', label: 'Bollinger breakout' },
  { id: 'bb_mean_reversion', label: 'Bollinger mean-reversion' },
  { id: 'macd_crossover', label: 'MACD crossover' },
  { id: 'donchian_breakout', label: 'Donchian breakout' },
  { id: 'momentum', label: 'Momentum 3 candles' },
];

export interface StrategyParameters {
  smaFastPeriod: number;
  smaSlowPeriod: number;
  emaFastPeriod: number;
  emaSlowPeriod: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  bollingerPeriod: number;
  bollingerStandardDeviations: number;
  macdFastPeriod: number;
  macdSlowPeriod: number;
  macdSignalPeriod: number;
  donchianPeriod: number;
  momentumCandles: number;
}

export const DEFAULT_STRATEGY_PARAMETERS: StrategyParameters = {
  smaFastPeriod: 20,
  smaSlowPeriod: 50,
  emaFastPeriod: 8,
  emaSlowPeriod: 21,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  bollingerPeriod: 20,
  bollingerStandardDeviations: 2,
  macdFastPeriod: 12,
  macdSlowPeriod: 26,
  macdSignalPeriod: 9,
  donchianPeriod: 20,
  momentumCandles: 3,
};

export interface BacktestCandle {
  epoch?: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type EntryTiming = 'current_open' | 'current_close';
export type OverlapPolicy = 'allow' | 'skip_until_exit' | 'cooldown';
export type TieOutcome = 'loss' | 'zero';

/**
 * The complete execution contract shared by every strategy and every runner.
 * `current_open` means the signal uses the prior completed candle and enters
 * at the current candle open. `current_close` enters at the signal candle close.
 */
export interface ExecutionModelConfig {
  entryTiming: EntryTiming;
  expiryBars: number;
  winPayout: number;
  lossPayout: number;
  tieOutcome: TieOutcome;
  overlapPolicy: OverlapPolicy;
  cooldownBars: number;
}

export interface SplitConfig {
  trainFraction: number;
  validationFraction: number;
  testFraction: number;
}

export interface BacktestConfig {
  split: SplitConfig;
  execution: ExecutionModelConfig;
  strategyParameters: StrategyParameters;
  candidateThreshold: number;
  minimumTradesPerWindow: number;
}

export const DEFAULT_EXECUTION_MODEL: ExecutionModelConfig = {
  entryTiming: 'current_open',
  expiryBars: 5,
  winPayout: 0.8,
  lossPayout: -1,
  tieOutcome: 'loss',
  overlapPolicy: 'allow',
  cooldownBars: 0,
};

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  split: {
    trainFraction: 0.6,
    validationFraction: 0.2,
    testFraction: 0.2,
  },
  execution: DEFAULT_EXECUTION_MODEL,
  strategyParameters: DEFAULT_STRATEGY_PARAMETERS,
  candidateThreshold: 0.02,
  minimumTradesPerWindow: 30,
};

export interface SplitRange {
  trainStart: number;
  trainEnd: number;
  validationStart: number;
  validationEnd: number;
  testStart: number;
  testEnd: number;
}

export interface BacktestRange {
  start: number;
  end: number;
}

export interface BacktestTrade {
  entryIndex: number;
  exitIndex: number;
  entryEpoch?: number;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
}

export interface BacktestMetrics {
  trades: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  ev: number;
  profitFactor: number;
  grossProfit: number;
  grossLoss: number;
}

export interface StrategyBacktestResult {
  strategy: StrategyId;
  strategyLabel: string;
  split: SplitRange;
  trades: BacktestTrade[];
  overall: BacktestMetrics;
  train: BacktestMetrics;
  validation: BacktestMetrics;
  test: BacktestMetrics;
}

export interface StrategyComparisonResult {
  symbol: ComparisonSymbol;
  strategy: StrategyId;
  strategyLabel: string;
  split: SplitRange;
  test: BacktestMetrics;
  candidate: boolean;
}

export interface BacktestWindow {
  id: string;
  label: string;
  startEpoch: number;
  endEpoch: number;
}

export type WindowStatus = 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA';

export interface WindowComparisonResult {
  window: BacktestWindow;
  symbol: ComparisonSymbol;
  strategy: StrategyId;
  strategyLabel: string;
  range: BacktestRange;
  test: BacktestMetrics;
  status: WindowStatus;
}

export interface SymbolPromotionSummary {
  symbol: ComparisonSymbol;
  strategy: StrategyId;
  strategyLabel: string;
  windows: number;
  passingWindows: number;
  minimumTradesPerWindow: number;
  qualifiesForSymbol: boolean;
}

export interface PromotionSummary {
  strategy: StrategyId;
  strategyLabel: string;
  qualifyingSymbols: number;
  requiredSymbols: number;
  promoted: boolean;
  bySymbol: SymbolPromotionSummary[];
}

export interface IndicatorCache {
  closes: number[];
  bodyDirections: Array<'UP' | 'DOWN' | 'FLAT'>;
  sma20: Array<number | null>;
  sma50: Array<number | null>;
  ema8: Array<number | null>;
  ema21: Array<number | null>;
  rsi14: Array<number | null>;
  bollinger20: Array<BollingerBands | null>;
  macd: Array<MacdValue | null>;
  macdLine: Array<number | null>;
  macdSignal: Array<number | null>;
  donchianHigh20: Array<number | null>;
  donchianLow20: Array<number | null>;
}


export function strategyLabel(strategy: StrategyId): string {
  return STRATEGIES.find(definition => definition.id === strategy)?.label ?? strategy;
}

export function normalizeStrategyId(strategy: string): StrategyId {
  if (strategy === 'sma_trend') return 'sma_crossover';
  if ((STRATEGY_IDS as readonly string[]).indexOf(strategy) >= 0) return strategy as StrategyId;
  throw new Error(`Unsupported strategy: ${strategy}`);
}

export function precomputeIndicators(
  candles: readonly BacktestCandle[],
  parameters: StrategyParameters = DEFAULT_STRATEGY_PARAMETERS,
): IndicatorCache {
  const closes = candles.map(candle => candle.close);
  const highs = candles.map(candle => candle.high);
  const lows = candles.map(candle => candle.low);
  const bodyDirections = candles.map(candle => {
    if (candle.close > candle.open) return 'UP' as const;
    if (candle.close < candle.open) return 'DOWN' as const;
    return 'FLAT' as const;
  });
  const macd = calculateMacdSeries(closes, parameters.macdFastPeriod, parameters.macdSlowPeriod, parameters.macdSignalPeriod);

  return {
    closes,
    bodyDirections,
    sma20: calculateSmaSeries(closes, parameters.smaFastPeriod),
    sma50: calculateSmaSeries(closes, parameters.smaSlowPeriod),
    ema8: calculateEmaSeries(closes, parameters.emaFastPeriod),
    ema21: calculateEmaSeries(closes, parameters.emaSlowPeriod),
    rsi14: calculateRsiSeries(closes, parameters.rsiPeriod),
    bollinger20: calculateBollingerBandsSeries(closes, parameters.bollingerPeriod, parameters.bollingerStandardDeviations),
    macd,
    macdLine: macd.map(value => value?.macd ?? null),
    macdSignal: macd.map(value => value?.signal ?? null),
    donchianHigh20: calculateRollingHighSeries(highs, parameters.donchianPeriod),
    donchianLow20: calculateRollingLowSeries(lows, parameters.donchianPeriod),
  };
}

function observationIndex(entryIndex: number, entryTiming: EntryTiming): number {
  return entryTiming === 'current_open' ? entryIndex - 1 : entryIndex;
}

function crossoverSignal(
  fast: readonly (number | null)[],
  slow: readonly (number | null)[],
  index: number,
): TradeDirection | null {
  if (index < 1) return null;
  const previousFast = fast[index - 1];
  const previousSlow = slow[index - 1];
  const currentFast = fast[index];
  const currentSlow = slow[index];
  if (previousFast === null || previousSlow === null || currentFast === null || currentSlow === null) return null;
  if (previousFast <= previousSlow && currentFast > currentSlow) return 'BUY';
  if (previousFast >= previousSlow && currentFast < currentSlow) return 'SELL';
  return null;
}

function signalAt(
  candles: readonly BacktestCandle[],
  indicators: IndicatorCache,
  strategy: StrategyId,
  entryIndex: number,
  entryTiming: EntryTiming,
  parameters: StrategyParameters,
): TradeDirection | null {
  const index = observationIndex(entryIndex, entryTiming);
  if (index < 0 || index >= candles.length) return null;

  switch (strategy) {
    case 'sma_crossover':
      return crossoverSignal(indicators.sma20, indicators.sma50, index);
    case 'ema_crossover':
      return crossoverSignal(indicators.ema8, indicators.ema21, index);
    case 'rsi_mean_reversion': {
      const rsi = indicators.rsi14[index];
      if (rsi === null) return null;
      if (rsi < parameters.rsiOversold) return 'BUY';
      if (rsi > parameters.rsiOverbought) return 'SELL';
      return null;
    }
    case 'bb_breakout': {
      if (index < 1) return null;
      const previousBands = indicators.bollinger20[index - 1];
      const currentBands = indicators.bollinger20[index];
      if (previousBands === null || currentBands === null) return null;
      const previousClose = indicators.closes[index - 1];
      const currentClose = indicators.closes[index];
      if (previousClose <= previousBands.upper && currentClose > currentBands.upper) return 'BUY';
      if (previousClose >= previousBands.lower && currentClose < currentBands.lower) return 'SELL';
      return null;
    }
    case 'bb_mean_reversion': {
      const bands = indicators.bollinger20[index];
      if (bands === null) return null;
      const close = indicators.closes[index];
      if (close <= bands.lower) return 'BUY';
      if (close >= bands.upper) return 'SELL';
      return null;
    }
    case 'macd_crossover': {
      return crossoverSignal(indicators.macdLine, indicators.macdSignal, index);
    }
    case 'donchian_breakout': {
      if (index < 1) return null;
      // The channel is the 20 completed candles before the observation candle.
      // For a current-close signal this is equivalent to slice(index - 20, index).
      const previousHigh = indicators.donchianHigh20[index - 1];
      const previousLow = indicators.donchianLow20[index - 1];
      if (previousHigh === null || previousLow === null) return null;
      const close = indicators.closes[index];
      if (close > previousHigh) return 'BUY';
      if (close < previousLow) return 'SELL';
      return null;
    }
    case 'momentum': {
      const start = index - parameters.momentumCandles + 1;
      if (start < 0) return null;
      const recent = indicators.bodyDirections.slice(start, index + 1);
      if (recent.length !== parameters.momentumCandles) return null;
      if (recent.every(direction => direction === 'UP')) return 'BUY';
      if (recent.every(direction => direction === 'DOWN')) return 'SELL';
      return null;
    }
  }
}

function buildSignalSeries(
  candles: readonly BacktestCandle[],
  indicators: IndicatorCache,
  strategy: StrategyId,
  execution: ExecutionModelConfig,
  parameters: StrategyParameters,
): Array<TradeDirection | null> {
  return candles.map((_, index) => signalAt(candles, indicators, strategy, index, execution.entryTiming, parameters));
}

function validateConfig(config: BacktestConfig): void {
  const split = config.split;
  const splitTotal = split.trainFraction + split.validationFraction + split.testFraction;
  if (Math.abs(splitTotal - 1) > 0.000001) throw new Error('Split fractions must total 1');
  if (split.trainFraction <= 0 || split.validationFraction < 0 || split.testFraction <= 0) {
    throw new Error('Train and test fractions must be greater than 0; validation may be 0');
  }

  const execution = config.execution;
  if (execution.expiryBars <= 0 || !Number.isInteger(execution.expiryBars)) throw new Error('expiryBars must be a positive integer');
  const parameters = config.strategyParameters;
  if (parameters.smaFastPeriod <= 0 || parameters.smaSlowPeriod <= parameters.smaFastPeriod) throw new Error('SMA periods must be positive and ordered');
  if (parameters.emaFastPeriod <= 0 || parameters.emaSlowPeriod <= parameters.emaFastPeriod) throw new Error('EMA periods must be positive and ordered');
  if (parameters.rsiPeriod <= 0 || parameters.rsiOversold < 0 || parameters.rsiOverbought > 100 || parameters.rsiOversold >= parameters.rsiOverbought) throw new Error('Invalid RSI parameters');
  if (parameters.bollingerPeriod <= 0 || parameters.bollingerStandardDeviations <= 0) throw new Error('Invalid Bollinger parameters');
  if (parameters.macdFastPeriod <= 0 || parameters.macdSlowPeriod <= parameters.macdFastPeriod || parameters.macdSignalPeriod <= 0) throw new Error('Invalid MACD parameters');
  if (parameters.donchianPeriod <= 0 || parameters.momentumCandles <= 0) throw new Error('Invalid breakout or momentum parameters');
  if (execution.lossPayout >= 0) throw new Error('lossPayout must be negative');
  if (execution.winPayout < 0) throw new Error('winPayout must not be negative');
  if (execution.cooldownBars < 0 || !Number.isInteger(execution.cooldownBars)) throw new Error('cooldownBars must be a non-negative integer');
  if (execution.overlapPolicy === 'cooldown' && execution.cooldownBars <= 0) throw new Error('cooldownBars must be positive for cooldown overlap policy');
  if (config.minimumTradesPerWindow < 0 || !Number.isInteger(config.minimumTradesPerWindow)) throw new Error('minimumTradesPerWindow must be a non-negative integer');
}

export function calculateSplitRange(candleCount: number, config: BacktestConfig = DEFAULT_BACKTEST_CONFIG): SplitRange {
  validateConfig(config);
  if (candleCount < 1) throw new Error('At least one candle is required');
  const trainEnd = Math.floor(candleCount * config.split.trainFraction);
  const validationEnd = Math.floor(candleCount * (config.split.trainFraction + config.split.validationFraction));
  return {
    trainStart: 0,
    trainEnd,
    validationStart: trainEnd,
    validationEnd,
    testStart: validationEnd,
    testEnd: candleCount,
  };
}

function metricsForTrades(trades: readonly BacktestTrade[]): BacktestMetrics {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (const trade of trades) {
    if (trade.pnl > 0) {
      wins += 1;
      grossProfit += trade.pnl;
    } else if (trade.pnl < 0) {
      losses += 1;
      grossLoss += Math.abs(trade.pnl);
    } else {
      ties += 1;
    }
  }

  const total = trades.length;
  return {
    trades: total,
    wins,
    losses,
    ties,
    winRate: total === 0 ? 0 : wins / total,
    ev: total === 0 ? 0 : (grossProfit - grossLoss) / total,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Number.POSITIVE_INFINITY : 0) : grossProfit / grossLoss,
    grossProfit,
    grossLoss,
  };
}

function resultForTrade(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number,
  execution: ExecutionModelConfig,
): number {
  const move = direction === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice;
  if (move > 0) return execution.winPayout;
  if (move < 0) return execution.lossPayout;
  return execution.tieOutcome === 'loss' ? execution.lossPayout : 0;
}

function simulateTrades(
  candles: readonly BacktestCandle[],
  signals: readonly (TradeDirection | null)[],
  range: BacktestRange,
  execution: ExecutionModelConfig,
): BacktestTrade[] {
  const trades: BacktestTrade[] = [];
  const start = Math.max(0, range.start);
  const end = Math.min(candles.length, range.end);
  let nextAvailableIndex = start;
  let lastEntryIndex = Number.NEGATIVE_INFINITY;

  for (let index = start; index < end; index += 1) {
    if (execution.overlapPolicy === 'skip_until_exit' && index < nextAvailableIndex) continue;
    // cooldownBars is the minimum bar distance between accepted entries.
    if (execution.overlapPolicy === 'cooldown' && index - lastEntryIndex < execution.cooldownBars) continue;

    const exitIndex = index + execution.expiryBars;
    if (exitIndex >= end) break;
    const direction = signals[index];
    if (direction === null) continue;

    const entryPrice = execution.entryTiming === 'current_open' ? candles[index].open : candles[index].close;
    const exitPrice = candles[exitIndex].close;
    trades.push({
      entryIndex: index,
      exitIndex,
      entryEpoch: candles[index].epoch,
      direction,
      entryPrice,
      exitPrice,
      pnl: resultForTrade(direction, entryPrice, exitPrice, execution),
    });

    lastEntryIndex = index;
    nextAvailableIndex = exitIndex + 1;
  }
  return trades;
}

function tradesWithinRange(trades: readonly BacktestTrade[], range: BacktestRange): BacktestTrade[] {
  return trades.filter(trade =>
    trade.entryIndex >= range.start &&
    trade.entryIndex < range.end &&
    trade.exitIndex < range.end,
  );
}

function runWithIndicators(
  candles: readonly BacktestCandle[],
  indicators: IndicatorCache,
  strategy: StrategyId,
  config: BacktestConfig,
  split: SplitRange,
): StrategyBacktestResult {
      const signals = buildSignalSeries(candles, indicators, strategy, config.execution, config.strategyParameters);
  const allTrades = simulateTrades(candles, signals, { start: 0, end: candles.length }, config.execution);
  const trainTrades = tradesWithinRange(allTrades, { start: split.trainStart, end: split.trainEnd });
  const validationTrades = tradesWithinRange(allTrades, { start: split.validationStart, end: split.validationEnd });
  const testTrades = tradesWithinRange(allTrades, { start: split.testStart, end: split.testEnd });

  return {
    strategy,
    strategyLabel: strategyLabel(strategy),
    split,
    trades: allTrades,
    overall: metricsForTrades(allTrades),
    train: metricsForTrades(trainTrades),
    validation: metricsForTrades(validationTrades),
    test: metricsForTrades(testTrades),
  };
}

export function runStrategyBacktest(
  candles: readonly BacktestCandle[],
  strategy: StrategyId,
  config: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
): StrategyBacktestResult {
  const split = calculateSplitRange(candles.length, config);
  return runWithIndicators(candles, precomputeIndicators(candles, config.strategyParameters), strategy, config, split);
}

export function runStrategyRangeBacktest(
  candles: readonly BacktestCandle[],
  strategy: StrategyId,
  range: BacktestRange,
  config: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
  indicators?: IndicatorCache,
): BacktestMetrics {
  validateConfig(config);
  const resolvedStart = Math.max(0, Math.min(candles.length, range.start));
  const resolvedEnd = Math.max(resolvedStart, Math.min(candles.length, range.end));
  const indicatorCache = indicators ?? precomputeIndicators(candles, config.strategyParameters);
  const signals = buildSignalSeries(candles, indicatorCache, strategy, config.execution, config.strategyParameters);
  const trades = simulateTrades(candles, signals, { start: resolvedStart, end: resolvedEnd }, config.execution);
  return metricsForTrades(trades);
}

function compareResults(left: StrategyComparisonResult, right: StrategyComparisonResult): number {
  if (right.test.ev !== left.test.ev) return right.test.ev - left.test.ev;
  const symbolOrder = COMPARISON_SYMBOLS.indexOf(left.symbol) - COMPARISON_SYMBOLS.indexOf(right.symbol);
  if (symbolOrder !== 0) return symbolOrder;
  return STRATEGY_IDS.indexOf(left.strategy) - STRATEGY_IDS.indexOf(right.strategy);
}

export function runStrategyComparison(
  candlesBySymbol: Record<ComparisonSymbol, readonly BacktestCandle[]>,
  config: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
): StrategyComparisonResult[] {
  validateConfig(config);
  const results: StrategyComparisonResult[] = [];

  for (const symbol of COMPARISON_SYMBOLS) {
    const candles = candlesBySymbol[symbol];
    if (!candles || candles.length === 0) throw new Error(`No candles supplied for ${symbol}`);
    const indicators = precomputeIndicators(candles, config.strategyParameters);
    const split = calculateSplitRange(candles.length, config);

    for (const strategy of STRATEGY_IDS) {
      const result = runWithIndicators(candles, indicators, strategy, config, split);
      results.push({
        symbol,
        strategy,
        strategyLabel: result.strategyLabel,
        split,
        test: result.test,
        candidate: result.test.ev > config.candidateThreshold,
      });
    }
  }
  return results.sort(compareResults);
}

function lowerBoundByEpoch(candles: readonly BacktestCandle[], epoch: number): number {
  let low = 0;
  let high = candles.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const candleEpoch = candles[middle].epoch ?? Number.NEGATIVE_INFINITY;
    if (candleEpoch < epoch) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function resolveWindowRange(candles: readonly BacktestCandle[], window: BacktestWindow): BacktestRange {
  return {
    start: lowerBoundByEpoch(candles, window.startEpoch),
    end: lowerBoundByEpoch(candles, window.endEpoch),
  };
}

export function runWindowComparisons(
  candlesBySymbol: Record<ComparisonSymbol, readonly BacktestCandle[]>,
  windows: readonly BacktestWindow[],
  config: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
  indicatorsBySymbol: Partial<Record<ComparisonSymbol, IndicatorCache>> = {},
): WindowComparisonResult[] {
  validateConfig(config);
  const results: WindowComparisonResult[] = [];

  for (const symbol of COMPARISON_SYMBOLS) {
    const candles = candlesBySymbol[symbol];
    if (!candles || candles.length === 0) throw new Error(`No candles supplied for ${symbol}`);
    const indicators = indicatorsBySymbol[symbol] ?? precomputeIndicators(candles, config.strategyParameters);

    for (const strategy of STRATEGY_IDS) {
      const signals = buildSignalSeries(candles, indicators, strategy, config.execution, config.strategyParameters);
      const allTrades = simulateTrades(candles, signals, { start: 0, end: candles.length }, config.execution);
      for (const window of windows) {
        const range = resolveWindowRange(candles, window);
        const trades = tradesWithinRange(allTrades, range);
        const test = metricsForTrades(trades);
        const status: WindowStatus = test.trades < config.minimumTradesPerWindow
          ? 'INSUFFICIENT_DATA'
          : test.ev > 0
            ? 'PASS'
            : 'FAIL';
        results.push({
          window,
          symbol,
          strategy,
          strategyLabel: strategyLabel(strategy),
          range,
          test,
          status,
        });
      }
    }
  }
  return results;
}

export function calculatePromotionSummaries(
  results: readonly WindowComparisonResult[],
  requiredSymbols = 3,
  minimumTradesPerWindow = DEFAULT_BACKTEST_CONFIG.minimumTradesPerWindow,
): PromotionSummary[] {
  const summaries: PromotionSummary[] = [];
  for (const strategy of STRATEGY_IDS) {
    const bySymbol = COMPARISON_SYMBOLS.map(symbol => {
      const rows = results.filter(row => row.strategy === strategy && row.symbol === symbol);
      const passingWindows = rows.filter(row => row.status === 'PASS').length;
      return {
        symbol,
        strategy,
        strategyLabel: strategyLabel(strategy),
        windows: rows.length,
        passingWindows,
        minimumTradesPerWindow,
        qualifiesForSymbol: rows.length > 0 && passingWindows === rows.length,
      } satisfies SymbolPromotionSummary;
    });
    const qualifyingSymbols = bySymbol.filter(summary => summary.qualifiesForSymbol).length;
    summaries.push({
      strategy,
      strategyLabel: strategyLabel(strategy),
      qualifyingSymbols,
      requiredSymbols,
      promoted: qualifyingSymbols >= requiredSymbols,
      bySymbol,
    });
  }
  return summaries;
}

function formatMetric(value: number, digits: number): string {
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '—';
  return value.toFixed(digits);
}

export function formatComparisonTable(
  results: readonly StrategyComparisonResult[],
  config: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
): string {
  const lines = [
    'Strategy comparison — TEST set only',
    `Execution: ${config.execution.entryTiming}, expiry ${config.execution.expiryBars} bars, win +${config.execution.winPayout.toFixed(2)}, loss ${config.execution.lossPayout.toFixed(2)}, overlap ${config.execution.overlapPolicy}`,
    `Split: ${(config.split.trainFraction * 100).toFixed(0)}/${(config.split.validationFraction * 100).toFixed(0)}/${(config.split.testFraction * 100).toFixed(0)}`,
    '',
    '| Rank | Symbol | Strategy | Trades | Win rate | TEST EV | Profit factor | Candidate |',
    '| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |',
  ];

  results.forEach((result, index) => {
    lines.push(`| ${index + 1} | ${result.symbol} | ${result.strategyLabel} | ${result.test.trades} | ${(result.test.winRate * 100).toFixed(2)}% | ${formatMetric(result.test.ev, 4)} | ${formatMetric(result.test.profitFactor, 4)} | ${result.candidate ? 'YES' : '—'} |`);
  });
  return lines.join('\n');
}

export function formatWindowTable(results: readonly WindowComparisonResult[]): string {
  const lines = [
    '| Window | Symbol | Strategy | Trades | Win rate | EV | Profit factor | Status |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const result of results) {
    lines.push(`| ${result.window.label} | ${result.symbol} | ${result.strategyLabel} | ${result.test.trades} | ${(result.test.winRate * 100).toFixed(2)}% | ${formatMetric(result.test.ev, 4)} | ${formatMetric(result.test.profitFactor, 4)} | ${result.status} |`);
  }
  return lines.join('\n');
}

export function formatPromotionTable(summaries: readonly PromotionSummary[]): string {
  const lines = [
    `| Strategy | R_100 | R_50 | R_25 | 1HZ30V | Qualifying symbols (of ${COMPARISON_SYMBOLS.length}) | Promoted |`,
    '| --- | --- | --- | --- | --- | ---: | --- |',
  ];
  for (const summary of summaries) {
    const statusBySymbol = new Map(summary.bySymbol.map(row => [row.symbol, row]));
    const status = (symbol: ComparisonSymbol) => {
      const row = statusBySymbol.get(symbol);
      return row?.qualifiesForSymbol ? `PASS (${row.passingWindows}/${row.windows})` : `FAIL (${row?.passingWindows ?? 0}/${row?.windows ?? 0})`;
    };
    lines.push(`| ${summary.strategyLabel} | ${status('R_100')} | ${status('R_50')} | ${status('R_25')} | ${status('1HZ30V')} | ${summary.qualifyingSymbols}/${COMPARISON_SYMBOLS.length} (need ${summary.requiredSymbols}) | ${summary.promoted ? 'YES' : 'NO'} |`);
  }
  return lines.join('\n');
}
