import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { derivWebSocket } from '../services/DerivWebSocket';
import { tradeJournal } from '../services/TradeJournal';
import { getPaperTrading, setPaperTrading } from '../services/Settings';
import { fetchEconomicCalendar, isNewsDangerWindow, getBlockedSymbols, NewsEvent } from '../services/NewsFilter';
import {
  DiscoveredSymbol,
  getActiveSymbols,
  saveActiveSymbols,
  getCachedDiscovery,
  cacheDiscovery,
  parseActiveSymbolsResponse,
  mergeDiscovered,
} from '../services/SymbolDiscovery';
import {
  ConnectionStatus,
  DerivBalance,
  DerivProfitTable,
  TickResponse,
  BalanceResponse,
  ProfitTableResponse,
  TradeDirection,
  TradeSuggestion,
  ActivePosition,
  DerivTick,
  JournalEntry,
} from '../types';
import { TRADING_CONFIG, SYMBOLS, SYNTHETIC_SYMBOL_KEYS, PAPER_TRADING } from '../constants/theme';
import { calculateSyntheticSignalScore } from '../services/SignalScoring';

const SYNTHETIC_SYMBOLS = SYNTHETIC_SYMBOL_KEYS.map((key) => SYMBOLS[key]);

export interface SyntheticMarketData {
  symbol: string;
  price: number;
  sma: number;
  direction: TradeDirection | null;
  signalStatus: 'WAITING' | 'BUY' | 'SELL';
  confidence: number;
}

// Higher timeframe candle type
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  epoch: number;
}

interface HigherTimeframeAnalysis {
  h4Direction: TradeDirection | null;
  d1Direction: TradeDirection | null;
  combinedTrend: TradeDirection | null; // Only goes with the trend
  resistance: number;   // TP target
  support: number;      // SL target
  confidence: number;
  analysis: string;
}

interface UseDerivWebSocketReturn {
  // Connection
  connectionStatus: ConnectionStatus;
  activeLoginId: string | null;
  isVirtual: boolean;
  accountType: 'demo' | 'real' | null;
  error: string | null;
  
  // Balance
  balance: DerivBalance | null;
  
  // Profit
  profitTable: DerivProfitTable | null;
  
  // Trading mode
  isPaperTrading: boolean;
  togglePaperTrading: (value: boolean) => Promise<void>;

  // Connection state
  inCooldown: boolean;
  cooldownRemainingSec: number;
  manualRetry: () => void;

  // News filter
  blockedSymbols: string[];
  nextNewsEvent: NewsEvent | null;
  minutesUntilNews: number | null;
  refreshNews: () => Promise<void>;

  // Dynamic symbols
  discoveredSymbols: DiscoveredSymbol[];
  activeSymbols: string[];
  toggleSymbol: (symbol: string) => Promise<void>;
  refreshSymbols: () => void;
  
  // Market data
  xauusdPrice: number;
  gbpusdPrice: number;
  audusdPrice: number;
  r100Price: number;
  xauusdSma: number;
  gbpusdSma: number;
  audusdSma: number;
  r100Sma: number;
  xauusdDirection: TradeDirection | null;
  gbpusdDirection: TradeDirection | null;
  audusdDirection: TradeDirection | null;
  r100Direction: TradeDirection | null;
  xauusdClosedUntil: Date | null;
  gbpusdClosedUntil: Date | null;
  audusdClosedUntil: Date | null;

  // Higher timeframe trend
  xauusdTrend: TradeDirection | null;
  gbpusdTrend: TradeDirection | null;
  audusdTrend: TradeDirection | null;
  r100Trend: TradeDirection | null;
  syntheticMarkets: SyntheticMarketData[];
  
  // Suggestions
  suggestions: TradeSuggestion[];
  
  // Active positions
  activePositions: ActivePosition[];
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => void;
  refreshProfitTable: (startDate: string, endDate: string) => void;
  executeTrade: (suggestion: TradeSuggestion) => Promise<boolean>;
  closePosition: (position: ActivePosition) => Promise<boolean>;
  refreshPositions: () => Promise<void>;
  refreshHigherTimeframe: () => Promise<void>;
  // Retry helper for closed markets (manual)
  retrySubscribe: (symbol: string) => void;
}

// Cooldown: 2 minutes between signals per symbol
const SIGNAL_COOLDOWN_MS = 2 * 60 * 1000;
// Require 3 consecutive ticks confirming direction
const TICK_CONFIRMATION_COUNT = 3;
// Minimum SMA deviation for signal
const MIN_SMA_DEVIATION_PERCENT = 0.05;

