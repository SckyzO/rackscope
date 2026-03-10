import { useState } from 'react';
import { Globe, LayoutDashboard, MonitorPlay, ArrowRight, RotateCcw, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ConfigDraft } from '../useSettingsConfig';
import { TooltipHelp } from '@app/components/ui/Tooltip';
import { StepperInput } from '@app/components/forms/StepperInput';
import { SectionCard } from '@app/pages/templates/EmptyPage';
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
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Default zoom
              <TooltipHelp text="Initial zoom level when the world map loads. 2 = world view, 7 = country level." />
            </label>
            <StepperInput
              value={Number(m.default_zoom ?? 4)}
              onChange={(v) => setMap('default_zoom', String(v))}
              min={1}
              max={18}
              step={1}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Min / Max zoom
              <TooltipHelp text="Users cannot zoom below min or above max." />
            </label>
            <div className="flex gap-2">
              <StepperInput
                value={Number(m.min_zoom ?? 2)}
                onChange={(v) => setMap('min_zoom', String(v))}
                min={1}
                max={18}
                step={1}
                className="w-full"
              />
              <StepperInput
                value={Number(m.max_zoom ?? 7)}
                onChange={(v) => setMap('max_zoom', String(v))}
                min={1}
                max={18}
                step={1}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Center latitude
              <TooltipHelp text="Default map center latitude (-90 to 90). 20 = slightly north of equator." />
            </label>
            <StepperInput
              value={Number(m.center_lat ?? 20)}
              onChange={(v) => setMap('center_lat', String(v))}
              min={-90}
              max={90}
              step={0.1}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Center longitude
              <TooltipHelp text="Default map center longitude (-180 to 180). 0 = prime meridian." />
            </label>
            <StepperInput
              value={Number(m.center_lon ?? 0)}
              onChange={(v) => setMap('center_lon', String(v))}
              min={-180}
              max={180}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-4">
          <FormSelect
            label="Map style"
            tooltip="Visual style of the world map. 'Minimal' adapts to dark/light mode. 'NOC' uses glowing teal outlines for wallboards."
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
              { value: 'retro', label: 'Retro — warm parchment, vintage cartography' },
              { value: 'midnight', label: 'Midnight — ultra-dark, minimal borders' },
            ]}
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zoom controls
            </span>
            <TooltipHelp text="Show +/− zoom buttons on the map. Disable for kiosk/display mode." />
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
                <TooltipHelp text={tooltip} />
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
            <TooltipHelp text="Shows play/pause/next buttons in the header. Views cycle automatically." />
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

      {/* ── Dashboard Reset ── */}
      <DashboardResetCard />
    </div>
  );
};
