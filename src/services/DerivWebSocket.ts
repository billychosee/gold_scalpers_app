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
  private publicWs: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private authReconnectAttempts = 0;
  private publicReconnectAttempts = 0;
  private authReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private publicReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private isManualDisconnect = false;
  private isRateLimited = false;
  private rateLimitTimer: ReturnType<typeof setTimeout> | null = null;
  // Timestamp of the most recent subscribe attempt; used to avoid rapid reconnect loops
  private lastSubscribeAt: number | null = null;
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

  private connectPublicSocket(): Promise<void> {
    return new Promise((resolve) => {
      if (this.publicWs?.readyState === WebSocket.OPEN) {
        console.log('[Public WS] Reusing existing connection');
        resolve();
        return;
      }

      if (this.publicWs && this.publicWs.readyState === WebSocket.CONNECTING) {
        console.log('[Public WS] Reusing existing connection');
        resolve();
        return;
      }

      const publicUrl = 'wss://api.derivws.com/trading/v1/options/ws/public';
      console.log('[Public WS] Connecting to', publicUrl);
      this.publicWs = new WebSocket(publicUrl);

      this.publicWs.onopen = () => {
        this.publicReconnectAttempts = 0;
        console.log('[Public WS] Connected');
        resolve();
      };

      this.publicWs.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
          console.log('[Public Raw]', raw.substring ? raw.substring(0, 300) : raw);
        } catch (err) {
          console.log('[Public Raw] <unserializable data>');
        }

        try {
          const message = JSON.parse(event.data);
          if ((message as any).error) {
            console.log('[Public Sub Error]', (message as any).error);
          }
          if (message.msg_type === 'tick' || (message as any).tick) {
            console.log('[Public Tick]', JSON.stringify(message).substring(0, 500));
          }
          this.handleMessage(message);
        } catch (error) {
          console.error('[Public WS] Error parsing message:', error);
        }
      };

      this.publicWs.onerror = (event) => {
        console.log('[Public WS] Error', event);
      };

      this.publicWs.onclose = (event) => {
        console.log('[Public WS] Closed', event.code, event.reason, (event as any).wasClean);
        console.trace('[Public WS] Close triggered by:');
        if (this.isManualDisconnect) return;
        if (this.publicReconnectAttempts >= 3) {
          console.log('[Public WS] Giving up after 3 reconnect attempts');
          return;
        }
        if (this.publicReconnectTimer) clearTimeout(this.publicReconnectTimer);
        this.publicReconnectAttempts += 1;
        const delay = Math.min(3000 * this.publicReconnectAttempts, 15000);
        console.log(`[Public WS] Reconnect attempt ${this.publicReconnectAttempts}/3 in ${delay}ms`);
        this.publicReconnectTimer = setTimeout(() => {
          this.connectPublicSocket().catch((err) => {
            console.error('[Public WS] Reconnect failed:', err);
          });
        }, delay);
      };
    });
  }

  // Connect to WebSocket
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Auth WS] Reusing existing connection');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log('[Auth WS] Connection already in progress');
      return;
    }

    if (this.isConnecting) {
      console.log('[Auth WS] Already connecting...');
      return;
    }

    if (this.isRateLimited) {
      console.log('[Auth WS] Rate limited - waiting...');
      return;
    }

    this.isConnecting = true;
    this.isManualDisconnect = false;
    this.notifyConnectionStatus('connecting');

    try {
      const accounts = await this.getAccountsList();
      const account = this.pickAccount(accounts);
      this.accountId = account.account_id;

      const initialBalance: DerivBalance = {
        balance: account.balance,
        currency: account.currency,
        loginid: account.account_id,
      };
      this.notifyBalance(initialBalance);

      const otpUrl = await this.getOtpUrl(account.account_id);
      console.log('[Auth WS] Connecting to', otpUrl);

      this.ws = new WebSocket(otpUrl);

      this.ws.onopen = () => {
        this.authReconnectAttempts = 0;
        this.isConnecting = false;
        console.log('[Auth WS] Connected');
        this.notifyConnectionStatus('connected');

        this.connectPublicSocket().catch((err) => {
          console.error('[Public WS] Failed to open:', err);
        });

        this.getBalance();
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
          console.log('[Auth Raw]', raw.substring ? raw.substring(0, 300) : raw);
        } catch (err) {
          console.log('[Auth Raw] <unserializable data>');
        }

        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if ((message as any).error) {
            console.log('[Auth Sub Error]', (message as any).error);
          }
          if (message.msg_type === 'tick' || (message as any).tick) {
            console.log('[Auth Tick]', JSON.stringify(message).substring(0, 500));
          }
          this.handleMessage(message);
        } catch (error) {
          console.error('[Auth WS] Error parsing message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.log('[Auth WS] Error', event);
        this.isConnecting = false;
        this.notifyConnectionStatus('error');
        this.notifyError('WebSocket connection error');
      };

      this.ws.onclose = (event) => {
        console.log('[Auth WS] Closed', event.code, event.reason, (event as any).wasClean);
        console.trace('[Auth WS] Close triggered by:');
        this.isConnecting = false;
        this.notifyConnectionStatus('disconnected');

        if (this.isManualDisconnect) return;
        if (this.authReconnectAttempts >= 3) {
          console.log('[Auth WS] Giving up after 3 reconnect attempts');
          return;
        }
        if (this.authReconnectTimer) clearTimeout(this.authReconnectTimer);
        this.authReconnectAttempts += 1;
        const delay = Math.min(3000 * this.authReconnectAttempts, 15000);
        console.log(`[Auth WS] Reconnect attempt ${this.authReconnectAttempts}/3 in ${delay}ms`);
        this.authReconnectTimer = setTimeout(() => {
          this.connect().catch((err) => {
            console.error('[Auth WS] Reconnect failed:', err);
          });
        }, delay);
      };
    } catch (error) {
      this.isConnecting = false;
      this.notifyConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Auth WS] Failed:', errorMessage);

      if (errorMessage.includes('429')) {
        console.log('[Auth WS] Rate limited! Waiting 60 seconds before retry...');
        this.isRateLimited = true;
        if (this.rateLimitTimer) clearTimeout(this.rateLimitTimer);
        this.rateLimitTimer = setTimeout(() => {
          console.log('[Auth WS] Rate limit cleared, allowing reconnection');
          this.isRateLimited = false;
          this.authReconnectAttempts = 0;
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
    
    if (this.authReconnectTimer) {
      clearTimeout(this.authReconnectTimer);
      this.authReconnectTimer = null;
    }

    if (this.publicReconnectTimer) {
      clearTimeout(this.publicReconnectTimer);
      this.publicReconnectTimer = null;
    }
    
    if (this.rateLimitTimer) {
      clearTimeout(this.rateLimitTimer);
      this.rateLimitTimer = null;
    }
    
    if (this.publicWs) {
      this.publicWs.close(1000, 'Manual disconnect');
      this.publicWs = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.accountId = null;
    this.notifyConnectionStatus('disconnected');
  }

  // Send message to the authenticated OTP WebSocket
  private sendAuthenticated(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('Authenticated WebSocket is not connected');
    }
  }

  // Send message to the public market-data WebSocket
  private sendPublic(message: object): void {
    if (this.publicWs?.readyState === WebSocket.OPEN) {
      this.publicWs.send(JSON.stringify(message));
    } else {
      throw new Error('Public tick WebSocket is not connected');
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    // Normalize message type: Deriv Options WS uses 'ticks' msg_type but app expects 'tick'
    const originalType = (message as any).msg_type;
    const msg_type = originalType === 'ticks' ? 'tick' : originalType;

    // Log subscription errors and ticks (STEP 4)
    try {
      if ((message as any).error) {
        console.log('[Sub Error]', (message as any).error);
      }
      if (msg_type === 'tick' || (message as any).tick || (message as any).ticks) {
        console.log('[Tick]', JSON.stringify(message).substring(0, 500));
      }
    } catch (err) {
      // Swallow logging errors
    }

    // Notify all handlers for this message type (use normalized type)
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

  // Legacy shared reconnect hook retained but unused; auth/public sockets now reconnect independently.
  private attemptReconnect(): void {
    // no-op; the auth and public socket close handlers own their respective retry loops
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

  // Subscribe to ticks via the dedicated public market-data socket.
  // This must only send when the public socket is already open; do not trigger a nested reconnect loop.
  subscribeTicks(symbol: string): void {
    if (this.publicWs?.readyState !== WebSocket.OPEN) {
      console.log('[Public WS] Skipping subscribe; socket is not open yet:', symbol);
      return;
    }

    console.log(`[Public WS] Subscribing to ticks: ${symbol}`);
    this.lastSubscribeAt = Date.now();
    const reqId = Date.now() % 1000000000;

    this.sendPublic({
      ticks: symbol,
      subscribe: 1,
      req_id: reqId,
    });
  }

  // Unsubscribe from ticks
  unsubscribeTicks(symbol: string): void {
    if (this.publicWs?.readyState === WebSocket.OPEN) {
      this.sendPublic({
        forget: symbol,
      });
    }
  }

  // Get balance
  getBalance(): void {
    this.sendAuthenticated({
      balance: 1,
      subscribe: 1,
    });
  }

  // Get profit table
  getProfitTable(startDate: string, endDate: string): void {
    this.sendAuthenticated({
      profit_table: 1,
      date_from: startDate,
      date_to: endDate,
    });
  }

  // Get proposal for trade - uses unique integer req_id (required by Deriv API schema)
  getProposal(
    symbol: string,
    contractType: string,
    stake: number,
    duration: number,
    durationUnit: string = 'm'
  ): Promise<DerivProposal> {
    return new Promise((resolve, reject) => {
      const reqId = Date.now() % 1000000000; // Integer required by API
      
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Get proposal timeout'));
      }, 10000);

      const unsubscribe = this.onMessage('proposal', (message) => {
        const response = message as any;
        // Match by req_id (both are integers)
        if (response.req_id !== undefined && response.req_id !== reqId) return;
        
        clearTimeout(timeout);
        unsubscribe();
        
        console.log(`[Proposal] Response:`, JSON.stringify(response).substring(0, 500));
        
        if (response.proposal) {
          resolve(response.proposal);
        } else if (response.error) {
          console.error(`[Proposal] Error:`, response.error);
          reject(new Error(response.error.message));
        } else {
          reject(new Error('Failed to get proposal'));
        }
      });

      this.sendAuthenticated({
        proposal: 1,
        amount: stake,
        basis: 'stake',
        contract_type: contractType,
        currency: 'USD',
        duration: duration,
        duration_unit: durationUnit,
        symbol: symbol,
        req_id: reqId,
      });
    });
  }

  // Get historical candles for multi-timeframe analysis
  // granularity and req_id MUST be integers per Deriv API schema
  // Valid granularities: 60,120,180,300,600,900,1800,3600,7200,14400,28800,86400
  getCandles(
    symbol: string,
    granularity: number,  // H4=14400, D1=86400
    count: number
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reqId = Date.now() % 1000000000; // Integer req_id required by API
      
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Get candles timeout for ${symbol} granularity=${granularity}`));
      }, 30000);

      const unsubscribe = this.onMessage('candles', (message) => {
        const response = message as any;
        // Match by req_id (both are integers)
        if (response.req_id !== undefined && response.req_id !== reqId) return;
        
        clearTimeout(timeout);
        unsubscribe();
        
        if (response.candles) {
          console.log(`[Candles] Got ${response.candles.length} candles for ${symbol} g=${granularity}`);
          resolve(response.candles);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve([]);
        }
      });

      console.log(`[Candles] Requesting ${symbol} granularity=${granularity} count=${count} req_id=${reqId}`);
      
      this.sendAuthenticated({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: count,
        end: 'latest',
        granularity: granularity,
        style: 'candles',
        req_id: reqId,
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

      this.sendAuthenticated({
        buy: proposalId,
        price: price,
      });
    });
  }

  // Sell (close) a contract
  sellContract(contractId: number): Promise<{ sell_price: number; profit: number }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sell contract timeout'));
      }, 10000);

      const unsubscribe = this.onMessage('sell', (message) => {
        clearTimeout(timeout);
        unsubscribe();
        
        const response = message as any;
        if (response.sell) {
          resolve(response.sell);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          reject(new Error('Failed to sell contract'));
        }
      });

      this.sendAuthenticated({
        sell: contractId,
      });
    });
  }

  // Get open positions (active contracts)
  getOpenPositions(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Get open positions timeout'));
      }, 10000);

      const unsubscribe = this.onMessage('portfolio', (message) => {
        clearTimeout(timeout);
        unsubscribe();
        
        const response = message as any;
        if (response.portfolio) {
          resolve(response.portfolio.contracts || []);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve([]);
        }
      });

      this.sendAuthenticated({
        portfolio: 1,
      });
    });
  }

  // Get contract proposal for selling (to get current price)
  getContractInfo(contractId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Get contract info timeout'));
      }, 10000);

      const unsubscribe = this.onMessage('proposal_open_contract', (message) => {
        clearTimeout(timeout);
        unsubscribe();
        
        const response = message as any;
        if (response.proposal_open_contract) {
          resolve(response.proposal_open_contract);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          reject(new Error('Failed to get contract info'));
        }
      });

      this.sendAuthenticated({
        proposal_open_contract: 1,
        contract_id: contractId,
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
