import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { NewsEvent } from '../../services/NewsFilter';

interface NewsPageProps {
  onBack: () => void;
  events: NewsEvent[];
  onRefresh: () => Promise<void>;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onBack, events, onRefresh }) => {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const formatEventTime = (epochMs: number) => {
    const d = new Date(epochMs);
    return {
      date: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'High') return COLORS.error;
    if (impact === 'Medium') return COLORS.warning;
    return COLORS.textMuted;
  };

  // Split events into today and tomorrow
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const dayAfterTomorrow = tomorrowStart + 24 * 60 * 60 * 1000;

  const todayEvents = events.filter((e) => e.scheduledTime >= todayStart && e.scheduledTime < tomorrowStart);
  const tomorrowEvents = events.filter((e) => e.scheduledTime >= tomorrowStart && e.scheduledTime < dayAfterTomorrow);
  const laterEvents = events.filter((e) => e.scheduledTime >= dayAfterTomorrow);

  const renderEvent = (event: NewsEvent) => {
    const { date, time } = formatEventTime(event.scheduledTime);
    const impactColor = getImpactColor(event.impact);

    return (
      <View key={event.id} style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.impactBar, { backgroundColor: impactColor }]} />
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
              {event.title}
            </Text>
            <View style={[styles.impactBadge, { backgroundColor: impactColor + '20' }]}>
              <Text style={[styles.impactText, { color: impactColor }]}>{event.impact.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.eventMeta}>
            <MaterialIcons name="attach-money" size={12} color={colors.textMuted} />
            <Text style={[styles.eventCurrency, { color: colors.textSecondary }]}>{event.currency}</Text>
            <MaterialIcons name="schedule" size={12} color={colors.textMuted} />
            <Text style={[styles.eventTime, { color: colors.textSecondary }]}>{date} {time}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSection = (title: string, items: NewsEvent[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
        {items.map(renderEvent)}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Economic News</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-available" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No high-impact events</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Pull down to refresh the calendar
            </Text>
          </View>
        ) : (
          <>
            {renderSection('Today', todayEvents)}
            {renderSection('Tomorrow', tomorrowEvents)}
            {laterEvents.length > 0 && renderSection('Later This Week', laterEvents)}
          </>
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
    gap: 12,
    padding: SIZES.paddingMedium,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...FONTS.semibold, fontSize: SIZES.large },
  listContent: { padding: SIZES.paddingMedium, paddingBottom: SIZES.paddingLarge },
  section: { marginBottom: SIZES.paddingMedium },
  sectionTitle: {
    ...FONTS.semibold,
    fontSize: SIZES.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.paddingSmall,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    marginBottom: SIZES.paddingSmall,
    overflow: 'hidden',
  },
  impactBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: SIZES.paddingSmall + 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  eventTitle: { ...FONTS.semibold, fontSize: 13, flex: 1, marginRight: 8 },
  impactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  impactText: { ...FONTS.bold, fontSize: 9, letterSpacing: 0.5 },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventCurrency: { ...FONTS.medium, fontSize: 11, marginRight: 6 },
  eventTime: { ...FONTS.regular, fontSize: 11 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: { ...FONTS.semibold, fontSize: 16 },
  emptySubtext: { ...FONTS.regular, fontSize: 12, textAlign: 'center' },
});
