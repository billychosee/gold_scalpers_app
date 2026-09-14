import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

interface AboutPageProps {
  onBack: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
      </View>
      
      <View style={styles.heroSection}>
        <MaterialIcons name="candlestick-chart" size={48} color={COLORS.gold} />
        <Text style={styles.appName}>GOLD SCALPER</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <View style={styles.featureRow}>
          <MaterialIcons name="timeline" size={16} color={COLORS.primary} />
          <Text style={styles.featureText}>Analyzes H4 and D1 higher timeframe trends</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialIcons name="speed" size={16} color={COLORS.gold} />
          <Text style={styles.featureText}>M1/M5 entry signals with 3-tick confirmation</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialIcons name="shield" size={16} color={COLORS.success} />
          <Text style={styles.featureText}>Confidence scoring based on momentum + trend</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialIcons name="auto-graph" size={16} color={COLORS.secondary} />
          <Text style={styles.featureText}>EMA8/EMA21 crossover for trend detection</Text>
        </View>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Risk Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          Trading involves significant risk. Past performance is not indicative of future results. 
          Only trade with money you can afford to lose. This app is for educational purposes.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: SIZES.paddingMedium, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...FONTS.semibold, fontSize: SIZES.large, color: COLORS.text },
  heroSection: { alignItems: 'center', paddingVertical: SIZES.paddingLarge * 2 },
  appName: { ...FONTS.bold, fontSize: 28, color: COLORS.text, letterSpacing: 2, marginTop: 12 },
  version: { ...FONTS.regular, fontSize: SIZES.small, color: COLORS.textMuted, marginTop: 4 },
  infoCard: {
    marginHorizontal: SIZES.paddingMedium, marginBottom: SIZES.paddingMedium,
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium,
    borderWidth: 1, borderColor: COLORS.border, padding: SIZES.paddingMedium,
  },
  infoTitle: {
    ...FONTS.semibold, fontSize: SIZES.font, color: COLORS.text,
    marginBottom: SIZES.paddingMedium,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featureText: { ...FONTS.regular, fontSize: SIZES.small, color: COLORS.textSecondary, flex: 1 },
  disclaimerText: {
    ...FONTS.regular, fontSize: SIZES.small, color: COLORS.textMuted, lineHeight: 18,
  },
});
