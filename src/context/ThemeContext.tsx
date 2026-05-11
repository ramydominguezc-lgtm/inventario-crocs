import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeCtx {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ preference: 'system', resolved: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() ?? 'light';
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme_pref').then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') setPreference(v);
    });
  }, []);

  function toggle() {
    // Cicla: system → light → dark → system
    const next: ThemePreference = preference === 'system' ? (system === 'dark' ? 'light' : 'dark') : preference === 'dark' ? 'light' : 'dark';
    setPreference(next);
    AsyncStorage.setItem('theme_pref', next);
  }

  const resolved: 'light' | 'dark' = preference === 'system' ? system : preference;
  return <Ctx.Provider value={{ preference, resolved, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() { return useContext(Ctx); }
