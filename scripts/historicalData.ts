import * as fs from 'node:fs';
import * as path from 'node:path';
import WebSocket from 'ws';
import type { BacktestCandle } from '../src/backtest/strategyComparison';

export interface HistoricalCandle extends BacktestCandle {
  epoch: number;
}

export interface HistoricalDataOptions {
  symbol: string;
  from: Date;
  to: Date;
  granularitySeconds?: number;
  cacheDir?: string;
  requestDelayMs?: number;
  maxRetries?: number;
  onProgress?: (message: string) => void;
}

interface CacheFile {
  version: 1;
  symbol: string;
  granularitySeconds: number;
  startEpoch: number;
  endEpoch: number;
  complete: boolean;
  nextEndEpoch: number;
  candles: HistoricalCandle[];
}

interface DerivCandleResponse {
  candles?: Array<Record<string, unknown>>;
  error?: { code?: string; message?: string };
}

const APP_ID = process.env.DERIV_APP_ID || process.env.EXPO_PUBLIC_DERIV_APP_ID || '1089';
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(APP_ID)}`;
const DEFAULT_GRANULARITY_SECONDS = 60;
const MAX_CANDLES_PER_REQUEST = 5000;
const DEFAULT_REQUEST_DELAY_MS = 750;
const DEFAULT_MAX_RETRIES = 6;
const CACHE_VERSION = 1 as const;

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function cacheKey(options: Required<Pick<HistoricalDataOptions, 'symbol' | 'from' | 'to' | 'granularitySeconds'>>): string {
  const safeSymbol = options.symbol.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeSymbol}-${options.granularitySeconds}-${Math.floor(options.from.getTime() / 1000)}-${Math.floor(options.to.getTime() / 1000)}.json`;
}

function readCache(cachePath: string): CacheFile | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as CacheFile;
    if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.candles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cachePath: string, value: CacheFile): void {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const temporaryPath = `${cachePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value));
  fs.renameSync(temporaryPath, cachePath);
}

function request<T>(message: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(WS_URL);
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error('Deriv request timed out.'));
    }, 30_000);

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    socket.on('open', () => socket.send(JSON.stringify(message)));
    socket.on('message', raw => {
      finish(() => {
        try {
          const response = JSON.parse(String(raw)) as T & DerivCandleResponse;
          socket.close();
          if (response.error) reject(new Error(response.error.message || response.error.code || 'Deriv request failed'));
          else resolve(response as T);
        } catch (error) {
          socket.close();
          reject(error);
        }
      });
    });
    socket.on('error', error => finish(() => reject(error)));
  });
}

async function requestWithBackoff<T>(message: object, label: string, maxRetries: number): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await request<T>(message);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(60_000, 2_000 * 2 ** attempt);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`${label}: request failed (${reason}); retrying in ${delay / 1000}s`);
      await wait(delay);
    }
  }
  throw new Error(`${label}: exhausted retries`);
}

function parseBatch(response: DerivCandleResponse): HistoricalCandle[] {
  return (response.candles || []).map(candle => ({
    epoch: Number(candle.epoch),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  })).filter(candle =>
    Number.isFinite(candle.epoch) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close),
  );
}

export async function fetchHistoricalCandles(options: HistoricalDataOptions): Promise<HistoricalCandle[]> {
  const granularitySeconds = options.granularitySeconds ?? DEFAULT_GRANULARITY_SECONDS;
  const requestDelayMs = options.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const startEpoch = Math.floor(options.from.getTime() / 1000);
  const endEpoch = Math.floor(options.to.getTime() / 1000);
  if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch) || startEpoch >= endEpoch) {
    throw new Error(`Invalid historical range for ${options.symbol}`);
  }

  const reportProgress = options.onProgress ?? ((message: string) => console.log(message));
  const cacheDirectory = path.resolve(process.cwd(), options.cacheDir ?? '.cache/backtest');
  const cachePath = path.join(cacheDirectory, cacheKey({
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    granularitySeconds,
  }));
  const cached = readCache(cachePath);
  const candlesByEpoch = new Map<number, HistoricalCandle>();
  let nextEndEpoch = endEpoch;

  if (cached && cached.symbol === options.symbol && cached.startEpoch === startEpoch && cached.endEpoch === endEpoch && cached.granularitySeconds === granularitySeconds) {
    cached.candles.forEach(candle => candlesByEpoch.set(candle.epoch, candle));
    if (cached.complete) {
      return [...candlesByEpoch.values()].sort((left, right) => left.epoch - right.epoch).filter(candle => candle.epoch >= startEpoch && candle.epoch < endEpoch);
    }
    nextEndEpoch = cached.nextEndEpoch;
    reportProgress(`${options.symbol}: resuming ${candlesByEpoch.size} cached candles`);
  }

  while (nextEndEpoch > startEpoch) {
    const response = await requestWithBackoff<DerivCandleResponse>({
      ticks_history: options.symbol,
      start: startEpoch,
      end: nextEndEpoch,
      style: 'candles',
      granularity: granularitySeconds,
      count: MAX_CANDLES_PER_REQUEST,
      adjust_start_time: 1,
      req_id: nextEndEpoch,
    }, `${options.symbol} ${new Date(nextEndEpoch * 1000).toISOString()}`, maxRetries);

    const batch = parseBatch(response);
    if (batch.length === 0) break;
    batch.forEach(candle => candlesByEpoch.set(candle.epoch, candle));

    const oldest = Math.min(...batch.map(candle => candle.epoch));
    if (oldest >= nextEndEpoch) throw new Error(`${options.symbol}: candle API made no pagination progress`);
    nextEndEpoch = oldest - granularitySeconds;
    const complete = oldest <= startEpoch;
    writeCache(cachePath, {
      version: CACHE_VERSION,
      symbol: options.symbol,
      granularitySeconds,
      startEpoch,
      endEpoch,
      complete,
      nextEndEpoch,
      candles: [...candlesByEpoch.values()],
    });
    reportProgress(`${options.symbol}: fetched ${candlesByEpoch.size} candles through ${new Date(oldest * 1000).toISOString()}`);
    if (complete) break;
    await wait(requestDelayMs);
  }

  const candles = [...candlesByEpoch.values()]
    .sort((left, right) => left.epoch - right.epoch)
    .filter(candle => candle.epoch >= startEpoch && candle.epoch < endEpoch);
  if (candles.length === 0) throw new Error(`${options.symbol}: no candles returned for requested range`);

  writeCache(cachePath, {
    version: CACHE_VERSION,
    symbol: options.symbol,
    granularitySeconds,
    startEpoch,
    endEpoch,
    complete: nextEndEpoch <= startEpoch,
    nextEndEpoch,
    candles,
  });
  return candles;
}
