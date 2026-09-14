# Gold Scalpers

Gold Scalpers is an Expo SDK 57 React Native app that streams Deriv market data, analyzes multi-timeframe trends, and manages BUY/SELL trade signals and active positions for XAU/USD, GBP/USD, AUD/USD, and Volatility 100.

## Features

- Live tick streams for XAUUSD, GBPUSD, AUDUSD, and R_100 through the Deriv WebSocket API
- Multi-timeframe analysis using H4/D1 EMA8/EMA21 trend detection
- 20-period SMA and market direction indicators
- BUY/SELL signals with 3-tick confirmation, 2-minute signal cooldown, confidence scores, and analysis text
- Trade suggestions with resistance/support entry, stop-loss, and take-profit targets
- Active position tracking with live profit and close-position actions
- Balance, currency, and date-range profit summary
- Trade History page for executed suggestions
- Side-drawer navigation with Dashboard, Market Watch, Trade Signals, Trade History, Settings, and About pages
- Demo-account selection by default, with explicit real-account opt-in
- Automatic reconnect and market-closed retry helpers
- Android, iOS, and web targets

## Technology

- Expo SDK 57 (`expo ~57.0.21`, `expo-status-bar ~57.0.1`)
- React Native 0.86 and React 19
- TypeScript
- Deriv REST and WebSocket APIs
- EAS Build

## Requirements

- Node.js 22.13.x
- npm
- Apple Xcode for iOS builds on macOS
- Android Studio for Android builds
- An EAS account for cloud builds

## Install

```sh
npm install
```

Create a `.env` file in the project root. This file is ignored by Git.

```env
EXPO_PUBLIC_DERIV_APP_ID=your_deriv_app_id
EXPO_PUBLIC_DERIV_API_TOKEN=your_deriv_api_token
EXPO_PUBLIC_ALLOW_REAL=false
```

`EXPO_PUBLIC_*` values are bundled into the client application. Use restricted demo tokens, never production credentials, and remove any hardcoded defaults from `src/constants/theme.ts` before public deployment. Real-account access remains disabled unless `EXPO_PUBLIC_ALLOW_REAL` is set exactly to `true` and no demo account is available.

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

## Pushing updates to GitHub

Commit and push project updates:

```sh
git add README.md
git commit -m "Update README"
git push origin main
```

## Project Structure

```text
.
├── App.tsx                  # Root navigation and dashboard layout
├── assets/                  # App icons and other static assets
├── src/
│   ├── components/
│   │   ├── pages/           # MarketWatch, TradeHistory, Settings, About
│   │   ├── ActivePositions.tsx
│   │   ├── BalanceCard.tsx
│   │   ├── Header.tsx
│   │   ├── MarketDataCard.tsx
│   │   ├── ProfitSummary.tsx
│   │   ├── SideDrawer.tsx
│   │   ├── TradeSuggestionCard.tsx
│   │   └── TradeSuggestionsList.tsx
│   ├── constants/           # Theme, symbols, trading, and API configuration
│   ├── hooks/               # Deriv connection and application state
│   ├── services/            # Deriv REST and WebSocket client
│   └── types/               # API and application TypeScript types
├── app.json                 # Expo application configuration
├── eas.json                 # EAS Build profiles
└── package.json             # Dependencies and development scripts
```

## Trading Disclaimer

This application is provided for development and evaluation purposes. Market data, signals, and automated trade actions can result in financial loss. Verify all behavior with a Deriv demo account, understand the trading strategy and risks, and never trade funds you cannot afford to lose.
