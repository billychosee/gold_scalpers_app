import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { DerivBalance } from '../types';

interface BalanceCardProps {
  balance: DerivBalance | null;
  onRefresh: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  onRefresh,
}) => {
  const formatBalance = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${(isNaN(num) ? 0 : num).toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account Balance</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={styles.balance}>
          {balance ? formatBalance(balance.balance) : '$0.00'}
        </Text>
        {balance && (
          <Text style={styles.currency}>{balance.currency}</Text>
        )}
      </View>
      
      {balance && (
        <Text style={styles.loginId}>Account: {balance.loginid}</Text>
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
    alignItems: 'center',
    marginBottom: SIZES.paddingSmall,
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
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  balance: {
    ...FONTS.bold,
    fontSize: SIZES.xxl,
    color: COLORS.success,
  },
  currency: {
    ...FONTS.medium,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  loginId: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textMuted,
  },
});