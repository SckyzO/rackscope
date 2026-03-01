/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AccentColor = 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber';
export type LightTheme = 'slate' | 'warm' | 'cool' | 'solarized';
export type DarkTheme = 'void' | 'navy' | 'forest' | 'matrix';

export interface AccentMeta {
  id: AccentColor;
  label: string;
  hex: string;
}
export interface PaletteMeta {
  id: LightTheme | DarkTheme;
  label: string;
  desc: string;
  preview: { bg: string; surface: string; border: string };
}

export const ACCENTS: AccentMeta[] = [
  { id: 'indigo', label: 'Indigo', hex: '#465fff' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
  { id: 'amber', label: 'Amber', hex: '#d97706' },
];

export const LIGHT_THEMES: PaletteMeta[] = [
  {
    id: 'slate',
    label: 'Slate',
    desc: 'Clean neutral white',
    preview: { bg: '#f9fafb', surface: '#ffffff', border: '#e5e7eb' },
  },
  {
    id: 'warm',
    label: 'Warm',
    desc: 'Soft cream tones',
    preview: { bg: '#faf9f7', surface: '#fffdf9', border: '#e8e4de' },
  },
  {
    id: 'cool',
    label: 'Cool',
    desc: 'Crisp blue-gray',
    preview: { bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0' },
  },
  {
    id: 'solarized',
    label: 'Solarized',
    desc: 'Easy on the eyes ☀️',
    preview: { bg: '#eee8d5', surface: '#fdf6e3', border: '#cfc8b0' },
  },
];

export const DARK_THEMES: PaletteMeta[] = [
  {
    id: 'void',
    label: 'Void',
    desc: 'Deep pure black',
    preview: { bg: '#030712', surface: '#111827', border: '#1f2937' },
  },
  {
    id: 'navy',
    label: 'Navy',
    desc: 'Dark slate blue',
    preview: { bg: '#020617', surface: '#0f172a', border: '#1e293b' },
  },
  {
    id: 'forest',
    label: 'Forest',
    desc: 'Dark zinc green',
    preview: { bg: '#09090b', surface: '#18181b', border: '#27272a' },
  },
  {
    id: 'matrix',
    label: 'Matrix',
    desc: 'There is no spoon 🟩',
    preview: { bg: '#000800', surface: '#001200', border: '#003000' },
  },
];

// ── CSS variable palettes ─────────────────────────────────────────────────────

const ACCENT_PALETTES: Record<AccentColor, Record<string, string>> = {
  indigo: {
    '--color-brand-25': '#f2f7ff',
    '--color-brand-50': '#ecf3ff',
    '--color-brand-100': '#dde9ff',
    '--color-brand-200': '#c2d6ff',
    '--color-brand-300': '#9cb9ff',
    '--color-brand-400': '#7592ff',
    '--color-brand-500': '#465fff',
    '--color-brand-600': '#3641f5',
    '--color-brand-700': '#2a31d8',
    '--color-brand-800': '#252dae',
    '--color-brand-900': '#262e89',
    '--color-brand-950': '#161950',
    '--color-accent': '#465fff',
    '--shadow-focus-ring': '0px 0px 0px 4px rgb(70 95 255 / 12%)',
  },
  violet: {
    '--color-brand-25': '#faf5ff',
    '--color-brand-50': '#f5f3ff',
    '--color-brand-100': '#ede9fe',
    '--color-brand-200': '#ddd6fe',
    '--color-brand-300': '#c4b5fd',
    '--color-brand-400': '#a78bfa',
    '--color-brand-500': '#7c3aed',
    '--color-brand-600': '#6d28d9',
    '--color-brand-700': '#5b21b6',
    '--color-brand-800': '#4c1d95',
    '--color-brand-900': '#3b1578',
    '--color-brand-950': '#2e1065',
    '--color-accent': '#7c3aed',
    '--shadow-focus-ring': '0px 0px 0px 4px rgb(124 58 237 / 12%)',
  },
  emerald: {
    '--color-brand-25': '#f6fef9',
    '--color-brand-50': '#ecfdf5',
    '--color-brand-100': '#d1fae5',
    '--color-brand-200': '#a7f3d0',
    '--color-brand-300': '#6ee7b7',
    '--color-brand-400': '#34d399',
    '--color-brand-500': '#059669',
    '--color-brand-600': '#047857',
    '--color-brand-700': '#065f46',
    '--color-brand-800': '#064e3b',
    '--color-brand-900': '#022c22',
    '--color-brand-950': '#011a14',
    '--color-accent': '#059669',
    '--shadow-focus-ring': '0px 0px 0px 4px rgb(5 150 105 / 12%)',
  },
  rose: {
    '--color-brand-25': '#fff5f7',
    '--color-brand-50': '#fff1f2',
    '--color-brand-100': '#ffe4e6',
    '--color-brand-200': '#fecdd3',
    '--color-brand-300': '#fda4af',
    '--color-brand-400': '#fb7185',
    '--color-brand-500': '#e11d48',
    '--color-brand-600': '#be123c',
    '--color-brand-700': '#9f1239',
    '--color-brand-800': '#881337',
    '--color-brand-900': '#6c1029',
    '--color-brand-950': '#4c0519',
    '--color-accent': '#e11d48',
    '--shadow-focus-ring': '0px 0px 0px 4px rgb(225 29 72 / 12%)',
  },
  amber: {
    '--color-brand-25': '#fffdf5',
    '--color-brand-50': '#fffbeb',
    '--color-brand-100': '#fef3c7',
    '--color-brand-200': '#fde68a',
    '--color-brand-300': '#fcd34d',
    '--color-brand-400': '#fbbf24',
    '--color-brand-500': '#d97706',
    '--color-brand-600': '#b45309',
    '--color-brand-700': '#92400e',
    '--color-brand-800': '#78350f',
    '--color-brand-900': '#5a2800',
    '--color-brand-950': '#3d1a00',
    '--color-accent': '#d97706',
    '--shadow-focus-ring': '0px 0px 0px 4px rgb(217 119 6 / 12%)',
  },
};

const LIGHT_PALETTES: Record<LightTheme, Record<string, string>> = {
  slate: {
    '--color-white': '#ffffff',
    '--color-gray-50': '#f9fafb',
    '--color-gray-100': '#f3f4f6',
    '--color-gray-200': '#e5e7eb',
  },
  warm: {
    '--color-white': '#fffdf9',
    '--color-gray-50': '#faf9f7',
    '--color-gray-100': '#f4f2ef',
    '--color-gray-200': '#e8e4de',
  },
  cool: {
    '--color-white': '#ffffff',
    '--color-gray-50': '#f8fafc',
    '--color-gray-100': '#f1f5f9',
    '--color-gray-200': '#e2e8f0',
  },
  // Solarized Light — warm cream designed to reduce eye strain (Ethan Schoonover, 2011)
  // base3 (#fdf6e3) → main surfaces,  base2 (#eee8d5) → page bg
  solarized: {
    '--color-white': '#fdf6e3',
    '--color-gray-50': '#eee8d5',
    '--color-gray-100': '#e3dcc8',
    '--color-gray-200': '#cfc8b0',
  },
};

const DARK_PALETTES: Record<DarkTheme, Record<string, string>> = {
  void: {
    '--color-gray-dark': '#111827',
    '--color-gray-700': '#374151',
    '--color-gray-800': '#1f2937',
    '--color-gray-900': '#111827',
    '--color-gray-950': '#030712',
  },
  navy: {
    '--color-gray-dark': '#0f172a',
    '--color-gray-700': '#334155',
    '--color-gray-800': '#1e293b',
    '--color-gray-900': '#0f172a',
    '--color-gray-950': '#020617',
  },
  forest: {
    '--color-gray-dark': '#18181b',
    '--color-gray-700': '#3f3f46',
    '--color-gray-800': '#27272a',
    '--color-gray-900': '#18181b',
    '--color-gray-950': '#09090b',
  },
  // Matrix: green-on-black — overrides surfaces AND brand palette
  matrix: {
    '--color-gray-dark': '#000d00',
    '--color-gray-700': '#003000',
    '--color-gray-800': '#001a00',
    '--color-gray-900': '#001000',
    '--color-gray-950': '#000800',
    // Override brand → Matrix green (applied last, overrides accent palette)
    '--color-brand-25': '#f0fff5',
    '--color-brand-50': '#e0ffe8',
    '--color-brand-100': '#b3ffcc',
    '--color-brand-200': '#66ff99',
    '--color-brand-300': '#33ff66',
    '--color-brand-400': '#00ff41',
    '--color-brand-500': '#00cc34',
    '--color-brand-600': '#009926',
    '--color-brand-700': '#006619',
    '--color-brand-800': '#003d0f',
    '--color-brand-900': '#001a07',
    '--color-brand-950': '#000d03',
    '--color-accent': '#00ff41',
    '--shadow-focus-ring': '0px 0px 0px 4px rgb(0 255 65 / 15%)',
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface ThemeContextType {
  mode: 'dark' | 'light';
  accent: AccentColor;
  lightTheme: LightTheme;
  darkTheme: DarkTheme;
  setMode: (mode: 'dark' | 'light') => void;
  setAccent: (accent: AccentColor) => void;
  setLightTheme: (theme: LightTheme) => void;
  setDarkTheme: (theme: DarkTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_ACCENTS = new Set<AccentColor>(['indigo', 'violet', 'emerald', 'rose', 'amber']);
const VALID_LIGHT = new Set<LightTheme>(['slate', 'warm', 'cool', 'solarized']);
const VALID_DARK = new Set<DarkTheme>(['void', 'navy', 'forest', 'matrix']);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // localStorage keys: 'theme-mode' | 'theme-accent' | 'theme-light' | 'theme-dark'
  const [mode, setModeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme-mode');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [accent, setAccentState] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('theme-accent') as AccentColor | null;
    return saved && VALID_ACCENTS.has(saved) ? saved : 'indigo';
  });
  const [lightTheme, setLightThemeState] = useState<LightTheme>(() => {
    const saved = localStorage.getItem('theme-light') as LightTheme | null;
    // 'stone' was replaced by 'solarized' — fall back to 'slate'
    if (saved === ('stone' as string)) return 'slate';
    return saved && VALID_LIGHT.has(saved) ? saved : 'slate';
  });
  const [darkTheme, setDarkThemeState] = useState<DarkTheme>(() => {
    const saved = localStorage.getItem('theme-dark') as DarkTheme | null;
    // 'charcoal' was removed — fall back to 'void'
    if (saved === ('charcoal' as string)) return 'void';
    return saved && VALID_DARK.has(saved) ? saved : 'void';
  });

  // Listen for mode changes fired by AppLayout's header toggle via the
  // 'rackscope-theme-mode' custom event. This keeps ThemeContext in sync when
  // the user clicks the dark/light button in the header (which lives outside
  // the ThemeProvider subtree).
  useEffect(() => {
    const handler = (e: CustomEvent<{ dark: boolean }>) => {
      setModeState(e.detail.dark ? 'dark' : 'light');
    };
    window.addEventListener('rackscope-theme-mode', handler as EventListener);
    return () => window.removeEventListener('rackscope-theme-mode', handler as EventListener);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (mode === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--color-bg-base', '#0a0a0a');
      root.style.setProperty('--color-bg-panel', '#121212');
      root.style.setProperty('--color-bg-elevated', '#1a1a1a');
      root.style.setProperty('--color-border', '#333333');
      root.style.setProperty('--color-text-base', '#e5e5e5');
      root.style.setProperty('--color-text-primary', '#ffffff');
      root.style.setProperty('--color-text-secondary', '#a3a3a3');
      root.style.setProperty('--color-text-muted', '#737373');
      root.style.setProperty('--color-text-inverse', '#0a0a0a');
      root.style.setProperty('--color-rack-interior', '#141414');
      root.style.setProperty('--color-rack-frame', '#2a2a2a');
      root.style.setProperty('--color-device-surface', '#1f2937');
      root.style.setProperty('--color-node-surface', '#0d0d0d');
      root.style.setProperty('--color-empty-slot', 'rgba(255,255,255,0.03)');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--color-bg-base', '#f5f3ef');
      root.style.setProperty('--color-bg-panel', '#faf8f5');
      root.style.setProperty('--color-bg-elevated', '#ffffff');
      root.style.setProperty('--color-border', '#d4cfc7');
      root.style.setProperty('--color-text-base', '#2c2822');
      root.style.setProperty('--color-text-primary', '#1a1714');
      root.style.setProperty('--color-text-secondary', '#5c574f');
      root.style.setProperty('--color-text-muted', '#8a8479');
      root.style.setProperty('--color-text-inverse', '#ffffff');
      root.style.setProperty('--color-rack-interior', '#ebe8e1');
      root.style.setProperty('--color-rack-frame', '#c4bfb5');
      root.style.setProperty('--color-device-surface', '#fdfcfa');
      root.style.setProperty('--color-node-surface', '#f5f3ef');
      root.style.setProperty('--color-empty-slot', 'rgba(0,0,0,0.02)');
    }

    Object.entries(ACCENT_PALETTES[accent]).forEach(([k, v]) => root.style.setProperty(k, v));
    Object.entries(LIGHT_PALETTES[lightTheme]).forEach(([k, v]) => root.style.setProperty(k, v));
    // Dark palette applied last; matrix overrides brand vars intentionally.
    Object.entries(DARK_PALETTES[darkTheme]).forEach(([k, v]) => root.style.setProperty(k, v));

    // Solarized preserves its warm text tones in dark mode.
    // Standard dark mode replaces text with neutral grays; Solarized Dark uses
    // its canonical palette (base0/base1/base00/base01) for readability.
    if (mode === 'dark' && lightTheme === 'solarized') {
      root.style.setProperty('--color-text-base', '#839496');     // Solarized base0
      root.style.setProperty('--color-text-primary', '#93a1a1');  // Solarized base1
      root.style.setProperty('--color-text-secondary', '#657b83'); // Solarized base00
      root.style.setProperty('--color-text-muted', '#586e75');     // Solarized base01
    }

    const isMatrix = mode === 'dark' && darkTheme === 'matrix';
    if (isMatrix) {
      root.style.setProperty('--color-gray-300', '#33ff00');
      root.style.setProperty('--color-gray-400', '#22cc00');
      root.style.setProperty('--color-gray-500', '#119900');
      root.style.setProperty('--color-gray-600', '#008f11');
      root.classList.add('mode-matrix');
    } else {
      ['--color-gray-300', '--color-gray-400', '--color-gray-500', '--color-gray-600'].forEach(
        (k) => root.style.removeProperty(k)
      );
      root.classList.remove('mode-matrix');
    }

    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-accent', accent);
    localStorage.setItem('theme-light', lightTheme);
    localStorage.setItem('theme-dark', darkTheme);
  }, [mode, accent, lightTheme, darkTheme]);

  // Dispatch 'rackscope-theme-mode' to keep AppLayout's isDark state in sync.
  // setAccent does not dispatch because accent changes do not affect AppLayout's
  // dark/light toggle — only mode switches need cross-tree coordination.
  const setMode = (m: 'dark' | 'light') => {
    setModeState(m);
    window.dispatchEvent(
      new CustomEvent('rackscope-theme-mode', { detail: { dark: m === 'dark' } })
    );
  };

  // Auto-switch mode when a palette is selected so the user immediately sees it.
  const setLightTheme = (t: LightTheme) => {
    setLightThemeState(t);
    setMode('light');
  };
  const setDarkTheme = (t: DarkTheme) => {
    setDarkThemeState(t);
    setMode('dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accent,
        lightTheme,
        darkTheme,
        setMode,
        setAccent: setAccentState,
        setLightTheme,
        setDarkTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
