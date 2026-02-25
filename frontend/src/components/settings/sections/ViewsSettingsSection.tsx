import { X, Plus } from 'lucide-react';
import type { ConfigDraft } from '../useSettingsConfig';
import { SettingField, SettingTooltip } from '../../../cosmos/components/SettingTooltip';
import { SectionCard } from '../../../cosmos/pages/templates/EmptyPage';

interface Props {
  draft: ConfigDraft;
  setDraft: (d: ConfigDraft) => void;
}

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
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

export const ViewsSettingsSection = ({ draft, setDraft }: Props) => {
  const f = draft.features;
  const p = draft.playlist;
  const m = draft.map;

  const setFeature = <K extends keyof ConfigDraft['features']>(
    key: K,
    val: ConfigDraft['features'][K]
  ) => setDraft({ ...draft, features: { ...f, [key]: val } });

  const setPlaylist = <K extends keyof ConfigDraft['playlist']>(
    key: K,
    val: ConfigDraft['playlist'][K]
  ) => setDraft({ ...draft, playlist: { ...p, [key]: val } });

  const setMap = <K extends keyof ConfigDraft['map']>(
    key: K,
    val: ConfigDraft['map'][K]
  ) => setDraft({ ...draft, map: { ...m, [key]: val } });

  const addView = () =>
    setPlaylist('views', [...p.views, '/cosmos/views/worldmap']);

  const removeView = (i: number) =>
    setPlaylist('views', p.views.filter((_, idx) => idx !== i));

  const updateView = (i: number, val: string) =>
    setPlaylist('views', p.views.map((v, idx) => (idx === i ? val : v)));

  return (
    <div className="space-y-6">
      {/* ── Map ── */}
      <SectionCard title="World Map" desc="Configure the default view of the world map">
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
          <SettingField
            label="Min / Max zoom"
            tooltip="Users cannot zoom below min or above max."
          >
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
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zoom controls
            </span>
            <SettingTooltip text="Show +/− zoom buttons on the map. Disable for kiosk/display mode." />
          </div>
          <Toggle
            checked={m.zoom_controls ?? true}
            onChange={(v) => setMap('zoom_controls', String(v))}
          />
        </div>
      </SectionCard>

      {/* ── Pages ── */}
      <SectionCard title="Pages & Navigation" desc="Enable or disable sections of the application">
        {(
          [
            {
              key: 'worldmap' as const,
              label: 'World Map',
              tooltip: 'Show the World Map page and its sidebar link.',
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
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              <SettingTooltip text={tooltip} />
            </div>
            <Toggle
              checked={f[key] as boolean}
              onChange={(v) => setFeature(key, v as ConfigDraft['features'][typeof key])}
            />
          </div>
        ))}
      </SectionCard>

      {/* ── Playlist ── */}
      <SectionCard
        title="Playlist Mode"
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
          <div className="mt-4 space-y-4">
            <SettingField
              label="Interval (seconds)"
              tooltip="How long each view is displayed before switching to the next. Minimum 5s."
            >
              <input
                type="number"
                min={5}
                value={p.interval_seconds}
                onChange={(e) => setPlaylist('interval_seconds', e.target.value)}
                className={inputCls}
              />
            </SettingField>

            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Views</span>
                <SettingTooltip text="Ordered list of routes to cycle through. Drag to reorder." />
              </div>
              <div className="space-y-2">
                {p.views.map((view, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={view}
                      onChange={(e) => updateView(i, e.target.value)}
                      placeholder="/cosmos/views/worldmap"
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeView(i)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-white/5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addView}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add view
                </button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
