import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'dark' | 'light';
type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan';

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => (localStorage.getItem('theme-mode') as ThemeMode) || 'dark');
  const [accent, setAccent] = useState<AccentColor>(() => (localStorage.getItem('theme-accent') as AccentColor) || 'blue');

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply Mode
    if (mode === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--color-bg-base', '#0a0a0a');
      root.style.setProperty('--color-bg-panel', '#121212');
      root.style.setProperty('--color-text-base', '#e5e5e5');
      root.style.setProperty('--color-border', '#333333');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--color-bg-base', '#f3f4f6');
      root.style.setProperty('--color-bg-panel', '#ffffff');
      root.style.setProperty('--color-text-base', '#111827');
      root.style.setProperty('--color-border', '#e5e7eb');
    }

    // Apply Accent
    const colors: Record<AccentColor, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      orange: '#f97316',
      red: '#ef4444',
      cyan: '#06b6d4',
    };
    root.style.setProperty('--color-accent', colors[accent]);

    // Persist
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-accent', accent);
  }, [mode, accent]);

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
