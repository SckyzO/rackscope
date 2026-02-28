/**
 * AppearanceSettingsSection — theme picker for General > Appearance.
 * Reads/writes ThemeContext (localStorage, no backend save needed).
 */
import { Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import {
  useTheme,
  ACCENTS,
  LIGHT_THEMES,
  DARK_THEMES,
  type AccentColor,
  type LightTheme,
  type DarkTheme,
  type PaletteMeta,
} from '../../../context/ThemeContext';

// ── Palette preview card ───────────────────────────────────────────────────────

const PaletteCard = ({
  meta,
  active,
  onClick,
}: {
  meta: PaletteMeta;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all ${
      active
        ? 'border-brand-500 shadow-sm'
        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
    }`}
  >
    {/* Color preview mini-mockup */}
    <div
      className="flex h-16 w-full flex-col gap-0.5 p-2"
      style={{ backgroundColor: meta.preview.bg }}
    >
      {/* Simulated sidebar strip */}
      <div className="h-2 w-8 rounded-sm" style={{ backgroundColor: meta.preview.border }} />
      {/* Simulated card */}
      <div
        className="mt-1 flex-1 rounded-sm"
        style={{
          backgroundColor: meta.preview.surface,
          border: `1px solid ${meta.preview.border}`,
        }}
      />
    </div>

    {/* Label */}
    <div
      className="flex items-center justify-between px-2.5 py-1.5"
      style={{
        backgroundColor: meta.preview.surface,
        borderTop: `1px solid ${meta.preview.border}`,
      }}
    >
      <div>
        <p
          className="text-left text-xs font-semibold"
          style={{ color: active ? undefined : '#6b7280' }}
        >
          {meta.label}
        </p>
        <p className="text-left text-[10px]" style={{ color: '#9ca3af' }}>
          {meta.desc}
        </p>
      </div>
      {active && (
        <div className="bg-brand-500 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  </button>
);

// ── Accent swatch ──────────────────────────────────────────────────────────────

const AccentSwatch = ({
  hex,
  label,
  active,
  onClick,
}: {
  hex: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    title={label}
    className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
      active
        ? 'scale-110 border-gray-400 dark:border-gray-200'
        : 'border-transparent hover:scale-105'
    }`}
    style={{ backgroundColor: hex }}
  >
    {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
  </button>
);

// ── Section header (inline, no card wrapper) ───────────────────────────────────

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
    {children}
  </p>
);

// ── Main component ─────────────────────────────────────────────────────────────

export const AppearanceSettingsSection = () => {
  const { accent, lightTheme, darkTheme, setAccent, setLightTheme, setDarkTheme } = useTheme();
  const [autoSaved, setAutoSaved] = useState(false);

  const flash = useCallback(() => {
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2500);
  }, []);

  const handleAccent = (a: AccentColor) => {
    setAccent(a);
    flash();
  };
  const handleLightTheme = (t: LightTheme) => {
    setLightTheme(t);
    flash();
  };
  const handleDarkTheme = (t: DarkTheme) => {
    setDarkTheme(t);
    flash();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="bg-brand-50 dark:bg-brand-500/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <svg
            className="text-brand-500 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <div className="flex-1 pt-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Appearance</h3>
            {autoSaved && (
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
                ✓ Auto saved
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Saved locally in your browser — no server save needed
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Accent color ─────────────────────────────────────────────── */}
        <div>
          <SubLabel>Accent color</SubLabel>
          <div className="flex items-center gap-3">
            {ACCENTS.map((a) => (
              <AccentSwatch
                key={a.id}
                hex={a.hex}
                label={a.label}
                active={accent === a.id}
                onClick={() => handleAccent(a.id as AccentColor)}
              />
            ))}
          </div>
        </div>

        {/* ── Light themes ─────────────────────────────────────────────── */}
        <div>
          <SubLabel>Light theme — default palette in light mode</SubLabel>
          <div className="grid grid-cols-4 gap-3">
            {LIGHT_THEMES.map((t) => (
              <PaletteCard
                key={t.id}
                meta={t}
                active={lightTheme === t.id}
                onClick={() => handleLightTheme(t.id as LightTheme)}
              />
            ))}
          </div>
        </div>

        {/* ── Dark themes ──────────────────────────────────────────────── */}
        <div>
          <SubLabel>Dark theme — default palette in dark mode</SubLabel>
          <div className="grid grid-cols-4 gap-3">
            {DARK_THEMES.map((t) => (
              <PaletteCard
                key={t.id}
                meta={t}
                active={darkTheme === t.id}
                onClick={() => handleDarkTheme(t.id as DarkTheme)}
              />
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-600">
          These preferences are stored in your browser. They don't affect other users or require a
          server save.
        </p>
      </div>
    </div>
  );
};
