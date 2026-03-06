import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  RefreshCw,
  FlaskConical,
  Cpu,
  X,
  GripVertical,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { FormSection } from '../common/FormSection';
import { FormField } from '../common/FormField';
import { FormRow } from '../../../app/components/forms/FormRow';
import { ToggleSwitch } from '../../../app/components/forms/ToggleSwitch';
import { SelectInput } from '../../../app/components/ui/SelectInput';
import { StepperInput } from '../../../app/components/forms/StepperInput';
import { AlertBanner } from '../../../app/components/ui/AlertBanner';
import { TooltipHelp } from '../../../app/components/ui/Tooltip';
import { api } from '../../../services/api';
import type { SimulatorOverride } from '../../../types';
import type { ConfigDraft } from '../useSettingsConfig';

// ── Constants ──────────────────────────────────────────────────────────────

const INCIDENT_MODE_OPTIONS = [
  { value: 'full_ok', label: 'full_ok — No incidents' },
  { value: 'light', label: 'light — 1–3 critical, 1–5 warning' },
  { value: 'medium', label: 'medium — 1–3 critical, 5–10 warning, 1 rack' },
  { value: 'heavy', label: 'heavy — 5–10 critical, 10–20 warning, 2 racks, 1 aisle' },
  { value: 'chaos', label: 'chaos — 15% critical, 25% warning' },
  { value: 'custom', label: 'custom — exact counts' },
];

