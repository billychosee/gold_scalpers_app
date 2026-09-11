import { DERIV_CONFIG, TRADING_CONFIG, SYMBOLS } from '../constants/theme';
import {
  WebSocketMessage,
  AuthorizeResponse,
  TickResponse,
  BalanceResponse,
  ProfitTableResponse,
  ProposalResponse,
  BuyResponse,
  ErrorResponse,
  DerivTick,
  DerivBalance,
  DerivAccount,
  DerivProposal,
  DerivBuyResult,
  DerivProfitTable,
  ConnectionStatus,
} from '../types';

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (status: ConnectionStatus) => void;
type ErrorHandler = (error: string) => void;

// Types for the new Options API
interface OptionsAccount {
  account_id: string;
  account_type: 'demo' | 'real'; // Official schema uses "demo" | "real"
  balance: number;
  currency: string;
  group?: string;
  status?: 'active' | 'inactive';
}

interface OptionsApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

class DerivWebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private isManualDisconnect = false;
  private isRateLimited = false;
  private rateLimitTimer: ReturnType<typeof setTimeout> | null = null;
  private tokenId: string = DERIV_CONFIG.API_TOKEN;
  private appId: string = DERIV_CONFIG.APP_ID;
  private accountId: string | null = null;
  private accountType: 'demo' | 'real' | null = null;
  private wsUrl: string = DERIV_CONFIG.WS_URL;

  constructor() {
    this.tokenId = DERIV_CONFIG.API_TOKEN;
    this.appId = DERIV_CONFIG.APP_ID;
  }

  // STEP 1: Get accounts list from Options API
  private async getAccountsList(): Promise<OptionsAccount[]> {
    console.log('[Step 1] Fetching accounts list...');
    
    const response = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      method: 'GET',
      headers: {
        'Deriv-App-ID': this.appId,
        'Authorization': `Bearer ${this.tokenId}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Accounts API failed: ${response.status} ${response.statusText}`);
    }

    const result: OptionsApiResponse<OptionsAccount[]> = await response.json();
    
    if (result.error) {
      throw new Error(`Accounts API error: ${result.error.message}`);
    }

    console.log(`[Step 1] Found ${result.data.length} account(s)`);
    result.data.forEach(acc => {
      const maskedId = acc.account_id?.substring(0, 3) + '***' + acc.account_id?.slice(-3);
      console.log(`  - ${maskedId}: account_type=${acc.account_type || 'MISSING'}, balance=${acc.balance} ${acc.currency}, status=${acc.status}`);
    });

    return result.data;
  }

  // STEP 2: Pick the demo account using OFFICIAL account_type field
  // NEVER use ID prefix detection - it's undocumented and unsafe
  private pickAccount(accounts: OptionsAccount[]): OptionsAccount {
    console.log('[Safety] Raw accounts response:');
    accounts.forEach(acc => {
      console.log(JSON.stringify({
        id_prefix: acc.account_id?.substring(0, 3) + '***',
        account_type: acc.account_type,
        balance: acc.balance,
        currency: acc.currency,
        status: acc.status,
      }));
    });
    
    // Validate all accounts have account_type
    accounts.forEach(acc => {
      if (!acc.account_type) {
        console.error(`[Safety] ERROR: account_type missing for account ${acc.account_id?.substring(0, 3)}***`);
        throw new Error(`[Safety] account_type missing for account ${acc.account_id?.substring(0, 3)}***. Cannot safely determine account type. Refusing to connect.`);
      }
    });
    
    console.log('[Step 2] Selecting demo account (using account_type field)...');
    
    // Use official account_type field ONLY
    const demoAccount = accounts.find(acc => acc.account_type === 'demo');
    
    if (!demoAccount) {
      if (!DERIV_CONFIG.ALLOW_REAL) {
        throw new Error('No demo account found (account_type === "demo"). EXPO_PUBLIC_ALLOW_REAL is not set to true. Refusing to connect.');
      }
      
      // Fall back to real account only if explicitly allowed
      const realAccount = accounts.find(acc => acc.account_type === 'real');
      if (!realAccount) {
        throw new Error('No accounts found');
      }
      
      console.log(`[Step 2] Using REAL account: ${realAccount.account_id?.substring(0, 3)}*** (account_type: ${realAccount.account_type})`);
      this.accountType = 'real';
      return realAccount;
    }
    
    console.log(`[Step 2] Using DEMO account: ${demoAccount.account_id?.substring(0, 3)}*** (account_type: ${demoAccount.account_type})`);
    this.accountType = 'demo';
    return demoAccount;
  }

  // STEP 3: Get OTP WebSocket URL
  private async getOtpUrl(accountId: string): Promise<string> {
    console.log(`[Step 3] Getting OTP for account ${accountId}...`);
    
    const response = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
      method: 'POST',
      headers: {
        'Deriv-App-ID': this.appId,
        'Authorization': `Bearer ${this.tokenId}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OTP API failed: ${response.status} ${response.statusText}`);
    }

    const result: OptionsApiResponse<{ url: string }> = await response.json();
    
    if (result.error) {
      throw new Error(`OTP API error: ${result.error.message}`);
    }

    console.log(`[Step 3] Got OTP URL (expires in 120s)`);
    this.wsUrl = result.data.url;
    return result.data.url;
  }

  // Connect to WebSocket
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Connect] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[Connect] Already connecting...');
      return;
    }

    // Don't try to connect if rate limited
    if (this.isRateLimited) {
      console.log('[Connect] Rate limited - waiting...');
      return;
    }

    // Reset state before connecting
    this.isConnecting = true;
    this.isManualDisconnect = false;
    this.notifyConnectionStatus('connecting');

    try {
      // STEP 1-3: Get accounts and OTP URL
      const accounts = await this.getAccountsList();
      const account = this.pickAccount(accounts);
      this.accountId = account.account_id;
      
      // Set initial balance from account info
      const initialBalance: DerivBalance = {
        balance: account.balance,
        currency: account.currency,
        loginid: account.account_id,
      };
      this.notifyBalance(initialBalance);
      
      // Get OTP URL (STEP 3)
      const otpUrl = await this.getOtpUrl(account.account_id);

      // STEP 4: Connect to the returned URL
      console.log('[Step 4] Connecting to WebSocket...');
      
      this.ws = new WebSocket(otpUrl);

      this.ws.onopen = () => {
        console.log('[Step 4] WebSocket connected!');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus('connected');
        
        // Subscribe to market data immediately after connection
        console.log('[Step 5] Subscribing to market data...');
        this.subscribeTicks(SYMBOLS.XAUUSD);
        this.subscribeTicks(SYMBOLS.GBPUSD);
        this.getBalance();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[Step 5] Error parsing message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        this.isConnecting = false;
        this.notifyConnectionStatus('error');
        this.notifyError('WebSocket connection error');
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket] Closed: code=${event.code} reason=${event.reason}`);
        this.isConnecting = false;
        this.notifyConnectionStatus('disconnected');
        
        // Auto reconnect if not manually closed
        if (!this.isManualDisconnect) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      this.isConnecting = false;
      this.notifyConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Connect] Failed:', errorMessage);
      
      // Check if rate limited (429)
      if (errorMessage.includes('429')) {
        console.log('[Connect] Rate limited! Waiting 60 seconds before retry...');
        this.isRateLimited = true;
        
        // Clear any existing rate limit timer
        if (this.rateLimitTimer) {
          clearTimeout(this.rateLimitTimer);
        }
        
        // Wait 60 seconds before allowing reconnection
        this.rateLimitTimer = setTimeout(() => {
          console.log('[Connect] Rate limit cleared, allowing reconnection');
          this.isRateLimited = false;
          this.reconnectAttempts = 0;
        }, 60000);
      }
      
      this.notifyError(errorMessage);
      throw error;
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    console.log('[Disconnect] Manual disconnect');
    this.isManualDisconnect = true;
    this.isConnecting = false;
    this.isRateLimited = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.rateLimitTimer) {
      clearTimeout(this.rateLimitTimer);
      this.rateLimitTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.accountId = null;
    this.notifyConnectionStatus('disconnected');
  }

  // Send message to WebSocket
  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    const { msg_type } = message;
    
    // Notify all handlers for this message type
    const handlers = this.messageHandlers.get(msg_type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(message));
    }
  }

  // Notify balance update (called from connect flow)
  private notifyBalance(balance: DerivBalance): void {
    const message = { msg_type: 'balance', balance } as BalanceResponse;
    this.handleMessage(message);
  }

  // Attempt to reconnect with exponential backoff (STEP 6)
  private attemptReconnect(): void {
    // Don't reconnect if rate limited
    if (this.isRateLimited) {
      console.log('[Reconnect] Rate limited - skipping reconnect');
      return;
    }

    if (this.reconnectAttempts >= TRADING_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.log('[Reconnect] Max attempts reached');
      this.notifyError('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: 5s, 10s, 20s, 30s, 30s (capped at 30s)
    // Start higher to avoid rate limiting (429)
    const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[Reconnect] Attempt ${this.reconnectAttempts}/${TRADING_CONFIG.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      console.log('[Reconnect] Re-running Steps 1-4...');
      this.connect().catch((err) => {
        console.error('[Reconnect] Failed:', err);
        // Will retry via onclose handler
      });
    }, delay);
  }

  // Register message handler
  onMessage(msgType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(msgType)) {
      this.messageHandlers.set(msgType, []);
    }
    this.messageHandlers.get(msgType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(msgType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // Register connection status handler
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  // Register error handler
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  // Notify connection status change
  private notifyConnectionStatus(status: ConnectionStatus): void {
    this.connectionHandlers.forEach(handler => handler(status));
  }

  // Notify error
  private notifyError(error: string): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  // Subscribe to ticks (STEP 5)
  subscribeTicks(symbol: string): void {
    console.log(`[Step 5] Subscribing to ticks: ${symbol}`);
    this.send({
      ticks: symbol,
      subscribe: 1,
    });
  }

  // Unsubscribe from ticks
  unsubscribeTicks(symbol: string): void {
    this.send({
      forget: symbol,
    });
  }

  // Get balance
  getBalance(): void {
    this.send({
      balance: 1,
      subscribe: 1,
    });
  }

  // Get profit table
  getProfitTable(startDate: string, endDate: string): void {
    this.send({
      profit_table: 1,
      date_from: startDate,
      date_to: endDate,
    });
  }

  // Get proposal for trade
  getProposal(
    symbol: string,
    contractType: string,
    stake: number,
    duration: number,
    durationUnit: string = 'm'
  ): Promise<DerivProposal> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Get proposal timeout'));
      }, 10000);

      const unsubscribe = this.onMessage('proposal', (message) => {
        clearTimeout(timeout);
        unsubscribe();
        
        const response = message as ProposalResponse;
        if (response.proposal) {
          resolve(response.proposal);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          reject(new Error('Failed to get proposal'));
        }
      });

      this.send({
        proposal: 1,
        amount: stake,
        basis: 'stake',
        contract_type: contractType,
        currency: 'USD',
        duration: duration,
        duration_unit: durationUnit,
        symbol: symbol,
      });
    });
  }

  // Buy contract
  buyContract(proposalId: string, price: number): Promise<DerivBuyResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Buy contract timeout'));
      }, 10000);

      const unsubscribe = this.onMessage('buy', (message) => {
        clearTimeout(timeout);
        unsubscribe();
        
        const response = message as BuyResponse;
        if (response.buy) {
          resolve(response.buy);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          reject(new Error('Failed to buy contract'));
        }
      });

      this.send({
        buy: proposalId,
        price: price,
      });
    });
  }

  // Get connection status
  getConnectionStatus(): ConnectionStatus {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get account info (for UI banner)
  getAccountInfo(): { accountId: string; accountType: 'demo' | 'real' } | null {
    if (!this.accountId || !this.accountType) return null;
    return {
      accountId: this.accountId,
      accountType: this.accountType,
    };
  }
}

// Singleton instance
export const derivWebSocket = new DerivWebSocketService();
export default derivWebSocket;
