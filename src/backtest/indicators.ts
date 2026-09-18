export interface BollingerBands {
  middle: number;
  upper: number;
  lower: number;
}

export interface MacdValue {
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateSmaSeries(values: readonly number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array.from({ length: values.length }, () => null);
  if (period <= 0) return result;

  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= period) sum -= values[index - period];
    if (index >= period - 1) result[index] = sum / period;
  }
  return result;
}

export function calculateSma(values: readonly number[], period: number): number | null {
  const series = calculateSmaSeries(values, period);
  return series.length === 0 ? null : series[series.length - 1];
}

export function calculateEmaSeries(values: readonly number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array.from({ length: values.length }, () => null);
  if (period <= 0 || values.length < period) return result;

  let seed = 0;
  for (let index = 0; index < period; index += 1) seed += values[index];

  let ema = seed / period;
  const multiplier = 2 / (period + 1);
  result[period - 1] = ema;
  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
    result[index] = ema;
  }
  return result;
}

export function calculateEma(values: readonly number[], period: number): number | null {
  const series = calculateEmaSeries(values, period);
  return series.length === 0 ? null : series[series.length - 1];
}

export function calculateRsiSeries(values: readonly number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array.from({ length: values.length }, () => null);
  if (period <= 0 || values.length <= period) return result;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] = relativeStrengthIndex(averageGain, averageLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    result[index] = relativeStrengthIndex(averageGain, averageLoss);
  }
  return result;
}

function relativeStrengthIndex(averageGain: number, averageLoss: number): number {
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export function calculateRsi(values: readonly number[], period: number): number | null {
  const series = calculateRsiSeries(values, period);
  return series.length === 0 ? null : series[series.length - 1];
}

export function calculateBollingerBandsSeries(
  values: readonly number[],
  period: number,
  standardDeviations: number,
): Array<BollingerBands | null> {
  const result: Array<BollingerBands | null> = Array.from({ length: values.length }, () => null);
  if (period <= 0) return result;

  let sum = 0;
  let sumSquares = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    sum += value;
    sumSquares += value * value;
    if (index >= period) {
      const removed = values[index - period];
      sum -= removed;
      sumSquares -= removed * removed;
    }

    if (index >= period - 1) {
      const middle = sum / period;
      const variance = Math.max(0, sumSquares / period - middle * middle);
      const standardDeviation = Math.sqrt(variance);
      result[index] = {
        middle,
        upper: middle + standardDeviations * standardDeviation,
        lower: middle - standardDeviations * standardDeviation,
      };
    }
  }
  return result;
}

export function calculateBollingerBands(
  values: readonly number[],
  period: number,
  standardDeviations: number,
): BollingerBands | null {
  const series = calculateBollingerBandsSeries(values, period, standardDeviations);
  return series.length === 0 ? null : series[series.length - 1];
}

export function calculateMacdSeries(
  values: readonly number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): Array<MacdValue | null> {
  const result: Array<MacdValue | null> = Array.from({ length: values.length }, () => null);
  if (fastPeriod <= 0 || slowPeriod <= fastPeriod || signalPeriod <= 0) return result;

  const fastSeries = calculateEmaSeries(values, fastPeriod);
  const slowSeries = calculateEmaSeries(values, slowPeriod);
  const macdSeries: Array<number | null> = Array.from({ length: values.length }, () => null);
  const compactMacd: number[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const fast = fastSeries[index];
    const slow = slowSeries[index];
    if (fast === null || slow === null) continue;
    const macd = fast - slow;
    macdSeries[index] = macd;
    compactMacd.push(macd);
  }

  const signalSeries = calculateEmaSeries(compactMacd, signalPeriod);
  let compactIndex = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (macdSeries[index] === null) continue;
    const signal = signalSeries[compactIndex];
    if (signal !== null) {
      const macd = macdSeries[index] as number;
      result[index] = { macd, signal, histogram: macd - signal };
    }
    compactIndex += 1;
  }
  return result;
}

export function calculateMacd(
  values: readonly number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): MacdValue | null {
  const series = calculateMacdSeries(values, fastPeriod, slowPeriod, signalPeriod);
  return series.length === 0 ? null : series[series.length - 1];
}

export function calculateRollingHighSeries(values: readonly number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array.from({ length: values.length }, () => null);
  if (period <= 0) return result;

  const deque: number[] = [];
  let head = 0;
  for (let index = 0; index < values.length; index += 1) {
    while (head < deque.length && deque[head] <= index - period) head += 1;
    while (deque.length > head && values[deque[deque.length - 1]] <= values[index]) deque.pop();
    deque.push(index);
    if (head > 128) {
      deque.splice(0, head);
      head = 0;
    }
    if (index >= period - 1) result[index] = values[deque[head]];
  }
  return result;
}

export function calculateRollingLowSeries(values: readonly number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array.from({ length: values.length }, () => null);
  if (period <= 0) return result;

  const deque: number[] = [];
  let head = 0;
  for (let index = 0; index < values.length; index += 1) {
    while (head < deque.length && deque[head] <= index - period) head += 1;
    while (deque.length > head && values[deque[deque.length - 1]] >= values[index]) deque.pop();
    deque.push(index);
    if (head > 128) {
      deque.splice(0, head);
      head = 0;
    }
    if (index >= period - 1) result[index] = values[deque[head]];
  }
  return result;
}

export function calculateRollingHigh(values: readonly number[], period: number): number | null {
  const series = calculateRollingHighSeries(values, period);
  return series.length === 0 ? null : series[series.length - 1];
}

export function calculateRollingLow(values: readonly number[], period: number): number | null {
  const series = calculateRollingLowSeries(values, period);
  return series.length === 0 ? null : series[series.length - 1];
}
