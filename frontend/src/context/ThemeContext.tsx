/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

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
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('theme-mode') as ThemeMode) || 'dark'
  );
  const [accent, setAccent] = useState<AccentColor>(
    () => (localStorage.getItem('theme-accent') as AccentColor) || 'blue'
  );

  useEffect(() => {
    const root = document.documentElement;

    // Apply Mode
    if (mode === 'dark') {
      root.classList.add('dark');
      // Base colors
      root.style.setProperty('--color-bg-base', '#0a0a0a');
      root.style.setProperty('--color-bg-panel', '#121212');
      root.style.setProperty('--color-bg-elevated', '#1a1a1a');
      root.style.setProperty('--color-border', '#333333');

      // Text colors
      root.style.setProperty('--color-text-base', '#e5e5e5');
      root.style.setProperty('--color-text-primary', '#ffffff');
      root.style.setProperty('--color-text-secondary', '#a3a3a3');
      root.style.setProperty('--color-text-muted', '#737373');
      root.style.setProperty('--color-text-inverse', '#0a0a0a');

      // Rack Specifics (Dark) - Better contrast
      root.style.setProperty('--color-rack-interior', '#141414');
      root.style.setProperty('--color-rack-frame', '#2a2a2a');
      root.style.setProperty('--color-device-surface', '#1f2937');
      root.style.setProperty('--color-node-surface', '#0d0d0d');
      root.style.setProperty('--color-empty-slot', 'rgba(255, 255, 255, 0.03)');
    } else {
      root.classList.remove('dark');
      // Base colors - Warmer, softer palette
      root.style.setProperty('--color-bg-base', '#f5f3ef'); // Warm off-white
      root.style.setProperty('--color-bg-panel', '#faf8f5'); // Slightly lighter cream
      root.style.setProperty('--color-bg-elevated', '#ffffff');
      root.style.setProperty('--color-border', '#d4cfc7'); // Warm gray

      // Text colors - Better contrast
      root.style.setProperty('--color-text-base', '#2c2822'); // Warm dark brown
      root.style.setProperty('--color-text-primary', '#1a1714'); // Almost black brown
      root.style.setProperty('--color-text-secondary', '#5c574f'); // Medium brown
      root.style.setProperty('--color-text-muted', '#8a8479'); // Light brown
      root.style.setProperty('--color-text-inverse', '#ffffff');

      // Rack Specifics (Light) - Soft metallic look
      root.style.setProperty('--color-rack-interior', '#ebe8e1');
      root.style.setProperty('--color-rack-frame', '#c4bfb5');
      root.style.setProperty('--color-device-surface', '#fdfcfa');
      root.style.setProperty('--color-node-surface', '#f5f3ef');
      root.style.setProperty('--color-empty-slot', 'rgba(0, 0, 0, 0.02)');
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