const averageNumbers = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const useDerivWebSocket = (): UseDerivWebSocketReturn => {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeLoginId, setActiveLoginId] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState<boolean>(true);
  const [accountType, setAccountType] = useState<'demo' | 'real' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Paper trading mode — runtime toggle, persisted to AsyncStorage
  const [paperTradingEnabled, setPaperTradingEnabledState] = useState<boolean>(PAPER_TRADING);

  // Reconnect cooldown state
  const [inCooldown, setInCooldown] = useState(false);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState(0);

  // News filter state
  const [blockedSymbols, setBlockedSymbols] = useState<string[]>([]);
  const [nextNewsEvent, setNextNewsEvent] = useState<NewsEvent | null>(null);
  const [minutesUntilNews, setMinutesUntilNews] = useState<number | null>(null);

  // Dynamic symbol discovery
  const [discoveredSymbols, setDiscoveredSymbols] = useState<DiscoveredSymbol[]>([]);
  const [activeSymbols, setActiveSymbols] = useState<string[]>([]);

  // Force refresh news calendar
  const refreshNews = useCallback(async () => {
    await fetchEconomicCalendar();
    const blocked = getBlockedSymbols();
    setBlockedSymbols(blocked);
  }, []);

  // Toggle a symbol on/off
  const toggleSymbol = useCallback(async (symbol: string) => {
    setActiveSymbols((prev) => {
      const isCurrentlyActive = prev.includes(symbol);
      const next = isCurrentlyActive
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];

      // Persist
      saveActiveSymbols(next);

      // Subscribe/unsubscribe
      if (isCurrentlyActive) {
        try { derivWebSocket.unsubscribeTicks(symbol); } catch (e) { /* ok */ }
        console.log(`[Symbols] Deactivated: ${symbol}`);
      } else {
        try { derivWebSocket.subscribeTicks(symbol); } catch (e) { /* ok */ }
        console.log(`[Symbols] Activated: ${symbol}`);
      }

      return next;
    });
  }, []);

  // Request fresh symbol discovery
  const refreshSymbols = useCallback(() => {
    try {
      derivWebSocket.requestActiveSymbols();
    } catch (e) {
      console.warn('[Symbols] Failed to request active symbols:', e);
    }
  }, []);

  // Load persisted paper trading setting on mount
  useEffect(() => {
    getPaperTrading().then(setPaperTradingEnabledState).catch(() => {});
  }, []);

  // Toggle paper trading — updates state AND persists
  const togglePaperTrading = useCallback(async (value: boolean) => {
    setPaperTradingEnabledState(value);
    await setPaperTrading(value);
  }, []);
  
  // Balance state
  const [balance, setBalance] = useState<DerivBalance | null>(null);
  
  // Profit state
  const [profitTable, setProfitTable] = useState<DerivProfitTable | null>(null);
  
  // Market data state
  const [xauusdPrice, setXauusdPrice] = useState<number>(0);
  const [gbpusdPrice, setGbpusdPrice] = useState<number>(0);
  const [audusdPrice, setAudusdPrice] = useState<number>(0);
  const [r100Price, setR100Price] = useState<number>(0);
  const [xauusdSma, setXauusdSma] = useState<number>(0);
  const [gbpusdSma, setGbpusdSma] = useState<number>(0);
  const [audusdSma, setAudusdSma] = useState<number>(0);
  const [r100Sma, setR100Sma] = useState<number>(0);
  const [xauusdDirection, setXauusdDirection] = useState<TradeDirection | null>(null);
  const [gbpusdDirection, setGbpusdDirection] = useState<TradeDirection | null>(null);
  const [audusdDirection, setAudusdDirection] = useState<TradeDirection | null>(null);
  const [r100Direction, setR100Direction] = useState<TradeDirection | null>(null);
  // Market closed states (null = open)
  const [xauusdClosedUntil, setXauusdClosedUntil] = useState<Date | null>(null);
  const [gbpusdClosedUntil, setGbpusdClosedUntil] = useState<Date | null>(null);
  const [audusdClosedUntil, setAudusdClosedUntil] = useState<Date | null>(null);

  // Higher timeframe trend state
  const [xauusdTrend, setXauusdTrend] = useState<TradeDirection | null>(null);
  const [gbpusdTrend, setGbpusdTrend] = useState<TradeDirection | null>(null);
  const [audusdTrend, setAudusdTrend] = useState<TradeDirection | null>(null);
  const [r100Trend, setR100Trend] = useState<TradeDirection | null>(null);
  const [syntheticMarkets, setSyntheticMarkets] = useState<SyntheticMarketData[]>(() =>
    SYNTHETIC_SYMBOLS.map((symbol) => ({
      symbol,
      price: 0,
      sma: 0,
      direction: null,
      signalStatus: 'WAITING',
      confidence: 0,
    })),
  );

  // Suggestions state
  const [suggestions, setSuggestions] = useState<TradeSuggestion[]>([]);
  
  // Active positions state
  const [activePositions, setActivePositions] = useState<ActivePosition[]>([]);
  
  // Refs for tick history
  const xauusdTicksRef = useRef<DerivTick[]>([]);
  const gbpusdTicksRef = useRef<DerivTick[]>([]);
  const audusdTicksRef = useRef<DerivTick[]>([]);
  const r100TicksRef = useRef<DerivTick[]>([]);
  const syntheticTicksRef = useRef<Record<string, DerivTick[]>>({});
  const syntheticLastSignalTimeRef = useRef<Record<string, number>>({});
  const syntheticLastDirectionRef = useRef<Record<string, TradeDirection | null>>({});

  // Refs for tracking confirmed direction ticks
  const xauusdConfirmedTicksRef = useRef<number>(0);
  const gbpusdConfirmedTicksRef = useRef<number>(0);
  const audusdConfirmedTicksRef = useRef<number>(0);
  const r100ConfirmedTicksRef = useRef<number>(0);
  const xauusdLastDirectionRef = useRef<TradeDirection | null>(null);
  const gbpusdLastDirectionRef = useRef<TradeDirection | null>(null);
  const audusdLastDirectionRef = useRef<TradeDirection | null>(null);
  const r100LastDirectionRef = useRef<TradeDirection | null>(null);
  
  // Refs for signal cooldown per symbol
  const xauusdLastSignalTimeRef = useRef<number>(0);
  const gbpusdLastSignalTimeRef = useRef<number>(0);
  const audusdLastSignalTimeRef = useRef<number>(0);
  const r100LastSignalTimeRef = useRef<number>(0);
  
  // Refs for active positions tracking
  const activePositionsRef = useRef<ActivePosition[]>([]);
  activePositionsRef.current = activePositions;

  // Guard against StrictMode double-invoke cleanup disconnecting a still-mounted socket lifecycle.
  const mountedRef = useRef(false);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Ref for tracking if real HTF candles are available
  const htfCandlesAvailableRef = useRef<boolean>(false);
  const htfErrorLoggedRef = useRef<boolean>(false);
  
  // Refs for higher timeframe analysis
  const xauusdAnalysisRef = useRef<HigherTimeframeAnalysis | null>(null);
  const gbpusdAnalysisRef = useRef<HigherTimeframeAnalysis | null>(null);
  const audusdAnalysisRef = useRef<HigherTimeframeAnalysis | null>(null);

  // Last retry timestamps to enforce "never more than once per minute"
  const xauusdLastRetryRef = useRef<number>(0);
  const gbpusdLastRetryRef = useRef<number>(0);
  const audusdLastRetryRef = useRef<number>(0);
  
  // Calculate EMA from an array of numbers
  const calculateEma = useCallback((data: number[], period: number): number => {
    if (data.length === 0) return 0;
    const multiplier = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }, []);
  
  // Analyze a single timeframe's candles using EMA8/EMA21
  // Returns: Bullish if last close > EMA21 AND EMA8 > EMA21
  //          Bearish if last close < EMA21 AND EMA8 < EMA21
  //          Else Neutral
  const analyzeSingleTimeframe = useCallback((candles: Candle[], timeframe: string): {
    direction: TradeDirection | null;
    lastClose: number;
    ema8: number;
    ema21: number;
    resistance: number;
    support: number;
  } => {
    if (candles.length < 10) {
      return { direction: null, lastClose: 0, ema8: 0, ema21: 0, resistance: 0, support: 0 };
    }
    
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    const lastClose = closes[closes.length - 1];
    const ema8 = calculateEma(closes, 8);
    const ema21 = calculateEma(closes, 21);
    
    // Resistance = highest high in last 20 candles
    const recentHighs = highs.slice(-20);
    const resistance = Math.max(...recentHighs);
    // Support = lowest low in last 20 candles
    const recentLows = lows.slice(-20);
    const support = Math.min(...recentLows);
    
    let direction: TradeDirection | null = null;
    
    if (lastClose > ema21 && ema8 > ema21) {
      direction = 'BUY';
    } else if (lastClose < ema21 && ema8 < ema21) {
      direction = 'SELL';
    }
    // else: Neutral (direction = null)
    
    return { direction, lastClose, ema8, ema21, resistance, support };
  }, [calculateEma]);
  
  // Refresh higher timeframe analysis using REAL candles from Deriv API
  const refreshHigherTimeframe = useCallback(async () => {
    if (!derivWebSocket.isConnected()) {
      console.log('[HTF] WebSocket not connected, skipping');
      return;
    }
    
    try {
      console.log('[HTF] Fetching real H4 and D1 candles...');
      
      // Fetch XAUUSD H4 candles (granularity=14400 seconds)
      let xauH4Candles: Candle[] = [];
      let xauD1Candles: Candle[] = [];
      let gbpH4Candles: Candle[] = [];
      let gbpD1Candles: Candle[] = [];
      let audH4Candles: Candle[] = [];
      let audD1Candles: Candle[] = [];
      
      try {
        xauH4Candles = await derivWebSocket.getCandles(SYMBOLS.XAUUSD, 14400, 200);
      } catch (err) {
        console.error('[HTF] FAILED to fetch XAUUSD H4 candles:', err);
      }
      
      try {
        xauD1Candles = await derivWebSocket.getCandles(SYMBOLS.XAUUSD, 86400, 200);
      } catch (err) {
        console.error('[HTF] FAILED to fetch XAUUSD D1 candles:', err);
      }
      
      try {
        gbpH4Candles = await derivWebSocket.getCandles(SYMBOLS.GBPUSD, 14400, 200);
      } catch (err) {
        console.error('[HTF] FAILED to fetch GBPUSD H4 candles:', err);
      }
      
      try {
        gbpD1Candles = await derivWebSocket.getCandles(SYMBOLS.GBPUSD, 86400, 200);
      } catch (err) {
        console.error('[HTF] FAILED to fetch GBPUSD D1 candles:', err);
      }
      
      try {
        audH4Candles = await derivWebSocket.getCandles(SYMBOLS.AUDUSD, 14400, 200);
      } catch (err) {
        console.error('[HTF] FAILED to fetch AUDUSD H4 candles:', err);
      }
      
      try {
        audD1Candles = await derivWebSocket.getCandles(SYMBOLS.AUDUSD, 86400, 200);
      } catch (err) {
        console.error('[HTF] FAILED to fetch AUDUSD D1 candles:', err);
      }
      
      // Check if we got candles (need at least 10 for EMA calculation)
      const xauH4Ok = xauH4Candles.length >= 10;
      const xauD1Ok = xauD1Candles.length >= 10;
      const gbpH4Ok = gbpH4Candles.length >= 10;
      const gbpD1Ok = gbpD1Candles.length >= 10;
      const audH4Ok = audH4Candles.length >= 10;
      const audD1Ok = audD1Candles.length >= 10;
      
      if (!xauH4Ok && !xauD1Ok && !gbpH4Ok && !gbpD1Ok && !audH4Ok && !audD1Ok) {
        // ALL candle requests failed - disable signal generation
        htfCandlesAvailableRef.current = false;
        if (!htfErrorLoggedRef.current) {
          console.error('[HTF] ═══════════════════════════════════════════════');
          console.error('[HTF] CRITICAL: Could not fetch ANY candle data from Deriv API.');
          console.error('[HTF] Signal generation is DISABLED until candles are available.');
          console.error('[HTF] Possible causes: symbol not available, market closed, or API error.');
          console.error('[HTF] ═══════════════════════════════════════════════');
          htfErrorLoggedRef.current = true;
        }
        return;
      }
      
      // At least some candles available - enable signal generation
      htfCandlesAvailableRef.current = true;
      htfErrorLoggedRef.current = false;
      
      // --- Analyze XAUUSD ---
      if (xauH4Ok || xauD1Ok) {
        const xauH4 = analyzeSingleTimeframe(xauH4Candles, 'H4');
        const xauD1 = analyzeSingleTimeframe(xauD1Candles, 'D1');
        
        // Log actual H4/D1 candle values as requested
        if (xauH4Ok) {
          console.log(`[HTF] XAUUSD H4 last close: ${xauH4.lastClose.toFixed(2)}, EMA8: ${xauH4.ema8.toFixed(2)}, EMA21: ${xauH4.ema21.toFixed(2)}, trend: ${xauH4.direction || 'NEUTRAL'}`);
        }
        if (xauD1Ok) {
          console.log(`[HTF] XAUUSD D1 last close: ${xauD1.lastClose.toFixed(2)}, EMA8: ${xauD1.ema8.toFixed(2)}, EMA21: ${xauD1.ema21.toFixed(2)}, trend: ${xauD1.direction || 'NEUTRAL'}`);
        }
        
        // Combined trend: H4 and D1 must agree for "confirmed"
        let combinedTrend: TradeDirection | null = null;
        let confidence = 0;
        let analysis = '';
        
        if (xauH4.direction === xauD1.direction && xauH4.direction !== null) {
          combinedTrend = xauH4.direction;
          confidence = 85;
          analysis = `H4 & D1 both ${combinedTrend} - CONFIRMED alignment`;
        } else if (xauH4.direction !== null && !xauD1Ok) {
          // D1 not available, use H4 only with lower confidence
          combinedTrend = xauH4.direction;
          confidence = 55;
          analysis = `H4 ${combinedTrend}, D1 unavailable - partial`;
        } else if (xauD1.direction !== null && !xauH4Ok) {
          combinedTrend = xauD1.direction;
          confidence = 55;
          analysis = `D1 ${xauD1.direction}, H4 unavailable - partial`;
        } else {
          analysis = 'H4 & D1 neutral - no clear trend';
          confidence = 0;
        }
        
        const resistance = (xauH4Ok && xauD1Ok)
          ? Math.min(xauH4.resistance, xauD1.resistance)
          : xauH4.resistance || xauD1.resistance;
        const support = (xauH4Ok && xauD1Ok)
          ? Math.max(xauH4.support, xauD1.support)
          : xauH4.support || xauD1.support;
        
        const xauAnalysis: HigherTimeframeAnalysis = {
          h4Direction: xauH4.direction,
          d1Direction: xauD1.direction,
          combinedTrend,
          resistance,
          support,
          confidence: Math.min(confidence, 100),
          analysis,
        };
        
        xauusdAnalysisRef.current = xauAnalysis;
        setXauusdTrend(xauAnalysis.combinedTrend);
        console.log(`[HTF] XAUUSD combined: ${combinedTrend || 'NEUTRAL'} (${confidence}%) - ${analysis}`);
      }
      
      // --- Analyze GBPUSD ---
      if (gbpH4Ok || gbpD1Ok) {
        const gbpH4 = analyzeSingleTimeframe(gbpH4Candles, 'H4');
        const gbpD1 = analyzeSingleTimeframe(gbpD1Candles, 'D1');
        
        if (gbpH4Ok) {
          console.log(`[HTF] GBPUSD H4 last close: ${gbpH4.lastClose.toFixed(4)}, EMA8: ${gbpH4.ema8.toFixed(4)}, EMA21: ${gbpH4.ema21.toFixed(4)}, trend: ${gbpH4.direction || 'NEUTRAL'}`);
        }
        if (gbpD1Ok) {
          console.log(`[HTF] GBPUSD D1 last close: ${gbpD1.lastClose.toFixed(4)}, EMA8: ${gbpD1.ema8.toFixed(4)}, EMA21: ${gbpD1.ema21.toFixed(4)}, trend: ${gbpD1.direction || 'NEUTRAL'}`);
        }
        
        let combinedTrend: TradeDirection | null = null;
        let confidence = 0;
        let analysis = '';
        
        if (gbpH4.direction === gbpD1.direction && gbpH4.direction !== null) {
          combinedTrend = gbpH4.direction;
          confidence = 85;
          analysis = `H4 & D1 both ${combinedTrend} - CONFIRMED alignment`;
        } else if (gbpH4.direction !== null && !gbpD1Ok) {
          combinedTrend = gbpH4.direction;
          confidence = 55;
          analysis = `H4 ${combinedTrend}, D1 unavailable - partial`;
        } else if (gbpD1.direction !== null && !gbpH4Ok) {
          combinedTrend = gbpD1.direction;
          confidence = 55;
          analysis = `D1 ${gbpD1.direction}, H4 unavailable - partial`;
        } else {
          analysis = 'H4 & D1 neutral - no clear trend';
          confidence = 0;
        }
        
        const resistance = (gbpH4Ok && gbpD1Ok)
          ? Math.min(gbpH4.resistance, gbpD1.resistance)
          : gbpH4.resistance || gbpD1.resistance;
        const support = (gbpH4Ok && gbpD1Ok)
          ? Math.max(gbpH4.support, gbpD1.support)
          : gbpH4.support || gbpD1.support;
        
        const gbpAnalysis: HigherTimeframeAnalysis = {
          h4Direction: gbpH4.direction,
          d1Direction: gbpD1.direction,
          combinedTrend,
          resistance,
          support,
          confidence: Math.min(confidence, 100),
          analysis,
        };
        
        gbpusdAnalysisRef.current = gbpAnalysis;
        setGbpusdTrend(gbpAnalysis.combinedTrend);
        console.log(`[HTF] GBPUSD combined: ${combinedTrend || 'NEUTRAL'} (${confidence}%) - ${analysis}`);
      }
      
      // --- Analyze AUDUSD ---
      if (audH4Ok || audD1Ok) {
        const audH4 = analyzeSingleTimeframe(audH4Candles, 'H4');
        const audD1 = analyzeSingleTimeframe(audD1Candles, 'D1');
        
        if (audH4Ok) {
          console.log(`[HTF] AUDUSD H4 last close: ${audH4.lastClose.toFixed(4)}, EMA8: ${audH4.ema8.toFixed(4)}, EMA21: ${audH4.ema21.toFixed(4)}, trend: ${audH4.direction || 'NEUTRAL'}`);
        }
        if (audD1Ok) {
          console.log(`[HTF] AUDUSD D1 last close: ${audD1.lastClose.toFixed(4)}, EMA8: ${audD1.ema8.toFixed(4)}, EMA21: ${audD1.ema21.toFixed(4)}, trend: ${audD1.direction || 'NEUTRAL'}`);
        }
        
        let combinedTrend: TradeDirection | null = null;
        let confidence = 0;
        let analysis = '';
        
        if (audH4.direction === audD1.direction && audH4.direction !== null) {
          combinedTrend = audH4.direction;
          confidence = 85;
          analysis = `H4 & D1 both ${combinedTrend} - CONFIRMED alignment`;
        } else if (audH4.direction !== null && !audD1Ok) {
          combinedTrend = audH4.direction;
          confidence = 55;
          analysis = `H4 ${combinedTrend}, D1 unavailable - partial`;
        } else if (audD1.direction !== null && !audH4Ok) {
          combinedTrend = audD1.direction;
          confidence = 55;
          analysis = `D1 ${audD1.direction}, H4 unavailable - partial`;
        } else {
          analysis = 'H4 & D1 neutral - no clear trend';
          confidence = 0;
        }
        
        const resistance = (audH4Ok && audD1Ok)
          ? Math.min(audH4.resistance, audD1.resistance)
          : audH4.resistance || audD1.resistance;
        const support = (audH4Ok && audD1Ok)
          ? Math.max(audH4.support, audD1.support)
          : audH4.support || audD1.support;
        
        const audAnalysis: HigherTimeframeAnalysis = {
          h4Direction: audH4.direction,
          d1Direction: audD1.direction,
          combinedTrend,
          resistance,
          support,
          confidence: Math.min(confidence, 100),
          analysis,
        };
        
        audusdAnalysisRef.current = audAnalysis;
        setAudusdTrend(audAnalysis.combinedTrend);
        console.log(`[HTF] AUDUSD combined: ${combinedTrend || 'NEUTRAL'} (${confidence}%) - ${analysis}`);
      }
    } catch (err) {
      console.error('[HTF] Failed to fetch higher timeframe candles:', err);
      htfCandlesAvailableRef.current = false;
    }
  }, [analyzeSingleTimeframe]);
  
  // Calculate SMA from ticks
  const calculateSma = useCallback((ticks: DerivTick[], period: number): number => {
    if (ticks.length < period) {
      return 0;
    }
    const recentTicks = ticks.slice(-period);
    const sum = recentTicks.reduce((acc, tick) => acc + tick.quote, 0);
    return sum / period;
  }, []);
  
  // Analyze market and determine trade direction with confidence
  // Only gives signals when:
  // 1. Real HTF candles are available (not fake from ticks)
  // 2. H4 and D1 agree on direction
  // 3. M1 signal direction matches H4/D1 trend
  const analyzeMarket = useCallback((
    price: number,
    sma: number,
    ticks: DerivTick[],
    symbol: string,
    higherTrend: TradeDirection | null,
    htfAnalysis: HigherTimeframeAnalysis | null
  ): { direction: TradeDirection | null; confidence: number; analysis: string } => {
    if (price === 0 || sma === 0 || ticks.length < TICK_CONFIRMATION_COUNT) {
      return { direction: null, confidence: 0, analysis: 'Collecting data...' };
    }
    
    // R_100 does not have the FX candle-based HTF analysis, so it uses
    // SMA and tick momentum to generate either BUY or SELL signals.
    const requiresHigherTrend = symbol !== SYMBOLS.R_100 && symbol !== 'R_100';

    // FX symbols need real candle data; R_100 does not depend on FX HTF candles.
    if (requiresHigherTrend && !htfCandlesAvailableRef.current) {
      return { direction: null, confidence: 0, analysis: 'HTF candles not available - signals disabled' };
    }

    // FX symbols require a confirmed higher timeframe trend (H4 = D1).
    if (requiresHigherTrend && !higherTrend) {
      return { direction: null, confidence: 0, analysis: 'No confirmed H4/D1 trend - waiting for alignment' };
    }
    
    // Only trade if H4 and D1 agree (confirmed trend)
    if (requiresHigherTrend && htfAnalysis && htfAnalysis.h4Direction !== htfAnalysis.d1Direction && htfAnalysis.d1Direction !== null && htfAnalysis.h4Direction !== null) {
      return { direction: null, confidence: 0, analysis: `H4=${htfAnalysis.h4Direction} but D1=${htfAnalysis.d1Direction} - conflicting, no signal` };
    }
    
    const deviationPercent = ((price - sma) / sma) * 100;
    const absDeviation = Math.abs(deviationPercent);
    
    // Check recent tick momentum (last 5 ticks)
    const recentTicks = ticks.slice(-5);
    if (recentTicks.length < 3) {
      return { direction: null, confidence: 0, analysis: 'Insufficient tick data' };
    }
    
    const priceChange = recentTicks[recentTicks.length - 1].quote - recentTicks[0].quote;
    const momentumUp = priceChange > 0;
    
    // Only trade WITH the higher timeframe trend
    // If H4/D1 says BUY, only look for BUY entries on M1/M5
    // If H4/D1 says SELL, only look for SELL entries on M1/M5
    
    // Check if M1/M5 entry aligns with higher timeframe
    let rawDirection: TradeDirection | null = null;
    
    if (higherTrend === 'BUY') {
      // BUY: look for pullback to SMA with upward momentum (flexible entry)
      // Allow price up to 0.1% below SMA as a pullback entry
      if (deviationPercent >= -0.1 && momentumUp) {
        rawDirection = 'BUY';
      }
    } else if (higherTrend === 'SELL') {
      // SELL: look for pullback to SMA with downward momentum (flexible entry)
      // Allow price up to 0.1% above SMA as a pullback entry
      if (deviationPercent <= 0.1 && !momentumUp) {
        rawDirection = 'SELL';
      }
    } else if (momentumUp && deviationPercent >= -0.1) {
      // R_100: no HTF trend, so upward momentum above the SMA supports BUY.
      rawDirection = 'BUY';
    } else if (!momentumUp && deviationPercent <= 0.1) {
      // R_100: downward momentum below the SMA supports SELL.
      rawDirection = 'SELL';
    }
    
    if (!rawDirection) {
      const waitingFor = higherTrend === 'BUY'
        ? 'BUY pullback near SMA'
        : higherTrend === 'SELL'
          ? 'SELL pullback near SMA'
          : 'BUY or SELL momentum near SMA';
      return { direction: null, confidence: 0, analysis: `H4/D1=${higherTrend}, waiting for ${waitingFor} entry` };
    }
    
    // Check if momentum confirms direction
    const momentumConfirms = (rawDirection === 'BUY' && momentumUp) || (rawDirection === 'SELL' && !momentumUp);
    
    // Calculate confidence based on:
    // 1. Higher timeframe alignment (40 points)
    // 2. Momentum confirmation (30 points)
    // 3. Tick consistency (30 points)
    
    let confidence = 0;
    
    // Higher timeframe alignment (0-40 points)
    if (htfAnalysis && htfAnalysis.combinedTrend === rawDirection) {
      confidence += Math.min(htfAnalysis.confidence * 0.4, 40);
    }
    
    // Momentum component (0-30 points)
    if (momentumConfirms) {
      confidence += 30;
    } else {
      confidence += 5;
    }
    
    // Tick consistency (0-30 points)
    const recent5Ticks = ticks.slice(-5);
    const ticksAgreeing = recent5Ticks.filter(t => {
      if (rawDirection === 'BUY') return t.quote > sma;
      return t.quote < sma;
    }).length;
    confidence += (ticksAgreeing / 5) * 30;
    
    confidence = Math.round(Math.min(confidence, 100));
    
    // Generate analysis text
    const priceStr = symbol.includes('XAUUSD') ? price.toFixed(2) : price.toFixed(4);
    const smaStr = symbol.includes('XAUUSD') ? sma.toFixed(2) : sma.toFixed(4);
    
    let analysis = `H4/D1 trend: ${higherTrend || 'N/A (SMA + momentum)'}`;
    if (htfAnalysis) {
      analysis += ` | ${htfAnalysis.analysis}`;
    }
    analysis += ` | M1 entry: ${rawDirection} at ${priceStr}, SMA ${smaStr}`;
    
    if (momentumConfirms) {
      analysis += `, momentum confirms`;
    }
    
    return { direction: rawDirection, confidence, analysis };
  }, []);
  
  // Check if signal is allowed (cooldown + no conflict)
  const isSignalAllowed = useCallback((
    symbol: string,
    newDirection: TradeDirection,
    lastSignalTime: number
  ): boolean => {
    const now = Date.now();
    const timeSinceLastSignal = now - lastSignalTime;
    
    // Check cooldown
    if (timeSinceLastSignal < SIGNAL_COOLDOWN_MS) {
      console.log(`[Cooldown] ${symbol}: ${(SIGNAL_COOLDOWN_MS - timeSinceLastSignal) / 1000}s remaining`);
      return false;
    }
    
    return true;
  }, []);
  
  // Create trade suggestion with TPs at resistance/support from higher timeframe
  const createSuggestion = useCallback((
    symbol: string,
    direction: TradeDirection,
    price: number,
    confidence: number,
    analysis: string,
    htfAnalysis: HigherTimeframeAnalysis | null
  ): TradeSuggestion => {
    const isGold = symbol.includes('XAUUSD');
    const pipValue = isGold ? 0.01 : 0.0001;
    
    const entryPrice = price;
    
    let stopLoss: number;
    let tp1: number;
    let tp2: number;
    
    if (htfAnalysis && htfAnalysis.resistance > 0 && htfAnalysis.support > 0) {
      if (direction === 'BUY') {
        // BUY: SL at recent support, TP1 at next resistance, TP2 at higher resistance
        stopLoss = htfAnalysis.support;
        tp1 = htfAnalysis.resistance;
        // TP2: use resistance + extra buffer
        tp2 = htfAnalysis.resistance + (htfAnalysis.resistance - entryPrice);
      } else {
        // SELL: SL at recent resistance, TP1 at next support, TP2 at lower support
        stopLoss = htfAnalysis.resistance;
        tp1 = htfAnalysis.support;
        // TP2: use support - extra buffer
        tp2 = htfAnalysis.support - (entryPrice - htfAnalysis.support);
      }
    } else {
      // Fallback to fixed pips if no HTF data
      const slDirection = direction === 'BUY' ? -1 : 1;
      stopLoss = entryPrice + (slDirection * TRADING_CONFIG.STOP_LOSS_PIPS * pipValue);
      tp1 = entryPrice - (slDirection * TRADING_CONFIG.TP1_PIPS * pipValue);
      tp2 = entryPrice - (slDirection * TRADING_CONFIG.TP2_PIPS * pipValue);
    }
    
    return {
      id: `${symbol}-${direction}-${Date.now()}`,
      symbol,
      direction,
      entryPrice,
      stopLoss,
      tp1,
      tp2,
      confidence,
      analysis,
      timestamp: new Date(),
      executed: false,
    };
  }, []);
  
  // Log a signal to the persistent trade journal
  const logSignalToJournal = useCallback(async (
    suggestion: TradeSuggestion,
    htfAnalysis: HigherTimeframeAnalysis | null,
  ) => {
    const entry: JournalEntry = {
      id: suggestion.id,
      timestamp_signal: suggestion.timestamp.toISOString(),
      timestamp_execution: null,
      symbol: suggestion.symbol,
      direction: suggestion.direction,
      signal_reason: suggestion.analysis,
      confidence_score: suggestion.confidence,
      htf_trend: htfAnalysis
        ? `H4:${htfAnalysis.h4Direction ?? 'NEUTRAL'} D1:${htfAnalysis.d1Direction ?? 'NEUTRAL'}`
        : 'N/A',
      ltf_context: `${suggestion.direction} at ${suggestion.entryPrice}`,
      entry_price: 0,
      stake: 0,
      payout_percent: null,
      expiry_seconds: 300, // 5-minute contract
      predicted_outcome: null,
      actual_outcome: 'not_executed',
      profit: 0,
      latency_ms: 0,
      market_closed_at_entry: false,
      paper_trade: paperTradingEnabled,
    };
    await tradeJournal.logSignal(entry);
  }, []);

  const analyzeSyntheticTick = useCallback((ticks: DerivTick[]): {
    sma20: number;
    direction: TradeDirection | null;
    signalStatus: 'WAITING' | 'BUY' | 'SELL';
    confidence: number;
    analysis: string;
  } => {
    if (ticks.length < 50) {
      return { sma20: 0, direction: null, signalStatus: 'WAITING', confidence: 0, analysis: 'Waiting for 50 ticks' };
    }

    const quotes = ticks.map((tick) => tick.quote);
    const currentSma20 = averageNumbers(quotes.slice(-20));
    const currentSma50 = averageNumbers(quotes.slice(-50));
    const previousSma20 = averageNumbers(quotes.slice(-21, -1));
    const previousSma50 = averageNumbers(quotes.slice(-51, -1));
    const recentQuotes = quotes.slice(-15);
    const changes = recentQuotes.map((quote, index) => index === 0 ? 0 : quote - recentQuotes[index - 1]);
    const gains = changes.reduce((sum, change) => sum + Math.max(change, 0), 0) / 14;
    const losses = changes.reduce((sum, change) => sum + Math.max(-change, 0), 0) / 14;
    const rsi = losses === 0 ? (gains === 0 ? 50 : 100) : 100 - (100 / (1 + gains / losses));
    const direction = previousSma20 <= previousSma50 && currentSma20 > currentSma50 && rsi < 70
      ? 'BUY'
      : previousSma20 >= previousSma50 && currentSma20 < currentSma50 && rsi > 30
        ? 'SELL'
        : null;
    const signalStatus: SyntheticMarketData['signalStatus'] = currentSma20 > currentSma50 ? 'BUY' : 'SELL';
    const confidence = calculateSyntheticSignalScore({
      direction,
      smaFast: currentSma20,
      smaSlow: currentSma50,
      rsi,
      recentChanges: changes.slice(1),
      observedTicks: ticks.length,
    });
    return {
      sma20: currentSma20,
      direction,
      signalStatus,
      confidence,
      analysis: `SMA20=${currentSma20.toFixed(2)} ${currentSma20 > currentSma50 ? '>' : '<'} SMA50=${currentSma50.toFixed(2)}, RSI=${rsi.toFixed(0)}, strength=${confidence}/100`,
    };
  }, []);

  // Handle tick updates
  const handleTick = useCallback((
    symbol: string,
    tick: DerivTick,
    xauusdHtfTrend: TradeDirection | null,
    gbpusdHtfTrend: TradeDirection | null,
    audusdHtfTrend: TradeDirection | null,
    r100HtfTrend: TradeDirection | null,
  ) => {
    const isXauusd = symbol === SYMBOLS.XAUUSD || symbol === 'frxXAUUSD';
    const isGbpusd = symbol === SYMBOLS.GBPUSD || symbol === 'frxGBPUSD';
    const isAudusd = symbol === SYMBOLS.AUDUSD || symbol === 'frxAUDUSD';
    const isR100 = symbol === SYMBOLS.R_100 || symbol === 'R_100';
    const isSynthetic = SYNTHETIC_SYMBOLS.includes(symbol);

    if (!isXauusd && !isGbpusd && !isAudusd && !isR100 && !isSynthetic) return;

    if (isSynthetic) {
      const ticks = [...(syntheticTicksRef.current[symbol] || []), tick].slice(-200);
      syntheticTicksRef.current[symbol] = ticks;
      const analysis = analyzeSyntheticTick(ticks);

      setSyntheticMarkets((previous) => previous.map((market) => market.symbol === symbol
        ? { ...market, price: tick.quote, sma: analysis.sma20, direction: analysis.direction, signalStatus: analysis.signalStatus, confidence: analysis.confidence }
        : market));
      if (symbol === SYMBOLS.R_100) {
        setR100Price(tick.quote);
        setR100Sma(analysis.sma20);
        setR100Direction(analysis.direction);
      }

      if (analysis.direction && syntheticLastDirectionRef.current[symbol] !== analysis.direction) {
        const lastSignal = syntheticLastSignalTimeRef.current[symbol] || 0;
        if (Date.now() - lastSignal >= SIGNAL_COOLDOWN_MS) {
          console.log(`[Signal] ${symbol}: ${analysis.direction} confirmed (${analysis.confidence}%) - ${analysis.analysis}`);
          const suggestion = createSuggestion(symbol, analysis.direction, tick.quote, analysis.confidence, analysis.analysis, null);
          setSuggestions((previous) => [suggestion, ...previous].slice(0, TRADING_CONFIG.MAX_SUGGESTIONS));
          logSignalToJournal(suggestion, null);
          syntheticLastSignalTimeRef.current[symbol] = Date.now();
        }
        syntheticLastDirectionRef.current[symbol] = analysis.direction;
      }

      console.log(`[Tick] ${symbol}: price=${tick.quote}, sma=${analysis.sma20.toFixed(2)}, htf=NEUTRAL, direction=${analysis.direction || 'NEUTRAL'}`);
      return;
    }

    if (isXauusd) {
      setXauusdPrice(tick.quote);
      xauusdTicksRef.current = [...xauusdTicksRef.current, tick].slice(-100);

      const sma = calculateSma(xauusdTicksRef.current, TRADING_CONFIG.SMA_PERIOD);
      setXauusdSma(sma);

      const currentTrend = xauusdHtfTrend;
      const currentAnalysis = xauusdAnalysisRef.current;
      const analysis = analyzeMarket(tick.quote, sma, xauusdTicksRef.current, symbol, currentTrend, currentAnalysis);

      if (analysis.direction) {
        if (analysis.direction === xauusdLastDirectionRef.current) {
          xauusdConfirmedTicksRef.current++;
        } else {
          xauusdConfirmedTicksRef.current = 1;
          xauusdLastDirectionRef.current = analysis.direction;
        }

        setXauusdDirection(analysis.direction);

        if (xauusdConfirmedTicksRef.current >= TICK_CONFIRMATION_COUNT) {
          if (isSignalAllowed(symbol, analysis.direction, xauusdLastSignalTimeRef.current)) {
            // News filter: block signal during high-impact events
            const newsCheck = isNewsDangerWindow(symbol);
            if (newsCheck.blocked) {
              console.log(`[Signal] ${symbol} BLOCKED by news: ${newsCheck.event?.title} (${newsCheck.event?.currency})`);
              xauusdConfirmedTicksRef.current = 0;
              xauusdLastDirectionRef.current = null;
              return;
            }

            console.log(`[Signal] ${symbol}: ${analysis.direction} confirmed (${analysis.confidence}%) - ${analysis.analysis}`);

            const suggestion = createSuggestion(
              symbol,
              analysis.direction,
              tick.quote,
              analysis.confidence,
              analysis.analysis,
              currentAnalysis
            );

            setSuggestions(prev => {
              const newSuggestions = [suggestion, ...prev];
              return newSuggestions.slice(0, TRADING_CONFIG.MAX_SUGGESTIONS);
            });
            logSignalToJournal(suggestion, currentAnalysis);

            xauusdLastSignalTimeRef.current = Date.now();
            xauusdConfirmedTicksRef.current = 0;
          }
        }
      } else {
        setXauusdDirection(null);
        xauusdConfirmedTicksRef.current = 0;
        xauusdLastDirectionRef.current = null;
      }

      console.log(`[Tick] ${symbol}: price=${tick.quote}, sma=${sma.toFixed(2)}, htf=${currentTrend || 'NEUTRAL'}, direction=${analysis.direction || 'NEUTRAL'}`);
    } else if (isGbpusd) {
      setGbpusdPrice(tick.quote);
      gbpusdTicksRef.current = [...gbpusdTicksRef.current, tick].slice(-100);

      const sma = calculateSma(gbpusdTicksRef.current, TRADING_CONFIG.SMA_PERIOD);
      setGbpusdSma(sma);

      const currentTrend = gbpusdHtfTrend;
      const currentAnalysis = gbpusdAnalysisRef.current;
      const analysis = analyzeMarket(tick.quote, sma, gbpusdTicksRef.current, symbol, currentTrend, currentAnalysis);

      if (analysis.direction) {
        if (analysis.direction === gbpusdLastDirectionRef.current) {
          gbpusdConfirmedTicksRef.current++;
        } else {
          gbpusdConfirmedTicksRef.current = 1;
          gbpusdLastDirectionRef.current = analysis.direction;
        }

        setGbpusdDirection(analysis.direction);

        if (gbpusdConfirmedTicksRef.current >= TICK_CONFIRMATION_COUNT) {
          if (isSignalAllowed(symbol, analysis.direction, gbpusdLastSignalTimeRef.current)) {
            const newsCheck = isNewsDangerWindow(symbol);
            if (newsCheck.blocked) {
              console.log(`[Signal] ${symbol} BLOCKED by news: ${newsCheck.event?.title} (${newsCheck.event?.currency})`);
              gbpusdConfirmedTicksRef.current = 0;
              gbpusdLastDirectionRef.current = null;
              return;
            }

            console.log(`[Signal] ${symbol}: ${analysis.direction} confirmed (${analysis.confidence}%) - ${analysis.analysis}`);

            const suggestion = createSuggestion(
              symbol,
              analysis.direction,
              tick.quote,
              analysis.confidence,
              analysis.analysis,
              currentAnalysis
            );

            setSuggestions(prev => {
              const newSuggestions = [suggestion, ...prev];
              return newSuggestions.slice(0, TRADING_CONFIG.MAX_SUGGESTIONS);
            });
            logSignalToJournal(suggestion, currentAnalysis);

            gbpusdLastSignalTimeRef.current = Date.now();
            gbpusdConfirmedTicksRef.current = 0;
          }
        }
      } else {
        setGbpusdDirection(null);
        gbpusdConfirmedTicksRef.current = 0;
        gbpusdLastDirectionRef.current = null;
      }

      console.log(`[Tick] ${symbol}: price=${tick.quote}, sma=${sma.toFixed(2)}, htf=${currentTrend || 'NEUTRAL'}, direction=${analysis.direction || 'NEUTRAL'}`);
    } else if (isAudusd) {
      setAudusdPrice(tick.quote);
      audusdTicksRef.current = [...audusdTicksRef.current, tick].slice(-100);

      const sma = calculateSma(audusdTicksRef.current, TRADING_CONFIG.SMA_PERIOD);
      setAudusdSma(sma);

      const currentTrend = audusdHtfTrend;
      const currentAnalysis = audusdAnalysisRef.current;
      const analysis = analyzeMarket(tick.quote, sma, audusdTicksRef.current, symbol, currentTrend, currentAnalysis);

      if (analysis.direction) {
        if (analysis.direction === audusdLastDirectionRef.current) {
          audusdConfirmedTicksRef.current++;
        } else {
          audusdConfirmedTicksRef.current = 1;
          audusdLastDirectionRef.current = analysis.direction;
        }

        setAudusdDirection(analysis.direction);

        if (audusdConfirmedTicksRef.current >= TICK_CONFIRMATION_COUNT) {
          if (isSignalAllowed(symbol, analysis.direction, audusdLastSignalTimeRef.current)) {
            const newsCheck = isNewsDangerWindow(symbol);
            if (newsCheck.blocked) {
              console.log(`[Signal] ${symbol} BLOCKED by news: ${newsCheck.event?.title} (${newsCheck.event?.currency})`);
              audusdConfirmedTicksRef.current = 0;
              audusdLastDirectionRef.current = null;
              return;
            }

            console.log(`[Signal] ${symbol}: ${analysis.direction} confirmed (${analysis.confidence}%) - ${analysis.analysis}`);

            const suggestion = createSuggestion(
              symbol,
              analysis.direction,
              tick.quote,
              analysis.confidence,
              analysis.analysis,
              currentAnalysis
            );

            setSuggestions(prev => {
              const newSuggestions = [suggestion, ...prev];
              return newSuggestions.slice(0, TRADING_CONFIG.MAX_SUGGESTIONS);
            });
            logSignalToJournal(suggestion, currentAnalysis);

            audusdLastSignalTimeRef.current = Date.now();
            audusdConfirmedTicksRef.current = 0;
          }
        }
      } else {
        setAudusdDirection(null);
        audusdConfirmedTicksRef.current = 0;
        audusdLastDirectionRef.current = null;
      }

      console.log(`[Tick] ${symbol}: price=${tick.quote}, sma=${sma.toFixed(2)}, htf=${currentTrend || 'NEUTRAL'}, direction=${analysis.direction || 'NEUTRAL'}`);
    } else if (isR100) {
      setR100Price(tick.quote);
      r100TicksRef.current = [...r100TicksRef.current, tick].slice(-100);

      const sma = calculateSma(r100TicksRef.current, TRADING_CONFIG.SMA_PERIOD);
      setR100Sma(sma);

      const currentTrend = r100HtfTrend;
      const analysis = analyzeMarket(tick.quote, sma, r100TicksRef.current, symbol, currentTrend, null);

      if (analysis.direction) {
        if (analysis.direction === r100LastDirectionRef.current) {
          r100ConfirmedTicksRef.current++;
        } else {
          r100ConfirmedTicksRef.current = 1;
          r100LastDirectionRef.current = analysis.direction;
        }

        setR100Direction(analysis.direction);

        if (r100ConfirmedTicksRef.current >= TICK_CONFIRMATION_COUNT) {
          if (isSignalAllowed(symbol, analysis.direction, r100LastSignalTimeRef.current)) {
            const newsCheck = isNewsDangerWindow(symbol);
            if (newsCheck.blocked) {
              console.log(`[Signal] ${symbol} BLOCKED by news: ${newsCheck.event?.title}`);
              r100ConfirmedTicksRef.current = 0;
              r100LastDirectionRef.current = null;
              return;
            }

            console.log(`[Signal] ${symbol}: ${analysis.direction} confirmed (${analysis.confidence}%) - ${analysis.analysis}`);

            const suggestion = createSuggestion(
              symbol,
              analysis.direction,
              tick.quote,
              analysis.confidence,
              analysis.analysis,
              null
            );

            setSuggestions(prev => {
              const newSuggestions = [suggestion, ...prev];
              return newSuggestions.slice(0, TRADING_CONFIG.MAX_SUGGESTIONS);
            });
            logSignalToJournal(suggestion, null);

            r100LastSignalTimeRef.current = Date.now();
            r100ConfirmedTicksRef.current = 0;
          }
        }
      } else {
        setR100Direction(null);
        r100ConfirmedTicksRef.current = 0;
        r100LastDirectionRef.current = null;
      }

      console.log(`[Tick] ${symbol}: price=${tick.quote}, sma=${sma.toFixed(2)}, htf=${currentTrend || 'NEUTRAL'}, direction=${analysis.direction || 'NEUTRAL'}`);
    }
  }, [calculateSma, analyzeMarket, analyzeSyntheticTick, isSignalAllowed, createSuggestion, logSignalToJournal]);
  
  // Connect and authorize
  const connect = useCallback(async () => {
    try {
      setError(null);
      await derivWebSocket.connect();
      
      const info = derivWebSocket.getAccountInfo();
      if (info) {
        setActiveLoginId(info.accountId);
        setAccountType(info.accountType);
        setIsVirtual(info.accountType === 'demo');
        
        // Auto-load profit table for current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        derivWebSocket.getProfitTable(
          firstDay.toISOString().split('T')[0],
          lastDay.toISOString().split('T')[0]
        );
        
        // Load open positions
        refreshPositions();
        
        // Fetch HTF analysis before requesting ticks so signal generation starts with trend context.
        console.log('[HTF] Fetching initial HTF analysis before tick subscriptions...');
        await refreshHigherTimeframe();
        // Keep subscriptions aligned with the persisted symbol selection.
        // Discovery is requested after the public socket is definitely open.
        refreshSymbols();

        // Retry HTF analysis after 10 seconds if first attempt failed
        setTimeout(() => {
          console.log('[HTF] Retrying HTF analysis...');
          refreshHigherTimeframe();
        }, 10000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, [refreshHigherTimeframe, refreshSymbols]);

  // Disconnect
  const disconnect = useCallback(() => {
    derivWebSocket.disconnect();
    setActiveLoginId(null);
    setAccountType(null);
    setBalance(null);
    setProfitTable(null);
    setXauusdPrice(0);
    setGbpusdPrice(0);
    setAudusdPrice(0);
    setR100Price(0);
    setXauusdSma(0);
    setGbpusdSma(0);
    setAudusdSma(0);
    setR100Sma(0);
    setXauusdDirection(null);
    setGbpusdDirection(null);
    setAudusdDirection(null);
    setR100Direction(null);
    setSuggestions([]);
    setActivePositions([]);
    xauusdTicksRef.current = [];
    gbpusdTicksRef.current = [];
    audusdTicksRef.current = [];
    r100TicksRef.current = [];
    syntheticTicksRef.current = {};
    syntheticLastSignalTimeRef.current = {};
    syntheticLastDirectionRef.current = {};
    setSyntheticMarkets(SYNTHETIC_SYMBOLS.map((symbol) => ({
      symbol,
      price: 0,
      sma: 0,
      direction: null,
      signalStatus: 'WAITING',
      confidence: 0,
    })));
  }, []);
  
  // Refresh balance
  const refreshBalance = useCallback(() => {
    derivWebSocket.getBalance();
  }, []);
  
  // Refresh profit table
  const refreshProfitTable = useCallback((startDate: string, endDate: string) => {
    derivWebSocket.getProfitTable(startDate, endDate);
  }, []);
  
  // Refresh open positions
  const refreshPositions = useCallback(async () => {
    try {
      const contracts = await derivWebSocket.getOpenPositions();
      const positions: ActivePosition[] = contracts.map((c: any) => ({
        id: `pos-${c.contract_id}`,
        contractId: c.contract_id,
        symbol: c.symbol,
        direction: c.contract_type === 'CALL' ? 'BUY' as TradeDirection : 'SELL' as TradeDirection,
        entryPrice: c.entry_tick_price || 0,
        stopLoss: 0,
        tp1: 0,
        tp2: 0,
        stake: c.buy_price || 0,
        currentPrice: c.current_spot_price || c.entry_tick_price || 0,
        profit: c.profit || 0,
        openTime: new Date(c.date_start * 1000),
        status: 'open',
        payout: c.payout || 0,
      }));
      setActivePositions(positions);
    } catch (err) {
      console.error('[Positions] Failed to refresh:', err);
    }
  }, []);
  
  // Close position
  const closePosition = useCallback(async (position: ActivePosition): Promise<boolean> => {
    try {
      setActivePositions(prev => 
        prev.map(p => p.id === position.id ? { ...p, status: 'closing' } : p)
      );
      
      const result = await derivWebSocket.sellContract(position.contractId);
      
      setActivePositions(prev => prev.filter(p => p.id !== position.id));
      
      // Refresh balance after closing
      refreshBalance();
      
      console.log(`[Position] Closed ${position.symbol} ${position.direction}: P&L $${result.profit?.toFixed(2)}`);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close position';
      console.error(`[Position] Close failed: ${errorMessage}`);
      
      setActivePositions(prev => 
        prev.map(p => p.id === position.id ? { ...p, status: 'open' } : p)
      );
      
      return false;
    }
  }, [refreshBalance]);
  
  // Execute trade (supports paper + real/demo modes)
  const executeTrade = useCallback(async (suggestion: TradeSuggestion): Promise<boolean> => {
    // News filter: block execution during high-impact events
    const newsCheck = isNewsDangerWindow(suggestion.symbol);
    if (newsCheck.blocked) {
      const event = newsCheck.event;
      const msg = event
        ? `A high-impact news event is within the danger window.\n\n${event.title} (${event.currency}) — ${newsCheck.minutesUntil !== undefined ? `${newsCheck.minutesUntil.toFixed(0)} min away` : 'active'}\n\nTrade blocked for safety.`
        : 'A high-impact news event is within the danger window. Trade blocked for safety.';
      console.log(`[Trade] BLOCKED by news: ${suggestion.symbol} — ${event?.title}`);
      Alert.alert('News event active', msg);
      return false;
    }

    try {
      console.log(`[Trade] Executing ${suggestion.direction} for ${suggestion.symbol} at ${suggestion.entryPrice}...`);
      
      // Get proposal - CALL for BUY, PUT for SELL
      const contractType = suggestion.direction === 'BUY' ? 'CALL' : 'PUT';
      console.log(`[Trade] Requesting ${contractType} proposal...`);
      
      const proposal = await derivWebSocket.getProposal(
        suggestion.symbol,
        contractType,
        TRADING_CONFIG.STAKE_AMOUNT,
        5,
        'm'
      );
      console.log(`[Trade] Got proposal: id=${proposal.id}, price=${proposal.price}`);

      // ── Paper trading: simulate without real WS buy ──
      if (paperTradingEnabled) {
        console.log(`[Paper] Simulating ${suggestion.direction} — no real order sent`);

        const paperPositionId = `paper-${Date.now()}`;
        const newPosition: ActivePosition = {
          id: paperPositionId,
          contractId: 0,
          symbol: suggestion.symbol,
          direction: suggestion.direction,
          entryPrice: proposal.price,
          stopLoss: suggestion.stopLoss,
          tp1: suggestion.tp1,
          tp2: suggestion.tp2,
          stake: TRADING_CONFIG.STAKE_AMOUNT,
          currentPrice: proposal.price,
          profit: 0,
          openTime: new Date(),
          status: 'open',
          payout: proposal.payout || 0,
        };
        setActivePositions(prev => [newPosition, ...prev]);

        // Update suggestion
        setSuggestions(prev =>
          prev.map(s =>
            s.id === suggestion.id
              ? { ...s, executed: true, executionResult: `Paper trade opened ${suggestion.direction}` }
              : s
          )
        );

        // Log execution to journal
        await tradeJournal.logExecution(suggestion.id, {
          timestamp_execution: new Date().toISOString(),
          entry_price: proposal.price,
          stake: TRADING_CONFIG.STAKE_AMOUNT,
          payout_percent: proposal.payout,
          latency_ms: Date.now() - suggestion.timestamp.getTime(),
          predicted_outcome: null,
        });

        // Schedule outcome resolution after 5 minutes (300 seconds)
        const expiryMs = 300 * 1000;
        const entryPrice = proposal.price;
        const direction = suggestion.direction;
        const journalId = suggestion.id;
        const payoutPct = proposal.payout || 0;
        const stakeAmount = TRADING_CONFIG.STAKE_AMOUNT;
        const symbol = suggestion.symbol;

        setTimeout(async () => {
          try {
            // Fetch 2 candles: we want the LAST CLOSED candle (index 0),
            // not the currently-forming one (index 1).
            // count=2 with 60s granularity gives us the two most recent 1-min candles.
            let settlementPrice: number | null = null;

            try {
              const candles = await derivWebSocket.getCandles(symbol, 60, 2);
              if (candles.length >= 2) {
                // Use the second-to-last candle — this is the last CLOSED candle
                settlementPrice = candles[candles.length - 2].close;
              } else if (candles.length === 1) {
                // Only 1 candle available — market may have just opened
                // Use its close but log a warning
                settlementPrice = candles[0].close;
                console.warn(`[Paper] Only 1 candle available for ${symbol} — using forming candle close`);
              }
            } catch (candleErr) {
              console.error(`[Paper] getCandles failed for ${symbol}:`, candleErr);
            }

            // If we still have no settlement price, try fetching a live tick as last resort
            if (settlementPrice === null) {
              console.warn(`[Paper] No candle data for ${symbol} — trade marked as unresolved`);
              // Mark as not executed rather than fabricating a result
              await tradeJournal.logOutcome(journalId, 'not_executed', 0);
              setActivePositions(prev => prev.filter(p => p.id !== paperPositionId));
              setSuggestions(prev =>
                prev.map(s =>
                  s.id === journalId
                    ? { ...s, executionResult: 'Resolution failed — no settlement data' }
                    : s
                )
              );
              return;
            }

            // Determine win/loss:
            // CALL/BUY wins if settlement > entry
            // PUT/SELL wins if settlement < entry
            const win = direction === 'BUY'
              ? settlementPrice > entryPrice
              : settlementPrice < entryPrice;

            const profit = win
              ? (stakeAmount * payoutPct / 100) - stakeAmount
              : -stakeAmount;

            const dirLabel = direction === 'BUY' ? 'CALL' : 'PUT';
            console.log(
              `[Paper] Resolved ${journalId}: entry=${entryPrice} exit=${settlementPrice} direction=${dirLabel} result=${win ? 'WIN' : 'LOSS'} pnl=${profit.toFixed(2)}`
            );

            // Update journal with outcome
            await tradeJournal.logOutcome(journalId, win ? 'win' : 'loss', profit);

            // Remove from active positions
            setActivePositions(prev => prev.filter(p => p.id !== paperPositionId));

            // Update suggestion with result
            setSuggestions(prev =>
              prev.map(s =>
                s.id === journalId
                  ? { ...s, executionResult: `${win ? 'WIN' : 'LOSS'} — P&L $${profit.toFixed(2)}` }
                  : s
              )
            );
          } catch (err) {
            console.error(`[Paper] Failed to resolve outcome for ${journalId}:`, err);
            // Log as not_executed rather than silently dropping
            await tradeJournal.logOutcome(journalId, 'not_executed', 0);
            setActivePositions(prev => prev.filter(p => p.id !== paperPositionId));
            setSuggestions(prev =>
              prev.map(s =>
                s.id === journalId
                  ? { ...s, executionResult: 'Resolution error — check console' }
                  : s
              )
            );
          }
        }, expiryMs);

        return true;
      }

      // ── Real / Demo execution ──
      console.log(`[Trade] Sending buy order...`);
      const result = await derivWebSocket.buyContract(proposal.id, proposal.price);
      console.log(`[Trade] Buy successful! Contract ID: ${result.contract_id}`);

      // Update suggestion
      setSuggestions(prev =>
        prev.map(s =>
          s.id === suggestion.id
            ? { ...s, executed: true, executionResult: `Opened ${suggestion.direction} - Contract #${result.contract_id}` }
            : s
        )
      );

      // Log execution to journal
      await tradeJournal.logExecution(suggestion.id, {
        timestamp_execution: new Date().toISOString(),
        entry_price: proposal.price,
        stake: TRADING_CONFIG.STAKE_AMOUNT,
        payout_percent: proposal.payout,
        latency_ms: Date.now() - suggestion.timestamp.getTime(),
        predicted_outcome: null,
      });

      // Add to active positions
      const newPosition: ActivePosition = {
        id: `pos-${result.contract_id}`,
        contractId: result.contract_id,
        symbol: suggestion.symbol,
        direction: suggestion.direction,
        entryPrice: suggestion.entryPrice,
        stopLoss: suggestion.stopLoss,
        tp1: suggestion.tp1,
        tp2: suggestion.tp2,
        stake: TRADING_CONFIG.STAKE_AMOUNT,
        currentPrice: suggestion.entryPrice,
        profit: 0,
        openTime: new Date(),
        status: 'open',
        payout: result.payout || 0,
      };

      setActivePositions(prev => [newPosition, ...prev]);

      // Refresh balance
      refreshBalance();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Trade execution failed';
      console.error(`[Trade] Execution failed: ${errorMessage}`);
      
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestion.id
            ? { ...s, executed: true, executionResult: `Error: ${errorMessage}` }
            : s
        )
      );
      
      return false;
    }
  }, [refreshBalance]);

  // Retry subscribe helper (exposed to UI as "Retry now")
  const retrySubscribe = useCallback((symbol: string) => {
    let lastRetryRef: { current: number };
    if (symbol.includes('XAU')) lastRetryRef = xauusdLastRetryRef;
    else if (symbol.includes('GBP')) lastRetryRef = gbpusdLastRetryRef;
    else if (symbol.includes('AUD')) lastRetryRef = audusdLastRetryRef;
    else lastRetryRef = { current: 0 } as any;

    const now = Date.now();
    if (now - lastRetryRef.current < 60000) {
      console.log('[Market] Retry suppressed: only one retry per minute allowed');
      return;
    }

    lastRetryRef.current = now;
    try {
      derivWebSocket.subscribeTicks(symbol);
    } catch (e) {
      console.log('[Market] Manual retry subscribe failed', e);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const unsubscribeConnection = derivWebSocket.onConnectionChange((status) => {
      setConnectionStatus(status);
    });

    const unsubscribeError = derivWebSocket.onError((errorMessage) => {
      setError(errorMessage);
    });

    const unsubscribeTick = derivWebSocket.onMessage('tick', (message) => {
      const msg: any = message;

      if (msg.error) {
        const err = msg.error as any;
        if (err.code === 'MarketIsClosed') {
          const reopenStr = Array.isArray(err.code_args) && err.code_args[0] ? err.code_args[0] : null;
          const reopenDate = reopenStr ? new Date(reopenStr) : null;
          const symbol = msg.echo_req?.ticks || msg.tick?.symbol || null;

          console.log('[Market] Closed for', symbol, 'reopens at', reopenDate);

          if (symbol && symbol.includes('XAU')) {
            setXauusdClosedUntil(reopenDate);
          } else if (symbol && symbol.includes('GBP')) {
            setGbpusdClosedUntil(reopenDate);
          } else if (symbol && symbol.includes('AUD')) {
            setAudusdClosedUntil(reopenDate);
          }

          const now = Date.now();
          let lastRetryRef: { current: number };
          if (symbol && symbol.includes('XAU')) lastRetryRef = xauusdLastRetryRef;
          else if (symbol && symbol.includes('GBP')) lastRetryRef = gbpusdLastRetryRef;
          else if (symbol && symbol.includes('AUD')) lastRetryRef = audusdLastRetryRef;
          else lastRetryRef = { current: 0 } as any;

          if (reopenDate && !isNaN(reopenDate.getTime())) {
            let scheduledTime = reopenDate.getTime();
            const minAllowed = lastRetryRef.current + 60000;
            if (scheduledTime < minAllowed) scheduledTime = minAllowed;
            const delay = Math.max(scheduledTime - now, 0);

            setTimeout(() => {
              if (Date.now() - lastRetryRef.current < 60000) {
                console.log('[Market] Retry suppressed: last retry < 60s ago');
                return;
              }
              lastRetryRef.current = Date.now();
              try {
                if (symbol) derivWebSocket.subscribeTicks(symbol);
              } catch (e) {
                console.log('[Market] Retry subscribe failed', e);
              }
            }, delay);
          } else {
            console.log('[Market] Could not parse reopen time, will retry in 5 min');
            const desiredTime = now + 5 * 60 * 1000;
            const scheduledTime = Math.max(desiredTime, lastRetryRef.current + 60000);
            const delay = scheduledTime - now;
            setTimeout(() => {
              if (Date.now() - lastRetryRef.current < 60000) {
                console.log('[Market] Retry suppressed: last retry < 60s ago');
                return;
              }
              lastRetryRef.current = Date.now();
              try {
                if (symbol) derivWebSocket.subscribeTicks(symbol);
              } catch (e) {
                console.log('[Market] Retry subscribe failed', e);
              }
            }, delay);
          }
          return;
        }

        console.log('[Tick Error]', err);
        setError(err.message || 'Tick subscription error');
        return;
      }

      const tickResponse = message as TickResponse;
      if (tickResponse.tick) {
        handleTick(
          tickResponse.tick.symbol,
          tickResponse.tick,
          xauusdAnalysisRef.current?.combinedTrend ?? xauusdTrend,
          gbpusdAnalysisRef.current?.combinedTrend ?? gbpusdTrend,
          audusdAnalysisRef.current?.combinedTrend ?? audusdTrend,
          r100Trend,
        );
      }
    });

    const unsubscribeBalance = derivWebSocket.onMessage('balance', (message) => {
      const balanceResponse = message as BalanceResponse;
      if (balanceResponse.balance) {
        setBalance(balanceResponse.balance);
      }
    });
    
    const unsubscribeProfitTable = derivWebSocket.onMessage('profit_table', (message) => {
      const profitTableResponse = message as ProfitTableResponse;
      if (profitTableResponse.profit_table) {
        setProfitTable(profitTableResponse.profit_table);
      }
    });
    
    const unsubscribeErrorResponse = derivWebSocket.onMessage('error', (message) => {
      const errorResponse = message as any;
      if (errorResponse.error) {
        setError(errorResponse.error.message);
      }
    });

    // Handler for active_symbols response
    const unsubscribeActiveSymbols = derivWebSocket.onMessage('active_symbols', (message) => {
      const discovered = parseActiveSymbolsResponse(message);
      if (discovered.length > 0) {
        // Merge with cached + FX defaults
        getCachedDiscovery().then((cached) => {
          const merged = mergeDiscovered(discovered, cached);
          setDiscoveredSymbols(merged);
          cacheDiscovery(merged);
        });
      }
    });
    
    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeTick();
      unsubscribeBalance();
      unsubscribeProfitTable();
      unsubscribeErrorResponse();
      unsubscribeActiveSymbols();
    };
  }, [handleTick, xauusdTrend, gbpusdTrend, audusdTrend, r100Trend]);
  
  // Auto-connect on mount; guard against StrictMode double-invoke cleanup.
  useEffect(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    if (mountedRef.current) return;
    mountedRef.current = true;

    connect().catch(() => {
      // Connection failed, user can retry manually
    });

    // Load news calendar on mount
    fetchEconomicCalendar().catch(() => {});

    // Load active symbols on mount
    getActiveSymbols().then((syms) => {
      setActiveSymbols(syms);
      console.log(`[Symbols] Loaded ${syms.length} active symbols: ${syms.join(', ')}`);
      // Subscribe to all active symbols once connected
      syms.forEach((sym) => {
        try { derivWebSocket.subscribeTicks(sym); } catch (e) { /* will subscribe on connect */ }
      });
    }).catch(() => {});

    // Load cached discovered symbols
    getCachedDiscovery().then((cached) => {
      if (cached.length > 0) {
        setDiscoveredSymbols(mergeDiscovered([], cached));
      }
    }).catch(() => {});

    return () => {
      if (!mountedRef.current) return;
      mountedRef.current = false;
      disconnectTimerRef.current = setTimeout(() => {
        disconnectTimerRef.current = null;
        if (!mountedRef.current) disconnect();
      }, 0);
    };
  }, [connect, disconnect]);
  
  // Periodic position refresh (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && activePositions.length > 0) {
        refreshPositions();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [connectionStatus, activePositions.length, refreshPositions]);
  
  // Periodic higher timeframe analysis (every 90 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected') {
        refreshHigherTimeframe();
      }
    }, 90 * 1000); // Every 90 seconds
    
    return () => clearInterval(interval);
  }, [connectionStatus, refreshHigherTimeframe]);

  // Poll cooldown state every second when disconnected
  useEffect(() => {
    if (connectionStatus === 'connected') return;
    const interval = setInterval(() => {
      const state = derivWebSocket.getConnectionState();
      setInCooldown(state.inCooldown);
      setCooldownRemainingSec(state.cooldownRemainingSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  // Manual retry — resets all reconnect state and tries immediately
  const handleManualRetry = useCallback(() => {
    derivWebSocket.manualRetry();
    setInCooldown(false);
    setCooldownRemainingSec(0);
  }, []);

  // Periodic news danger window check (every 30 seconds)
  useEffect(() => {
    const checkNews = () => {
      const blocked = getBlockedSymbols();
      setBlockedSymbols(blocked);

      // Find the closest upcoming news event for any watched symbol
      const symbols = ['frxXAUUSD', 'frxGBPUSD', 'frxAUDUSD'];
      let closestEvent: NewsEvent | null = null;
      let closestMinutes = Infinity;

      for (const sym of symbols) {
        const result = isNewsDangerWindow(sym);
        if (result.event && result.minutesUntil !== undefined) {
          if (result.minutesUntil < closestMinutes || (result.blocked && (!closestEvent || result.minutesUntil < closestMinutes))) {
            closestEvent = result.event;
            closestMinutes = result.minutesUntil;
          }
        }
      }

      setNextNewsEvent(closestEvent);
      setMinutesUntilNews(closestMinutes < Infinity ? closestMinutes : null);

      // Log state changes
      for (const sym of symbols) {
        const result = isNewsDangerWindow(sym);
        if (result.blocked && result.event) {
          const minText = result.minutesUntil !== undefined
            ? `${result.minutesUntil.toFixed(0)} min away`
            : 'inside window';
          console.log(`[News] ${sym} blocked — ${result.event.title} (${result.event.currency}) ${minText}`);
        }
      }
    };

    checkNews();
    const interval = setInterval(checkNews, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Refresh news calendar every hour
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEconomicCalendar().catch(() => {});
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    // Connection
    connectionStatus,
    activeLoginId,
    isVirtual,
    accountType,
    error,
     
    // Balance
    balance,
     
    // Profit
    profitTable,

    // Trading mode
    isPaperTrading: paperTradingEnabled,
    togglePaperTrading,

    // Cooldown
    inCooldown,
    cooldownRemainingSec,
    manualRetry: handleManualRetry,

    // News filter
    blockedSymbols,
    nextNewsEvent,
    minutesUntilNews,
    refreshNews,

    // Dynamic symbols
    discoveredSymbols,
    activeSymbols,
    toggleSymbol,
    refreshSymbols,
     
    // Market data
    xauusdPrice,
    gbpusdPrice,
    audusdPrice,
    r100Price,
    xauusdSma,
    gbpusdSma,
    audusdSma,
    r100Sma,
    xauusdDirection,
    gbpusdDirection,
    audusdDirection,
    r100Direction,
    xauusdClosedUntil,
    gbpusdClosedUntil,
    audusdClosedUntil,

    // Higher timeframe trend
    xauusdTrend,
    gbpusdTrend,
    audusdTrend,
    r100Trend,
    syntheticMarkets,
     
    // Suggestions
    suggestions,
     
    // Active positions
    activePositions,
     
    // Actions
    connect,
    disconnect,
    refreshBalance,
    refreshProfitTable,
    executeTrade,
    closePosition,
    refreshPositions,
    refreshHigherTimeframe,
    retrySubscribe,
  };
};
