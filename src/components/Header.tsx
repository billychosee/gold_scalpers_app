import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { ConnectionStatus, DerivBalance } from '../types';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isVirtual: boolean;
  activeLoginId: string | null;
  accountType: 'demo' | 'real' | null;
  balance: DerivBalance | null;
  onMenuPress: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  isVirtual,
  activeLoginId,
  accountType,
  balance,
  onMenuPress,
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return COLORS.success;
      case 'connecting': return COLORS.warning;
      case 'error': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'connecting': return 'Connecting';
      case 'error': return 'Error';
      default: return 'Offline';
    }
  };

  const formatBalance = () => {
    if (!balance?.balance) return '0.00';
    const num = typeof balance.balance === 'string' ? parseFloat(balance.balance) : balance.balance;
    return (isNaN(num) ? 0 : num).toFixed(2);
  };

  const getMaskedId = () => {
    if (!activeLoginId) return '***';
    if (activeLoginId.length <= 6) return activeLoginId;
    return activeLoginId.substring(0, 3) + '***' + activeLoginId.slice(-3);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        {/* Hamburger Menu */}
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
          <MaterialIcons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <MaterialIcons name="candlestick-chart" size={22} color={COLORS.gold} />
          <Text style={styles.logoText}>GOLD</Text>
          <Text style={styles.logoAccent}>SCALPER</Text>
        </View>
        
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>
      </View>
      
      {/* Compact Account Bar */}
      {activeLoginId && connectionStatus === 'connected' && (
        <View style={styles.accountBar}>
          <View style={styles.accountInfo}>
            <View style={[
              styles.accountBadge,
              { backgroundColor: accountType === 'demo' ? COLORS.gold : COLORS.error }
            ]}>
              <Text style={styles.accountBadgeText}>{accountType?.toUpperCase() || 'DEMO'}</Text>
            </View>
            <Text style={styles.accountId}>{getMaskedId()}</Text>
          </View>
          <Text style={styles.balanceText}>${formatBalance()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingSmall,
    paddingVertical: SIZES.paddingSmall,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logoText: { ...FONTS.bold, fontSize: 15, color: COLORS.text, letterSpacing: 1 },
  logoAccent: { ...FONTS.bold, fontSize: 15, color: COLORS.gold, letterSpacing: 1 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...FONTS.medium, fontSize: 11 },
  accountBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMedium,
    paddingBottom: SIZES.paddingSmall,
  },
  accountInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  accountBadgeText: { ...FONTS.bold, fontSize: 9, color: COLORS.background, letterSpacing: 0.5 },
  accountId: { ...FONTS.medium, fontSize: 11, color: COLORS.textSecondary },
  balanceText: { ...FONTS.semibold, fontSize: 13, color: COLORS.text },
});
