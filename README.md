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

# Run the historical single-strategy backtest
npm run backtest -- --symbol=R_100 --from=2026-01-01 --to=2026-09-01 --strategy=sma_trend

# Run the nested walk-forward adaptive backtest
npm run adaptive-backtest -- --from=2026-01-01 --to=2026-09-01
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
│   ├── services/            # Deriv, news, settings, journal, and signal-scoring services
│   └── types/               # API and application TypeScript types
├── app.json                 # Expo application configuration
├── eas.json                 # EAS Build profiles
├── package.json             # Dependencies and development scripts
├── scripts/backtest.ts      # Canonical single-strategy historical backtester
├── scripts/strategy-comparison.ts # Monthly multi-symbol comparison runner
├── scripts/strategy-sensitivity.ts # Predeclared execution-policy sensitivity runner
├── scripts/historicalData.ts # Cached, rate-limited candle downloader
├── scripts/runStrategyComparison.ts # JSON runner for supplied candle files
├── scripts/nestedWalkForward.ts # Nested walk-forward adaptive backtest runner
├── src/backtest/            # Shared indicators, execution model, windows, and metrics
│   ├── indicators.ts        # Precomputed indicator series (SMA, EMA, RSI, BB, MACD, etc.)
│   ├── strategyComparison.ts # Canonical strategy engine and comparison runner
│   ├── monthlyWindows.ts    # Monthly window builder for walk-forward splits
│   ├── nestedWalkForward.ts # Nested walk-forward adaptive selection and confirmation
│   ├── strategySensitivity.ts # Execution-policy sensitivity report generator
├── test-ws.js               # Optional Deriv WebSocket smoke test
└── .env                     # Local environment values; ignored by Git
```

## Current Behavior and Limitations

- Higher-timeframe H4/D1 analysis is currently applied to XAUUSD, GBPUSD, and AUDUSD. R_100 uses tick and SMA analysis without H4/D1 trend analysis.
- Market Watch displays the FX symbols and the configured synthetic-index collection. Synthetic symbols use SMA/crossover state and do not require FX H4/D1 analysis.
- Trade History is session-scoped. The Trade Journal is the persistent record of signals, executions, and outcomes.
- Several Settings controls are currently display-only, including Auto-Execute Trades, minimum confidence, stake amount, SMA period, push notifications, sound, and connection values. Paper trading and theme preferences are functional and persisted.
- Economic news is loaded from the Trading Economics guest calendar and cached locally for one hour. News blocking applies to relevant FX symbols; R_100 is treated as a synthetic instrument and is not blocked by news events.
- The backtester assumes an 80% payout and does not claim that a positive sample is durable edge. The canonical 2026-01-01 through 2026-09-01 comparison produced 256 monthly TEST rows, all with negative EV, so no strategy was promoted under the 30-trade, every-window, three-of-four-symbol rule.

## Security and Data Notes

- Deriv credentials supplied through `EXPO_PUBLIC_*` are included in client builds and should be treated as public configuration, not server secrets.
- Use a restricted Deriv token with the minimum required permissions and rotate it if it is ever exposed.
- Local settings, news cache, and journal entries are stored in AsyncStorage and are not encrypted.
- Do not store production credentials, private keys, or sensitive account information in the repository.

## Strategy comparison harness

The comparison uses one canonical engine for the single-strategy backtester, JSON runner, and network-backed monthly comparison:

- SMA crossover (20/50 baseline)
- EMA crossover (8/21)
- RSI mean-reversion (14, 30/70 thresholds)
- Bollinger Band breakout (20, 2 standard deviations)
- Bollinger Band mean-reversion (20, 2 standard deviations)
- MACD crossover (12/26/9)
- Donchian channel breakout (20 completed candles)
- Momentum (3 consecutive candle bodies)

The shared execution model is explicit: signal at the prior completed candle, enter at the current candle open, hold for five candles, assume an 80% net win return and -100% loss, allow overlapping signals, and treat ties as losses. All indicators are precomputed once per symbol. The default split is chronological 60% train, 20% validation, and 20% TEST.

Run the predeclared monthly-window comparison:

```sh
npm run compare-strategies -- --from=2026-01-01 --to=2026-09-01
```

The runner caches candles under `.cache/backtest`, throttles requests, retries with exponential backoff, and reports every monthly window separately. A window passes only with positive EV and at least 30 trades. A strategy is promoted only when it passes every window for at least 3 of 4 symbols. Use `--json` for machine-readable output.

Run the predeclared execution-policy sensitivity report:

```sh
npm run compare-strategy-sensitivity -- --from=2026-01-01 --to=2026-09-01
```

The sensitivity report runs the same 8 monthly windows × 4 symbols × 8 strategies under three fixed policies: `allow`, `skip_until_exit`, and `cooldown` with a fixed five-bar entry gap. Policies are selected before results are inspected, and each policy receives the same promotion rule. A strategy/symbol is marked execution-policy sensitive only when `allow` is negative in every window while the alternative is positive with at least 30 trades in every window. On the cached 2026-01-01 through 2026-09-01 data, all 768 policy/window/symbol/strategy rows failed; no policy promoted a strategy and no strict execution-policy-sensitive pair was found.

To run one canonical backtest:

```sh
npm run backtest -- --symbol=R_100 --from=2026-01-01 --to=2026-09-01 --strategy=sma_trend
```

The JSON runner remains available for supplied candle files:

```sh
npm run backtest:compare -- path/to/candles.json
```

### Follow-up research beyond fixed parameters

The negative result is evidence against these fixed signal definitions under this payout and expiry model; it is not evidence that an unconstrained adaptive or machine-learning strategy will work. Any follow-up should remain a separate, predeclared experiment:

- **Regime-adaptive indicators:** choose periods or thresholds from volatility, trend strength, or rolling distribution features, but fit the rule only on the training portion of each walk-forward segment.
- **Distribution-aware thresholds:** replace fixed RSI/Bollinger cutoffs with training-window quantiles or volatility-normalized distances, with a minimum sample-size rule and no test-window recalibration.
- **State-conditioned execution:** evaluate whether signal direction or expiry should change by regime, while keeping the execution policy fixed during each comparison.
- **Machine-learning wrappers:** use a time-ordered feature pipeline, purged/embargoed validation, nested walk-forward model selection, probability calibration, and a locked final TEST set. Compare against the fixed baselines and a no-trade threshold.
- **Multiple-testing controls:** predeclare the candidate family, cap the search budget, record every attempted configuration, and reserve untouched future data for confirmation. A positive backtest after broad search is not a promotion result by itself.

The sensitivity implementation also keeps indicator computation separate from execution: indicators are calculated once per symbol in O(N) series passes, while policy simulation is rerun against the cached signals. Rolling-channel deques use head indexes rather than repeated array shifts. Signals use only completed observations for current-open entries, and trades crossing a monthly end are excluded from that month's metrics.

## Nested walk-forward (adaptive) backtest

The fixed-parameter comparison in the previous section found no promoted strategy. As a predeclared follow-up within the regime-adaptive category, the adaptive backtest performs a nested walk-forward over a bounded, pre-declared family of parameter candidates:

```sh
npm run adaptive-backtest -- --from=2026-01-01 --to=2026-09-01
```

The runner uses one canonical engine, the same 80% net payout / -100% loss execution model, and precomputed per-symbol indicator series. Each parameter candidate is fixed before data inspection. For each strategy and symbol, the engine evaluates every candidate against training windows, selects the winner by validation EV (with minimum-trade gates), and then runs the selected parameters through an untouched confirmation window that never feeds back into selection. A strategy is promoted only when it achieves a positive-EV PASS on every fold's confirmation window for at least `required-symbols` (default 3) of 4 symbols. Use `--json` for machine-readable output and `--required-symbols=N` to override the threshold.

The 24 candidates span SMA (10/30, 20/50, 30/75), EMA (5/13, 8/21, 13/34), RSI mean-reversion (oversold/sold 20/80, 30/70, 35/65), Bollinger Band breakout and mean-reversion (period 20/30 at 2σ/2.5σ), MACD (8/21/5, 12/26/9, 19/39/9), Donchian channel (10/20/30), and momentum (2/3/4 candle bodies).

## Trading Disclaimer

This application is provided for development and evaluation purposes. Market data, signals, simulated trades, and automated trade actions can result in financial loss. Verify all behavior with a Deriv demo account, understand the trading strategy and risks, and never trade funds you cannot afford to lose.
