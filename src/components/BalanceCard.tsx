import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { DerivBalance } from '../types';

interface BalanceCardProps {
  balance: DerivBalance | null;
  onRefresh: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balance, onRefresh }) => {
  const { colors } = useTheme();

  const formatBalance = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${(isNaN(num) ? 0 : num).toFixed(2)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.labelRow}>
            <MaterialIcons name="account-balance-wallet" size={14} color={colors.gold} />
            <Text style={[styles.label, { color: colors.textMuted }]}>Portfolio</Text>
          </View>
          <Text style={[styles.balance, { color: colors.text }]}>
            {balance ? formatBalance(balance.balance) : '$0.00'}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={[styles.refreshBtn, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {balance && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{balance.currency}</Text>
          <Text style={[styles.footerDot, { color: colors.border }]}>|</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{balance.loginid}</Text>
        </View>
      )}
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
  left: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  label: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  balance: { ...FONTS.bold, fontSize: 26, color: COLORS.text, letterSpacing: -0.5 },
  refreshBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerText: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  footerDot: { color: COLORS.border, fontSize: 10 },
});
