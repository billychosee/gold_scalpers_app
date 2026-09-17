import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry } from '../types';

const STORAGE_KEY = 'gold-scalpers-journal';
const MAX_ENTRIES = 5000;

/**
 * Persistent trade journal backed by AsyncStorage.
 * Records every signal AND every trade execution + outcome.
 */
class TradeJournalService {
  // ── Core CRUD ────────────────────────────────────────────────────

  /** Load all entries from storage (newest first). */
  async getAllEntries(): Promise<JournalEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const entries: JournalEntry[] = JSON.parse(raw);
      return entries.sort(
        (a, b) => new Date(b.timestamp_signal).getTime() - new Date(a.timestamp_signal).getTime(),
      );
    } catch (err) {
      console.error('[Journal] Failed to load entries:', err);
      return [];
    }
  }

  /** Persist the full array back to storage. */
  private async persistAll(entries: JournalEntry[]): Promise<void> {
    try {
      // Trim oldest if over cap
      const trimmed = entries.length > MAX_ENTRIES ? entries.slice(0, MAX_ENTRIES) : entries;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.error('[Journal] Failed to persist:', err);
    }
  }

  // ── Logging ──────────────────────────────────────────────────────

  /** Record a new signal (may or may not be executed later). */
  async logSignal(entry: JournalEntry): Promise<void> {
    const entries = await this.getAllEntries();
    entries.unshift(entry); // newest first
    await this.persistAll(entries);
    console.log(`[Journal] Signal logged: ${entry.id} ${entry.symbol} ${entry.direction}`);
  }

  /** Update an existing entry with execution details. */
  async logExecution(
    id: string,
    data: {
      timestamp_execution: string;
      entry_price: number;
      stake: number;
      payout_percent: number;
      latency_ms: number;
      predicted_outcome: string | null;
    },
  ): Promise<void> {
    const entries = await this.getAllEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      console.warn(`[Journal] logExecution: entry ${id} not found — creating new entry`);
      return;
    }
    entries[idx] = { ...entries[idx], ...data };
    await this.persistAll(entries);
    console.log(`[Journal] Execution logged: ${id}`);
  }

  /** Update an existing entry with the final outcome after expiry. */
  async logOutcome(
    id: string,
    actualOutcome: 'win' | 'loss' | 'not_executed',
    profit: number,
  ): Promise<void> {
    const entries = await this.getAllEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      console.warn(`[Journal] logOutcome: entry ${id} not found`);
      return;
    }
    entries[idx].actual_outcome = actualOutcome;
    entries[idx].profit = profit;
    await this.persistAll(entries);
    console.log(`[Journal] Outcome logged: ${id} → ${actualOutcome} P&L ${profit.toFixed(2)}`);
  }

  // ── Queries ──────────────────────────────────────────────────────

  /** Get a single entry by id. */
  async getEntryById(id: string): Promise<JournalEntry | null> {
    const entries = await this.getAllEntries();
    return entries.find((e) => e.id === id) ?? null;
  }

  /** Filter entries by symbol, direction, outcome, and/or date range. */
  async getFiltered(filters: {
    symbol?: string;
    direction?: string;
    outcome?: string;
    from?: string; // ISO date
    to?: string;   // ISO date
  }): Promise<JournalEntry[]> {
    let entries = await this.getAllEntries();
    if (filters.symbol) entries = entries.filter((e) => e.symbol === filters.symbol);
    if (filters.direction) entries = entries.filter((e) => e.direction === filters.direction);
    if (filters.outcome) entries = entries.filter((e) => e.actual_outcome === filters.outcome);
    if (filters.from) {
      const fromMs = new Date(filters.from).getTime();
      entries = entries.filter((e) => new Date(e.timestamp_signal).getTime() >= fromMs);
    }
    if (filters.to) {
      const toMs = new Date(filters.to).getTime();
      entries = entries.filter((e) => new Date(e.timestamp_signal).getTime() <= toMs);
    }
    return entries;
  }

  // ── Aggregate Stats ──────────────────────────────────────────────

  async getStats(): Promise<{
    totalSignals: number;
    totalTrades: number;
    wins: number;
    losses: number;
    notExecuted: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    paperTrades: number;
    realTrades: number;
  }> {
    const entries = await this.getAllEntries();
    const trades = entries.filter((e) => e.actual_outcome === 'win' || e.actual_outcome === 'loss');
    const wins = trades.filter((e) => e.actual_outcome === 'win').length;
    const losses = trades.filter((e) => e.actual_outcome === 'loss').length;
    const notExecuted = entries.filter((e) => e.actual_outcome === 'not_executed').length;
    const totalProfit = trades.reduce((sum, e) => sum + e.profit, 0);

    return {
      totalSignals: entries.length,
      totalTrades: trades.length,
      wins,
      losses,
      notExecuted,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
      totalProfit,
      avgProfit: trades.length > 0 ? totalProfit / trades.length : 0,
      paperTrades: entries.filter((e) => e.paper_trade).length,
      realTrades: entries.filter((e) => !e.paper_trade).length,
    };
  }

  // ── CSV Export ───────────────────────────────────────────────────

  async exportToCSV(): Promise<string> {
    const entries = await this.getAllEntries();
    const header = [
      'id',
      'timestamp_signal',
      'timestamp_execution',
      'symbol',
      'direction',
      'signal_reason',
      'confidence_score',
      'htf_trend',
      'ltf_context',
      'entry_price',
      'stake',
      'payout_percent',
      'expiry_seconds',
      'predicted_outcome',
      'actual_outcome',
      'profit',
      'latency_ms',
      'market_closed_at_entry',
      'paper_trade',
    ].join(',');

    const rows = entries.map((e) =>
      [
        e.id,
        e.timestamp_signal,
        e.timestamp_execution ?? '',
        e.symbol,
        e.direction,
        `"${(e.signal_reason || '').replace(/"/g, '""')}"`,
        e.confidence_score,
        `"${e.htf_trend}"`,
        `"${e.ltf_context}"`,
        e.entry_price,
        e.stake,
        e.payout_percent ?? '',
        e.expiry_seconds,
        e.predicted_outcome ?? '',
        e.actual_outcome ?? '',
        e.profit,
        e.latency_ms,
        e.market_closed_at_entry,
        e.paper_trade,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  // ── Maintenance ──────────────────────────────────────────────────

  /** Clear all journal entries. */
  async clearJournal(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[Journal] Journal cleared');
  }

  /** Get entry count. */
  async getEntryCount(): Promise<number> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    return JSON.parse(raw).length;
  }
}

// Singleton
export const tradeJournal = new TradeJournalService();
export default tradeJournal;
