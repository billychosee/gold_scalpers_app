import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { MarketContext } from '../types';

interface MarketDataCardProps {
  symbol: string;
  price: number;
  sma: number;
  context: MarketContext;
  label: string;
}

export const MarketDataCard: React.FC<MarketDataCardProps> = ({
  symbol,
  price,
  sma,
  context,
  label,
}) => {
  const getContextColor = () => {
    switch (context) {
      case 'LONG':
        return COLORS.long;
      case 'SHORT':
        return COLORS.short;
      default:
        return COLORS.textMuted;
    }
  };

  const getContextLabel = () => {
    switch (context) {
      case 'LONG':
        return 'LONG CONTEXT';
      case 'SHORT':
        return 'SHORT CONTEXT';
      default:
        return 'NEUTRAL';
    }
  };

  const formatPrice = (value: number) => {
    if (symbol === 'XAUUSD') {
      return value.toFixed(2);
    }
    return value.toFixed(4);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
        
        <View style={[styles.contextBadge, { backgroundColor: getContextColor() + '20' }]}>
          <Text style={[styles.contextText, { color: getContextColor() }]}>
            {getContextLabel()}
          </Text>
        </View>
      </View>
      
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Current Price</Text>
        <Text style={styles.price}>{formatPrice(price)}</Text>
      </View>
      
      <View style={styles.smaContainer}>
        <Text style={styles.smaLabel}>20-Period SMA</Text>
        <Text style={styles.sma}>{sma > 0 ? formatPrice(sma) : 'Calculating...'}</Text>
      </View>
      
      {sma > 0 && (
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonLabel}>vs SMA:</Text>
          <Text style={[
            styles.comparisonValue,
            { color: price > sma ? COLORS.long : price < sma ? COLORS.short : COLORS.textMuted }
          ]}>
            {price > sma ? '↑ Above' : price < sma ? '↓ Below' : '→ At SMA'}
            {' '}
            ({((Math.abs(price - sma) / sma) * 100).toFixed(2)}%)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.paddingMedium,
    marginHorizontal: SIZES.paddingMedium,
    marginTop: SIZES.paddingMedium,
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingMedium,
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    ...FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.primary,
  },
  label: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  contextBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSmall,
  },
  contextText: {
    ...FONTS.semibold,
    fontSize: SIZES.small,
  },
  priceContainer: {
    marginBottom: SIZES.paddingSmall,
  },
  priceLabel: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  price: {
    ...FONTS.bold,
    fontSize: SIZES.xxl,
    color: COLORS.text,
  },
  smaContainer: {
    marginBottom: SIZES.paddingSmall,
  },
  smaLabel: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  sma: {
    ...FONTS.semibold,
    fontSize: SIZES.large,
    color: COLORS.textSecondary,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SIZES.paddingSmall,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  comparisonLabel: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  comparisonValue: {
    ...FONTS.medium,
    fontSize: SIZES.small,
  },
});