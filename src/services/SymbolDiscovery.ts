import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSymbolDisplayName } from '../constants/theme';

// ── Types ─────────────────────────────────────────────────────────

export interface DiscoveredSymbol {
  symbol: string;
  display_name: string;
  market: string;
  submarket: string;
}

export interface SymbolConfig {
  discovered: DiscoveredSymbol[];
  activeSymbols: string[];
}

// ── Config ────────────────────────────────────────────────────────

const STORAGE_KEY = 'gold-scalpers_symbols';
const DISCOVERY_CACHE_KEY = 'gold-scalpers_symbols_discovered';

// Default active symbols (user's preferred list)
const DEFAULT_ACTIVE = [
  'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
  '1HZ15V', '1HZ30V', '1HZ90V',
  'BOOM500', 'CRASH500',
];

// Also include FX pairs that were previously hardcoded
const DEFAULT_FX = ['frxXAUUSD', 'frxGBPUSD', 'frxAUDUSD'];

// ── Persistence ───────────────────────────────────────────────────

/** Load active symbols from AsyncStorage. Falls back to defaults. */
export async function getActiveSymbols(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as string[];
    }
  } catch (err) {
    console.error('[Symbols] Failed to load active symbols:', err);
  }
  // First launch: seed with defaults
  const defaults = [...DEFAULT_ACTIVE, ...DEFAULT_FX];
  await saveActiveSymbols(defaults);
  return defaults;
}

/** Save active symbols to AsyncStorage. */
export async function saveActiveSymbols(symbols: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch (err) {
    console.error('[Symbols] Failed to save active symbols:', err);
  }
}

/** Load cached discovered symbols. */
export async function getCachedDiscovery(): Promise<DiscoveredSymbol[]> {
  try {
    const raw = await AsyncStorage.getItem(DISCOVERY_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw) as DiscoveredSymbol[];
    }
  } catch (err) {
    console.warn('[Symbols] Failed to load discovery cache:', err);
  }
  return [];
}

/** Cache discovered symbols. */
export async function cacheDiscovery(symbols: DiscoveredSymbol[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DISCOVERY_CACHE_KEY, JSON.stringify(symbols));
  } catch (err) {
    console.warn('[Symbols] Failed to cache discovery:', err);
  }
}

// ── Discovery Parsing ─────────────────────────────────────────────

/**
 * Parse the active_symbols response from Deriv WebSocket.
 * Response shape: { active_symbols: string, msg_type: 'active_symbols' }
 * The active_symbols field is a JSON string containing the full list.
 */
export function parseActiveSymbolsResponse(response: any): DiscoveredSymbol[] {
  try {
    // The response.active_symbols might be a JSON string or already parsed
    let data: any[];
    if (typeof response.active_symbols === 'string') {
      data = JSON.parse(response.active_symbols);
    } else if (Array.isArray(response.active_symbols)) {
      data = response.active_symbols;
    } else if (response.active_symbols?.symbols) {
      data = response.active_symbols.symbols;
    } else {
      console.warn('[Symbols] Unexpected response shape:', Object.keys(response));
      return [];
    }

    // Keep all tradeable markets returned by Deriv. The UI can search and
    // group them, while the technical symbol code remains the subscription key.
    const mapped: DiscoveredSymbol[] = data.map((item: any) => {
      const symbol = String(item.symbol || item.id || '').trim();
      const fallbackName = item.display_name || item.display || symbol;
      return {
        symbol,
        display_name: getSymbolDisplayName(symbol, fallbackName),
        market: item.market || 'Other',
        submarket: item.submarket || '',
      };
    }).filter((s: DiscoveredSymbol) => s.symbol);

    console.log(`[Symbols] Discovered ${mapped.length} tradeable symbols`);
    return mapped;
  } catch (err) {
    console.error('[Symbols] Failed to parse active_symbols:', err);
    return [];
  }
}

/** Merge discovered list with cached + defaults for full list. */
export function mergeDiscovered(
  newlyDiscovered: DiscoveredSymbol[],
  cached: DiscoveredSymbol[],
): DiscoveredSymbol[] {
  const map = new Map<string, DiscoveredSymbol>();

  // Add cached symbols first, normalizing human-readable labels in case an
  // older cache stored only the technical Deriv code.
  for (const s of cached) {
    map.set(s.symbol, { ...s, display_name: getSymbolDisplayName(s.symbol, s.display_name) });
  }
  // Override with newly discovered data.
  for (const s of newlyDiscovered) {
    map.set(s.symbol, { ...s, display_name: getSymbolDisplayName(s.symbol, s.display_name) });
  }

  // Add FX defaults if not in discovered (they may not be "synthetic")
  const fxDefaults: DiscoveredSymbol[] = [
    { symbol: 'frxXAUUSD', display_name: 'Gold', market: 'Forex', submarket: 'Gold' },
    { symbol: 'frxGBPUSD', display_name: 'GBP/USD', market: 'Forex', submarket: 'Major' },
    { symbol: 'frxAUDUSD', display_name: 'AUD/USD', market: 'Forex', submarket: 'Major' },
  ];
  for (const s of fxDefaults) {
    if (!map.has(s.symbol)) map.set(s.symbol, s);
  }

  return Array.from(map.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));
}
