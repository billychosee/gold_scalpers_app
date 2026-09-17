import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ColorPalette } from '../constants/theme';
import { getThemeMode, setThemeMode as persistThemeMode, ThemeMode } from '../services/Settings';

interface ThemeContextValue {
  themeMode: ThemeMode;
  colors: ColorPalette;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  colors: darkColors,
  setThemeMode: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load persisted theme on mount
  useEffect(() => {
    getThemeMode().then(setThemeModeState).catch(() => {});
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await persistThemeMode(mode);
  };

  const effectiveTheme = useMemo<'light' | 'dark'>(() => {
    if (themeMode === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  const colors = effectiveTheme === 'light' ? lightColors : darkColors;

  const value = useMemo(
    () => ({ themeMode, colors, setThemeMode }),
    [themeMode, colors, setThemeMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
