import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface TradeHistoryPageProps {
  onBack: () => void;
  suggestions: any[];
}

export const TradeHistoryPage: React.FC<TradeHistoryPageProps> = ({ onBack, suggestions }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const executed = suggestions.filter(s => s.executed);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade History</Text>
      </View>

      {executed.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No trades executed yet</Text>
        </View>
      ) : (
        executed.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View style={[styles.dirBadge, { backgroundColor: item.direction === 'BUY' ? COLORS.long : COLORS.short }]}>
                <MaterialIcons name={item.direction === 'BUY' ? 'trending-up' : 'trending-down'} size={12} color={COLORS.text} />
                <Text style={styles.dirText}>{item.direction}</Text>
              </View>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={[
                styles.resultText,
                { color: item.executionResult?.startsWith('Error') ? COLORS.error : COLORS.success }
              ]}>
                {item.executionResult?.substring(0, 30)}
              </Text>
            </View>
            <View style={styles.historyPrices}>
              <Text style={styles.priceMini}>Entry: {item.entryPrice.toFixed(item.symbol.includes('XAU') ? 2 : 4)}</Text>
              <Text style={styles.priceMini}>SL: {item.stopLoss.toFixed(item.symbol.includes('XAU') ? 2 : 4)}</Text>
              <Text style={styles.priceMini}>TP: {item.tp1.toFixed(item.symbol.includes('XAU') ? 2 : 4)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const createStyles = (colors: typeof COLORS) => {
  const COLORS = colors;
  return StyleSheet.create({
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
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyText: { ...FONTS.medium, fontSize: SIZES.font, color: COLORS.textMuted, marginTop: 12 },
  historyCard: {
    margin: SIZES.paddingMedium, backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium, borderWidth: 1, borderColor: COLORS.border,
    padding: SIZES.paddingMedium,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dirBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  dirText: { ...FONTS.bold, fontSize: 10, color: COLORS.text },
  symbol: { ...FONTS.semibold, fontSize: SIZES.font, color: COLORS.text, flex: 1 },
  resultText: { ...FONTS.regular, fontSize: 11 },
  historyPrices: { flexDirection: 'row', gap: 12 },
  priceMini: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary },
  });
};
