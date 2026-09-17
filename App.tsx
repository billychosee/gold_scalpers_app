import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, SYMBOLS } from './src/constants/theme';
import { useTheme, ThemeProvider } from './src/context/ThemeContext';
import { useDerivWebSocket } from './src/hooks/useDerivWebSocket';
import { getUpcomingEvents } from './src/services/NewsFilter';
import { Header } from './src/components/Header';
import { BalanceCard } from './src/components/BalanceCard';
import { MarketDataCard } from './src/components/MarketDataCard';
import { ActivePositions } from './src/components/ActivePositions';
import { TradeSuggestionsList } from './src/components/TradeSuggestionsList';
import { ProfitSummary } from './src/components/ProfitSummary';
import { SideDrawer } from './src/components/SideDrawer';
import { SettingsPage } from './src/components/pages/SettingsPage';
import { MarketWatchPage } from './src/components/pages/MarketWatchPage';
import { AboutPage } from './src/components/pages/AboutPage';
import { TradeHistoryPage } from './src/components/pages/TradeHistoryPage';
import { TradeJournalPage } from './src/components/pages/TradeJournalPage';
import { TradingModeBanner } from './src/components/TradingModeBanner';
import { NewsModal } from './src/components/NewsModal';
import { NewsPage } from './src/components/pages/NewsPage';
import { SymbolManagerPage } from './src/components/pages/SymbolManagerPage';

