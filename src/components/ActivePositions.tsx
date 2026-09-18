import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, getSymbolDisplayName, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { ActivePosition } from '../types';

interface ActivePositionsProps {
  positions: ActivePosition[];
  onClose: (position: ActivePosition) => void;
}

export const ActivePositions: React.FC<ActivePositionsProps> = ({ positions, onClose }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const formatPrice = (value: number, symbol: string) => {
    if (symbol.includes('XAUUSD')) return value.toFixed(2);
    return value.toFixed(4);
  };

  const formatProfit = (profit: number) => {
    const sign = profit >= 0 ? '+' : '';
    return `${sign}$${Math.abs(profit).toFixed(2)}`;
  };

  const handleClose = (position: ActivePosition) => {
    Alert.alert(
      'Close Position',
      `Close ${position.direction} ${position.symbol}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close', style: 'destructive', onPress: () => onClose(position) },
      ]
    );
  };

  const renderPosition = ({ item }: { item: ActivePosition }) => {
    const isProfit = item.profit >= 0;
    const isBuy = item.direction === 'BUY';
    
    return (
      <View style={styles.positionCard}>
        <View style={styles.positionHeader}>
          <View style={styles.positionLeft}>
            <View style={[styles.dirBadge, { backgroundColor: isBuy ? COLORS.long : COLORS.short }]}>
              <MaterialIcons name={isBuy ? 'trending-up' : 'trending-down'} size={10} color={COLORS.text} />
              <Text style={styles.dirText}>{item.direction}</Text>
            </View>
            <View>
              <Text style={styles.symbolText}>{getSymbolDisplayName(item.symbol)}</Text>
              <Text style={styles.symbolCode}>{item.symbol}</Text>
            </View>
          </View>
          <Text style={[styles.profitText, { color: isProfit ? COLORS.success : COLORS.error }]}>
            {formatProfit(item.profit)}
          </Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceMini}>Entry: {formatPrice(item.entryPrice, item.symbol)}</Text>
          <Text style={[styles.priceMini, { color: isProfit ? COLORS.success : COLORS.error }]}>
            Now: {formatPrice(item.currentPrice, item.symbol)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.closeBtn, item.status === 'closing' && { opacity: 0.5 }]}
          onPress={() => handleClose(item)}
          disabled={item.status === 'closing'}
        >
          <MaterialIcons name="close" size={12} color={COLORS.text} />
          <Text style={styles.closeBtnText}>{item.status === 'closing' ? '...' : 'Close'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={20} color={COLORS.textMuted} />
      <Text style={styles.emptyText}>No Open Positions</Text>
    </View>
  );

  if (positions.length === 0) return renderEmpty();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="work-outline" size={14} color={COLORS.gold} />
        <Text style={styles.title}>Positions</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{positions.length}</Text>
        </View>
      </View>
      <FlatList
        data={positions}
        renderItem={renderPosition}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (colors: typeof COLORS) => {
  const COLORS = colors;
  return StyleSheet.create({
  container: {
    marginTop: SIZES.paddingSmall,
    marginHorizontal: SIZES.paddingMedium,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6,
  },
  title: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, flex: 1 },
  countBadge: {
    backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  countText: { ...FONTS.bold, fontSize: 11, color: COLORS.text },
  positionCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusSmall,
    padding: SIZES.paddingSmall, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  positionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  positionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dirBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
  },
  dirText: { ...FONTS.bold, fontSize: 9, color: COLORS.text },
  symbolText: { ...FONTS.semibold, fontSize: 11, color: COLORS.text },
  symbolCode: { ...FONTS.regular, fontSize: 9, color: COLORS.textMuted, marginTop: 1 },
  profitText: { ...FONTS.bold, fontSize: 13 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceMini: { ...FONTS.regular, fontSize: 10, color: COLORS.textSecondary },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: COLORS.error, paddingVertical: 6, borderRadius: SIZES.radiusSmall,
  },
  closeBtnText: { ...FONTS.semibold, fontSize: 10, color: COLORS.text },
  emptyContainer: {
    paddingVertical: SIZES.paddingMedium, alignItems: 'center', gap: 4,
  },
  emptyText: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  });
};
