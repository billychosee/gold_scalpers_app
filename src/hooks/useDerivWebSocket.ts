import { useState, useEffect, useCallback, useRef } from 'react';
import { derivWebSocket } from '../services/DerivWebSocket';
import {
  ConnectionStatus,
  DerivBalance,
  DerivAccount,
  DerivProfitTable,
  TickResponse,
  BalanceResponse,
  ProfitTableResponse,
  AuthorizeResponse,
  MarketContext,
  TradeSuggestion,
  DerivTick,
} from '../types';
import { TRADING_CONFIG, SYMBOLS } from '../constants/theme';

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
  
  // Market data
  xauusdPrice: number;
  gbpusdPrice: number;
  xauusdSma: number;
  gbpusdSma: number;
  xauusdContext: MarketContext;
  gbpusdContext: MarketContext;
  
  // Suggestions
  suggestions: TradeSuggestion[];
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => void;
  refreshProfitTable: (startDate: string, endDate: string) => void;
  executeTrade: (suggestion: TradeSuggestion) => Promise<boolean>;
}

export const useDerivWebSocket = (): UseDerivWebSocketReturn => {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeLoginId, setActiveLoginId] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState<boolean>(true);
  const [accountType, setAccountType] = useState<'demo' | 'real' | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Balance state
  const [balance, setBalance] = useState<DerivBalance | null>(null);
  
  // Profit state
  const [profitTable, setProfitTable] = useState<DerivProfitTable | null>(null);
  
  // Market data state
  const [xauusdPrice, setXauusdPrice] = useState<number>(0);
  const [gbpusdPrice, setGbpusdPrice] = useState<number>(0);
  const [xauusdSma, setXauusdSma] = useState<number>(0);
  const [gbpusdSma, setGbpusdSma] = useState<number>(0);
  const [xauusdContext, setXauusdContext] = useState<MarketContext>('NEUTRAL');
  const [gbpusdContext, setGbpusdContext] = useState<MarketContext>('NEUTRAL');
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<TradeSuggestion[]>([]);
  
  // Refs for storing tick history
  const xauusdTicksRef = useRef<DerivTick[]>([]);
  const gbpusdTicksRef = useRef<DerivTick[]>([]);
  
  // Refs for tracking previous context (to debounce suggestions)
  const prevXauusdContextRef = useRef<MarketContext>('NEUTRAL');
  const prevGbpusdContextRef = useRef<MarketContext>('NEUTRAL');
  
  // Calculate SMA from ticks
  const calculateSma = useCallback((ticks: DerivTick[], period: number): number => {
    if (ticks.length < period) {
      return 0;
    }
    
    const recentTicks = ticks.slice(-period);
    const sum = recentTicks.reduce((acc, tick) => acc + tick.quote, 0);
    return sum / period;
  }, []);
  
  // Determine market context
  const determineContext = useCallback((price: number, sma: number): MarketContext => {
    if (price === 0 || sma === 0) return 'NEUTRAL';
    
    // Use a small threshold to avoid noise
    const threshold = sma * 0.0001; // 0.01% threshold (very sensitive)
    const diff = price - sma;
    const diffPercent = (diff / sma) * 100;
    
    console.log(`[Context] price=${price}, sma=${sma}, diff=${diff.toFixed(4)}, diff%=${diffPercent.toFixed(4)}%, threshold=${threshold.toFixed(4)}`);
    
    if (price > sma + threshold) {
      return 'LONG';
    } else if (price < sma - threshold) {
      return 'SHORT';
    }
    return 'NEUTRAL';
  }, []);
  
  // Generate trade suggestion (works for both LONG and SHORT contexts)
  const generateSuggestion = useCallback((
    symbol: string,
    price: number,
    context: MarketContext
  ): TradeSuggestion | null => {
    // Generate suggestions for both LONG and SHORT
    if (context !== 'LONG' && context !== 'SHORT') return null;
    
    // Calculate pip value based on symbol (Deriv uses frxXAUUSD, frxGBPUSD)
    const isGold = symbol.includes('XAUUSD');
    const pipValue = isGold ? 0.01 : 0.0001; // Gold has 2 decimal places, forex has 4
    
    console.log(`[Signal] Generating ${context} suggestion for ${symbol} at ${price}`);
    
    const entryPrice = price;
    
    // For LONG context: suggest SHORT (counter-trend)
    // For SHORT context: suggest LONG (counter-trend)
    const suggestedContext: 'LONG' | 'SHORT' = context === 'LONG' ? 'SHORT' : 'LONG';
    const slDirection = context === 'LONG' ? 1 : -1; // +1 for LONG, -1 for SHORT
    
    const stopLoss = entryPrice + (slDirection * TRADING_CONFIG.STOP_LOSS_PIPS * pipValue);
    const tp1 = entryPrice - (slDirection * TRADING_CONFIG.TP1_PIPS * pipValue);
    const tp2 = entryPrice - (slDirection * TRADING_CONFIG.TP2_PIPS * pipValue);
    
    return {
      id: `${symbol}-${Date.now()}`,
      symbol,
      entryPrice,
      stopLoss,
      tp1,
      tp2,
      context: suggestedContext,
      timestamp: new Date(),
      executed: false,
    };
  }, []);
  
  // Add suggestion to list
  const addSuggestion = useCallback((suggestion: TradeSuggestion) => {
    setSuggestions(prev => {
      const newSuggestions = [suggestion, ...prev];
      // Keep only the last N suggestions
      return newSuggestions.slice(0, TRADING_CONFIG.MAX_SUGGESTIONS);
    });
  }, []);
  
  // Handle tick updates
  const handleTick = useCallback((symbol: string, tick: DerivTick) => {
    // Deriv uses frxXAUUSD, frxGBPUSD format
    const isXauusd = symbol === SYMBOLS.XAUUSD || symbol === 'frxXAUUSD';
    const isGbpusd = symbol === SYMBOLS.GBPUSD || symbol === 'frxGBPUSD';
    
    if (!isXauusd && !isGbpusd) return;
    
    // Update price
    if (isXauusd) {
      setXauusdPrice(tick.quote);
      
      // Add to tick history
      xauusdTicksRef.current = [...xauusdTicksRef.current, tick].slice(-100); // Keep last 100 ticks
      
      // Calculate SMA
      const sma = calculateSma(xauusdTicksRef.current, TRADING_CONFIG.SMA_PERIOD);
      setXauusdSma(sma);
      
      // Determine context
      const context = determineContext(tick.quote, sma);
      setXauusdContext(context);
      
      // Debug: Log signal detection every 10 ticks
      if (xauusdTicksRef.current.length % 10 === 0) {
        console.log(`[Signal] XAUUSD: price=${tick.quote}, sma=${sma.toFixed(2)}, context=${context}, ticks=${xauusdTicksRef.current.length}`);
      }
      
      // Generate suggestion when context CHANGES (not on every tick)
      const prevContext = prevXauusdContextRef.current;
      if ((context === 'LONG' || context === 'SHORT') && context !== prevContext) {
        console.log(`[Signal] XAUUSD context changed to ${context}! Generating suggestion...`);
        const suggestion = generateSuggestion(SYMBOLS.XAUUSD, tick.quote, context);
        if (suggestion) {
          addSuggestion(suggestion);
        }
      }
      prevXauusdContextRef.current = context;
    } else {
      setGbpusdPrice(tick.quote);
      
      // Add to tick history
      gbpusdTicksRef.current = [...gbpusdTicksRef.current, tick].slice(-100); // Keep last 100 ticks
      
      // Calculate SMA
      const sma = calculateSma(gbpusdTicksRef.current, TRADING_CONFIG.SMA_PERIOD);
      setGbpusdSma(sma);
      
      // Determine context
      const context = determineContext(tick.quote, sma);
      setGbpusdContext(context);
      
      // Debug: Log signal detection every 10 ticks
      if (gbpusdTicksRef.current.length % 10 === 0) {
        console.log(`[Signal] GBPUSD: price=${tick.quote}, sma=${sma.toFixed(2)}, context=${context}, ticks=${gbpusdTicksRef.current.length}`);
      }
      
      // Only generate suggestion when context CHANGES to LONG (not on every tick)
      const prevContext = prevGbpusdContextRef.current;
      if (context === 'LONG' && prevContext !== 'LONG') {
        console.log(`[Signal] GBPUSD context changed to LONG! Generating suggestion...`);
        const suggestion = generateSuggestion(SYMBOLS.GBPUSD, tick.quote, context);
        if (suggestion) {
          addSuggestion(suggestion);
        }
      }
      prevGbpusdContextRef.current = context;
    }
  }, [calculateSma, determineContext, generateSuggestion, addSuggestion]);
  
  // Connect and authorize
  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Connect to WebSocket (subscriptions happen inside connect())
      await derivWebSocket.connect();
      
      // Get account info from service
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
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  // Disconnect
  const disconnect = useCallback(() => {
    derivWebSocket.disconnect();
    setActiveLoginId(null);
    setAccountType(null);
    setBalance(null);
    setProfitTable(null);
    setXauusdPrice(0);
    setGbpusdPrice(0);
    setXauusdSma(0);
    setGbpusdSma(0);
    setXauusdContext('NEUTRAL');
    setGbpusdContext('NEUTRAL');
    setSuggestions([]);
    xauusdTicksRef.current = [];
    gbpusdTicksRef.current = [];
  }, []);
  
  // Refresh balance
  const refreshBalance = useCallback(() => {
    derivWebSocket.getBalance();
  }, []);
  
  // Refresh profit table
  const refreshProfitTable = useCallback((startDate: string, endDate: string) => {
    derivWebSocket.getProfitTable(startDate, endDate);
  }, []);
  
  // Execute trade
  const executeTrade = useCallback(async (suggestion: TradeSuggestion): Promise<boolean> => {
    try {
      console.log(`[Trade] Executing ${suggestion.context} trade for ${suggestion.symbol}...`);
      console.log(`[Trade] Entry: ${suggestion.entryPrice}, SL: ${suggestion.stopLoss}, TP1: ${suggestion.tp1}`);
      
      // Get proposal for the trade
      console.log(`[Trade] Requesting proposal...`);
      const proposal = await derivWebSocket.getProposal(
        suggestion.symbol,
        suggestion.context === 'SHORT' ? 'PUT' : 'CALL', // Match suggestion context
        TRADING_CONFIG.STAKE_AMOUNT,
        5, // 5 minutes duration
        'm'
      );
      console.log(`[Trade] Got proposal: id=${proposal.id}, price=${proposal.price}`);
      
      // Execute buy
      console.log(`[Trade] Sending buy order...`);
      const result = await derivWebSocket.buyContract(proposal.id, proposal.price);
      console.log(`[Trade] Buy successful! Contract ID: ${result.contract_id}`);
      
      // Update suggestion with execution result
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestion.id
            ? { ...s, executed: true, executionResult: `Trade executed successfully. Contract ID: ${result.contract_id}` }
            : s
        )
      );
      
      // Refresh balance after trade
      refreshBalance();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Trade execution failed';
      console.error(`[Trade] Execution failed: ${errorMessage}`);
      
      // Update suggestion with error
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
  
  // Set up event listeners
  useEffect(() => {
    // Connection status handler
    const unsubscribeConnection = derivWebSocket.onConnectionChange((status) => {
      setConnectionStatus(status);
    });
    
    // Error handler
    const unsubscribeError = derivWebSocket.onError((errorMessage) => {
      setError(errorMessage);
    });
    
    // Tick handler
    const unsubscribeXauusdTick = derivWebSocket.onMessage('tick', (message) => {
      const tickResponse = message as TickResponse;
      if (tickResponse.tick) {
        handleTick(tickResponse.tick.symbol, tickResponse.tick);
      }
    });
    
    // Balance handler
    const unsubscribeBalance = derivWebSocket.onMessage('balance', (message) => {
      const balanceResponse = message as BalanceResponse;
      if (balanceResponse.balance) {
        setBalance(balanceResponse.balance);
      }
    });
    
    // Profit table handler
    const unsubscribeProfitTable = derivWebSocket.onMessage('profit_table', (message) => {
      const profitTableResponse = message as ProfitTableResponse;
      if (profitTableResponse.profit_table) {
        setProfitTable(profitTableResponse.profit_table);
      }
    });
    
    // Error response handler
    const unsubscribeErrorResponse = derivWebSocket.onMessage('error', (message) => {
      const errorResponse = message as any;
      if (errorResponse.error) {
        setError(errorResponse.error.message);
      }
    });
    
    // Cleanup
    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeXauusdTick();
      unsubscribeBalance();
      unsubscribeProfitTable();
      unsubscribeErrorResponse();
    };
  }, [handleTick]);
  
  // Auto-connect on mount
  useEffect(() => {
    // Try to connect automatically
    connect().catch(() => {
      // Connection failed, user can retry manually
    });
    
    // Demo mode: generate a test suggestion every 30 seconds for testing
    const demoInterval = setInterval(() => {
      if (suggestions.length < 3 && connectionStatus === 'connected') {
        const symbols = ['frxXAUUSD', 'frxGBPUSD'];
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        const currentPrice = randomSymbol === 'frxXAUUSD' ? xauusdPrice : gbpusdPrice;
        
        if (currentPrice > 0) {
          console.log(`[Demo] Generating test suggestion for ${randomSymbol} at ${currentPrice}`);
          const suggestion = generateSuggestion(randomSymbol, currentPrice, 'LONG');
          if (suggestion) {
            addSuggestion(suggestion);
          }
        }
      }
    }, 30000);
    
    // Cleanup on unmount
    return () => {
      disconnect();
      clearInterval(demoInterval);
    };
  }, [connect, disconnect, suggestions.length, connectionStatus, xauusdPrice, gbpusdPrice, generateSuggestion, addSuggestion]);
  
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
    
    // Market data
    xauusdPrice,
    gbpusdPrice,
    xauusdSma,
    gbpusdSma,
    xauusdContext,
    gbpusdContext,
    
    // Suggestions
    suggestions,
    
    // Actions
    connect,
    disconnect,
    refreshBalance,
    refreshProfitTable,
    executeTrade,
  };
};