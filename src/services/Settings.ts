import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAPER_TRADING } from '../constants/theme';

const KEY_PAPER_TRADING = 'gold_scalpers_settings_paper';
const KEY_THEME_MODE = 'gold_scalpers_settings_theme';

export type ThemeMode = 'system' | 'light' | 'dark';

// ── Paper Trading ─────────────────────────────────────────────────

/** Get the current paper trading setting. Defaults to env var on first launch. */
export async function getPaperTrading(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PAPER_TRADING);
    if (raw === null) {
      // First launch — seed from env var
      await AsyncStorage.setItem(KEY_PAPER_TRADING, JSON.stringify(PAPER_TRADING));
      return PAPER_TRADING;
    }
    return JSON.parse(raw) as boolean;
  } catch (err) {
    console.error('[Settings] Failed to read paper trading:', err);
    return PAPER_TRADING;
  }
}

/** Persist the paper trading toggle. */
export async function setPaperTrading(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PAPER_TRADING, JSON.stringify(value));
    console.log(`[Settings] Paper trading toggled to: ${value}`);
  } catch (err) {
    console.error('[Settings] Failed to write paper trading:', err);
  }
}

// ── Theme Mode ────────────────────────────────────────────────────

/** Get the current theme mode preference. Defaults to 'system'. */
export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(KEY_THEME_MODE);
    if (raw === null) return 'system';
    return JSON.parse(raw) as ThemeMode;
  } catch (err) {
    console.error('[Settings] Failed to read theme mode:', err);
    return 'system';
  }
}

/** Persist the theme mode preference. */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_THEME_MODE, JSON.stringify(mode));
    console.log(`[Settings] Theme mode set to: ${mode}`);
  } catch (err) {
    console.error('[Settings] Failed to write theme mode:', err);
  }
}
