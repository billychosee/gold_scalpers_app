import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────

export interface NewsEvent {
  id: string;
  title: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low';
  scheduledTime: number; // epoch ms, UTC
}

export interface DangerWindowResult {
  blocked: boolean;
  event?: NewsEvent;
  minutesUntil?: number;
  minutesAfter?: number;
}

// ── Config ────────────────────────────────────────────────────────

const CACHE_KEY = 'gold-scalpers-news-calendar';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// High-impact currencies we care about
const RELEVANT_CURRENCIES = ['USD', 'GBP', 'AUD', 'EUR', 'NZD', 'CAD', 'CHF', 'JPY'];

// Danger window: 15 min before, 5 min after
const DANGER_BEFORE_MIN = 15;
const DANGER_AFTER_MIN = 5;
const LOOKAHEAD_MIN = 30; // how far ahead to look

// Symbol → currencies mapping
const SYMBOL_CURRENCIES: Record<string, string[]> = {
  frxXAUUSD: ['USD'],
  frxGBPUSD: ['GBP', 'USD'],
  frxAUDUSD: ['AUD', 'USD'],
  R_100: [], // synthetics unaffected by news
};

// ── Cache ─────────────────────────────────────────────────────────

let cachedEvents: NewsEvent[] | null = null;
let cacheTimestamp: number = 0;

// ── Fetching ──────────────────────────────────────────────────────

/**
 * Fetch high-impact economic calendar events.
 * Uses Trading Economics guest API (no auth required).
 * Caches for 1 hour in memory + AsyncStorage.
 */
export async function fetchEconomicCalendar(): Promise<NewsEvent[]> {
  const now = Date.now();

  // Check in-memory cache first
  if (cachedEvents && now - cacheTimestamp < CACHE_TTL_MS) {
    console.log(`[News] Using in-memory cache (${cachedEvents.length} events)`);
    return cachedEvents;
  }

  // Check AsyncStorage cache
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as { events: NewsEvent[]; timestamp: number };
      if (now - stored.timestamp < CACHE_TTL_MS) {
        cachedEvents = stored.events;
        cacheTimestamp = stored.timestamp;
        console.log(`[News] Using AsyncStorage cache (${stored.events.length} events)`);
        return stored.events;
      }
    }
  } catch (err) {
    console.warn('[News] Failed to read cache:', err);
  }

  // Fetch fresh data
  try {
    const events = await fetchFromTradingEconomics();

    // Persist to cache
    cachedEvents = events;
    cacheTimestamp = now;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ events, timestamp: now }));

    console.log(`[News] Loaded ${events.length} high-impact events for this week`);
    return events;
  } catch (err) {
    console.error('[News] Failed to fetch calendar:', err);
    // Return cached data if available (even if stale)
    if (cachedEvents) {
      console.log('[News] Falling back to stale cache');
      return cachedEvents;
    }
    return [];
  }
}

