// Deriv API Types
export interface DerivTick {
  symbol: string;
  quote: number;
  epoch: number;
}

export interface DerivBalance {
  balance: number;
  currency: string;
  loginid: string;
}

export interface DerivAccount {
  loginid: string;
  is_virtual: boolean;
  currency: string;
  balance: number;
}

export interface DerivProposal {
  id: string;
  symbol: string;
  contract_type: string;
  payout: number;
  price: number;
}

export interface DerivBuyResult {
  contract_id: number;
  balance_after: number;
  buy_price: number;
  payout: number;
}

export interface DerivProfitTable {
  transactions: DerivTransaction[];
  total_profit: number;
}

export interface DerivTransaction {
  transaction_id: number;
  contract_id: number;
  open_time: string;
  close_time: string;
  symbol: string;
  contract_type: string;
  buy_price: number;
  sell_price: number;
  profit: number;
}

// App Types
export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected' | 'cooldown';

export type MarketContext = 'LONG' | 'SHORT' | 'NEUTRAL';

export type TradeDirection = 'BUY' | 'SELL';

export interface ActivePosition {
  id: string;
  contractId: number;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  stake: number;
  currentPrice: number;
  profit: number;
  openTime: Date;
  status: 'open' | 'closing' | 'closed';
  payout: number;
}

export interface TradeSuggestion {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  /** Relative signal-strength score; not a calibrated win probability. */
  confidence: number;
  analysis: string;
  timestamp: Date;
  executed: boolean;
  executionResult?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  sma: number;
  context: MarketContext;
  ticks: DerivTick[];
  lastUpdate: Date;
}

export interface AppState {
  connectionStatus: ConnectionStatus;
  activeLoginId: string | null;
  isVirtual: boolean;
  balance: DerivBalance | null;
  marketData: {
    XAUUSD: MarketData;
    GBPUSD: MarketData;
  };
  suggestions: TradeSuggestion[];
  activePositions: ActivePosition[];
  profitTable: DerivProfitTable | null;
  error: string | null;
}

// WebSocket Message Types
export interface WebSocketMessage {
  msg_type: string;
  [key: string]: any;
}

export interface AuthorizeResponse {
  msg_type: 'authorize';
  authorize: {
    loginid: string;
    is_virtual: boolean;
    currency: string;
    balance: number;
  };
}

export interface TickResponse {
  msg_type: 'tick';
  tick: DerivTick;
}

export interface BalanceResponse {
  msg_type: 'balance';
  balance: DerivBalance;
}

export interface ProfitTableResponse {
  msg_type: 'profit_table';
  profit_table: DerivProfitTable;
}

export interface ProposalResponse {
  msg_type: 'proposal';
  proposal?: DerivProposal;
  error?: {
    code: string;
    message: string;
  };
}

export interface BuyResponse {
  msg_type: 'buy';
  buy?: DerivBuyResult;
  error?: {
    code: string;
    message: string;
  };
}

export interface ErrorResponse {
  msg_type: 'error';
  error: {
    code: string;
    message: string;
  };
}

// ── Trade Journal ──────────────────────────────────────────────────
export interface JournalEntry {
  id: string;
  timestamp_signal: string;          // ISO 8601
  timestamp_execution: string | null; // ISO 8601, null until executed
  symbol: string;
  direction: 'CALL' | 'PUT' | 'BUY' | 'SELL';
  signal_reason: string;             // which conditions fired
  confidence_score: number;
  htf_trend: string;                 // "H4:BUY D1:BUY" or "H4:NEUTRAL D1:SELL"
  ltf_context: string;               // "M5:BUY at 2345.67"
  entry_price: number;
  stake: number;
  payout_percent: number | null;
  expiry_seconds: number;
  predicted_outcome: string | null;  // null until resolved
  actual_outcome: 'win' | 'loss' | 'not_executed' | null;
  profit: number;                    // signed
  latency_ms: number;                // signal → execution
  market_closed_at_entry: boolean;
  paper_trade: boolean;
}