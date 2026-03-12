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
  type IconId,
  type IconBg,
} from '@src/context/ThemeContext';
import { AppIcon, ICON_LABELS, getIconContainerClass, getIconSize } from '../AppIcon';
import { TooltipHelp } from '../ui/Tooltip';

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
    className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition-all ${
      active
        ? 'border-gray-400 dark:border-gray-200 scale-105'
        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:scale-[1.02]'
    }`}
  >
    <div
      className="h-8 w-full rounded-lg"
      style={{ backgroundColor: hex }}
    >
      {active && (
        <div className="flex h-full items-center justify-center">
          <Check className="h-3.5 w-3.5 text-white drop-shadow" />
        </div>
      )}
    </div>
    <span className={`text-[10px] font-medium leading-none ${active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
      {label}
    </span>
  </button>
);

// ── Section header (inline, no card wrapper) ───────────────────────────────────

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
    {children}
  </p>
);

/** Header row: label + optional tooltip, consistent spacing */
const SectionHeader = ({ label, tooltip }: { label: string; tooltip?: string }) => (
  <div className="mb-2 flex items-center gap-1.5">
    <SubLabel>{label}</SubLabel>
    {tooltip && <TooltipHelp text={tooltip} />}
  </div>
);

// ── Icon picker card ───────────────────────────────────────────────────────────

const IconCard = ({
  id,
  active,
  iconBg,
  onClick,
}: {
  id: IconId;
  active: boolean;
  iconBg: IconBg;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    title={ICON_LABELS[id]}
    className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
      active
        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
    }`}
  >
    <div className={getIconContainerClass(iconBg)}>
      <AppIcon id={id} className={getIconSize(iconBg)} />
    </div>
    <p className="text-center text-[10px] leading-tight text-gray-500 dark:text-gray-400">
      {ICON_LABELS[id]}
    </p>
    {active && (
      <div className="bg-brand-500 absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full">
        <Check className="h-2.5 w-2.5 text-white" />
      </div>
    )}
  </button>
);

// ── Icon background style card ─────────────────────────────────────────────────

const BG_STYLES: { id: IconBg; label: string; desc: string }[] = [
  { id: 'badge',  label: 'Badge',  desc: 'Filled square' },
  { id: 'soft',   label: 'Soft',   desc: 'Tinted bg' },
  { id: 'circle', label: 'Circle', desc: 'Filled circle' },
  { id: 'ghost',  label: 'Ghost',  desc: 'Outline only' },
  { id: 'solo',   label: 'Solo',   desc: 'Icon only' },
];

const BgStyleCard = ({
  style,
  active,
  onClick,
  previewIconId,
}: {
  style: (typeof BG_STYLES)[number];
  active: boolean;
  onClick: () => void;
  previewIconId: IconId;
}) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center gap-2.5 rounded-xl border-2 py-3 px-2 transition-all ${
      active
        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
    }`}
  >
    {/* Visual mini-preview of the container style */}
    <div className={getIconContainerClass(style.id)}>
      <AppIcon id={previewIconId} className={getIconSize(style.id)} />
    </div>
    <div className="text-center">
      <p className={`text-xs font-semibold ${active ? 'text-brand-500' : 'text-gray-700 dark:text-gray-300'}`}>
        {style.label}
      </p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">{style.desc}</p>
    </div>
    {active && (
      <div className="bg-brand-500 absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full">
        <Check className="h-2.5 w-2.5 text-white" />
      </div>
    )}
  </button>
);

// ── Main component ─────────────────────────────────────────────────────────────

const ALL_ICON_IDS: IconId[] = Object.keys(ICON_LABELS) as IconId[];

export const AppearanceSettingsSection = () => {
  const {
    accent, lightTheme, darkTheme,
    iconId, iconBg,
    setAccent, setLightTheme, setDarkTheme,
    setIconId, setIconBg,
  } = useTheme();
  const [autoSaved, setAutoSaved] = useState(false);

  const flash = useCallback(() => {
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2500);
  }, []);

  const handleAccent = (a: AccentColor) => { setAccent(a); flash(); };
  const handleLightTheme = (t: LightTheme) => { setLightTheme(t); flash(); };
  const handleDarkTheme = (t: DarkTheme) => { setDarkTheme(t); flash(); };
  const handleIconId = (id: IconId) => { setIconId(id); flash(); };
  const handleIconBg = (bg: IconBg) => { setIconBg(bg); flash(); };

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
          <SectionHeader label="Accent color" tooltip="Primary interactive color for buttons, active sidebar items, focused inputs and links. Applied immediately." />
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
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
          <SectionHeader label="Light theme — default palette in light mode" tooltip="Color palette used when light mode is active." />
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
          <SectionHeader label="Dark theme — default palette in dark mode" tooltip="Color palette used when dark mode is active. Void (near-black) is recommended for NOC environments." />
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

        {/* ── Icon style ──────────────────────────────────────────────── */}
        <div>
          <SectionHeader label="Icon style" tooltip="Container shape and fill for the app icon in the sidebar and throughout the UI." />
          <div className="grid grid-cols-5 gap-2">
            {BG_STYLES.map((s) => (
              <BgStyleCard
                key={s.id}
                style={s}
                active={iconBg === s.id}
                onClick={() => handleIconBg(s.id)}
                previewIconId={iconId}
              />
            ))}
          </div>
        </div>

        {/* ── App icon ──────────────────────────────────────────────────── */}
        <div>
          <SectionHeader label="App icon" tooltip="Icon used in the sidebar, favicon, and About page." />
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {ALL_ICON_IDS.map((id) => (
              <IconCard
                key={id}
                id={id}
                active={iconId === id}
                iconBg={iconBg}
                onClick={() => handleIconId(id)}
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
