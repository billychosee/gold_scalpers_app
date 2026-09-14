// Deriv-inspired professional trading theme
export const COLORS = {
  // Primary colors - Deriv red/coral
  primary: '#FF444F', // Deriv red
  primaryDark: '#E53935',
  secondary: '#00D4FF',
  
  // Background colors - Clean dark theme
  background: '#1A1A2E', // Deep navy background
  surface: '#16213E', // Card background
  surfaceLight: '#1E2D4A', // Lighter surface
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#A0AEC0', // Muted blue-gray
  textMuted: '#6B7280',
  
  // Status colors
  success: '#10B981', // Emerald green
  error: '#EF4444', // Red
  warning: '#F59E0B', // Amber
  demo: '#FFD700', // Gold for demo
  real: '#EF4444', // Red for real
  
  // Trading colors
  long: '#10B981', // Green for BUY
  short: '#EF4444', // Red for SELL
  
  // Borders
  border: '#2D3748',
  borderLight: '#4A5568',
  
  // Gold accent (for branding)
  gold: '#FFD700',
  goldDark: '#B8860B',
};

export const FONTS = {
  regular: {
    fontFamily: 'System',
    fontWeight: '400' as const,
  },
  medium: {
    fontFamily: 'System',
    fontWeight: '500' as const,
  },
  semibold: {
    fontFamily: 'System',
    fontWeight: '600' as const,
  },
  bold: {
    fontFamily: 'System',
    fontWeight: '700' as const,
  },
};

export const SIZES = {
  // Global sizes
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 20,
  extraLarge: 24,
  xxl: 32,
  
  // Padding
  paddingSmall: 8,
  paddingMedium: 16,
  paddingLarge: 24,
  
  // Border radius
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusXl: 24,
  radiusFull: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.46,
    elevation: 6,
  },
};

// Trading configuration
export const TRADING_CONFIG = {
  SMA_PERIOD: 20,
  STOP_LOSS_PIPS: 200,
  TP1_PIPS: 300,
  TP2_PIPS: 500,
  STAKE_AMOUNT: 1,
  MAX_SUGGESTIONS: 10,
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
};

// Deriv API configuration — secrets MUST come from .env only
export const DERIV_CONFIG = {
  WS_URL: 'wss://ws.derivws.com/websockets/v3',
  APP_ID: process.env.EXPO_PUBLIC_DERIV_APP_ID || '',
  API_TOKEN: process.env.EXPO_PUBLIC_DERIV_API_TOKEN || '',
  ALLOW_REAL: process.env.EXPO_PUBLIC_ALLOW_REAL === 'true',
};

// Symbols to track
export const SYMBOLS = {
  XAUUSD: 'frxXAUUSD',
  GBPUSD: 'frxGBPUSD',
  AUDUSD: 'frxAUDUSD',
  R_100: 'R_100',
};
