# Gold Scalpers

Gold Scalpers is a React Native and Expo SDK 57 application for monitoring Deriv market data and managing trading suggestions for XAU/USD and GBP/USD.

## Features

- Live XAU/USD and GBP/USD tick streams through the Deriv WebSocket API
- Deriv demo-account selection by default, with an explicit real-account opt-in
- Account balance and date-range profit history
- 20-period simple moving average and market-context indicators
- Counter-trend trade suggestions with entry, stop-loss, and take-profit levels
- Five-minute Deriv contract proposals and execution
- Automatic reconnection with exponential backoff
- Pull-to-refresh account and profit data
- Android, iOS, and web targets
- Development, preview, and production EAS Build profiles

## Technology

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript
- Deriv Trading API and WebSocket API
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
EXPO_PUBLIC_DERIV_APP_ID=1089
EXPO_PUBLIC_DERIV_API_TOKEN=your_demo_api_token
EXPO_PUBLIC_ALLOW_REAL=false
```

`EXPO_PUBLIC_DERIV_API_TOKEN` must belong to the Deriv app ID. Use a restricted demo token where possible. Variables prefixed with `EXPO_PUBLIC_` are bundled into the client application, so never place production secrets or unrestricted credentials in this project.

Real-account access remains disabled unless `EXPO_PUBLIC_ALLOW_REAL` is set exactly to `true` and no demo account is available. Test thoroughly with a demo account before considering real trades.

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

Create an Android development build:

```sh
npx eas build --profile development --platform android
```

Create an Android preview APK:

```sh
npx eas build --profile preview --platform android
```

Create a production build:

```sh
npx eas build --profile production --platform android
```

Production iOS builds may also require configured Apple credentials and certificates.

## Project Structure

```text
.
├── App.tsx                  # Root interface and refresh behavior
├── assets/                  # App icons and other static assets
├── src/
│   ├── components/          # Market, account, profit, and trade UI
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
