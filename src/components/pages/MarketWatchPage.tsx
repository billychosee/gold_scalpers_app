import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

interface MarketWatchPageProps {
  onBack: () => void;
  xauusdPrice: number;
  gbpusdPrice: number;
  audusdPrice: number;
  xauusdSma: number;
  gbpusdSma: number;
  audusdSma: number;
  xauusdDirection: string | null;
  gbpusdDirection: string | null;
  audusdDirection: string | null;
  xauusdTrend: string | null;
  gbpusdTrend: string | null;
  audusdTrend: string | null;
  xauusdClosedUntil?: Date | null;
  gbpusdClosedUntil?: Date | null;
  audusdClosedUntil?: Date | null;
  xauusdOnRetry?: () => void;
  gbpusdOnRetry?: () => void;
  audusdOnRetry?: () => void;
}

export const MarketWatchPage: React.FC<MarketWatchPageProps> = ({
  onBack,
  xauusdPrice,
  gbpusdPrice,
  audusdPrice,
  xauusdSma,
  gbpusdSma,
  audusdSma,
  xauusdDirection,
  gbpusdDirection,
  audusdDirection,
  xauusdTrend,
  gbpusdTrend,
  audusdTrend,
  xauusdClosedUntil,
  gbpusdClosedUntil,
  audusdClosedUntil,
  xauusdOnRetry,
  gbpusdOnRetry,
  audusdOnRetry,
}) => {
  const renderSymbolRow = (
    symbol: string, label: string, price: number, sma: number, 
    direction: string | null, trend: string | null, closedUntil?: Date | null, onRetry?: () => void
  ) => {
    const isGold = symbol.includes('XAU');
    const priceStr = isGold ? price.toFixed(2) : price.toFixed(4);
    const smaStr = isGold ? sma.toFixed(2) : sma.toFixed(4);
    const aboveSma = price > sma && sma > 0;

    return (
      <View style={styles.symbolCard}>
        <View style={styles.symbolHeader}>
          <View style={styles.symbolInfo}>
            <View style={[styles.iconWrap, isGold && { backgroundColor: COLORS.gold + '20' }]}>
              <MaterialIcons name={isGold ? 'diamond' : 'currency-exchange'} size={18} color={isGold ? COLORS.gold : COLORS.primary} />
            </View>
            <View>
              <Text style={styles.symbolName}>{symbol}</Text>
              <Text style={styles.symbolLabel}>{label}</Text>
            </View>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceBig}>{priceStr}</Text>
          </View>
        </View>
        <View style={styles.symbolStats}>
          <View style={styles.statMini}>
            <Text style={styles.statMiniLabel}>SMA</Text>
            <Text style={styles.statMiniValue}>{sma}</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statMiniLabel}>vs SMA</Text>
            <Text style={[styles.statMiniValue, { color: aboveSma ? COLORS.long : COLORS.short }]}>
              {aboveSma ? 'Above' : 'Below'}
            </Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statMiniLabel}>Signal</Text>
            <Text style={[styles.statMiniValue, { 
              color: direction === 'BUY' ? COLORS.long : direction === 'SELL' ? COLORS.short : COLORS.textMuted 
            }]}>
              {direction || 'NEUTRAL'}
            </Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statMiniLabel}>H4/D1</Text>
            <Text style={[styles.statMiniValue, { 
              color: trend === 'BUY' ? COLORS.long : trend === 'SELL' ? COLORS.short : COLORS.textMuted 
            }]}>
              {trend || '---'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Watch</Text>
      </View>
      {renderSymbolRow('XAUUSD', 'Gold', xauusdPrice, xauusdSma, xauusdDirection, xauusdTrend, xauusdClosedUntil, xauusdOnRetry)}
      {renderSymbolRow('GBPUSD', 'British Pound / US Dollar', gbpusdPrice, gbpusdSma, gbpusdDirection, gbpusdTrend, gbpusdClosedUntil, gbpusdOnRetry)}
      {renderSymbolRow('R_100', 'Volatility 100 Index', audusdPrice, audusdSma, audusdDirection, audusdTrend, audusdClosedUntil, audusdOnRetry)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: SIZES.paddingMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...FONTS.semibold, fontSize: SIZES.large, color: COLORS.text },
  symbolCard: {
    margin: SIZES.paddingMedium, backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  symbolHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SIZES.paddingMedium,
  },
  symbolInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  symbolName: { ...FONTS.bold, fontSize: SIZES.medium, color: COLORS.text },
  symbolLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  priceCol: { alignItems: 'flex-end' },
  priceBig: { ...FONTS.bold, fontSize: SIZES.large, color: COLORS.text },
  symbolStats: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  statMini: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRightWidth: 1, borderRightColor: COLORS.border },
  statMiniLabel: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  statMiniValue: { ...FONTS.semibold, fontSize: 12, color: COLORS.text },
});
