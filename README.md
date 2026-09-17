# Gold Scalpers

Gold Scalpers is an Expo SDK 57 React Native application for monitoring Deriv market data, analyzing price action, generating BUY/SELL trade signals, and tracking positions for XAU/USD, GBP/USD, AUD/USD, and Volatility 100 (R_100).

The app is intended for development, evaluation, and paper trading. It can connect to Deriv demo or real accounts, but real-account access requires an explicit opt-in.

## Features

- Live tick streams for XAUUSD, GBPUSD, AUDUSD, and synthetic indices including R_10, R_25, R_50, R_75, 1HZ15V, 1HZ30V, 1HZ90V, BOOM500, BOOM600, CRASH500, and CRASH600 through the Deriv WebSocket API
- 20-period SMA and market-direction indicators
- Higher-timeframe EMA8/EMA21 trend analysis for supported FX symbols
- BUY/SELL signals with 3-tick confirmation, 2-minute signal cooldown, confidence scores, and analysis text
- Trade suggestions with entry, resistance/support context, stop-loss, and take-profit targets
- Active-position tracking with live profit and close-position actions
- Balance, currency, and date-range profit summaries
- Trade History page for executed suggestions in the current app session
- Persistent Trade Journal with signal, execution, outcome, P&L, filtering, statistics, CSV export, and clearing tools
- Economic News page and news modal with high-impact event alerts
- High-impact news danger-window protection for relevant FX symbols
- Paper trading mode with simulated orders and five-minute outcome resolution
- Persistent light, dark, and system theme preferences
- Side-drawer navigation for Dashboard, Market Watch, Trade Signals, Trade History, Economic News, Settings, and About
- Demo-account selection by default, with explicit real-account opt-in
- Automatic reconnect, rate-limit cooldown, and market-closed retry helpers
- Android, iOS, and web targets
- No-lookahead M1 synthetic-index backtesting with train/test reporting and expected-value metrics

## Technology

- Expo SDK 57 (`expo ~57.0.21`, `expo-status-bar ~57.0.1`)
- React Native 0.86 and React 19
- TypeScript
- Deriv REST and WebSocket APIs
- AsyncStorage for local settings, news cache, and trade journal data
- EAS Build

## Requirements

- Node.js 22.13.x or a compatible Node.js 22 release
- npm
- Apple Xcode for iOS builds on macOS
- Android Studio for Android builds
- An EAS account for cloud builds
- A Deriv application ID and a restricted API token with the required account access

## Install

```sh
npm install
```

Create a `.env` file in the project root. This file is ignored by Git.

```env
EXPO_PUBLIC_DERIV_APP_ID=your_deriv_app_id
EXPO_PUBLIC_DERIV_API_TOKEN=your_restricted_deriv_api_token
EXPO_PUBLIC_ALLOW_REAL=false
EXPO_PUBLIC_PAPER_TRADING=true
```

`EXPO_PUBLIC_PAPER_TRADING=true` enables paper trading on the first launch. The setting can then be changed and persisted from the app's Settings page.

`EXPO_PUBLIC_*` values are bundled into the client application. Use restricted demo credentials, never production credentials, and do not commit `.env`. Real-account access remains disabled unless `EXPO_PUBLIC_ALLOW_REAL` is set exactly to `true` and the account-selection flow permits a real account.

## Development

Start Metro:

```sh
npm start
```

Run on a specific target:

```sh
npm run android
npm run ios
npm run web

# Run the historical synthetic-index backtest
npm run backtest -- --symbol=R_100 --from=2026-01-01 --to=2026-09-01 --strategy=sma_trend
```

Check TypeScript without emitting files:

```sh
npx tsc --noEmit
```

## EAS Builds

Install the EAS CLI if it is not already available:

```sh
npm install --global eas-cli
```

Create an internal preview APK:

```sh
npx eas build --profile preview --platform android
```

Production and development profiles can be added to `eas.json` when needed. iOS builds require configured Apple credentials and certificates.

## Optional WebSocket Check

The repository includes a standalone Node.js smoke test for the public Deriv WebSocket endpoint:

```sh
node test-ws.js
```

The test subscribes to R_100 ticks for 60 seconds and reports whether ticks are received. It is useful for separating network-level connection troubleshooting.

## Project Structure

```text
.
├── App.tsx                  # Root navigation and dashboard layout
├── assets/                  # App icons and other static assets
├── src/
│   ├── components/
│   │   ├── pages/           # MarketWatch, TradeHistory, Settings, News, Journal, About
│   │   ├── ActivePositions.tsx
│   │   ├── BalanceCard.tsx
│   │   ├── Header.tsx
│   │   ├── MarketDataCard.tsx
│   │   ├── NewsModal.tsx
│   │   ├── ProfitSummary.tsx
│   │   ├── SideDrawer.tsx
│   │   ├── TradeSuggestionCard.tsx
│   │   ├── TradeSuggestionsList.tsx
│   │   └── TradingModeBanner.tsx
│   ├── constants/           # Theme, symbols, trading, and API configuration
│   ├── context/             # Theme context and persistence
│   ├── hooks/               # Deriv connection and application state
│   ├── services/            # Deriv, news, settings, and journal services
│   └── types/               # API and application TypeScript types
├── app.json                 # Expo application configuration
├── eas.json                 # EAS Build profiles
├── package.json             # Dependencies and development scripts
├── scripts/backtest.ts      # Historical M1 SMA crossover backtester
├── test-ws.js               # Optional Deriv WebSocket smoke test
└── .env                     # Local environment values; ignored by Git
```

## Current Behavior and Limitations

- Higher-timeframe H4/D1 analysis is currently applied to XAUUSD, GBPUSD, and AUDUSD. R_100 uses tick and SMA analysis without H4/D1 trend analysis.
- Market Watch displays the FX symbols and the configured synthetic-index collection. Synthetic symbols use SMA/crossover state and do not require FX H4/D1 analysis.
- Trade History is session-scoped. The Trade Journal is the persistent record of signals, executions, and outcomes.
- Several Settings controls are currently display-only, including Auto-Execute Trades, minimum confidence, stake amount, SMA period, push notifications, sound, and connection values. Paper trading and theme preferences are functional and persisted.
- Economic news is loaded from the Trading Economics guest calendar and cached locally for one hour. News blocking applies to relevant FX symbols; R_100 is treated as a synthetic instrument and is not blocked by news events.
- The backtester assumes an 80% payout and does not claim that a positive sample is durable edge. A bounded R_100 validation from 2026-01-01 through 2026-01-15 produced 312 trades, a 52.24% win rate, EV of -0.0596 per stake, and profit factor 0.8752, so that sample was not profitable.

## Security and Data Notes

- Deriv credentials supplied through `EXPO_PUBLIC_*` are included in client builds and should be treated as public configuration, not server secrets.
- Use a restricted Deriv token with the minimum required permissions and rotate it if it is ever exposed.
- Local settings, news cache, and journal entries are stored in AsyncStorage and are not encrypted.
- Do not store production credentials, private keys, or sensitive account information in the repository.

## Trading Disclaimer

This application is provided for development and evaluation purposes. Market data, signals, simulated trades, and automated trade actions can result in financial loss. Verify all behavior with a Deriv demo account, understand the trading strategy and risks, and never trade funds you cannot afford to lose.
