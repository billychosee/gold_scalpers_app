import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TradeSuggestion } from '../types';
import { TradeSuggestionCard } from './TradeSuggestionCard';

interface TradeSuggestionsListProps {
  suggestions: TradeSuggestion[];
  onExecute: (suggestion: TradeSuggestion) => void;
}

export const TradeSuggestionsList: React.FC<TradeSuggestionsListProps> = ({
  suggestions,
  onExecute,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="pulse-outline" size={32} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Waiting for Signals</Text>
      <Text style={styles.emptySubtitle}>
        BUY/SELL signals will appear when market analysis confirms a direction
      </Text>
      <View style={styles.infoBadges}>
        <View style={styles.infoBadge}>
          <MaterialIcons name="info-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.infoText}>3-tick confirmation required</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="auto-graph" size={18} color={COLORS.gold} />
          <Text style={styles.title}>Trade Signals</Text>
        </View>
        <View style={styles.countContainer}>
          <Text style={styles.count}>{suggestions.length}</Text>
          <Text style={styles.countMax}>/10</Text>
        </View>
      </View>

      {suggestions.length === 0 ? (
        renderEmpty()
      ) : (
        <View style={styles.list}>
          {suggestions.map((item) => (
            <TradeSuggestionCard
              key={item.id}
              suggestion={item}
              onExecute={onExecute}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: typeof COLORS) => {
  const COLORS = colors;
  return StyleSheet.create({
  container: {
    flex: 1,
    marginTop: SIZES.paddingMedium,
    paddingHorizontal: SIZES.paddingMedium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingMedium,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...FONTS.semibold,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  count: {
    ...FONTS.bold,
    fontSize: SIZES.font,
    color: COLORS.primary,
  },
  countMax: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textMuted,
  },
  list: {
    paddingBottom: SIZES.paddingLarge,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.paddingLarge * 2,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingMedium,
  },
  emptyTitle: {
    ...FONTS.semibold,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SIZES.paddingLarge,
    marginBottom: SIZES.paddingMedium,
  },
  infoBadges: {
    alignItems: 'center',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
  },
  infoText: {
    ...FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  });
};
