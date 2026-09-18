import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TradeDirection } from '../types';

interface MarketDataCardProps {
  symbol: string;
  price: number;
  sma: number;
  direction: TradeDirection | null;
  higherTrend: TradeDirection | null;
  label: string;
  closedUntil?: Date | null;
  onRetry?: () => void;
}

export const MarketDataCard: React.FC<MarketDataCardProps> = ({
  symbol, price, sma, direction, higherTrend, label, closedUntil, onRetry,
}) => {
  const { colors } = useTheme();

  const getDirectionColor = () => {
    switch (direction) {
      case 'BUY': return colors.long;
      case 'SELL': return colors.short;
      default: return colors.textMuted;
    }
  };

  const formatPrice = (value: number) => {
    if (symbol === 'XAUUSD') return value.toFixed(2);
    return value.toFixed(4);
  };

  const isGold = symbol.includes('XAU');

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.symbolRow}>
            <MaterialIcons name={isGold ? 'diamond' : 'currency-exchange'} size={14} color={isGold ? colors.gold : colors.primary} />
            <Text style={[styles.symbol, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{symbol}</Text>
            <View style={[styles.dirBadge, { backgroundColor: getDirectionColor() + '20' }]}>
              <Text style={[styles.dirText, { color: getDirectionColor() }]}>{direction || '---'}</Text>
            </View>
            {higherTrend && (
              <View style={[styles.trendBadge, { backgroundColor: higherTrend === 'BUY' ? colors.long + '20' : colors.short + '20' }]}>
                <Text style={[styles.trendText, { color: higherTrend === 'BUY' ? colors.long : colors.short }]}>H4/D1 {higherTrend}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.priceCol}>
          {closedUntil ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.price}>Market closed — reopens at {new Date(closedUntil).toLocaleString()}</Text>
              {onRetry && (
                  <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
                  <Text style={styles.retryText}>Retry now</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={[styles.price, { color: colors.text }]}>{formatPrice(price)}</Text>
              {sma > 0 && <Text style={[styles.sma, { color: colors.textMuted }]}>SMA {formatPrice(sma)}</Text>}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.paddingSmall + 4,
    marginHorizontal: SIZES.paddingMedium,
    marginTop: SIZES.paddingSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flex: 1, marginRight: 8 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  symbol: { ...FONTS.bold, fontSize: 13, color: COLORS.text },
  label: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  dirBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dirText: { ...FONTS.bold, fontSize: 9 },
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trendText: { ...FONTS.bold, fontSize: 9 },
  priceCol: { alignItems: 'flex-end' },
  price: { ...FONTS.bold, fontSize: 18, color: COLORS.text, letterSpacing: -0.5 },
  sma: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  retryText: { ...FONTS.semibold, fontSize: 12, color: '#fff' },
});