// Inner app component that consumes the theme context
function AppContent() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const effectiveTheme = themeMode === 'system' ? 'dark' : themeMode; // simplified for StatusBar
  const {
    connectionStatus,
    activeLoginId,
    isVirtual,
    accountType,
    error,
    balance,
    profitTable,
    isPaperTrading,
    togglePaperTrading,
    inCooldown,
    cooldownRemainingSec,
    manualRetry,
    blockedSymbols,
    nextNewsEvent,
    minutesUntilNews,
    refreshNews,
    discoveredSymbols,
    activeSymbols,
    toggleSymbol,
    refreshSymbols,
    xauusdPrice,
    gbpusdPrice,
    audusdPrice,
    r100Price,
    xauusdSma,
    gbpusdSma,
    audusdSma,
    r100Sma,
    xauusdDirection,
    gbpusdDirection,
    audusdDirection,
    r100Direction,
    xauusdTrend,
    gbpusdTrend,
    audusdTrend,
    r100Trend,
    syntheticMarkets,
    suggestions,
    activePositions,
    connect,
    disconnect,
    refreshBalance,
    refreshProfitTable,
    executeTrade,
    closePosition,
    refreshHigherTimeframe,
    xauusdClosedUntil,
    gbpusdClosedUntil,
    audusdClosedUntil,
    retrySubscribe,
  } = useDerivWebSocket();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [newsModalVisible, setNewsModalVisible] = useState(false);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK' }]);
    }
  }, [error]);

  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    };
  };

  const handleRefreshProfitTable = () => {
    const { start, end } = getCurrentMonthRange();
    refreshProfitTable(start, end);
  };

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    refreshBalance();
    handleRefreshProfitTable();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshBalance, handleRefreshProfitTable]);

  const handleMenuSelect = (pageId: string) => {
    setActivePage(pageId === 'dashboard' ? null : pageId);
  };

  // Render page content based on active page
  if (activePage) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {activePage === 'settings' && (
              <SettingsPage
                onBack={() => setActivePage(null)}
                onViewJournal={() => setActivePage('journal')}
                onViewSymbols={() => setActivePage('symbols')}
                paperTrading={isPaperTrading}
                onTogglePaperTrading={togglePaperTrading}
                themeMode={themeMode}
                onSetThemeMode={setThemeMode}
                upcomingEvents={getUpcomingEvents()}
                onRefreshNews={refreshNews}
                activeSymbolCount={activeSymbols.length}
                discoveredSymbolCount={discoveredSymbols.length}
              />
            )}
            {activePage === 'journal' && (
              <TradeJournalPage onBack={() => setActivePage('settings')} />
            )}
            {activePage === 'news' && (
              <NewsPage
                onBack={() => setActivePage(null)}
                events={getUpcomingEvents(72)}
                onRefresh={refreshNews}
              />
            )}
            {activePage === 'symbols' && (
              <SymbolManagerPage
                onBack={() => setActivePage(null)}
                discoveredSymbols={discoveredSymbols}
                activeSymbols={activeSymbols}
                onToggleSymbol={toggleSymbol}
                onRefresh={refreshSymbols}
              />
            )}
            {activePage === 'market' && (
              <MarketWatchPage 
                onBack={() => setActivePage(null)}
                xauusdPrice={xauusdPrice}
                gbpusdPrice={gbpusdPrice}
                audusdPrice={audusdPrice}
                xauusdSma={xauusdSma}
                gbpusdSma={gbpusdSma}
                audusdSma={audusdSma}
                xauusdDirection={xauusdDirection}
                gbpusdDirection={gbpusdDirection}
                audusdDirection={audusdDirection}
                xauusdTrend={xauusdTrend}
                gbpusdTrend={gbpusdTrend}
                audusdTrend={audusdTrend}
                xauusdClosedUntil={xauusdClosedUntil}
                gbpusdClosedUntil={gbpusdClosedUntil}
                audusdClosedUntil={null}
                xauusdOnRetry={() => retrySubscribe(SYMBOLS.XAUUSD)}
                gbpusdOnRetry={() => retrySubscribe(SYMBOLS.GBPUSD)}
                audusdOnRetry={() => retrySubscribe(SYMBOLS.AUDUSD)}
                syntheticMarkets={syntheticMarkets}
              />
            )}
            {activePage === 'about' && (
              <AboutPage onBack={() => setActivePage(null)} />
            )}
            {activePage === 'history' && (
              <TradeHistoryPage onBack={() => setActivePage(null)} suggestions={suggestions} />
            )}
            {activePage === 'signals' && (
              <View style={{ flex: 1 }}>
                <Header
                  connectionStatus={connectionStatus}
                  isVirtual={isVirtual}
                  activeLoginId={activeLoginId}
                  accountType={accountType}
                  balance={balance}
                  onMenuPress={() => setDrawerVisible(true)}
                  upcomingNewsCount={blockedSymbols.length > 0 ? blockedSymbols.length : getUpcomingEvents(24).length}
                  onNewsPress={() => setNewsModalVisible(true)}
                />
                <TradeSuggestionsList
                  suggestions={suggestions}
                  onExecute={executeTrade}
                />
              </View>
            )}
          </View>
          <SideDrawer
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            activePage={activePage}
            onMenuSelect={handleMenuSelect}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
        
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Header
            connectionStatus={connectionStatus}
            isVirtual={isVirtual}
            activeLoginId={activeLoginId}
            accountType={accountType}
            balance={balance}
            onMenuPress={() => setDrawerVisible(true)}
            upcomingNewsCount={blockedSymbols.length > 0 ? blockedSymbols.length : getUpcomingEvents(24).length}
            onNewsPress={() => setNewsModalVisible(true)}
          />
          <TradingModeBanner
            isPaperTrading={isPaperTrading}
            accountType={accountType}
          />

          {/* Cooldown / Connection lost banner */}
          {inCooldown && (
              <View style={[styles.cooldownBanner, { backgroundColor: colors.warning }]}>
              <Text style={[styles.cooldownText, { color: colors.background }]}>
                Too many reconnect attempts — waiting {cooldownRemainingSec}s before retrying
              </Text>
            </View>
          )}
          {!inCooldown && connectionStatus === 'disconnected' && (
            <TouchableOpacity style={[styles.retryBanner, { backgroundColor: colors.error }]} onPress={manualRetry}>
              <Text style={styles.retryText}>Connection lost — tap to retry</Text>
            </TouchableOpacity>
          )}

          {/* News danger window banner */}
          {blockedSymbols.length > 0 && nextNewsEvent && (
            <View style={styles.newsBanner}>
              <Text style={styles.newsBannerText}>
                ⚠️ {nextNewsEvent.title} ({nextNewsEvent.currency})
                {minutesUntilNews !== null && minutesUntilNews > 0
                  ? ` in ${Math.ceil(minutesUntilNews)} min`
                  : ' — active'}
                {' — '}
                {blockedSymbols.map(s => s.replace('frx', '')).join(', ')} signals paused
              </Text>
            </View>
          )}
          
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <BalanceCard
              balance={balance}
              onRefresh={refreshBalance}
            />
            
            <ActivePositions
              positions={activePositions}
              onClose={closePosition}
            />
            
            <MarketDataCard
              symbol="XAUUSD"
              price={xauusdPrice}
              sma={xauusdSma}
              direction={xauusdDirection}
              higherTrend={xauusdTrend}
              label="Gold"
              closedUntil={xauusdClosedUntil}
              onRetry={() => retrySubscribe(SYMBOLS.XAUUSD)}
            />

            <MarketDataCard
              symbol="GBPUSD"
              price={gbpusdPrice}
              sma={gbpusdSma}
              direction={gbpusdDirection}
              onRetry={() => retrySubscribe(SYMBOLS.GBPUSD)}
              higherTrend={gbpusdTrend}
              label="British Pound / US Dollar"
              closedUntil={gbpusdClosedUntil}
            />

            <MarketDataCard
              symbol="R_100"
              price={r100Price}
              sma={r100Sma}
              direction={r100Direction}
              higherTrend={r100Trend}
              label="Volatility 100 Index"
              closedUntil={null}
              onRetry={() => retrySubscribe(SYMBOLS.R_100)}
            />
            
            <ProfitSummary
              profitTable={profitTable}
              onRefresh={handleRefreshProfitTable}
            />
            
            <TradeSuggestionsList
              suggestions={suggestions}
              onExecute={executeTrade}
            />
          </ScrollView>
        </View>

        <SideDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          activePage={activePage}
          onMenuSelect={handleMenuSelect}
        />

        {/* News bell popup modal */}
        <NewsModal
          visible={newsModalVisible}
          onClose={() => setNewsModalVisible(false)}
          events={getUpcomingEvents(48)}
          onViewAll={() => setActivePage('news')}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZES.paddingLarge,
  },
  cooldownBanner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: SIZES.paddingMedium,
    alignItems: 'center',
  },
  cooldownText: {
    ...FONTS.semibold,
    fontSize: 12,
    color: '#1A1A2E',
  },
  retryBanner: {
    backgroundColor: COLORS.error,
    paddingVertical: 10,
    paddingHorizontal: SIZES.paddingMedium,
    alignItems: 'center',
  },
  retryText: {
    ...FONTS.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  newsBanner: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: SIZES.paddingMedium,
    alignItems: 'center',
  },
  newsBannerText: {
    ...FONTS.semibold,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

// Default export wraps everything with ThemeProvider
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
