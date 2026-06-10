// src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const light = {
  primary: '#6563FF',
  background: '#F3F6FF',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF6F6',
  text: '#030912',
  textSecondary: '#7E8CB4',
  textTertiary: '#ADB6D2',
  border: '#D2D5DF',
  icon: '#818085',
  inputBg: '#F3F6FF',
  tabBar: '#FFFFFF',
  cardBorder: '#D2D5DF',
  danger: '#FF453A',
  green: '#30D158',
  orange: '#FF9F0A',
  backbackground: '#b7b5fd8b',
  isDark: false,
};

const dark = {
  primary: '#6563FF',
  background: '#020204',
  surface: '#10111eb2',
  surfaceAlt: '#252635',
  text: '#FFFFFF',
  textSecondary: '#ADB6D2',
  textTertiary: '#595D68',
  border: '#252746',
  icon: '#595D68',
  inputBg: '#14151A',
  tabBar: '#020204',
  cardBorder: '#252746',
  danger: '#451616',
  green: '#30D158',
  orange: '#FF9F0A',
  backbackground: '#b7b5fd8b',
  isDark: true,
};

export type ThemeColors = typeof light;
export type ThemeMode = 'system' | 'dark' | 'light';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: dark,
  isDark: true,
  themeMode: 'system',
  setThemeMode: () => { },
  toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('@theme_mode').then(saved => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setThemeMode(saved);
      }
    });
  }, []);
  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    AsyncStorage.setItem('@theme_mode', mode);
  };

  const isDark =
    themeMode === 'dark'  ? true  :
    themeMode === 'light' ? false :
    systemScheme === 'dark';

  const colors = isDark ? dark : light;

  return (
    <ThemeContext.Provider value={{
      colors, isDark, themeMode,
      setThemeMode: handleSetThemeMode,  // ← updated function
      toggleTheme: () =>
        handleSetThemeMode(themeMode === 'dark' ? 'light' : 'dark'),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);