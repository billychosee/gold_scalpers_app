import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Animated, 
  TouchableWithoutFeedback, Dimensions, ScrollView, SafeAreaView 
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  iconLib: 'MaterialIcons' | 'Ionicons' | 'Feather';
}

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
  activePage: string | null;
  onMenuSelect: (pageId: string) => void;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', iconLib: 'MaterialIcons' },
  { id: 'market', icon: 'candlestick-chart', label: 'Market Watch', iconLib: 'MaterialIcons' },
  { id: 'signals', icon: 'auto-graph', label: 'Trade Signals', iconLib: 'MaterialIcons' },
  { id: 'history', icon: 'history', label: 'Trade History', iconLib: 'MaterialIcons' },
  { id: 'news', icon: 'notification-important', label: 'Economic News', iconLib: 'MaterialIcons' },
  { id: 'symbols', icon: 'widgets', label: 'Manage Symbols', iconLib: 'MaterialIcons' },
  { id: 'settings', icon: 'settings', label: 'Settings', iconLib: 'MaterialIcons' },
  { id: 'about', icon: 'info', label: 'About', iconLib: 'MaterialIcons' },
];

export const SideDrawer: React.FC<SideDrawerProps> = ({
  visible,
  onClose,
  activePage,
  onMenuSelect,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlayBg, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      
      <Animated.View style={[styles.drawer, { backgroundColor: colors.surface, borderRightColor: colors.border, transform: [{ translateX: slideAnim }] }]}> 
        <SafeAreaView style={styles.drawerContent}>
          {/* Logo */}
          <View style={styles.drawerHeader}>
            <MaterialIcons name="candlestick-chart" size={32} color={colors.gold} />
            <View>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>GOLD</Text>
              <Text style={[styles.drawerTitleAccent, { color: colors.gold }]}>SCALPER</Text>
            </View>
          </View>
          
          {/* Menu Items */}
          <ScrollView style={styles.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  activePage === item.id && [styles.menuItemActive, { backgroundColor: colors.surfaceLight }]
                ]}
                onPress={() => {
                  onMenuSelect(item.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                {item.iconLib === 'MaterialIcons' ? (
                  <MaterialIcons 
                    name={item.icon as any} 
                    size={20} 
                    color={activePage === item.id ? colors.gold : colors.textSecondary} 
                  />
                ) : item.iconLib === 'Ionicons' ? (
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color={activePage === item.id ? colors.gold : colors.textSecondary} 
                  />
                ) : (
                  <Feather 
                    name={item.icon as any} 
                    size={20} 
                    color={activePage === item.id ? colors.gold : colors.textSecondary} 
                  />
                )}
                <Text style={[
                  styles.menuLabel,
                  activePage === item.id && [styles.menuLabelActive, { color: colors.gold }]
                ]}>
                  {item.label}
                </Text>
                <MaterialIcons 
                  name="chevron-right" 
                  size={18} 
                  color={colors.textMuted} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Version */}
          <View style={styles.drawerFooter}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>v1.0.0</Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  overlayBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SIZES.paddingMedium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerTitle: {
    ...FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    letterSpacing: 1,
  },
  drawerTitleAccent: {
    ...FONTS.bold,
    fontSize: 18,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  menuList: {
    flex: 1,
    paddingTop: SIZES.paddingSmall,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: SIZES.paddingMedium,
    marginHorizontal: SIZES.paddingSmall,
    borderRadius: SIZES.radiusSmall,
  },
  menuItemActive: {
    backgroundColor: COLORS.surfaceLight,
  },
  menuLabel: {
    ...FONTS.medium,
    fontSize: SIZES.font,
    color: COLORS.textSecondary,
    flex: 1,
  },
  menuLabelActive: {
    color: COLORS.gold,
  },
  drawerFooter: {
    padding: SIZES.paddingMedium,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  versionText: {
    ...FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textMuted,
  },
});
