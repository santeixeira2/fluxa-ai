import { createContext, useContext, type ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';

interface ThemeContextValue {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be inside ThemeProvider');
  return ctx;
}
