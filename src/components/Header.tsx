import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { ConnectionStatus, DerivBalance } from '../types';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isVirtual: boolean;
  activeLoginId: string | null;
  accountType: 'demo' | 'real' | null;
  balance: DerivBalance | null;
  onMenuPress: () => void;
  upcomingNewsCount: number;
  onNewsPress: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  isVirtual,
  activeLoginId,
  accountType,
  balance,
  onMenuPress,
  upcomingNewsCount,
  onNewsPress,
}) => {
  const { colors } = useTheme();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return colors.success;
      case 'connecting': return colors.warning;
      case 'error': return colors.error;
      default: return colors.textMuted;
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
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.topBar}>
        {/* Hamburger Menu */}
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
          <MaterialIcons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <MaterialIcons name="candlestick-chart" size={22} color={colors.gold} />
          <Text style={[styles.logoText, { color: colors.text }]}>GOLD</Text>
          <Text style={[styles.logoAccent, { color: colors.gold }]}>SCALPER</Text>
        </View>
        
        <View style={styles.rightSection}>
          {/* News Bell */}
          <TouchableOpacity onPress={onNewsPress} style={styles.bellBtn}>
            <MaterialIcons name="notifications" size={20} color={colors.text} />
            {upcomingNewsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {upcomingNewsCount > 9 ? '9+' : upcomingNewsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
          </View>
        </View>
      </View>
      
      {/* Compact Account Bar */}
      {activeLoginId && connectionStatus === 'connected' && (
        <View style={styles.accountBar}>
          <View style={styles.accountInfo}>
            <View style={[
              styles.accountBadge,
              { backgroundColor: accountType === 'demo' ? colors.gold : colors.error }
            ]}>
              <Text style={[styles.accountBadgeText, { color: colors.background }]}>{accountType?.toUpperCase() || 'DEMO'}</Text>
            </View>
            <Text style={[styles.accountId, { color: colors.textSecondary }]}>{getMaskedId()}</Text>
          </View>
          <Text style={[styles.balanceText, { color: colors.text }]}>${formatBalance()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...FONTS.bold,
    fontSize: 9,
    color: '#FFFFFF',
  },
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
