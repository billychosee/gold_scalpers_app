// ── Color palettes ─────────────────────────────────────────────────
export type ColorPalette = typeof darkColors;

export const darkColors = {
  // Primary colors - Deriv red/coral
  primary: '#FF444F',
  primaryDark: '#E53935',
  secondary: '#00D4FF',

  // Background colors
  background: '#1A1A2E',
  surface: '#16213E',
  surfaceLight: '#1E2D4A',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textMuted: '#6B7280',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  demo: '#FFD700',
  real: '#EF4444',

  // Trading colors
  long: '#10B981',
  short: '#EF4444',

  // Borders
  border: '#2D3748',
  borderLight: '#4A5568',

  // Gold accent
  gold: '#FFD700',
  goldDark: '#B8860B',
};

export const lightColors: ColorPalette = {
  // Primary colors
  primary: '#FF444F',
  primaryDark: '#E53935',
  secondary: '#0099CC',

  // Background colors
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceLight: '#F0F0F0',

  // Text colors
  text: '#1A1A2E',
  textSecondary: '#4A5568',
  textMuted: '#9CA3AF',

  // Status colors
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  demo: '#B8860B',
  real: '#DC2626',

  // Trading colors
  long: '#059669',
  short: '#DC2626',

  // Borders
  border: '#E2E8F0',
  borderLight: '#CBD5E1',

  // Gold accent
  gold: '#B8860B',
  goldDark: '#92400E',
};

// Default COLORS export for backward compatibility (dark theme)
export const COLORS = darkColors;

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

// Paper trading mode — reads from .env
export const PAPER_TRADING = process.env.EXPO_PUBLIC_PAPER_TRADING === 'true';

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
  R_10: 'R_10',
  R_25: 'R_25',
  R_50: 'R_50',
  R_75: 'R_75',
  V_15_1S: '1HZ15V',
  V_30_1S: '1HZ30V',
  V_90_1S: '1HZ90V',
  BOOM_500: 'BOOM500',
  BOOM_600: 'BOOM600',
  CRASH_500: 'CRASH500',
  CRASH_600: 'CRASH600',
};

export const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
  frxXAUUSD: 'Gold (XAU/USD)',
  frxGBPUSD: 'British Pound / US Dollar',
  frxAUDUSD: 'Australian Dollar / US Dollar',
  R_10: 'Volatility 10 Index',
  R_25: 'Volatility 25 Index',
  R_50: 'Volatility 50 Index',
  R_75: 'Volatility 75 Index',
  R_100: 'Volatility 100 Index',
  '1HZ15V': 'Volatility 15 (1s) Index',
  '1HZ30V': 'Volatility 30 (1s) Index',
  '1HZ90V': 'Volatility 90 (1s) Index',
  BOOM500: 'Boom 500 Index',
  BOOM600: 'Boom 600 Index',
  CRASH500: 'Crash 500 Index',
  CRASH600: 'Crash 600 Index',
};

export function getSymbolDisplayName(symbol: string, fallback?: string): string {
  return SYMBOL_DISPLAY_NAMES[symbol] || fallback || symbol;
}

export const SYNTHETIC_SYMBOL_KEYS = [
  'R_100', 'R_10', 'R_25', 'R_50', 'R_75',
  'V_15_1S', 'V_30_1S', 'V_90_1S',
  'CRASH_500', 'CRASH_600', 'BOOM_500', 'BOOM_600',
] as const;
