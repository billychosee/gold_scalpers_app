import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Share } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { tradeJournal } from '../../services/TradeJournal';

interface SettingsPageProps {
  onBack: () => void;
  onViewJournal: () => void;
  onViewSymbols: () => void;
  paperTrading: boolean;
  onTogglePaperTrading: (value: boolean) => Promise<void>;
  themeMode: 'system' | 'light' | 'dark';
  onSetThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  upcomingEvents: Array<{ id: string; title: string; currency: string; impact: string; scheduledTime: number }>;
  onRefreshNews: () => Promise<void>;
  activeSymbolCount: number;
  discoveredSymbolCount: number;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onViewJournal, onViewSymbols, paperTrading, onTogglePaperTrading, themeMode, onSetThemeMode, upcomingEvents, onRefreshNews, activeSymbolCount, discoveredSymbolCount }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [autoTrade, setAutoTrade] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [journalCount, setJournalCount] = useState(0);

  useEffect(() => {
    tradeJournal.getEntryCount().then(setJournalCount);
  }, []);

  const handleExportCSV = async () => {
    try {
      const csv = await tradeJournal.exportToCSV();
      if (csv.split('\n').length <= 1) {
        Alert.alert('Empty Journal', 'No entries to export.');
        return;
      }
      await Share.share({
        message: csv,
      });
    } catch (err) {
      Alert.alert('Export Failed', 'Could not generate CSV.');
    }
  };

  const handleClearJournal = () => {
    Alert.alert(
      'Clear Journal',
      'This will permanently delete all journal entries. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await tradeJournal.clearJournal();
            setJournalCount(0);
            Alert.alert('Done', 'Journal cleared.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* ── Trading Mode ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trading Mode</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="science" size={18} color="#3B82F6" />
            <View>
              <Text style={styles.settingLabel}>Paper Trading</Text>
              <Text style={styles.settingDesc}>Simulate trades without real orders</Text>
            </View>
          </View>
          <Switch
            value={paperTrading}
            onValueChange={(val) => {
              onTogglePaperTrading(val);
            }}
            trackColor={{ false: COLORS.surfaceLight, true: '#3B82F660' }}
            thumbColor={paperTrading ? '#3B82F6' : COLORS.textMuted}
          />
        </View>
      </View>

      {/* ── Manage Symbols ── */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.journalButton} onPress={onViewSymbols}>
          <MaterialIcons name="widgets" size={18} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Manage Symbols</Text>
            <Text style={styles.settingDesc}>
              {activeSymbolCount} active / {discoveredSymbolCount} discovered
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Display Theme ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display Theme</Text>
        <View style={styles.themeOptions}>
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.themeOption, themeMode === mode && styles.themeOptionActive]}
              onPress={() => onSetThemeMode(mode)}
            >
              <MaterialIcons
                name={
                  mode === 'system' ? 'phone-android'
                  : mode === 'light' ? 'light-mode'
                  : 'dark-mode'
                }
                size={16}
                color={themeMode === mode ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.themeOptionText, themeMode === mode && styles.themeOptionTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Economic News ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Economic News</Text>
          <TouchableOpacity onPress={onRefreshNews}>
            <MaterialIcons name="refresh" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {upcomingEvents.length === 0 ? (
          <Text style={styles.newsEmpty}>No high-impact events upcoming</Text>
        ) : (
          upcomingEvents.slice(0, 6).map((event) => {
            const eventDate = new Date(event.scheduledTime);
            const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = eventDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
            return (
              <View key={event.id} style={styles.newsEventRow}>
                <View style={styles.newsEventInfo}>
                  <MaterialIcons name="warning" size={14} color={COLORS.error} />
                  <View>
                    <Text style={styles.newsEventTitle}>{event.title}</Text>
                    <Text style={styles.newsEventMeta}>{event.currency} — {dateStr} {timeStr}</Text>
                  </View>
                </View>
                <Text style={[styles.newsImpactBadge, { backgroundColor: COLORS.error + '20', color: COLORS.error }]}>
                  HIGH
                </Text>
              </View>
            );
          })
        )}
        {upcomingEvents.length > 6 && (
          <Text style={styles.newsMore}>+{upcomingEvents.length - 6} more events</Text>
        )}
      </View>

      {/* ── Trade Journal ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trade Journal</Text>
        <Text style={styles.journalSummary}>
          {journalCount} {journalCount === 1 ? 'entry' : 'entries'} recorded
        </Text>

        <TouchableOpacity style={styles.journalButton} onPress={onViewJournal}>
          <MaterialIcons name="list-alt" size={18} color={COLORS.primary} />
          <Text style={styles.journalButtonText}>View Trade Journal</Text>
          <MaterialIcons name="chevron-right" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.journalButton} onPress={handleExportCSV}>
          <MaterialIcons name="file-download" size={18} color={COLORS.success} />
          <Text style={styles.journalButtonText}>Export Journal to CSV</Text>
          <MaterialIcons name="chevron-right" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.journalButton} onPress={handleClearJournal}>
          <MaterialIcons name="delete-forever" size={18} color={COLORS.error} />
          <Text style={[styles.journalButtonText, { color: COLORS.error }]}>Clear Journal</Text>
          <MaterialIcons name="chevron-right" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Trading Settings ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trading</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="flash-on" size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.settingLabel}>Auto-Execute Trades</Text>
              <Text style={styles.settingDesc}>Automatically open positions from signals</Text>
            </View>
          </View>
          <Switch
            value={autoTrade}
            onValueChange={setAutoTrade}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
            thumbColor={autoTrade ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="tune" size={18} color={COLORS.gold} />
            <View>
              <Text style={styles.settingLabel}>Min Confidence</Text>
              <Text style={styles.settingDesc}>Minimum confidence to show signals</Text>
            </View>
          </View>
          <Text style={styles.settingValue}>50%</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="attach-money" size={18} color={COLORS.success} />
            <View>
              <Text style={styles.settingLabel}>Stake Amount</Text>
              <Text style={styles.settingDesc}>USD per trade</Text>
            </View>
          </View>
          <Text style={styles.settingValue}>$1.00</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="timeline" size={18} color={COLORS.secondary} />
            <View>
              <Text style={styles.settingLabel}>SMA Period</Text>
              <Text style={styles.settingDesc}>Moving average period</Text>
            </View>
          </View>
          <Text style={styles.settingValue}>20</Text>
        </View>
      </View>

      {/* ── Notifications ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={18} color={COLORS.warning} />
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Get alerts for trade signals</Text>
            </View>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
            thumbColor={notifications ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="volume-high" size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.settingLabel}>Sound</Text>
              <Text style={styles.settingDesc}>Play sound on signal</Text>
            </View>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
            thumbColor={soundEnabled ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      </View>

      {/* ── Display ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="dark-mode" size={18} color={COLORS.textMuted} />
            <View>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDesc}>Use dark theme</Text>
            </View>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
            thumbColor={darkMode ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      </View>

      {/* ── Connection ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="wifi" size={18} color={COLORS.success} />
            <View>
              <Text style={styles.settingLabel}>Reconnect Interval</Text>
              <Text style={styles.settingDesc}>Auto-reconnect delay</Text>
            </View>
          </View>
          <Text style={styles.settingValue}>3s</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="refresh" size={18} color={COLORS.secondary} />
            <View>
              <Text style={styles.settingLabel}>Max Reconnect Attempts</Text>
              <Text style={styles.settingDesc}>Before giving up</Text>
            </View>
          </View>
          <Text style={styles.settingValue}>5</Text>
        </View>
      </View>
    </ScrollView>
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
  section: {
    marginTop: SIZES.paddingMedium,
    marginHorizontal: SIZES.paddingMedium,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMedium,
  },
  sectionTitle: {
    ...FONTS.semibold,
    fontSize: SIZES.small,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.paddingSmall,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingLabel: { ...FONTS.medium, fontSize: SIZES.font, color: COLORS.text },
  settingDesc: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  settingValue: { ...FONTS.semibold, fontSize: SIZES.font, color: COLORS.primary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  // Theme section
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  themeOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  themeOptionText: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  themeOptionTextActive: { color: COLORS.primary },
  // News section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsEmpty: {
    ...FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    paddingVertical: 8,
  },
  newsEventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  newsEventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  newsEventTitle: { ...FONTS.medium, fontSize: 12, color: COLORS.text },
  newsEventMeta: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  newsImpactBadge: {
    ...FONTS.bold,
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  newsMore: {
    ...FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  // Journal section
  journalSummary: {
    ...FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingSmall,
  },
  journalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  journalButtonText: {
    ...FONTS.medium,
    fontSize: SIZES.font,
    color: COLORS.text,
    flex: 1,
  },
  });
};
