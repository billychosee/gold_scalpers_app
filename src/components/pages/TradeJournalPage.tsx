import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { tradeJournal } from '../../services/TradeJournal';
import { JournalEntry } from '../../types';

interface TradeJournalPageProps {
  onBack: () => void;
}

type FilterType = 'all' | 'executed' | 'wins' | 'losses' | 'not_executed';

export const TradeJournalPage: React.FC<TradeJournalPageProps> = ({ onBack }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<{
    totalSignals: number;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
  } | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    let loaded: JournalEntry[];
    switch (filter) {
      case 'wins':
        loaded = await tradeJournal.getFiltered({ outcome: 'win' });
        break;
      case 'losses':
        loaded = await tradeJournal.getFiltered({ outcome: 'loss' });
        break;
      case 'not_executed':
        loaded = await tradeJournal.getFiltered({ outcome: 'not_executed' });
        break;
      case 'executed':
        loaded = await tradeJournal.getFiltered({ outcome: 'win' });
        const losses = await tradeJournal.getFiltered({ outcome: 'loss' });
        loaded = [...loaded, ...losses].sort(
          (a, b) => new Date(b.timestamp_signal).getTime() - new Date(a.timestamp_signal).getTime(),
        );
        break;
      default:
        loaded = await tradeJournal.getAllEntries();
    }
    setEntries(loaded);
    setStats(await tradeJournal.getStats());
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (symbol: string, price: number) => {
    if (symbol.includes('XAUUSD')) return price.toFixed(2);
    return price.toFixed(4);
  };

  const getOutcomeColor = (outcome: string | null) => {
    if (outcome === 'win') return COLORS.success;
    if (outcome === 'loss') return COLORS.error;
    return COLORS.textMuted;
  };

  const getOutcomeLabel = (entry: JournalEntry) => {
    if (entry.actual_outcome === 'win') return 'WIN';
    if (entry.actual_outcome === 'loss') return 'LOSS';
    if (entry.actual_outcome === 'not_executed') return 'Signal only';
    return 'Pending';
  };

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'executed', label: 'Trades' },
    { key: 'wins', label: 'Wins' },
    { key: 'losses', label: 'Losses' },
    { key: 'not_executed', label: 'Signals' },
  ];

  const renderItem = ({ item }: { item: JournalEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryHeaderLeft}>
          <Text style={styles.entrySymbol}>{item.symbol}</Text>
          <View style={[
            styles.directionBadge,
            { backgroundColor: item.direction === 'BUY' || item.direction === 'CALL' ? COLORS.long : COLORS.short },
          ]}>
            <Text style={styles.directionText}>{item.direction}</Text>
          </View>
          {item.paper_trade && (
            <View style={styles.paperBadge}>
              <Text style={styles.paperBadgeText}>PAPER</Text>
            </View>
          )}
        </View>
        <View style={styles.entryHeaderRight}>
          <Text style={[styles.outcomeText, { color: getOutcomeColor(item.actual_outcome) }]}>
            {getOutcomeLabel(item)}
          </Text>
          {item.profit !== 0 && (
            <Text style={[
              styles.profitText,
              { color: item.profit > 0 ? COLORS.success : COLORS.error },
            ]}>
              {item.profit > 0 ? '+' : ''}{item.profit.toFixed(2)}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.timeText}>{formatTime(item.timestamp_signal)}</Text>

      {item.signal_reason ? (
        <Text style={styles.reasonText} numberOfLines={2}>{item.signal_reason}</Text>
      ) : null}

      <View style={styles.entryDetails}>
        {item.entry_price > 0 && (
          <Text style={styles.detailText}>
            Entry: {formatPrice(item.symbol, item.entry_price)}
          </Text>
        )}
        {item.payout_percent != null && (
          <Text style={styles.detailText}>Payout: {item.payout_percent}%</Text>
        )}
        {item.latency_ms > 0 && (
          <Text style={styles.detailText}>Latency: {item.latency_ms}ms</Text>
        )}
        <Text style={styles.detailText}>HTF: {item.htf_trend}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Journal</Text>
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSignals}</Text>
            <Text style={styles.statLabel}>Signals</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalTrades}</Text>
            <Text style={styles.statLabel}>Trades</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.error }]}>{stats.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.winRate.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              { color: stats.totalProfit >= 0 ? COLORS.success : COLORS.error },
            ]}>
              {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total P&L</Text>
          </View>
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        {filterButtons.map((fb) => (
          <TouchableOpacity
            key={fb.key}
            style={[styles.filterBtn, filter === fb.key && styles.filterBtnActive]}
            onPress={() => setFilter(fb.key)}
          >
            <Text style={[styles.filterBtnText, filter === fb.key && styles.filterBtnTextActive]}>
              {fb.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Entries List */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No journal entries yet</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Signals and trades will appear here automatically'
                : 'No entries match this filter'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const createStyles = (colors: typeof COLORS) => {
  const COLORS = colors;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SIZES.paddingMedium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...FONTS.semibold, fontSize: SIZES.large, color: COLORS.text },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SIZES.paddingSmall,
    gap: 4,
  },
  statItem: {
    flex: 1,
    minWidth: 55,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  statLabel: { ...FONTS.regular, fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.paddingMedium,
    paddingVertical: SIZES.paddingSmall,
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  filterBtnText: { ...FONTS.medium, fontSize: 11, color: COLORS.textMuted },
  filterBtnTextActive: { color: COLORS.primary },
  // List
  listContent: { padding: SIZES.paddingMedium, paddingBottom: SIZES.paddingLarge },
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingSmall + 4,
    marginBottom: SIZES.paddingSmall,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entrySymbol: { ...FONTS.semibold, fontSize: 13, color: COLORS.text },
  directionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  directionText: { ...FONTS.bold, fontSize: 9, color: COLORS.text },
  paperBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  paperBadgeText: { ...FONTS.bold, fontSize: 8, color: '#FFFFFF' },
  outcomeText: { ...FONTS.semibold, fontSize: 11 },
  profitText: { ...FONTS.bold, fontSize: 12 },
  timeText: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  reasonText: {
    ...FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14,
    marginBottom: 6,
  },
  entryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailText: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: { ...FONTS.semibold, fontSize: 16, color: COLORS.textMuted },
  emptySubtext: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  });
};
