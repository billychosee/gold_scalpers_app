import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
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
  const renderItem = ({ item }: { item: TradeSuggestion }) => (
    <TradeSuggestionCard suggestion={item} onExecute={onExecute} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Trade Suggestions</Text>
      <Text style={styles.emptySubtitle}>
        Suggestions will appear when LONG context is detected (price {'>'} SMA)
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suggested Trades</Text>
        <Text style={styles.count}>{suggestions.length}/10</Text>
      </View>
      
      <FlatList
        data={suggestions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={suggestions.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: SIZES.paddingMedium,
    paddingHorizontal: SIZES.paddingMedium,
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
  count: {
    ...FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  list: {
    paddingBottom: SIZES.paddingMedium,
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
  },
});