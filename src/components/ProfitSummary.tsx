import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { DerivProfitTable } from '../types';

interface ProfitSummaryProps {
  profitTable: DerivProfitTable | null;
  onRefresh: () => void;
}

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({
  profitTable,
  onRefresh,
}) => {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Monthly Profit</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>
      
      {profitTable ? (
        <View style={styles.content}>
          <View style={styles.profitContainer}>
            <Text style={styles.profitLabel}>Total Profit</Text>
            {(() => {
              // Calculate total profit from transactions if total_profit is missing/NaN
              let totalProfit = profitTable.total_profit;
              if (isNaN(totalProfit) && profitTable.transactions) {
                totalProfit = profitTable.transactions.reduce((sum: number, t: any) => {
                  const profit = typeof t.profit === 'string' ? parseFloat(t.profit) : (t.profit || 0);
                  return sum + (isNaN(profit) ? 0 : profit);
                }, 0);
              }
              const safeProfit = isNaN(totalProfit) ? 0 : totalProfit;
              return (
                <Text style={[
                  styles.profitValue,
                  { color: getProfitColor(safeProfit) }
                ]}>
                  {formatProfit(safeProfit)}
                </Text>
              );
            })()}
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Trades</Text>
              <Text style={styles.statValue}>
                {profitTable.transactions?.length || 0}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <Text style={styles.statValue}>
                {profitTable.transactions && profitTable.transactions.length > 0
                  ? `${((profitTable.transactions.filter((t: any) => {
                      const profit = typeof t.profit === 'string' ? parseFloat(t.profit) : (t.profit || 0);
                      return !isNaN(profit) && profit > 0;
                    }).length / profitTable.transactions.length) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No profit data available</Text>
          <Text style={styles.emptySubtext}>Tap refresh to load data</Text>
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
    marginBottom: SIZES.paddingMedium,
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingMedium,
  },
  title: {
    ...FONTS.semibold,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.radiusSmall,
  },
  refreshText: {
    ...FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  content: {
    alignItems: 'center',
  },
  profitContainer: {
    alignItems: 'center',
    marginBottom: SIZES.paddingMedium,
  },
  profitLabel: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  profitValue: {
    ...FONTS.bold,
    fontSize: SIZES.xxl,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: SIZES.paddingSmall,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...FONTS.semibold,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingMedium,
  },
  emptyText: {
    ...FONTS.medium,
    fontSize: SIZES.font,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textMuted,
  },
});