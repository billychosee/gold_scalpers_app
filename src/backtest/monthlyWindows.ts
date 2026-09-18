import type { BacktestWindow } from './strategyComparison';

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function nextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/** Windows are defined before any candle results are fetched. End is exclusive. */
export function createMonthlyWindows(from: Date, to: Date): BacktestWindow[] {
  const windows: BacktestWindow[] = [];
  let cursor = monthStart(from);
  while (cursor < to) {
    const monthEnd = nextMonth(cursor);
    const start = Math.max(from.getTime(), cursor.getTime());
    const end = Math.min(to.getTime(), monthEnd.getTime());
    if (start < end) {
      const startDate = new Date(start);
      const month = String(startDate.getUTCMonth() + 1);
      const label = `${startDate.getUTCFullYear()}-${month.length === 1 ? `0${month}` : month}`;
      windows.push({
        id: label,
        label,
        startEpoch: Math.floor(start / 1000),
        endEpoch: Math.floor(end / 1000),
      });
    }
    cursor = monthEnd;
  }
  return windows;
}
