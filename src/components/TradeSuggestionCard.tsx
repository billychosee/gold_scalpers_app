import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TradeSuggestion } from '../types';

interface TradeSuggestionCardProps {
  suggestion: TradeSuggestion;
  onExecute: (suggestion: TradeSuggestion) => void;
}

export const TradeSuggestionCard: React.FC<TradeSuggestionCardProps> = ({
  suggestion,
  onExecute,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const formatPrice = (value: number) => {
    if (suggestion.symbol.includes('XAUUSD')) return value.toFixed(2);
    return value.toFixed(4);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return COLORS.success;
    if (confidence >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const copyToClipboard = (label: string, value: string) => {
    Clipboard.setString(value);
    Alert.alert('Copied', `${label}: ${value} copied to clipboard`);
  };

  const copyAllPrices = () => {
    const text = `Entry: ${formatPrice(suggestion.entryPrice)}\nSL: ${formatPrice(suggestion.stopLoss)}\nTP1: ${formatPrice(suggestion.tp1)}\nTP2: ${formatPrice(suggestion.tp2)}`;
    Clipboard.setString(text);
    Alert.alert('Copied', 'All price levels copied to clipboard');
  };

  const handleExecute = () => {
    onExecute(suggestion);
  };

  const isBuy = suggestion.direction === 'BUY';

  return (
    <View style={[
      styles.container,
      { borderLeftColor: isBuy ? COLORS.long : COLORS.short }
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[
            styles.directionBadge,
            { backgroundColor: isBuy ? COLORS.long : COLORS.short }
          ]}>
            <MaterialIcons name={isBuy ? 'trending-up' : 'trending-down'} size={12} color={COLORS.text} />
            <Text style={styles.directionText}>{suggestion.direction}</Text>
          </View>
          <Text style={styles.symbol}>{suggestion.symbol}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.time}>{formatTime(suggestion.timestamp)}</Text>
          <TouchableOpacity onPress={copyAllPrices} style={styles.copyAllBtn}>
            <MaterialIcons name="content-copy" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Confidence - compact */}
      <View style={styles.confidenceRow}>
        <Ionicons name="shield-checkmark" size={12} color={getConfidenceColor(suggestion.confidence)} />
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <Text style={[styles.confidenceValue, { color: getConfidenceColor(suggestion.confidence) }]}>
          {suggestion.confidence}%
        </Text>
        <View style={styles.confidenceBarBg}>
          <View style={[styles.confidenceBarFill, { 
            width: `${suggestion.confidence}%`,
            backgroundColor: getConfidenceColor(suggestion.confidence) 
          }]} />
        </View>
      </View>
      
      {/* Analysis - single line */}
      <Text style={styles.analysisText} numberOfLines={2}>{suggestion.analysis}</Text>
      
      {/* Price Levels - compact copyable rows */}
      <View style={styles.priceContainer}>
        <Text style={styles.priceSectionTitle}>Price Levels</Text>
        <TouchableOpacity 
          style={styles.priceRow} 
          onPress={() => copyToClipboard('Entry', formatPrice(suggestion.entryPrice))}
        >
          <Text style={styles.priceLabel}>Entry</Text>
          <Text style={styles.priceValue}>{formatPrice(suggestion.entryPrice)}</Text>
          <MaterialIcons name="content-copy" size={12} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.priceRow} 
          onPress={() => copyToClipboard('Stop Loss', formatPrice(suggestion.stopLoss))}
        >
          <Text style={styles.priceLabel}>Stop Loss</Text>
          <Text style={[styles.priceValue, { color: COLORS.error }]}>{formatPrice(suggestion.stopLoss)}</Text>
          <MaterialIcons name="content-copy" size={12} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.priceRow} 
          onPress={() => copyToClipboard('TP1', formatPrice(suggestion.tp1))}
        >
          <Text style={styles.priceLabel}>TP1</Text>
          <Text style={[styles.priceValue, { color: COLORS.success }]}>{formatPrice(suggestion.tp1)}</Text>
          <MaterialIcons name="content-copy" size={12} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.priceRow} 
          onPress={() => copyToClipboard('TP2', formatPrice(suggestion.tp2))}
        >
          <Text style={styles.priceLabel}>TP2</Text>
          <Text style={[styles.priceValue, { color: COLORS.success }]}>{formatPrice(suggestion.tp2)}</Text>
          <MaterialIcons name="content-copy" size={12} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      
      {/* Execute Button */}
      {suggestion.executed ? (
        <View style={[
          styles.resultContainer,
          { backgroundColor: suggestion.executionResult?.startsWith('Error') 
              ? COLORS.error + '15' : COLORS.success + '15' }
        ]}>
          <MaterialIcons 
            name={suggestion.executionResult?.startsWith('Error') ? 'error-outline' : 'check-circle'} 
            size={14} 
            color={suggestion.executionResult?.startsWith('Error') ? COLORS.error : COLORS.success} 
          />
          <Text style={[
            styles.resultText,
            { color: suggestion.executionResult?.startsWith('Error') ? COLORS.error : COLORS.success }
          ]}>
            {suggestion.executionResult}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.executeButton, { backgroundColor: isBuy ? COLORS.long : COLORS.short }]}
          onPress={handleExecute}
          activeOpacity={0.8}
        >
          <MaterialIcons name={isBuy ? 'shopping-cart' : 'sell'} size={16} color={COLORS.text} />
          <Text style={styles.executeButtonText}>Execute {suggestion.direction}</Text>
        </TouchableOpacity>
      )}
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
    marginBottom: SIZES.paddingSmall,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  directionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  directionText: { ...FONTS.bold, fontSize: 10, color: COLORS.text },
  symbol: { ...FONTS.semibold, fontSize: 13, color: COLORS.text },
  time: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  copyAllBtn: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  confidenceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6,
  },
  confidenceLabel: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  confidenceValue: { ...FONTS.bold, fontSize: 11, marginRight: 4 },
  confidenceBarBg: {
    flex: 1, height: 3, backgroundColor: COLORS.surfaceLight, borderRadius: 2, overflow: 'hidden',
  },
  confidenceBarFill: { height: '100%', borderRadius: 2 },
  analysisText: {
    ...FONTS.regular, fontSize: 10, color: COLORS.textSecondary, 
    lineHeight: 14, marginBottom: 6,
  },
  priceContainer: {
    backgroundColor: COLORS.surfaceLight, borderRadius: SIZES.radiusSmall, padding: 8, marginBottom: 8,
  },
  priceSectionTitle: {
    ...FONTS.semibold, fontSize: 10, color: COLORS.textMuted, 
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3,
  },
  priceLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary },
  priceValue: { ...FONTS.semibold, fontSize: 12, color: COLORS.text, flex: 1, textAlign: 'right' },
  resultContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 8, borderRadius: SIZES.radiusSmall,
  },
  resultText: { ...FONTS.medium, fontSize: 11 },
  executeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: SIZES.radiusSmall,
  },
  executeButtonText: { ...FONTS.semibold, fontSize: 13, color: COLORS.text },
  });
};
