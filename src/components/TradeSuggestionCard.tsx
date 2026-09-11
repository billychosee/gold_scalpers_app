import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { TradeSuggestion } from '../types';

interface TradeSuggestionCardProps {
  suggestion: TradeSuggestion;
  onExecute: (suggestion: TradeSuggestion) => void;
}

export const TradeSuggestionCard: React.FC<TradeSuggestionCardProps> = ({
  suggestion,
  onExecute,
}) => {
  const formatPrice = (value: number) => {
    if (suggestion.symbol === 'XAUUSD') {
      return value.toFixed(2);
    }
    return value.toFixed(4);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleExecute = () => {
    Alert.alert(
      'Execute Trade',
      `Execute ${suggestion.context} trade for ${suggestion.symbol} at ${formatPrice(suggestion.entryPrice)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Execute', onPress: () => onExecute(suggestion) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbol}>{suggestion.symbol}</Text>
          <Text style={styles.context}>{suggestion.context} Trade</Text>
        </View>
        <Text style={styles.time}>{formatTime(suggestion.timestamp)}</Text>
      </View>
      
      <View style={styles.priceContainer}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Entry</Text>
          <Text style={styles.priceValue}>{formatPrice(suggestion.entryPrice)}</Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Stop Loss</Text>
          <Text style={[styles.priceValue, { color: COLORS.error }]}>
            {formatPrice(suggestion.stopLoss)}
          </Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>TP1</Text>
          <Text style={[styles.priceValue, { color: COLORS.success }]}>
            {formatPrice(suggestion.tp1)}
          </Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>TP2</Text>
          <Text style={[styles.priceValue, { color: COLORS.success }]}>
            {formatPrice(suggestion.tp2)}
          </Text>
        </View>
      </View>
      
      {suggestion.executed ? (
        <View style={[
          styles.resultContainer,
          { backgroundColor: suggestion.executionResult?.startsWith('Error') 
              ? COLORS.error + '20' 
              : COLORS.success + '20' 
          }
        ]}>
          <Text style={[
            styles.resultText,
            { color: suggestion.executionResult?.startsWith('Error') 
                ? COLORS.error 
                : COLORS.success 
            }
          ]}>
            {suggestion.executionResult}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.executeButton,
            { backgroundColor: suggestion.context === 'LONG' ? COLORS.long : COLORS.short }
          ]}
          onPress={handleExecute}
          activeOpacity={0.7}
        >
          <Text style={styles.executeButtonText}>
            Execute Demo {suggestion.context}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.paddingMedium,
    marginBottom: SIZES.paddingSmall,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingMedium,
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    ...FONTS.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
  context: {
    ...FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.short,
    marginTop: 2,
  },
  time: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textMuted,
  },
  priceContainer: {
    marginBottom: SIZES.paddingMedium,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  priceValue: {
    ...FONTS.semibold,
    fontSize: SIZES.font,
    color: COLORS.text,
  },
  resultContainer: {
    padding: SIZES.paddingSmall,
    borderRadius: SIZES.radiusSmall,
  },
  resultText: {
    ...FONTS.medium,
    fontSize: SIZES.small,
    textAlign: 'center',
  },
  executeButton: {
    backgroundColor: COLORS.short,
    paddingVertical: 12,
    borderRadius: SIZES.radiusSmall,
    alignItems: 'center',
  },
  executeButtonText: {
    ...FONTS.semibold,
    fontSize: SIZES.font,
    color: COLORS.text,
  },
});