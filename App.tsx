import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SYMBOLS } from './src/constants/theme';
import { useDerivWebSocket } from './src/hooks/useDerivWebSocket';
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

export default function App() {
  const {
    connectionStatus,
    activeLoginId,
    isVirtual,
    accountType,
    error,
    balance,
    profitTable,
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
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
          <View style={styles.container}>
            {activePage === 'settings' && (
              <SettingsPage onBack={() => setActivePage(null)} />
            )}
            {activePage === 'market' && (
              <MarketWatchPage 
                onBack={() => setActivePage(null)}
                xauusdPrice={xauusdPrice}
                gbpusdPrice={gbpusdPrice}
                audusdPrice={r100Price}
                xauusdSma={xauusdSma}
                gbpusdSma={gbpusdSma}
                audusdSma={r100Sma}
                xauusdDirection={xauusdDirection}
                gbpusdDirection={gbpusdDirection}
                audusdDirection={r100Direction}
                xauusdTrend={xauusdTrend}
                gbpusdTrend={gbpusdTrend}
                audusdTrend={r100Trend}
                xauusdClosedUntil={xauusdClosedUntil}
                gbpusdClosedUntil={gbpusdClosedUntil}
                audusdClosedUntil={null}
                xauusdOnRetry={() => retrySubscribe(SYMBOLS.XAUUSD)}
                gbpusdOnRetry={() => retrySubscribe(SYMBOLS.GBPUSD)}
                audusdOnRetry={() => retrySubscribe(SYMBOLS.R_100)}
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        <View style={styles.container}>
          <Header
            connectionStatus={connectionStatus}
            isVirtual={isVirtual}
            activeLoginId={activeLoginId}
            accountType={accountType}
            balance={balance}
            onMenuPress={() => setDrawerVisible(true)}
          />
          
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
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
});
