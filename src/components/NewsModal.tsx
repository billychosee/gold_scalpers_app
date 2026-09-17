import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { NewsEvent } from '../services/NewsFilter';

interface NewsModalProps {
  visible: boolean;
  onClose: () => void;
  events: NewsEvent[];
  onViewAll: () => void;
}

export const NewsModal: React.FC<NewsModalProps> = ({ visible, onClose, events, onViewAll }) => {
  const { colors } = useTheme();

  const formatTime = (epochMs: number) => {
    const d = new Date(epochMs);
    const now = new Date();
    const diffMs = epochMs - now.getTime();
    const diffMin = Math.round(diffMs / (1000 * 60));

    if (diffMin > 0 && diffMin < 60) return `in ${diffMin} min`;
    if (diffMin >= 60 && diffMin < 1440) return `in ${Math.round(diffMin / 60)}h`;
    if (diffMin < 0 && diffMin > -60) return `${Math.abs(diffMin)} min ago`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.popup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.popupHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.popupHeaderLeft}>
              <MaterialIcons name="notifications" size={18} color={COLORS.primary} />
              <Text style={[styles.popupTitle, { color: colors.text }]}>Economic News</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Events List */}
          <ScrollView style={styles.eventList} nestedScrollEnabled>
            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-available" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No upcoming high-impact events</Text>
              </View>
            ) : (
              events.slice(0, 8).map((event) => (
                <View key={event.id} style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.eventDot, { backgroundColor: COLORS.error }]} />
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={[styles.eventMeta, { color: colors.textMuted }]}>
                      {event.currency} — {formatTime(event.scheduledTime)}
                    </Text>
                  </View>
                  <View style={[styles.eventBadge, { backgroundColor: COLORS.error + '15' }]}>
                    <Text style={[styles.eventBadgeText, { color: COLORS.error }]}>HIGH</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          {events.length > 0 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, { borderTopColor: colors.border }]}
              onPress={() => { onClose(); onViewAll(); }}
            >
              <Text style={[styles.viewAllText, { color: COLORS.primary }]}>View All Events</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  popup: {
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    maxHeight: 400,
    overflow: 'hidden',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.paddingMedium,
    borderBottomWidth: 1,
  },
  popupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popupTitle: { ...FONTS.semibold, fontSize: SIZES.medium },
  eventList: {
    maxHeight: 300,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.paddingSmall + 4,
    paddingHorizontal: SIZES.paddingMedium,
    borderBottomWidth: 1,
    gap: 10,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: { ...FONTS.medium, fontSize: 13 },
  eventMeta: { ...FONTS.regular, fontSize: 11, marginTop: 2 },
  eventBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventBadgeText: { ...FONTS.bold, fontSize: 9, letterSpacing: 0.5 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: { ...FONTS.regular, fontSize: 13 },
  viewAllBtn: {
    padding: SIZES.paddingMedium,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  viewAllText: { ...FONTS.semibold, fontSize: 13 },
});
