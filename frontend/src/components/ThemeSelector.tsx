import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { mode, accent, setMode, setAccent } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const accents: Array<{ value: 'blue' | 'green' | 'purple' | 'orange' | 'cyan'; label: string; color: string }> = [
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'green', label: 'Green', color: '#10b981' },
    { value: 'purple', label: 'Purple', color: '#8b5cf6' },
    { value: 'orange', label: 'Orange', color: '#f97316' },
    { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-panel)] border border-[var(--color-border)] px-3 py-2 text-sm transition hover:border-[var(--color-accent)]"
        title="Theme Settings"
      >
        <Palette className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
        {mode === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] shadow-xl z-50">
          {/* Mode Section */}
          <div className="border-b border-[var(--color-border)] p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Theme Mode
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMode('dark');
                  setIsOpen(false);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'dark'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'border border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
              <button
                onClick={() => {
                  setMode('light');
                  setIsOpen(false);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'light'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'border border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
            </div>
          </div>

          {/* Accent Color Section */}
          <div className="p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Accent Color
            </div>
            <div className="grid grid-cols-5 gap-2">
              {accents.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setAccent(item.value);
                    setIsOpen(false);
                  }}
                  className={`flex h-10 w-full items-center justify-center rounded-lg transition ${
                    accent === item.value
                      ? 'ring-2 ring-offset-2 ring-offset-[var(--color-bg-panel)]'
                      : 'hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: item.color,
                    ringColor: item.color,
                  }}
                  title={item.label}
                >
                  {accent === item.value && (
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
