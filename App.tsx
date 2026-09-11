import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from './src/constants/theme';
import { useDerivWebSocket } from './src/hooks/useDerivWebSocket';
import { Header } from './src/components/Header';
import { BalanceCard } from './src/components/BalanceCard';
import { MarketDataCard } from './src/components/MarketDataCard';
import { TradeSuggestionsList } from './src/components/TradeSuggestionsList';
import { ProfitSummary } from './src/components/ProfitSummary';

export default function App() {
  const {
    // Connection
    connectionStatus,
    activeLoginId,
    isVirtual,
    accountType,
    error,
    
    // Balance
    balance,
    
    // Profit
    profitTable,
    
    // Market data
    xauusdPrice,
    gbpusdPrice,
    xauusdSma,
    gbpusdSma,
    xauusdContext,
    gbpusdContext,
    
    // Suggestions
    suggestions,
    
    // Actions
    connect,
    disconnect,
    refreshBalance,
    refreshProfitTable,
    executeTrade,
  } = useDerivWebSocket();

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK' }]);
    }
  }, [error]);

  // Get current month's date range for profit table
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    };
  };

  // Refresh profit table for current month
  const handleRefreshProfitTable = () => {
    const { start, end } = getCurrentMonthRange();
    refreshProfitTable(start, end);
  };

  // Handle pull to refresh
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    refreshBalance();
    handleRefreshProfitTable();
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshBalance, handleRefreshProfitTable]);

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
            
            <MarketDataCard
              symbol="XAUUSD"
              price={xauusdPrice}
              sma={xauusdSma}
              context={xauusdContext}
              label="Gold"
            />
            
            <MarketDataCard
              symbol="GBPUSD"
              price={gbpusdPrice}
              sma={gbpusdSma}
              context={gbpusdContext}
              label="British Pound / US Dollar"
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