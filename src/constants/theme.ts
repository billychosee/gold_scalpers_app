export const COLORS = {
  // Primary colors
  primary: '#FFD700', // Gold
  primaryDark: '#B8860B', // Dark gold
  secondary: '#00D4FF', // Cyan
  
  // Background colors
  background: '#0A0A0F', // Very dark background
  surface: '#12121A', // Card background
  surfaceLight: '#1A1A25', // Lighter surface
  
  // Text colors
  text: '#FFFFFF', // Primary text
  textSecondary: '#8E8E93', // Secondary text
  textMuted: '#636366', // Muted text
  
  // Status colors
  success: '#34C759', // Green
  error: '#FF3B30', // Red
  warning: '#FF9500', // Orange
  demo: '#FFD700', // Yellow for demo badge
  real: '#FF3B30', // Red for real badge
  
  // Trading colors
  long: '#34C759', // Green for long
  short: '#FF3B30', // Red for short
  
  // Borders
  border: '#2C2C34', // Subtle border
  borderLight: '#3A3A42', // Lighter border
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
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.46,
    elevation: 6,
  },
};

// Trading configuration
export const TRADING_CONFIG = {
  SMA_PERIOD: 20, // 20-period SMA
  STOP_LOSS_PIPS: 200, // 200 pips above entry for short
  TP1_PIPS: 300, // 300 pips below entry for short
  TP2_PIPS: 500, // 500 pips below entry for short
  STAKE_AMOUNT: 1, // $1 stake for demo trades
  MAX_SUGGESTIONS: 10, // Keep last 10 suggestions
  RECONNECT_INTERVAL: 3000, // 3 seconds reconnect interval
  MAX_RECONNECT_ATTEMPTS: 5, // Maximum reconnect attempts
};

// Deriv API configuration
export const DERIV_CONFIG = {
  WS_URL: 'wss://ws.derivws.com/websockets/v3',
  APP_ID: process.env.EXPO_PUBLIC_DERIV_APP_ID || '1089', // 1089 is Deriv's test app_id
  API_TOKEN: process.env.EXPO_PUBLIC_DERIV_API_TOKEN || '',
  ALLOW_REAL: process.env.EXPO_PUBLIC_ALLOW_REAL === 'true',
};

// Symbols to track (Deriv API uses 'frx' prefix for forex symbols)
export const SYMBOLS = {
  XAUUSD: 'frxXAUUSD', // Gold
  GBPUSD: 'frxGBPUSD', // GBP/USD
};