import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { DiscoveredSymbol } from '../../services/SymbolDiscovery';

interface SymbolManagerPageProps {
  onBack: () => void;
  discoveredSymbols: DiscoveredSymbol[];
  activeSymbols: string[];
  onToggleSymbol: (symbol: string) => Promise<void>;
  onRefresh: () => void;
}

export const SymbolManagerPage: React.FC<SymbolManagerPageProps> = ({
  onBack,
  discoveredSymbols,
  activeSymbols,
  onToggleSymbol,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const filteredSymbols = useMemo(() => {
    if (!search.trim()) return discoveredSymbols;
    const q = search.toLowerCase();
    return discoveredSymbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.display_name.toLowerCase().includes(q) ||
        s.submarket.toLowerCase().includes(q),
    );
  }, [discoveredSymbols, search]);

  // Group by submarket
  const grouped = useMemo(() => {
    const groups = new Map<string, DiscoveredSymbol[]>();
    for (const sym of filteredSymbols) {
      const key = sym.submarket || sym.market || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(sym);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSymbols]);

  const activeCount = activeSymbols.length;
  const totalCount = discoveredSymbols.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Symbols</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {activeCount} active / {totalCount} discovered
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={[styles.refreshBtn, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Box */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialIcons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search symbols..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Symbols List */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {grouped.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="widgets" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No symbols found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              {search ? 'Try a different search' : 'Tap refresh to discover symbols'}
            </Text>
          </View>
        ) : (
          grouped.map(([group, symbols]) => (
            <View key={group} style={styles.group}>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group}</Text>
              {symbols.map((sym) => {
                const isActive = activeSymbols.includes(sym.symbol);
                return (
                  <TouchableOpacity
                    key={sym.symbol}
                    style={[styles.symbolRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => onToggleSymbol(sym.symbol)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.symbolInfo}>
                      <View style={[
                        styles.symbolDot,
                        { backgroundColor: isActive ? colors.success : colors.textMuted },
                      ]} />
                      <View>
                        <Text style={[styles.symbolName, { color: colors.text }]}>{sym.symbol}</Text>
                        <Text style={[styles.symbolDisplay, { color: colors.textSecondary }]}>
                          {sym.display_name}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={isActive}
                      onValueChange={() => onToggleSymbol(sym.symbol)}
                      trackColor={{ false: colors.surfaceLight, true: colors.success + '60' }}
                      thumbColor={isActive ? colors.success : colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.paddingMedium,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { ...FONTS.semibold, fontSize: SIZES.large },
  headerSub: { ...FONTS.regular, fontSize: 11, marginTop: 2 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SIZES.paddingMedium,
    marginBottom: 0,
    paddingHorizontal: SIZES.paddingMedium,
    paddingVertical: SIZES.paddingSmall,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...FONTS.regular,
    fontSize: 14,
    paddingVertical: 4,
  },
  listContent: {
    padding: SIZES.paddingMedium,
    paddingBottom: SIZES.paddingLarge,
  },
  group: { marginBottom: SIZES.paddingMedium },
  groupTitle: {
    ...FONTS.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.paddingSmall,
  },
  symbolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.paddingSmall + 4,
    paddingHorizontal: SIZES.paddingMedium,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    marginBottom: 4,
  },
  symbolInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  symbolDot: { width: 8, height: 8, borderRadius: 4 },
  symbolName: { ...FONTS.semibold, fontSize: 13 },
  symbolDisplay: { ...FONTS.regular, fontSize: 11, marginTop: 1 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: { ...FONTS.semibold, fontSize: 16 },
  emptySubtext: { ...FONTS.regular, fontSize: 12, textAlign: 'center' },
});