async function fetchFromTradingEconomics(): Promise<NewsEvent[]> {
  // Date range: this week (Mon–Fri)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Friday

  const dateFrom = formatDate(monday);
  const dateTo = formatDate(friday);

  const url = `https://api.tradingeconomics.com/calendar?c=guest:guest&f=json&dateFrom=${dateFrom}&dateTo=${dateTo}`;

  console.log(`[News] Fetching from Trading Economics: ${dateFrom} to ${dateTo}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Trading Economics API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    console.warn('[News] Unexpected response shape:', typeof data);
    return [];
  }

  // Filter to high-impact + relevant currencies
  const events: NewsEvent[] = data
    .filter((item: any) => {
      const impact = item.Importance || item.importance || '';
      const impactLevel = typeof impact === 'number'
        ? impact >= 3 ? 'High' : impact >= 2 ? 'Medium' : 'Low'
        : String(impact).toLowerCase().includes('high') ? 'High'
        : String(impact).toLowerCase().includes('medium') ? 'Medium'
        : 'Low';

      const currency = item.Country || item.country || '';
      const currencyCode = mapCountryToCurrency(currency);

      return impactLevel === 'High' && RELEVANT_CURRENCIES.includes(currencyCode);
    })
    .map((item: any, index: number) => {
      const currency = mapCountryToCurrency(item.Country || item.country || '');
      const title = item.Event || item.event || item.Title || item.title || 'Unknown Event';
      const dateStr = item.Date || item.date || item.CalendarDate || '';
      const timeStr = item.Time || item.time || '';

      // Parse the scheduled time
      let scheduledTime: number;
      if (dateStr) {
        const datetimeStr = timeStr ? `${dateStr}T${timeStr}` : dateStr;
        scheduledTime = new Date(datetimeStr).getTime();
      } else {
        scheduledTime = now.getTime();
      }

      return {
        id: `news-${index}-${scheduledTime}`,
        title: String(title).trim(),
        currency,
        impact: 'High' as const,
        scheduledTime,
      };
    })
    .filter((event: NewsEvent) => !isNaN(event.scheduledTime));

  return events;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapCountryToCurrency(country: string): string {
  const map: Record<string, string> = {
    'United States': 'USD',
    'United States of America': 'USD',
    'USA': 'USD',
    'US': 'USD',
    'United Kingdom': 'GBP',
    'UK': 'GBP',
    'Great Britain': 'GBP',
    'Australia': 'AUD',
    'Eurozone': 'EUR',
    'European Union': 'EUR',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Netherlands': 'EUR',
    'New Zealand': 'NZD',
    'Canada': 'CAD',
    'Switzerland': 'CHF',
    'Japan': 'JPY',
    'China': 'CNY',
    'India': 'INR',
  };

  // Try exact match first, then partial
  if (map[country]) return map[country];
  const lower = country.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return country; // return as-is if unknown
}

// ── Danger Window Check ───────────────────────────────────────────

/**
 * Check if a symbol is inside a news danger window.
 * Danger window = 15 min before to 5 min after a High-impact event.
 */
export function isNewsDangerWindow(
  symbol: string,
  now?: number,
): DangerWindowResult {
  const nowMs = now ?? Date.now();
  const currencies = SYMBOL_CURRENCIES[symbol] ?? [];

  // Synthetics (R_100) are never blocked by news
  if (currencies.length === 0) {
    return { blocked: false };
  }

  const events = cachedEvents ?? [];

  // Find the next High-impact event for relevant currencies
  // within the lookahead window
  let closestEvent: NewsEvent | null = null;
  let closestDelta = Infinity;

  for (const event of events) {
    if (!currencies.includes(event.currency)) continue;
    if (event.impact !== 'High') continue;

    const deltaMs = event.scheduledTime - nowMs;
    const deltaMin = deltaMs / (1000 * 60);

    // Event must be within lookahead (before or after)
    if (deltaMin > -DANGER_AFTER_MIN && deltaMin < LOOKAHEAD_MIN) {
      if (Math.abs(deltaMin) < Math.abs(closestDelta)) {
        closestEvent = event;
        closestDelta = deltaMin;
      }
    }
  }

  if (!closestEvent) {
    return { blocked: false };
  }

  const eventTimeMin = closestDelta; // negative = after event, positive = before event

  // Inside danger window: 15 min before to 5 min after
  const insideWindow = eventTimeMin >= -DANGER_AFTER_MIN && eventTimeMin <= DANGER_BEFORE_MIN;

  if (insideWindow) {
    const minutesUntil = Math.max(0, eventTimeMin);
    const minutesAfter = eventTimeMin < 0 ? Math.abs(eventTimeMin) : 0;

    return {
      blocked: true,
      event: closestEvent,
      minutesUntil,
      minutesAfter,
    };
  }

  return { blocked: false, event: closestEvent, minutesUntil: eventTimeMin };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Get all upcoming high-impact events (for Settings display).
 */
export function getUpcomingEvents(hoursAhead: number = 48): NewsEvent[] {
  const events = cachedEvents ?? [];
  const now = Date.now();
  const cutoff = now + hoursAhead * 60 * 60 * 1000;

  return events
    .filter((e) => e.scheduledTime >= now && e.scheduledTime <= cutoff && e.impact === 'High')
    .sort((a, b) => a.scheduledTime - b.scheduledTime);
}

/**
 * Get all symbols currently inside a danger window.
 */
export function getBlockedSymbols(): string[] {
  const symbols = ['frxXAUUSD', 'frxGBPUSD', 'frxAUDUSD'];
  return symbols.filter((s) => isNewsDangerWindow(s).blocked);
}

/**
 * Force refresh the calendar cache.
 */
export async function refreshCalendar(): Promise<NewsEvent[]> {
  cachedEvents = null;
  cacheTimestamp = 0;
  await AsyncStorage.removeItem(CACHE_KEY);
  return fetchEconomicCalendar();
}
