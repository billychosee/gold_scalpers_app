import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [autoTrade, setAutoTrade] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Trading Settings */}
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

      {/* Notifications */}
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

      {/* Display */}
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

      {/* Connection */}
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

const styles = StyleSheet.create({
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
});
