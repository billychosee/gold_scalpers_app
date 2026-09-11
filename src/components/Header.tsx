import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { ConnectionStatus, DerivBalance } from '../types';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isVirtual: boolean;
  activeLoginId: string | null;
  accountType: 'demo' | 'real' | null;
  balance: DerivBalance | null;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  isVirtual,
  activeLoginId,
  accountType,
  balance,
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return COLORS.success;
      case 'connecting':
        return COLORS.warning;
      case 'error':
        return COLORS.error;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  // Safety banner color based on account_type
  const getBannerColor = () => {
    if (!accountType) return COLORS.warning; // ORANGE if unknown
    return accountType === 'demo' ? COLORS.success : COLORS.error;
  };

  // Mask account ID for safety banner (first 3 + last 3 chars)
  const getMaskedId = () => {
    if (!activeLoginId) return '***';
    if (activeLoginId.length <= 6) return activeLoginId;
    return activeLoginId.substring(0, 3) + '***' + activeLoginId.slice(-3);
  };

  // Get account type label
  const getAccountTypeLabel = () => {
    if (!accountType) return 'UNKNOWN ⚠️';
    return accountType.toUpperCase();
  };

  // Format balance safely (handle string or number)
  const formatBalance = () => {
    if (!balance?.balance) return '0.00';
    const num = typeof balance.balance === 'string' ? parseFloat(balance.balance) : balance.balance;
    return (isNaN(num) ? 0 : num).toFixed(2);
  };

  return (
    <View style={styles.container}>
      {/* Safety Banner */}
      {activeLoginId && connectionStatus === 'connected' && (
        <View style={[styles.safetyBanner, { backgroundColor: getBannerColor() }]}>
          <Text style={styles.safetyBannerText}>
            Trading on: {getMaskedId()} | {getAccountTypeLabel()} | ${formatBalance()}
          </Text>
        </View>
      )}
      
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Gold Scalper</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          
          <View style={[
            styles.accountBadge,
            { backgroundColor: accountType === 'demo' ? COLORS.demo : accountType === 'real' ? COLORS.real : COLORS.warning }
          ]}>
            <Text style={styles.accountBadgeText}>
              {accountType === 'demo' ? 'DEMO' : accountType === 'real' ? 'REAL' : 'UNSAFE'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  safetyBanner: {
    paddingHorizontal: SIZES.paddingMedium,
    paddingVertical: 6,
  },
  safetyBannerText: {
    ...FONTS.bold,
    fontSize: 11,
    color: COLORS.background,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMedium,
    paddingVertical: SIZES.paddingSmall,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    ...FONTS.medium,
    fontSize: SIZES.small,
    marginRight: 12,
  },
  accountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  accountBadgeText: {
    ...FONTS.bold,
    fontSize: 10,
    color: COLORS.background,
  },
});