const MODE_DEFAULTS: Record<string, number> = {
  full_ok: 1,
  light: 2,
  medium: 4,
  heavy: 4,
  chaos: 3,
  custom: 2,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Separator between FormRows inside a divide-y container */
const FormRows = ({ children }: { children: React.ReactNode }) => (
  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-4 dark:divide-gray-800 dark:border-gray-800">
    {React.Children.map(children, (child) => (child ? <div className="py-3">{child}</div> : null))}
  </div>
);

// ── Slurm Node Mapping Editor ──────────────────────────────────────────────

interface MappingEntry {
  node: string;
  instance: string;
}

const SlurmMappingEditor = ({ mappingPath }: { mappingPath?: string }) => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<MappingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getSlurmMapping();
      setEntries(data.entries ?? []);
    } catch {
      /**/
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    load();
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSlurmMapping(entries);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /**/
    } finally {
      setSaving(false);
    }
  };

  const update = (i: number, field: keyof MappingEntry, val: string) => {
    const next = [...entries];
    next[i] = { ...next[i], [field]: val };
    setEntries(next);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1.5 text-xs font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        Edit mappings
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Node mappings
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Supports wildcards: <span className="font-mono">n*</span> →{' '}
            <span className="font-mono">compute*</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-2 px-1">
            <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
              Slurm node (pattern)
            </span>
            <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
              Topology instance
            </span>
          </div>
          {entries.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input
                value={e.node}
                onChange={(ev) => update(i, 'node', ev.target.value)}
                placeholder="n* or n001"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <div className="flex gap-1">
                <input
                  value={e.instance}
                  onChange={(ev) => update(i, 'instance', ev.target.value)}
                  placeholder="compute* or compute001"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setEntries(entries.filter((_, j) => j !== i))}
                  className="rounded p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEntries([...entries, { node: '', instance: '' }])}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add mapping
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
        {!mappingPath && (
          <p className="text-[10px] text-amber-500">Set the mapping file path first</p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !mappingPath}
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
            saved
              ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
              : 'bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400'
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

// ── Main section ───────────────────────────────────────────────────────────

interface PluginsSettingsSectionProps {
  draft: ConfigDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConfigDraft | null>>;
}

export const PluginsSettingsSection: React.FC<PluginsSettingsSectionProps> = ({
  draft,
  setDraft,
}) => {
  const [simulatorSettingsOpen, setSimulatorSettingsOpen] = useState(false);
  const [slurmSettingsOpen, setSlurmSettingsOpen] = useState(false);
  const [roleInput, setRoleInput] = useState('');
  const roleInputRef = useRef<HTMLInputElement>(null);

  const [ribbonVisible, setRibbonVisible] = useState(
    () => localStorage.getItem('rackscope.demo.ribbon') !== 'hidden'
  );

  const [metricsFiles, setMetricsFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [metricsFilesLoading, setMetricsFilesLoading] = useState(false);

  const [overrides, setOverrides] = useState<SimulatorOverride[]>([]);
  const [simulatorRunning, setSimulatorRunning] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({ instance: '', metric: 'up', value: '0' });

  useEffect(() => {
    setMetricsFilesLoading(true);
    api
      .getMetricsFiles()
      .then((data) => setMetricsFiles(data.files ?? []))
      .catch(() => undefined)
      .finally(() => setMetricsFilesLoading(false));
  }, []);

  const loadSimulatorData = useCallback(async () => {
    try {
      const [overridesData, status] = await Promise.all([
        api.getSimulatorOverrides(),
        api.getSimulatorStatus().catch(() => ({ running: false })),
      ]);
      setOverrides(overridesData.overrides ?? []);
      setSimulatorRunning(status?.running ?? false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadSimulatorData();
  }, [loadSimulatorData]);

  const handleRestartSimulator = async () => {
    setRestarting(true);
    try {
      await api.restartSimulator();
      // Poll until the simulator comes back up (max 30s)
      const poll = setInterval(async () => {
        try {
          const status = await api.getSimulatorStatus();
          if (status?.running) {
            clearInterval(poll);
            setRestarting(false);
            loadSimulatorData();
          }
        } catch {
          /* still restarting */
        }
      }, 1500);
      setTimeout(() => {
        clearInterval(poll);
        setRestarting(false);
        loadSimulatorData();
      }, 30000);
    } catch {
      setRestarting(false);
    }
  };

  const toggleRibbon = (value: boolean) => {
    localStorage.setItem('rackscope.demo.ribbon', value ? 'visible' : 'hidden');
    setRibbonVisible(value);
    window.dispatchEvent(new Event('rackscope-demo-ribbon'));
  };

  const handleAddOverride = async () => {
    try {
      await api.addSimulatorOverride({
        instance: newOverride.instance || null,
        rack_id: null,
        metric: newOverride.metric,
        value: parseFloat(newOverride.value),
        ttl_seconds: 0,
      });
      await loadSimulatorData();
      setShowAddOverride(false);
      setNewOverride({ instance: '', metric: 'up', value: '0' });
    } catch {
      /* ignore */
    }
  };

  const updateSimulator = (
    field: string,
    value: string | boolean | number | Record<string, unknown> | Array<unknown>
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          simulator: { ...prev.plugins.simulator, [field]: value },
        },
      };
    });
  };

  const updateCustomIncident = (field: string, value: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          simulator: {
            ...prev.plugins.simulator,
            custom_incidents: {
              ...prev.plugins.simulator.custom_incidents,
              [field]: String(value),
            },
          },
        },
      };
    });
  };

  const updateSlurm = (
    field: string,
    value: string | boolean | Record<string, string> | Array<unknown>
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          slurm: { ...prev.plugins.slurm, [field]: value },
        },
      };
    });
  };

  const updateSlurmColor = (severity: 'ok' | 'warn' | 'crit' | 'info', color: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          slurm: {
            ...prev.plugins.slurm,
            severity_colors: { ...prev.plugins.slurm.severity_colors, [severity]: color },
          },
        },
      };
    });
  };

  const moveSlurmStatus = (
    status: string,
    fromSeverity: 'ok' | 'warn' | 'crit' | 'info' | null,
    toSeverity: 'ok' | 'warn' | 'crit' | 'info' | null
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const newStatusMap = { ...prev.plugins.slurm.status_map };
      if (fromSeverity) {
        newStatusMap[fromSeverity] = newStatusMap[fromSeverity].filter((s) => s !== status);
      }
      if (toSeverity && !newStatusMap[toSeverity].includes(status)) {
        newStatusMap[toSeverity] = [...newStatusMap[toSeverity], status];
      }
      return {
        ...prev,
        plugins: { ...prev.plugins, slurm: { ...prev.plugins.slurm, status_map: newStatusMap } },
      };
    });
  };

  const sim = draft.plugins.simulator;

  return (
    <div className="space-y-4">
      {/* Global restart warning */}
      <AlertBanner variant="warning">
        Enabling or disabling plugins requires a backend restart — run{' '}
        <code className="rounded bg-amber-900/20 px-1.5 py-0.5 font-mono text-xs">
          make restart
        </code>{' '}
        after saving.
      </AlertBanner>

      {/* ── Simulator Plugin ── */}
      <FormSection
        title="Simulator Plugin"
        icon={FlaskConical}
        iconColor="text-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-500/10"
        description="Metrics simulator for testing without real hardware"
      >
        {/* Running-state banner */}
        {simulatorRunning ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="flex-1 text-sm font-medium text-amber-700 dark:text-amber-400">
              {restarting ? 'Restarting simulator…' : 'Config changes take effect on next restart.'}
            </p>
            <button
              onClick={handleRestartSimulator}
              disabled={restarting}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? 'Restarting…' : 'Restart'}
            </button>
          </div>
        ) : (
          <AlertBanner variant="info">
            Start the stack with{' '}
            <code className="rounded bg-blue-900/20 px-1.5 py-0.5 font-mono text-xs">make up</code>{' '}
            to run the simulator.
          </AlertBanner>
        )}

        <FormRows>
          <FormRow
            label="Enable Simulator"
            description="Activate simulator plugin for demo mode"
            tooltip="When enabled, the simulator generates fake Prometheus metrics for testing without real hardware."
          >
            <ToggleSwitch
              checked={sim.enabled}
              onChange={() => updateSimulator('enabled', !sim.enabled)}
            />
          </FormRow>

          {sim.enabled && (
            <FormRow
              label="Show DEMO ribbon"
              description="Display the diagonal DEMO ribbon in the top-left corner"
              tooltip="Display a diagonal DEMO banner in the top-left corner while the simulator is active."
            >
              <ToggleSwitch checked={ribbonVisible} onChange={() => toggleRibbon(!ribbonVisible)} />
            </FormRow>
          )}
        </FormRows>

        {sim.enabled && (
          <>
            <button
              type="button"
              onClick={() => setSimulatorSettingsOpen(!simulatorSettingsOpen)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {simulatorSettingsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Advanced Settings
            </button>

            {simulatorSettingsOpen && (
              <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                {/* Timing */}
                <FormRows>
                  <FormRow
                    label="Update Interval"
                    tooltip="How often the simulator generates a new set of metrics."
                  >
                    <StepperInput
                      value={parseInt(sim.update_interval_seconds, 10) || 20}
                      onChange={(v) => updateSimulator('update_interval_seconds', String(v))}
                      min={5}
                      max={3600}
                      step={5}
                      unit="s"
                      className="w-28"
                    />
                  </FormRow>
                  <FormRow
                    label="Random Seed"
                    tooltip="Pin a seed for reproducible simulation. Leave empty for random output."
                  >
                    <input
                      type="text"
                      value={sim.seed}
                      onChange={(e) => updateSimulator('seed', e.target.value)}
                      placeholder="empty = random"
                      className="focus:border-brand-500 w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    />
                  </FormRow>
                </FormRows>

                {/* Incident settings */}
                <FormRows>
                  <FormRow
                    label="Incident Mode"
                    description="Controls the failure pattern injected by the simulator"
                    tooltip="full_ok has no failures. light/medium/heavy add increasingly more. chaos is percentage-based. custom uses exact counts."
                  >
                    <SelectInput
                      value={sim.incident_mode}
                      onChange={(mode) => {
                        updateSimulator('incident_mode', mode);
                        updateSimulator('changes_per_hour', String(MODE_DEFAULTS[mode] ?? 2));
                      }}
                      options={INCIDENT_MODE_OPTIONS}
                      className="w-64"
                    />
                  </FormRow>

                  <FormRow
                    label="Changes / hour"
                    description="How often the set of failing devices is reshuffled"
                    tooltip="Ignored in full_ok mode. Lower values = more stable failures; higher values = more churn."
                  >
                    <StepperInput
                      value={parseInt(sim.changes_per_hour, 10) || 2}
                      onChange={(v) => updateSimulator('changes_per_hour', String(v))}
                      min={1}
                      max={60}
                      unit="/h"
                      disabled={sim.incident_mode === 'full_ok'}
                      className="w-28"
                    />
                  </FormRow>
                </FormRows>

                {/* Custom incident counts */}
                {sim.incident_mode === 'custom' && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Custom counts
                    </p>
                    <FormRows>
                      {(
                        [
                          {
                            label: 'Devices Critical',
                            field: 'devices_crit',
                            tooltip: 'Nodes forced to up=0, Slurm=down.',
                          },
                          {
                            label: 'Devices Warning',
                            field: 'devices_warn',
                            tooltip: 'Nodes forced to health=1, Slurm=drain.',
                          },
                          {
                            label: 'Racks Critical',
                            field: 'racks_crit',
                            tooltip: 'All nodes in these racks are marked down.',
                          },
                          {
                            label: 'Aisles Hot',
                            field: 'aisles_hot',
                            tooltip: 'Racks in these aisles get a +12°C temperature boost.',
                          },
                        ] as const
                      ).map(({ label, field, tooltip }) => (
                        <FormRow key={field} label={label} tooltip={tooltip}>
                          <StepperInput
                            value={parseInt(sim.custom_incidents[field], 10) || 0}
                            onChange={(v) => updateCustomIncident(field, v)}
                            min={0}
                            className="w-28"
                          />
                        </FormRow>
                      ))}
                    </FormRows>
                  </div>
                )}

                {/* Paths + TTL */}
                <FormRows>
                  <FormRow
                    label="Overrides Path"
                    tooltip="YAML file where runtime metric overrides are persisted across restarts."
                  >
                    <input
                      type="text"
                      value={sim.overrides_path}
                      onChange={(e) => updateSimulator('overrides_path', e.target.value)}
                      placeholder="config/plugins/simulator/overrides/overrides.yaml"
                      className="focus:border-brand-500 w-80 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    />
                  </FormRow>
                  <FormRow
                    label="Default TTL"
                    tooltip="Lifetime of overrides in seconds. Set to 0 for permanent overrides."
                  >
                    <StepperInput
                      value={parseInt(sim.default_ttl_seconds, 10) || 120}
                      onChange={(v) => updateSimulator('default_ttl_seconds', String(v))}
                      min={0}
                      max={86400}
                      step={60}
                      unit="s"
                      className="w-28"
                    />
                  </FormRow>
                </FormRows>

                {/* Metrics catalog */}
                <FormRows>
                  <FormRow
                    label="Metrics Catalog"
                    tooltip="Primary YAML catalog defining which Prometheus metrics the simulator generates."
                  >
                    <SelectInput
                      value={sim.metrics_catalog_path ?? ''}
                      onChange={(v) => updateSimulator('metrics_catalog_path', v)}
                      placeholder={metricsFilesLoading ? 'Loading…' : '— Select a file —'}
                      options={metricsFiles.map((f) => ({ value: f.path, label: f.name }))}
                      className="w-72"
                    />
                  </FormRow>
                </FormRows>

                {/* Additional catalogs */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Additional Catalogs
                    <TooltipHelp text="Extra metric catalogs merged on top of the primary. Last one wins on conflicts." />
                  </p>
                  <div className="space-y-2">
                    {sim.metrics_catalogs.map((catalog, index) => (
                      <div
                        key={index}
                        className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <ToggleSwitch
                          checked={catalog.enabled}
                          onChange={() => {
                            const next = [...sim.metrics_catalogs];
                            next[index] = { ...next[index], enabled: !catalog.enabled };
                            updateSimulator('metrics_catalogs', next);
                          }}
                        />
                        <FormField
                          label="ID"
                          value={catalog.id}
                          onChange={(v) => {
                            const next = [...sim.metrics_catalogs];
                            next[index] = { ...next[index], id: v };
                            updateSimulator('metrics_catalogs', next);
                          }}
                          className="flex-1"
                        />
                        <FormField
                          label="Path"
                          value={catalog.path}
                          onChange={(v) => {
                            const next = [...sim.metrics_catalogs];
                            next[index] = { ...next[index], path: v };
                            updateSimulator('metrics_catalogs', next);
                          }}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSimulator(
                              'metrics_catalogs',
                              sim.metrics_catalogs.filter((_, i) => i !== index)
                            )
                          }
                          className="mb-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateSimulator('metrics_catalogs', [
                          ...sim.metrics_catalogs,
                          { id: '', path: '', enabled: true },
                        ])
                      }
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add catalog
                    </button>
                  </div>
                </div>

                {/* Slurm Node Failures */}
                <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Slurm Node Failures
                    <TooltipHelp text="Force specific Slurm statuses on random nodes each reshuffle cycle. Applied on top of the incident mode. Useful to simulate maintenance or drain states independently." />
                  </p>

                  {/* Status → count rows */}
                  <div className="space-y-2">
                    {Object.entries(sim.slurm_random_statuses).map(([statusName, count]) => (
                      <div key={statusName} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={statusName}
                          onChange={(e) => {
                            const newVal = e.target.value.trim();
                            if (!newVal || newVal === statusName) return;
                            const entries = Object.entries(sim.slurm_random_statuses).filter(([k]) => k !== statusName);
                            updateSimulator('slurm_random_statuses', Object.fromEntries([...entries, [newVal, count]]));
                          }}
                          className="w-28 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          placeholder="status"
                        />
                        <StepperInput
                          value={parseInt(count, 10) || 0}
                          onChange={(v) =>
                            updateSimulator('slurm_random_statuses', { ...sim.slurm_random_statuses, [statusName]: String(v) })
                          }
                          min={0}
                          max={500}
                          step={1}
                          unit="nodes"
                          className="w-36"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...sim.slurm_random_statuses };
                            delete next[statusName];
                            updateSimulator('slurm_random_statuses', next);
                          }}
                          className="text-gray-400 transition hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateSimulator('slurm_random_statuses', { ...sim.slurm_random_statuses, '': '1' })
                      }
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add status
                    </button>
                  </div>

                  {/* Match patterns */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Node patterns
                      <TooltipHelp text="Only nodes matching these glob patterns are eligible for random Slurm status injection. Example: compute*, visu*" />
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sim.slurm_random_match.map((pattern, idx) => (
                        <div key={idx} className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {pattern}
                          <button
                            type="button"
                            onClick={() => {
                              const next = sim.slurm_random_match.filter((_, i) => i !== idx);
                              updateSimulator('slurm_random_match', next);
                            }}
                            className="ml-0.5 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <input
                        type="text"
                        placeholder="Add pattern…"
                        className="w-28 rounded-full border border-dashed border-gray-300 bg-transparent px-2.5 py-1 font-mono text-xs dark:border-gray-600 dark:text-gray-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !sim.slurm_random_match.includes(val)) {
                              updateSimulator('slurm_random_match', [...sim.slurm_random_match, val]);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metric Overrides */}
                <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Metric Overrides
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={loadSimulatorData}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                      >
                        <RefreshCw className="h-3 w-3" /> Refresh
                      </button>
                      {overrides.length > 0 && (
                        <button
                          onClick={() =>
                            api
                              .clearSimulatorOverrides()
                              .then(loadSimulatorData)
                              .catch(() => {
                                /* noop */
                              })
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/50 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" /> Clear All
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddOverride((p) => !p)}
                        className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-white transition"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                  </div>

                  {showAddOverride && (
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                      <input
                        type="text"
                        value={newOverride.instance}
                        onChange={(e) =>
                          setNewOverride((p) => ({ ...p, instance: e.target.value }))
                        }
                        placeholder="Instance (e.g. compute001)"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newOverride.metric}
                          onChange={(e) =>
                            setNewOverride((p) => ({ ...p, metric: e.target.value }))
                          }
                          placeholder="Metric (e.g. up)"
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                        <input
                          type="number"
                          value={newOverride.value}
                          onChange={(e) => setNewOverride((p) => ({ ...p, value: e.target.value }))}
                          placeholder="Value"
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddOverride}
                          className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white uppercase hover:bg-green-600"
                        >
                          Add Override
                        </button>
                        <button
                          onClick={() => setShowAddOverride(false)}
                          className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-bold text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {overrides.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                      No active overrides
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {overrides.map((ov) => (
                        <div
                          key={ov.id}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
                        >
                          <span className="font-mono text-xs">
                            <span className="text-brand-500">{ov.instance ?? ov.rack_id}</span>
                            <span className="mx-1.5 text-gray-400 dark:text-gray-500">→</span>
                            <span className="text-amber-500">{ov.metric}</span>
                            <span className="mx-1.5 text-gray-400 dark:text-gray-500">=</span>
                            <span className="text-gray-800 dark:text-white/90">{ov.value}</span>
                          </span>
                          <button
                            onClick={() =>
                              api
                                .deleteSimulatorOverride(ov.id)
                                .then(loadSimulatorData)
                                .catch(() => {
                                  /* noop */
                                })
                            }
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </FormSection>

      {/* ── Slurm Plugin ── */}
      <FormSection
        title="Slurm Plugin"
        icon={Cpu}
        iconColor="text-blue-500"
        iconBg="bg-blue-50 dark:bg-blue-500/10"
        description="Workload manager integration for HPC clusters"
      >
        <FormRows>
          <FormRow
            label="Enable Slurm Integration"
            description="Enables HPC wallboard, node list, partitions and alerts views"
            tooltip="Requires a Prometheus metric that exposes Slurm node statuses (e.g. slurm_node_status)."
          >
            <ToggleSwitch
              checked={draft.plugins.slurm.enabled}
              onChange={() => updateSlurm('enabled', !draft.plugins.slurm.enabled)}
            />
          </FormRow>
        </FormRows>

        <button
          type="button"
          onClick={() => setSlurmSettingsOpen(!slurmSettingsOpen)}
          disabled={!draft.plugins.slurm.enabled}
          className={`flex items-center gap-2 text-sm font-medium transition ${
            draft.plugins.slurm.enabled
              ? 'cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              : 'cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-500'
          }`}
        >
          {slurmSettingsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Settings
        </button>

        {slurmSettingsOpen && draft.plugins.slurm.enabled && (
          <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            {/* ── Prometheus Source ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                Prometheus Source
              </p>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Metric name
                  <TooltipHelp text="Prometheus metric name that exposes Slurm node statuses. Default: slurm_node_status" />
                </label>
                <input
                  value={draft.plugins.slurm.metric}
                  onChange={(e) => updateSlurm('metric', e.target.value)}
                  placeholder="slurm_node_status"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Node label
                    <TooltipHelp text="Prometheus label that identifies the node name (e.g. node, hostname)." />
                  </label>
                  <input
                    value={draft.plugins.slurm.label_node}
                    onChange={(e) => updateSlurm('label_node', e.target.value)}
                    placeholder="node"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status label
                    <TooltipHelp text="Prometheus label that carries the Slurm node status value (e.g. status, state)." />
                  </label>
                  <input
                    value={draft.plugins.slurm.label_status}
                    onChange={(e) => updateSlurm('label_status', e.target.value)}
                    placeholder="status"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Partition label
                    <TooltipHelp text="Prometheus label for the Slurm partition name (e.g. partition, queue)." />
                  </label>
                  <input
                    value={draft.plugins.slurm.label_partition}
                    onChange={(e) => updateSlurm('label_partition', e.target.value)}
                    placeholder="partition"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* ── Node Filtering ── */}
            <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-700">
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                Node Filtering
              </p>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Device roles
                  <TooltipHelp text="Only devices whose template role matches one of these values will appear in Slurm views. Leave empty to match all." />
                </label>
                <div
                  onClick={() => roleInputRef.current?.focus()}
                  className="focus-within:border-brand-500 flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                >
                  {draft.plugins.slurm.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {role}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSlurm(
                            'roles',
                            draft.plugins.slurm.roles.filter((_, i) => i !== idx)
                          );
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={roleInputRef}
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && roleInput.trim()) {
                        e.preventDefault();
                        const val = roleInput.trim().toLowerCase();
                        if (!draft.plugins.slurm.roles.includes(val))
                          updateSlurm('roles', [...draft.plugins.slurm.roles, val]);
                        setRoleInput('');
                      } else if (
                        e.key === 'Backspace' &&
                        !roleInput &&
                        draft.plugins.slurm.roles.length > 0
                      ) {
                        updateSlurm('roles', draft.plugins.slurm.roles.slice(0, -1));
                      }
                    }}
                    className="min-w-[100px] flex-1 border-none bg-transparent text-sm outline-none dark:text-white"
                    placeholder={
                      draft.plugins.slurm.roles.length === 0 ? 'Type a role and press Enter' : ''
                    }
                  />
                </div>
              </div>

              <FormRows>
                <FormRow
                  label="Include unlabeled nodes"
                  description="Show devices that have no role defined in their template"
                  tooltip="Include Slurm nodes with no matching entry in the node mapping file. When disabled, only explicitly mapped nodes appear in Slurm views."
                >
                  <ToggleSwitch
                    checked={draft.plugins.slurm.include_unlabeled}
                    onChange={() =>
                      updateSlurm('include_unlabeled', !draft.plugins.slurm.include_unlabeled)
                    }
                  />
                </FormRow>
              </FormRows>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Node mapping file
                  <TooltipHelp text="YAML file mapping Slurm node names / patterns to topology instance names. Supports wildcards: n* → compute*." />
                </label>
                <input
                  value={draft.plugins.slurm.mapping_path}
                  onChange={(e) => updateSlurm('mapping_path', e.target.value)}
                  placeholder="config/plugins/slurm/node_mapping.yaml"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>

              <SlurmMappingEditor mappingPath={draft.plugins.slurm.mapping_path} />
            </div>

            {/* ── Severity Colors ── */}
            <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-700">
              <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                Severity Colors
                <TooltipHelp text="Color swatches for OK/WARN/CRIT/INFO Slurm node state badges in all Slurm views." />
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['ok', 'warn', 'crit', 'info'] as const).map((sev) => (
                  <div
                    key={sev}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <input
                      type="color"
                      value={draft.plugins.slurm.severity_colors[sev]}
                      onChange={(e) => updateSlurmColor(sev, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[10px] font-bold tracking-wider uppercase"
                        style={{ color: draft.plugins.slurm.severity_colors[sev] }}
                      >
                        {sev}
                      </div>
                      <div className="font-mono text-[9px] text-gray-400">
                        {draft.plugins.slurm.severity_colors[sev]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Status Mapping ── */}
            <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                  Status Mapping
                  <TooltipHelp text="Map Slurm node status strings to Rackscope health states. Drag statuses between zones to configure." />
                </p>
                <span className="text-[10px] text-gray-400 dark:text-gray-600">
                  — drag to move between zones, click + to add
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {(['ok', 'warn', 'crit', 'info'] as const).map((sev) => {
                  const color = draft.plugins.slurm.severity_colors[sev];
                  return (
                    <div
                      key={sev}
                      className="flex flex-col gap-2 rounded-xl border-2 border-dashed p-3 transition"
                      style={{ borderColor: color }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.background = `${color}12`;
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.background = '';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.background = '';
                        const status = e.dataTransfer.getData('status');
                        const from = e.dataTransfer.getData('fromSeverity') as
                          | 'ok'
                          | 'warn'
                          | 'crit'
                          | 'info'
                          | null;
                        if (status) moveSlurmStatus(status, from || null, sev);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-black tracking-wider uppercase"
                          style={{ color }}
                        >
                          {sev}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {draft.plugins.slurm.status_map[sev].length}
                        </span>
                      </div>
                      <div className="min-h-[60px] space-y-1">
                        {draft.plugins.slurm.status_map[sev].map((status) => (
                          <div
                            key={status}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('status', status);
                              e.dataTransfer.setData('fromSeverity', sev);
                              e.currentTarget.style.opacity = '0.4';
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                            className="group flex cursor-grab items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                            style={{ borderLeftWidth: 2, borderLeftColor: color }}
                          >
                            <GripVertical className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
                            <span className="flex-1 font-mono text-gray-600 dark:text-gray-300">
                              {status}
                            </span>
                            <button
                              type="button"
                              onClick={() => moveSlurmStatus(status, sev, null)}
                              className="hidden text-gray-300 group-hover:block hover:text-red-400 dark:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.elements[0] as HTMLInputElement;
                          const val = input.value.trim().toLowerCase();
                          if (val && !draft.plugins.slurm.status_map[sev].includes(val)) {
                            moveSlurmStatus(val, null, sev);
                            input.value = '';
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="add status…"
                            className="min-w-0 flex-1 rounded border border-dashed border-gray-200 bg-transparent px-2 py-1 font-mono text-[10px] text-gray-400 focus:outline-none dark:border-gray-700"
                          />
                          <button
                            type="submit"
                            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Drag statuses between zones to reclassify them. Click × to remove. Unclassified
                statuses are shown as UNKNOWN.
              </p>
            </div>
          </div>
        )}
      </FormSection>
    </div>
  );
};
