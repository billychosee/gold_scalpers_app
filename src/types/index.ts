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
export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected';

export type MarketContext = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface TradeSuggestion {
  id: string;
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  context: MarketContext;
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