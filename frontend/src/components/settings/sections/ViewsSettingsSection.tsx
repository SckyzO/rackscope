import { useState } from 'react';
import {
  Globe,
  LayoutDashboard,
  MonitorPlay,
  ArrowRight,
  RotateCcw,
  Check,
  MousePointerClick,
} from 'lucide-react';
import { Server } from 'lucide-react';
import { useTooltipSettings, TOOLTIP_STYLES } from '../../../hooks/useTooltipSettings';
import { HUDTooltipCard } from '../../HUDTooltip';
import { FormToggle } from '../common/FormToggle';
import { Link } from 'react-router-dom';
import type { ConfigDraft } from '../useSettingsConfig';
import { SettingField, SettingTooltip } from '../../../app/components/SettingTooltip';
import { SectionCard } from '../../../app/pages/templates/EmptyPage';
import { FormSelect } from '../common/FormSelect';

// Dashboard localStorage keys (mirrors DashboardPage constants)
const DASH_KEY = 'rackscope.dashboards';
const DASH_VER_KEY = 'rackscope.dashboards.version';

const DashboardResetCard = () => {
  const [done, setDone] = useState(false);
  const handleReset = () => {
    localStorage.removeItem(DASH_KEY);
    localStorage.removeItem(DASH_VER_KEY);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };
  return (
    <SectionCard
      title="Dashboard Layout"
      desc="Restore the default widget layout if something goes wrong"
      icon={RotateCcw}
      iconColor="text-orange-500"
      iconBg="bg-orange-50 dark:bg-orange-500/10"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Resets all dashboards to the factory default. Your widget data is not affected.
        </p>
        <button
          onClick={handleReset}
          className={`ml-4 flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            done
              ? 'bg-green-500 text-white'
              : 'border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-700/40 dark:bg-orange-500/10 dark:text-orange-400'
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          {done ? 'Reset done — reload page' : 'Reset layout'}
        </button>
      </div>
    </SectionCard>
  );
};

interface Props {
  draft: ConfigDraft;
  setDraft: (d: ConfigDraft) => void;
}

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 rounded-full p-0 transition-colors ${checked ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
  >
    <span
      className={`absolute top-1 left-0 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

const inputCls =
  'focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white';

// ── Tooltip style preview data (same WARN compute node for every preview) ─────
const PREVIEW_PROPS = {
  title: 'COMPUTE125',
  subtitle: 'Node',
  status: 'WARN' as const,
  enclosure: 'BullSequana X410 · 1U Twin CPU',
  icon: Server,
  checkSummary: { ok: 4, warn: 1, crit: 0 },
  details: [{ label: 'Location', value: 'RACK U14 · S2', italic: true }],
  reasons: [{ label: 'IPMI temperature high', severity: 'WARN' }],
  metrics: { temp: 39.8, tempWarn: 38, tempCrit: 45, power: 285, powerMax: 350 },
  mousePos: { x: 0, y: 0 },
};

// Scale factors per style to fit the preview container (100px wide × 86px tall)
const PREVIEW_SCALE: Record<string, number> = {
  tinted: 0.3,
  compact: 0.3,
  glass: 0.3,
  split: 0.32,
  terminal: 0.35,
  ultracompact: 0.45,
};

const TooltipStyleSection = () => {
  const { style, aura, setStyle, setAura } = useTooltipSettings();
  return (
    <SectionCard
      title="Tooltip style"
      desc="Choose how node/device tooltips look in rack views"
      icon={MousePointerClick}
      iconColor="text-brand-500"
      iconBg="bg-brand-50 dark:bg-brand-500/10"
    >
      {/* Visual style grid */}
      <div className="grid grid-cols-3 gap-3">
        {TOOLTIP_STYLES.map((s) => {
          const scale = PREVIEW_SCALE[s.id] ?? 0.32;
          const previewW = 320;
          const previewH = Math.round(previewW * 1.1);
          const containerW = Math.round(previewW * scale);
          const containerH = Math.round(previewH * scale);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 transition-all ${
                style === s.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-transparent bg-gray-100 hover:border-gray-300 dark:bg-gray-800/50 dark:hover:border-gray-600'
              }`}
            >
              {/* Scaled-down real tooltip preview */}
              <div
                className="overflow-hidden rounded-lg bg-gray-950"
                style={{ width: containerW, height: containerH }}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: previewW,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  <HUDTooltipCard style={s.id} aura={false} {...PREVIEW_PROPS} />
                </div>
              </div>
              {/* Label */}
              <div className="text-center">
                <div
                  className={`text-[11px] font-semibold ${style === s.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {s.label}
                  {s.id === 'tinted' && (
                    <span className="ml-1 rounded bg-gray-200 px-1 text-[9px] font-bold text-gray-500 uppercase dark:bg-gray-700 dark:text-gray-400">
                      défaut
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Aura toggle */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <FormToggle
          label="Color aura"
          description="Glow shadow around the tooltip matching the alert severity (amber for WARN, red for CRIT)"
          checked={aura}
          onChange={setAura}
        />
      </div>
    </SectionCard>
  );
};

export const ViewsSettingsSection = ({ draft, setDraft }: Props) => {
  const f = draft.features;
  const m = draft.map;

  const setFeature = <K extends keyof ConfigDraft['features']>(
    key: K,
    val: ConfigDraft['features'][K]
  ) => setDraft({ ...draft, features: { ...f, [key]: val } });

  const setMap = <K extends keyof ConfigDraft['map']>(key: K, val: ConfigDraft['map'][K]) =>
    setDraft({ ...draft, map: { ...m, [key]: val } });

  return (
    <div className="space-y-6">
      {/* ── Map ── */}
      <SectionCard
        title="World Map"
        desc="Configure the default view of the world map"
        icon={Globe}
        iconColor="text-sky-500"
        iconBg="bg-sky-50 dark:bg-sky-500/10"
      >
        <div className="grid grid-cols-2 gap-4">
          <SettingField
            label="Default zoom"
            tooltip="Initial zoom level when the world map loads. 2 = world view, 7 = country level."
          >
            <input
              type="number"
              min={1}
              max={18}
              value={m.default_zoom ?? 4}
              onChange={(e) => setMap('default_zoom', e.target.value)}
              className={inputCls}
            />
          </SettingField>
          <SettingField label="Min / Max zoom" tooltip="Users cannot zoom below min or above max.">
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={18}
                placeholder="Min"
                value={m.min_zoom ?? 2}
                onChange={(e) => setMap('min_zoom', e.target.value)}
                className={inputCls}
              />
              <input
                type="number"
                min={1}
                max={18}
                placeholder="Max"
                value={m.max_zoom ?? 7}
                onChange={(e) => setMap('max_zoom', e.target.value)}
                className={inputCls}
              />
            </div>
          </SettingField>
          <SettingField
            label="Center latitude"
            tooltip="Default map center latitude (-90 to 90). 20 = slightly north of equator."
          >
            <input
              type="number"
              step="0.1"
              value={m.center_lat ?? 20}
              onChange={(e) => setMap('center_lat', e.target.value)}
              className={inputCls}
            />
          </SettingField>
          <SettingField
            label="Center longitude"
            tooltip="Default map center longitude (-180 to 180). 0 = prime meridian."
          >
            <input
              type="number"
              step="0.1"
              value={m.center_lon ?? 0}
              onChange={(e) => setMap('center_lon', e.target.value)}
              className={inputCls}
            />
          </SettingField>
        </div>
        <div className="mt-4">
          <FormSelect
            label="Map style"
            tooltip="Visual style of the world map. 'Minimal' adapts to dark/light mode. 'NOC' uses glowing teal outlines ideal for wallboards."
            value={m.style ?? 'minimal'}
            onChange={(v) => {
              setMap('style', v);
              // Also persist immediately to localStorage so WorldMapPage picks it up
              // without waiting for backend save + reload
              localStorage.setItem('rackscope.map.style', v);
            }}
            options={[
              { value: 'minimal', label: 'Minimal — adaptive dark/light (default)' },
              { value: 'noc', label: 'NOC — glowing teal for wallboards' },
              { value: 'flat', label: 'Flat — solid fills, crisp borders' },
            ]}
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zoom controls
            </span>
            <SettingTooltip text="Show +/− zoom buttons on the map. Disable for kiosk/display mode." />
          </div>
          <Toggle checked={m.zoom_controls ?? true} onChange={(v) => setMap('zoom_controls', v)} />
        </div>
      </SectionCard>

      {/* ── Pages ── */}
      <SectionCard
        title="Pages & Navigation"
        desc="Enable or disable sections of the application"
        icon={LayoutDashboard}
        iconColor="text-brand-500"
        iconBg="bg-brand-50 dark:bg-brand-500/10"
      >
        <div className="space-y-2">
          {(
            [
              {
                key: 'worldmap' as const,
                label: 'World Map',
                tooltip: 'Show the World Map page and its sidebar link.',
              },
              {
                key: 'aisle_dashboard' as const,
                label: 'Cluster Dashboard',
                tooltip: 'Show the small cluster / aisle dashboard page in navigation.',
              },
              {
                key: 'notifications' as const,
                label: 'Notifications',
                tooltip: 'Show the Notifications page and the badge in the header.',
              },
              {
                key: 'dev_tools' as const,
                label: 'Dev Tools (UI Library)',
                tooltip:
                  'Show developer pages: UI Library, Showcase, Tables. Disable in production.',
              },
            ] as { key: keyof ConfigDraft['features']; label: string; tooltip: string }[]
          ).map(({ key, label, tooltip }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </span>
                <SettingTooltip text={tooltip} />
              </div>
              <Toggle
                checked={f[key] as boolean}
                onChange={(v) => setFeature(key, v as ConfigDraft['features'][typeof key])}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Playlist ── */}
      <SectionCard
        title="Playlist Mode"
        icon={MonitorPlay}
        iconColor="text-purple-500"
        iconBg="bg-purple-50 dark:bg-purple-500/10"
        desc="Automatically rotate through views — ideal for NOC screens"
      >
        <div className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable playlist
            </span>
            <SettingTooltip text="Shows play/pause/next buttons in the header. Views cycle automatically." />
          </div>
          <Toggle checked={f.playlist} onChange={(v) => setFeature('playlist', v)} />
        </div>

        {f.playlist && (
          <Link
            to="/playlist"
            className="border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/15 mt-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          >
            <MonitorPlay className="h-4 w-4 shrink-0" />
            Configure views, intervals and display mode
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        )}
      </SectionCard>

      {/* ── Tooltip Style ── */}
      <TooltipStyleSection />

      {/* ── Dashboard Reset ── */}
      <DashboardResetCard />
    </div>
  );
};
