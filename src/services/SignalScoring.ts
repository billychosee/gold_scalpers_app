import type { TradeDirection } from '../types';

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export interface SyntheticSignalScoreInput {
  direction: TradeDirection | null;
  smaFast: number;
  smaSlow: number;
  rsi: number;
  recentChanges: readonly number[];
  observedTicks: number;
}

/**
 * Returns a relative signal-strength score, not a calibrated probability.
 * Each component is derived from the current observed tick window.
 */
export function calculateSyntheticSignalScore(input: SyntheticSignalScoreInput): number {
  if (!input.direction || input.smaFast <= 0 || input.smaSlow <= 0) return 0;

  const averageMove = input.recentChanges.reduce((sum, change) => sum + Math.abs(change), 0)
    / Math.max(input.recentChanges.length, 1);
  const trendDistance = Math.abs(input.smaFast - input.smaSlow);
  const trendComponent = clamp(trendDistance / Math.max(averageMove * 4, Number.EPSILON));

  const directionalChanges = input.recentChanges.filter(change => change !== 0);
  const agreeingChanges = directionalChanges.filter(change => input.direction === 'BUY' ? change > 0 : change < 0).length;
  const momentumComponent = agreeingChanges / Math.max(directionalChanges.length, 1);

  const rsiComponent = input.direction === 'BUY'
    ? clamp((input.rsi - 50) / 20)
    : clamp((50 - input.rsi) / 20);
  const dataComponent = clamp(input.observedTicks / 100);

  return Math.round(clamp(
    trendComponent * 40 + momentumComponent * 30 + rsiComponent * 20 + dataComponent * 10,
    0,
    100,
  ));
}
