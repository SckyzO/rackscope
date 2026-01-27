/* eslint-disable react-refresh/only-export-components */
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
      root.style.setProperty('--color-bg-base', '#0a0a0a');
      root.style.setProperty('--color-bg-panel', '#121212');
      root.style.setProperty('--color-text-base', '#e5e5e5');
      root.style.setProperty('--color-border', '#333333');

      // Rack Specifics (Dark) - Better contrast
      root.style.setProperty('--color-rack-interior', '#141414');
      root.style.setProperty('--color-rack-frame', '#2a2a2a');
      root.style.setProperty('--color-device-surface', '#1f2937'); // gray-800
      root.style.setProperty('--color-node-surface', '#0d0d0d');
      root.style.setProperty('--color-empty-slot', 'rgba(255, 255, 255, 0.03)');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--color-bg-base', '#f8fafc'); // slate-50
      root.style.setProperty('--color-bg-panel', '#ffffff');
      root.style.setProperty('--color-text-base', '#0f172a'); // slate-900
      root.style.setProperty('--color-border', '#e2e8f0'); // slate-200

      // Rack Specifics (Light) - Soft metallic look
      root.style.setProperty('--color-rack-interior', '#f1f5f9');
      root.style.setProperty('--color-rack-frame', '#cbd5e1'); // slate-300
      root.style.setProperty('--color-device-surface', '#ffffff');
      root.style.setProperty('--color-node-surface', '#f8fafc');
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
