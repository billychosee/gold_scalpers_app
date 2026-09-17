import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface TradingModeBannerProps {
  isPaperTrading: boolean;
  accountType: 'demo' | 'real' | null;
}

/**
 * Persistent banner showing the current trading mode.
 * Blue = Paper, Yellow = Demo, Red = Real
 */
export const TradingModeBanner: React.FC<TradingModeBannerProps> = ({
  isPaperTrading,
  accountType,
}) => {
  const { colors } = useTheme();

  if (isPaperTrading) {
    return (
      <View style={[styles.banner, styles.paper, { backgroundColor: colors.secondary }]}>
        <MaterialIcons name="science" size={14} color="#FFFFFF" />
        <Text style={styles.text}>
          PAPER MODE — Trades are simulated, no real money at risk
        </Text>
      </View>
    );
  }

  if (accountType === 'real') {
    return (
      <View style={[styles.banner, styles.real, { backgroundColor: colors.error }]}>
        <MaterialIcons name="warning" size={14} color="#FFFFFF" />
        <Text style={styles.text}>
          REAL MONEY MODE — Actual trades are being placed
        </Text>
      </View>
    );
  }

  // Demo account (not paper)
  return (
    <View style={[styles.banner, styles.demo, { backgroundColor: colors.demo }]}>
      <MaterialIcons name="school" size={14} color={colors.background} />
      <Text style={[styles.text, styles.demoText, { color: colors.background }]}>
        DEMO MODE — Using Deriv demo account
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: SIZES.paddingMedium,
  },
  paper: {
    backgroundColor: '#3B82F6', // Blue
  },
  demo: {
    backgroundColor: 'transparent',
  },
  real: {
    backgroundColor: 'transparent',
  },
  text: {
    ...FONTS.semibold,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  demoText: {
    color: '#1A1A2E',
  },
});
