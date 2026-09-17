import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { DerivProfitTable } from '../types';

interface ProfitSummaryProps {
  profitTable: DerivProfitTable | null;
  onRefresh: () => void;
}

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ profitTable, onRefresh }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const formatProfit = (profit: number | string) => {
    const num = typeof profit === 'string' ? parseFloat(profit) : profit;
    const safeNum = isNaN(num) ? 0 : num;
    const sign = safeNum >= 0 ? '+' : '';
    return `${sign}$${Math.abs(safeNum).toFixed(2)}`;
  };

  const getProfitColor = (profit: number | string) => {
    const num = typeof profit === 'string' ? parseFloat(profit) : profit;
    const safeNum = isNaN(num) ? 0 : num;
    return safeNum >= 0 ? COLORS.success : COLORS.error;
  };

  const getTotalProfit = () => {
    if (!profitTable) return 0;
    let totalProfit = profitTable.total_profit;
    if (isNaN(totalProfit) && profitTable.transactions) {
      totalProfit = profitTable.transactions.reduce((sum: number, t: any) => {
        const profit = typeof t.profit === 'string' ? parseFloat(t.profit) : (t.profit || 0);
        return sum + (isNaN(profit) ? 0 : profit);
      }, 0);
    }
    return isNaN(totalProfit) ? 0 : totalProfit;
  };

  const getWinRate = () => {
    if (!profitTable?.transactions || profitTable.transactions.length === 0) return '0';
    const wins = profitTable.transactions.filter((t: any) => {
      const profit = typeof t.profit === 'string' ? parseFloat(t.profit) : (t.profit || 0);
      return !isNaN(profit) && profit > 0;
    }).length;
    return ((wins / profitTable.transactions.length) * 100).toFixed(1);
  };

  const totalProfit = getTotalProfit();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.labelRow}>
            <MaterialIcons name="assessment" size={14} color={COLORS.gold} />
            <Text style={styles.label}>Performance</Text>
          </View>
          <Text style={[styles.profitValue, { color: getProfitColor(totalProfit) }]}>
            {formatProfit(totalProfit)}
          </Text>
        </View>
        <View style={styles.statsRight}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profitTable?.transactions?.length || 0}</Text>
            <Text style={styles.statLabel}>Trades</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{getWinRate()}%</Text>
            <Text style={styles.statLabel}>Win</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: typeof COLORS) => {
  const COLORS = colors;
  return StyleSheet.create({
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
  left: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  label: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  profitValue: { ...FONTS.bold, fontSize: 22, letterSpacing: -0.5 },
  statsRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { alignItems: 'center' },
  statValue: { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  statLabel: { ...FONTS.regular, fontSize: 9, color: COLORS.textMuted },
  statDivider: { width: 1, height: 20, backgroundColor: COLORS.border },
  refreshBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  });
};
